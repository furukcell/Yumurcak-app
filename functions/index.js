const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

function arr(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'object') return Object.keys(value).filter((key) => value[key]).map(String);
  return [String(value)];
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean).map(String)));
}

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (!value) return '';
  if (value === 'admin') return 'yonetici';
  if (value === 'yönetici') return 'yonetici';
  if (value === 'öğretmen') return 'ogretmen';
  if (value === 'teacher') return 'ogretmen';
  if (value === 'parent') return 'veli';
  return value;
}

function roleMatches(userRole, targetRoles = []) {
  const normalizedTargets = targetRoles.map(normalizeRole).filter(Boolean);
  if (!normalizedTargets.length) return false;
  if (normalizedTargets.includes('all') || normalizedTargets.includes('herkes')) return true;
  return normalizedTargets.includes(normalizeRole(userRole));
}

function cleanExpoData(value) {
  if (!value || typeof value !== 'object') return {};

  return Object.entries(value).reduce((acc, [key, item]) => {
    if (item === undefined || item === null) return acc;
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      acc[key] = item;
      return acc;
    }
    acc[key] = JSON.stringify(item);
    return acc;
  }, {});
}

function chunkArray(items = [], size = 90) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function getChildName(child = {}) {
  return `${child.ad || child.adSoyad || child.isim || child.cocukAdi || 'Çocuk'} ${child.soyad || ''}`.trim();
}

function getParentIdsFromChild(child = {}) {
  return unique([
    ...arr(child.veliIds),
    ...arr(child.parentIds),
    ...arr(child.veliler),
    child.veliId,
    child.parentId,
  ]);
}

async function getChild(childId) {
  if (!childId) return {};
  const snap = await admin.database().ref(`cocuklar/${childId}`).once('value');
  return snap.val() || {};
}

async function getParentIdsForChildIds(childIds = []) {
  const ids = unique(childIds);
  if (!ids.length) return [];

  const parentIds = [];
  await Promise.all(ids.map(async (childId) => {
    const child = await getChild(childId);
    parentIds.push(...getParentIdsFromChild(child));
  }));

  return unique(parentIds);
}

async function createNotificationRecord(payload = {}) {
  const data = Object.entries({
    baslik: payload.baslik || payload.title || 'Yumurcak Bildirim',
    mesaj: payload.mesaj || payload.aciklama || '',
    tip: payload.tip || 'genel',
    kresId: payload.kresId || '',
    hedefRol: payload.hedefRol || '',
    hedefRoller: payload.hedefRoller || null,
    hedefUserIds: payload.hedefUserIds || null,
    hedefSinifIds: payload.hedefSinifIds || null,
    hedefCocukIds: payload.hedefCocukIds || null,
    routeName: payload.routeName || '',
    routeParams: payload.routeParams || {},
    createdBy: payload.createdBy || 'cloud-function',
    createdAt: Date.now(),
    serverCreatedAt: admin.database.ServerValue.TIMESTAMP,
    okunduBy: {},
    pushStatus: 'pending',
    source: payload.source || 'cloud-function',
    sourceId: payload.sourceId || '',
  }).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') acc[key] = value;
    return acc;
  }, {});

  const notificationRef = await admin.database().ref('bildirimler').push(data);
  return notificationRef.key;
}

async function notifyChildParents({ childId, fallbackChild = {}, payload = {} }) {
  const child = childId ? await getChild(childId) : fallbackChild;
  const finalChild = Object.keys(child || {}).length ? child : fallbackChild;
  const parentIds = getParentIdsFromChild(finalChild);
  if (!parentIds.length) return null;

  return createNotificationRecord({
    kresId: payload.kresId || finalChild.kresId || '',
    hedefUserIds: parentIds,
    ...payload,
  });
}

async function getTargetPushTokens(payload = {}) {
  const usersSnap = await admin.database().ref('kullanicilar').once('value');
  const users = usersSnap.val() || {};

  const targetUserIds = unique([...arr(payload.hedefUserIds), ...arr(payload.kullaniciIds)]);
  const targetRoles = unique([...arr(payload.hedefRol), ...arr(payload.hedefRoller)]);
  const targetSinifIds = unique([...arr(payload.hedefSinifIds), ...arr(payload.sinifIds)]);
  const creatorId = String(payload.createdBy || '');
  const kresId = String(payload.kresId || '');
  const tokens = [];

  Object.entries(users).forEach(([id, user = {}]) => {
    const userId = String(id);
    const authUid = String(user.authUid || '');
    const userRole = user.rol || '';
    const userKresId = String(user.kresId || '');
    const userSinifId = String(user.sinifId || user.sinif || '');

    if (kresId && userKresId && userKresId !== kresId) return;
    if (creatorId && (creatorId === userId || creatorId === authUid)) return;

    if (targetUserIds.length) {
      const isTargetUser = targetUserIds.includes(userId) || (authUid && targetUserIds.includes(authUid));
      if (!isTargetUser) return;
    } else if (targetRoles.length) {
      if (!roleMatches(userRole, targetRoles)) return;
    } else if (targetSinifIds.length) {
      if (!userSinifId || !targetSinifIds.includes(userSinifId)) return;
    } else {
      return;
    }

    if (targetSinifIds.length && userSinifId && !targetSinifIds.includes(userSinifId)) return;

    const token = user.pushToken || user.expoPushToken || user.notificationToken;
    if (token) tokens.push(String(token));
  });

  return unique(tokens).filter((token) => token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}

async function sendExpoPushMessages(messages = []) {
  if (!messages.length) return [];

  const results = [];
  const chunks = chunkArray(messages, 90);

  for (const chunk of chunks) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    const json = await response.json();
    results.push(json);
  }

  return results;
}

exports.sendPushOnNotificationCreate = functions
  .region('europe-west1')
  .database
  .ref('/bildirimler/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const notificationId = context.params.notificationId;
    const payload = snapshot.val() || {};

    if (payload.pushSentAt || payload.pushStatus === 'sent') {
      return null;
    }

    const title = payload.baslik || payload.title || 'Yumurcak Bildirim';
    const body = payload.mesaj || payload.aciklama || '';

    if (!body) {
      await snapshot.ref.update({
        pushStatus: 'skipped_empty_body',
        pushCheckedAt: admin.database.ServerValue.TIMESTAMP,
      });
      return null;
    }

    const tokens = await getTargetPushTokens(payload);

    if (!tokens.length) {
      await snapshot.ref.update({
        pushStatus: 'no_tokens',
        pushCheckedAt: admin.database.ServerValue.TIMESTAMP,
      });
      return null;
    }

    const data = cleanExpoData({
      notificationId,
      tip: payload.tip || 'genel',
      routeName: payload.routeName || '',
      routeParams: payload.routeParams || {},
    });

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default',
    }));

    try {
      const expoResponses = await sendExpoPushMessages(messages);
      await snapshot.ref.update({
        pushStatus: 'sent',
        pushTokenCount: tokens.length,
        pushSentAt: admin.database.ServerValue.TIMESTAMP,
        pushProvider: 'expo',
        pushResponsePreview: JSON.stringify(expoResponses).slice(0, 1200),
      });
    } catch (error) {
      console.error('Expo push send failed:', error);
      await snapshot.ref.update({
        pushStatus: 'error',
        pushError: String(error && error.message ? error.message : error).slice(0, 500),
        pushCheckedAt: admin.database.ServerValue.TIMESTAMP,
      });
    }

    return null;
  });

exports.createNotificationOnDailyReportCreate = functions
  .region('europe-west1')
  .database
  .ref('/gunlukRaporlar/{reportId}')
  .onCreate(async (snapshot, context) => {
    const reportId = context.params.reportId;
    const report = snapshot.val() || {};
    const childId = report.cocukId || report.childId;
    if (!childId) return null;

    const child = await getChild(childId);
    const parentIds = getParentIdsFromChild(child);
    if (!parentIds.length) return null;

    await createNotificationRecord({
      kresId: report.kresId || child.kresId || '',
      hedefUserIds: parentIds,
      baslik: '📋 Günlük rapor hazır',
      mesaj: `${getChildName(child)} için bugünkü günlük rapor girildi.`,
      tip: 'rapor',
      routeName: 'ParentReports',
      routeParams: { reportId, childId },
      source: 'gunlukRaporlar',
      sourceId: reportId,
      createdBy: report.ogretmenId || report.teacherId || 'cloud-function',
    });

    return null;
  });

exports.createNotificationOnGalleryCreate = functions
  .region('europe-west1')
  .database
  .ref('/galeri/{galleryId}')
  .onCreate(async (snapshot, context) => {
    const galleryId = context.params.galleryId;
    const gallery = snapshot.val() || {};
    const mediaCount = Number(gallery.mediaCount || arr(gallery.mediaItems).length || 1);
    const mediaLabel = mediaCount > 1 ? `${mediaCount} yeni medya` : (gallery.type === 'video' ? 'Yeni video' : 'Yeni fotoğraf');
    const title = gallery.aciklama || gallery.hedefAdi || 'Galeri paylaşımı';

    const childIds = unique([
      ...arr(gallery.cocukIds),
      gallery.cocukId,
      gallery.studentId,
    ]);

    if (childIds.length) {
      const parentIds = await getParentIdsForChildIds(childIds);
      if (!parentIds.length) return null;
      await createNotificationRecord({
        kresId: gallery.kresId || '',
        hedefUserIds: parentIds,
        baslik: '🖼️ Galeriye yeni paylaşım',
        mesaj: `${title}: ${mediaLabel} yüklendi.`,
        tip: 'galeri',
        routeName: 'ParentGallery',
        routeParams: { galleryId },
        source: 'galeri',
        sourceId: galleryId,
        createdBy: gallery.yukleyenId || 'cloud-function',
      });
      return null;
    }

    await createNotificationRecord({
      kresId: gallery.kresId || '',
      hedefRol: 'veli',
      baslik: '🖼️ Galeriye yeni paylaşım',
      mesaj: `${title}: ${mediaLabel} yüklendi.`,
      tip: 'galeri',
      routeName: 'ParentGallery',
      routeParams: { galleryId },
      source: 'galeri',
      sourceId: galleryId,
      createdBy: gallery.yukleyenId || 'cloud-function',
    });

    return null;
  });

exports.createNotificationOnPollCreate = functions
  .region('europe-west1')
  .database
  .ref('/anketler/{pollId}')
  .onCreate(async (snapshot, context) => {
    const pollId = context.params.pollId;
    const poll = snapshot.val() || {};
    if (poll.aktif === false) return null;

    await createNotificationRecord({
      kresId: poll.kresId || poll.kurumId || '',
      hedefRol: 'veli',
      baslik: '🗳️ Yeni anket',
      mesaj: poll.baslik || poll.title || 'Veliler için yeni bir anket yayınlandı.',
      tip: 'anket',
      routeName: 'ParentPolls',
      routeParams: { pollId },
      source: 'anketler',
      sourceId: pollId,
      createdBy: poll.createdBy || 'cloud-function',
    });

    return null;
  });

exports.createNotificationOnWeeklyBadgeWrite = functions
  .region('europe-west1')
  .database
  .ref('/haftaninRozetleri/{badgeRecordId}')
  .onWrite(async (change, context) => {
    const badgeRecordId = context.params.badgeRecordId;
    const before = change.before.val() || null;
    const after = change.after.val() || null;
    if (!after || after.aktif === false) return null;

    const beforeUpdatedAt = Number(before && before.updatedAt ? before.updatedAt : 0);
    const afterUpdatedAt = Number(after.updatedAt || 0);
    if (before && beforeUpdatedAt && afterUpdatedAt && beforeUpdatedAt === afterUpdatedAt) return null;

    const childId = after.cocukId;
    if (!childId) return null;

    const child = await getChild(childId);
    const parentIds = getParentIdsFromChild(child);
    if (!parentIds.length) return null;

    const badgeEmoji = after.badgeEmoji || after.rozetEmoji || '🏅';
    const badgeTitle = after.badgeTitle || after.rozetAdi || 'Haftanın Yıldızı';

    await createNotificationRecord({
      kresId: after.kresId || child.kresId || '',
      hedefUserIds: parentIds,
      baslik: `${badgeEmoji} Yeni rozet`,
      mesaj: `${getChildName(child)} bu hafta "${badgeTitle}" rozeti kazandı.`,
      tip: 'rozet',
      routeName: 'ParentBadges',
      routeParams: { badgeRecordId, childId },
      source: 'haftaninRozetleri',
      sourceId: badgeRecordId,
      createdBy: after.ogretmenId || 'cloud-function',
    });

    return null;
  });

exports.createNotificationOnAttendanceWrite = functions
  .region('europe-west1')
  .database
  .ref('/yoklamalar/{attendanceId}')
  .onWrite(async (change, context) => {
    const attendanceId = context.params.attendanceId;
    const before = change.before.val() || null;
    const after = change.after.val() || null;
    if (!after) return null;
    if (before && before.durum === after.durum) return null;

    const childId = after.cocukId || after.childId;
    if (!childId) return null;

    const child = await getChild(childId);
    const durum = String(after.durum || '').toLowerCase();
    const statusLabel = durum === 'gelmedi' ? 'bugün gelmedi olarak işaretlendi.' : durum === 'gec' ? 'bugün geç geldi olarak işaretlendi.' : 'bugün okula geldi olarak işaretlendi.';

    await notifyChildParents({
      childId,
      fallbackChild: child,
      payload: {
        kresId: after.kresId || child.kresId || '',
        baslik: '✅ Yoklama güncellendi',
        mesaj: `${getChildName(child)} ${statusLabel}`,
        tip: 'yoklama',
        routeName: 'ParentAttendance',
        routeParams: { attendanceId, childId },
        source: 'yoklamalar',
        sourceId: attendanceId,
        createdBy: after.ogretmenId || 'cloud-function',
      },
    });

    return null;
  });

exports.createNotificationOnMealListCreate = functions
  .region('europe-west1')
  .database
  .ref('/yemekListeleri/{mealId}')
  .onCreate(async (snapshot, context) => {
    const mealId = context.params.mealId;
    const meal = snapshot.val() || {};
    if (meal.aktif === false) return null;

    const title = meal.baslik || (meal.ayKey ? `${meal.ayKey} yemek listesi` : 'Yemek listesi');
    await createNotificationRecord({
      kresId: meal.kresId || '',
      hedefRol: 'veli',
      baslik: '🍽️ Yemek listesi güncellendi',
      mesaj: `${title} yayınlandı.`,
      tip: 'yemek',
      routeName: 'ParentMeals',
      routeParams: { mealId, ayKey: meal.ayKey || '' },
      source: 'yemekListeleri',
      sourceId: mealId,
      createdBy: meal.olusturanId || 'cloud-function',
    });

    return null;
  });

exports.createNotificationOnMedicalWrite = functions
  .region('europe-west1')
  .database
  .ref('/medikalBilgiler/{childId}')
  .onWrite(async (change, context) => {
    const childId = context.params.childId;
    const before = change.before.val() || null;
    const after = change.after.val() || null;
    if (!after) return null;
    if (before && JSON.stringify(before) === JSON.stringify(after)) return null;

    const child = await getChild(childId);
    const parentIds = getParentIdsFromChild(child);
    if (!parentIds.length) return null;

    const updater = after.guncelleyenVeliId || after.guncelleyenId || after.updatedBy || '';
    await createNotificationRecord({
      kresId: after.kresId || child.kresId || '',
      hedefRol: ['yonetici', 'ogretmen'],
      baslik: '🩺 Medikal bilgi güncellendi',
      mesaj: `${getChildName(child)} için medikal bilgiler güncellendi.`,
      tip: 'medikal',
      routeName: 'TeacherMedical',
      routeParams: { childId },
      source: 'medikalBilgiler',
      sourceId: childId,
      createdBy: updater || 'cloud-function',
    });

    return null;
  });

exports.createNotificationOnPhysicalDevelopmentCreate = functions
  .region('europe-west1')
  .database
  .ref('/fizikselGelisim/{recordId}')
  .onCreate(async (snapshot, context) => {
    const recordId = context.params.recordId;
    const record = snapshot.val() || {};
    const childId = record.cocukId || record.childId;
    if (!childId) return null;

    const child = await getChild(childId);
    await notifyChildParents({
      childId,
      fallbackChild: child,
      payload: {
        kresId: record.kresId || child.kresId || '',
        baslik: '📈 Gelişim kaydı eklendi',
        mesaj: `${getChildName(child)} için yeni fiziksel gelişim ölçümü kaydedildi.`,
        tip: 'gelisim',
        routeName: 'ParentDevelopment',
        routeParams: { recordId, childId },
        source: 'fizikselGelisim',
        sourceId: recordId,
        createdBy: record.ogretmenId || 'cloud-function',
      },
    });

    return null;
  });

exports.createNotificationOnAdaptationWrite = functions
  .region('europe-west1')
  .database
  .ref('/uyumKayitlari/{adaptationId}')
  .onWrite(async (change, context) => {
    const adaptationId = context.params.adaptationId;
    const before = change.before.val() || null;
    const after = change.after.val() || null;
    if (!after) return null;

    const beforeUpdatedAt = Number(before && before.updatedAt ? before.updatedAt : 0);
    const afterUpdatedAt = Number(after.updatedAt || 0);
    if (before && beforeUpdatedAt && afterUpdatedAt && beforeUpdatedAt === afterUpdatedAt) return null;

    const childId = after.cocukId || after.childId;
    if (!childId) return null;

    const child = await getChild(childId);
    const scoreText = Number.isFinite(Number(after.skor)) ? ` Skor: ${after.skor}/100.` : '';
    await notifyChildParents({
      childId,
      fallbackChild: child,
      payload: {
        kresId: after.kresId || child.kresId || '',
        baslik: '🌱 Uyum takibi güncellendi',
        mesaj: `${getChildName(child)} için bugünkü uyum kaydı girildi.${scoreText}`,
        tip: 'uyum',
        routeName: 'ParentUyum',
        routeParams: { adaptationId, childId },
        source: 'uyumKayitlari',
        sourceId: adaptationId,
        createdBy: after.kaydedenId || 'cloud-function',
      },
    });

    return null;
  });

// ============================================================
// FAZ 7 — Etkinlik Kütüphanesi: merkezi, anonim etkinlik havuzu
//
// `dersProgramlari` (Aylık Ders Programı / Etkinlik Kartı) her gün için
// bir `etkinlik` metni tutuyor. Bu metin değiştiğinde (yeni girildiğinde
// veya düzenlendiğinde) `etkinlikHavuzu` node'undaki ilgili anonim kaydı
// güncelliyoruz: toplam kullanım sayısı, farklı kreş sayısı, son kullanım.
//
// Anonimlik: `etkinlikHavuzu`'na okul adı/öğretmen adı/çocuk/sınıf bilgisi
// YAZILMIYOR. Hangi kreşlerin bu etkinliği kullandığını saymak için gereken
// kreşId listesi ayrı bir node'da (`_etkinlikHavuzuMeta`) tutuluyor; bu node
// database.rules.json'da hem client read hem write için kapalı — sadece bu
// fonksiyon (Admin SDK, kuralları by-pass eder) erişebiliyor.
//
// `etkinlikHavuzu`'na client YAZAMAZ (rules: ".write": false) — havuzdaki
// tüm güncellemeler sadece bu fonksiyon üzerinden, sunucu tarafında olur.
// ============================================================

function normalizeActivityName(name) {
  return String(name || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyActivityName(name) {
  const normalized = normalizeActivityName(name);
  if (!normalized) return '';
  return normalized.replace(/\s+/g, '-').slice(0, 120);
}

// `ogunler.{key}` ya düz metin (admin aylık) ya da `{ text, fotoUrl, ... }`
// objesi (öğretmen günlük) olabiliyor — bkz. src/components/MealTodayCard.js
// içindeki `getMealText`. Aynı mantık burada da lazım.
function extractMealText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return String(value.text || value.aciklama || '').trim();
}

exports.updateActivityPoolOnScheduleWrite = functions
  .region('europe-west1')
  .database
  .ref('/dersProgramlari/{recordId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists() ? change.before.val() : null;
    const after = change.after.exists() ? change.after.val() : null;

    if (!after) return null; // silme — havuzdan düşürmüyoruz, MVP kapsamı dışı
    if (after.aktif === false) return null;

    const activityName = String(after.etkinlik || '').trim();
    if (!activityName) return null;

    // Aynı metin + kategori zaten kayıtlıysa (örn. sadece açıklama düzenlendiyse)
    // tekrar saymıyoruz — çift sayım riskini önlüyor.
    const beforeName = before ? String(before.etkinlik || '').trim() : '';
    const beforeKategori = before ? (before.kategori || 'diger') : null;
    const afterKategori = after.kategori || 'diger';
    if (before && beforeName === activityName && beforeKategori === afterKategori) {
      return null;
    }

    const slug = slugifyActivityName(activityName);
    if (!slug) return null;

    const kresId = after.kresId || '';
    const tema = after.tema || null;

    let yasGrubu = 'Genel';
    if (after.sinifId) {
      try {
        const sinifSnap = await admin.database().ref(`siniflar/${after.sinifId}/yasGrubu`).once('value');
        yasGrubu = sinifSnap.val() || 'Genel';
      } catch (err) {
        console.error('yasGrubu okunamadı', err);
      }
    }

    const now = Date.now();
    const poolRef = admin.database().ref(`etkinlikHavuzu/${slug}`);
    const metaRef = admin.database().ref(`_etkinlikHavuzuMeta/${slug}`);
    const adNormalized = normalizeActivityName(activityName);

    // Toplam kullanım sayısını atomik artırıyoruz (transaction — eşzamanlı
    // yazmalarda kayıp sayım olmaması için).
    await poolRef.transaction((current) => {
      if (!current) {
        return {
          ad: activityName,
          adNormalized,
          yasGrubu,
          kategori: afterKategori,
          tema,
          toplamKullanim: 1,
          kresSayisi: 0, // aşağıda metaRef'ten hesaplanıp güncellenecek
          sonKullanim: now,
          createdAt: now,
          updatedAt: now,
        };
      }
      return {
        ...current,
        ad: activityName,
        adNormalized,
        yasGrubu,
        kategori: afterKategori,
        tema,
        toplamKullanim: (current.toplamKullanim || 0) + 1,
        sonKullanim: now,
        updatedAt: now,
      };
    });

    // Farklı kreş sayısı: kresId'yi gizli meta node'una işleyip, oradaki
    // anahtar sayısını herkese açık havuz kaydına yazıyoruz.
    if (kresId) {
      await metaRef.child('kresIdler').child(kresId).set(true);
      const metaSnap = await metaRef.child('kresIdler').once('value');
      const kresSayisi = metaSnap.exists() ? Object.keys(metaSnap.val()).length : 0;
      await poolRef.child('kresSayisi').set(kresSayisi);
    }

    return null;
  });

// ============================================================
// FAZ 8 — Hazır Yemek Önerileri: merkezi, anonim yemek havuzu
//
// `yemekListeleri` kaydındaki `ogunler.{kahvalti|ogle|araOgun}` metinleri
// değiştiğinde ilgili öğün türü için `yemekHavuzu`'ndaki anonim kaydı
// güncelliyoruz. Aynı anonimlik/güvenlik deseni etkinlik havuzuyla BİREBİR
// AYNI: `yemekHavuzu`'na client yazamaz, kreş sayımı için gereken kresId
// listesi ayrı, tamamen gizli bir node'da (`_yemekHavuzuMeta`) tutuluyor.
//
// Aynı metin farklı öğün türlerinde ayrı kayıt olsun diye (örn. "Mercimek
// Çorbası" kahvaltıda değil öğlede önerilsin) node anahtarı `{ogun}__{slug}`
// şeklinde öğün türüyle namespace'leniyor. Arama da (bkz. mealLibrary.js)
// `searchKey = "{ogun}|{metinNormalized}"` alanı üzerinden tek bir index'le
// hem öğün türüne hem metne göre filtreleyebiliyor (RTDB tek seferde sadece
// bir alana orderByChild yapabildiği için bu birleşik anahtar hilesi gerekti).
// ============================================================

exports.updateMealPoolOnMealWrite = functions
  .region('europe-west1')
  .database
  .ref('/yemekListeleri/{recordId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists() ? change.before.val() : null;
    const after = change.after.exists() ? change.after.val() : null;

    if (!after) return null;
    if (after.aktif === false) return null;

    const ogunlerAfter = after.ogunler || {};
    const ogunlerBefore = before ? (before.ogunler || {}) : {};
    const kresId = after.kresId || '';
    const now = Date.now();

    const oguns = ['kahvalti', 'ogle', 'araOgun', 'ikindi'];

    for (const ogun of oguns) {
      // Admin'in aylık ekranı düz metin yazıyor (`ogunler.kahvalti = "..."`),
      // öğretmenin günlük ekranı ise `{ text, fotoUrl, fotoPath, updatedAt }`
      // objesi yazıyor — ikisini de destekliyoruz (bkz. MealTodayCard.getMealText).
      const metin = extractMealText(ogunlerAfter[ogun]);
      if (!metin) continue;

      const beforeMetin = extractMealText(ogunlerBefore[ogun]);
      if (before && beforeMetin === metin) continue; // değişmemiş, tekrar sayma

      const metinNormalized = normalizeActivityName(metin);
      const slug = slugifyActivityName(metin);
      if (!slug) continue;

      const poolKey = `${ogun}__${slug}`;
      const searchKey = `${ogun}|${metinNormalized}`;
      const poolRef = admin.database().ref(`yemekHavuzu/${poolKey}`);
      const metaRef = admin.database().ref(`_yemekHavuzuMeta/${poolKey}`);

      await poolRef.transaction((current) => {
        if (!current) {
          return {
            metin,
            metinNormalized,
            ogun,
            searchKey,
            toplamKullanim: 1,
            kresSayisi: 0,
            sonKullanim: now,
            createdAt: now,
            updatedAt: now,
          };
        }
        return {
          ...current,
          metin,
          metinNormalized,
          ogun,
          searchKey,
          toplamKullanim: (current.toplamKullanim || 0) + 1,
          sonKullanim: now,
          updatedAt: now,
        };
      });

      if (kresId) {
        await metaRef.child('kresIdler').child(kresId).set(true);
        const metaSnap = await metaRef.child('kresIdler').once('value');
        const kresSayisi = metaSnap.exists() ? Object.keys(metaSnap.val()).length : 0;
        await poolRef.child('kresSayisi').set(kresSayisi);
      }
    }

    return null;
  });

// ============================================================
// FAZ 8 — Duyuru ve Etkinlik bildirimleri
// `duyurular` ve `etkinlikler` node'larını dinleyen trigger hiç
// yoktu, bu yüzden öğretmen/admin panelinden oluşturulan duyuru
// ve etkinlikler veliye bildirim olarak gitmiyordu.
//
// ÖNEMLİ: veli kaydında (`kullanicilar/{id}`) sinifId alanı YOK.
// Sınıf bilgisi sadece `cocuklar/{id}.sinifId` üzerinde tutuluyor,
// veli oraya `veliIds` üzerinden bağlı. Bu yüzden sınıf bazlı
// hedeflemede önce sınıftaki çocukları çekip oradan veli id'lerine
// iniyoruz (aşağıdaki `getParentIdsForSiniflar` bunu yapıyor).
// ============================================================

async function getParentIdsForSiniflar(sinifIds = [], kresId = '') {
  const ids = unique(sinifIds);
  if (!ids.length) return [];

  const childrenSnap = await admin.database().ref('cocuklar').once('value');
  const children = childrenSnap.val() || {};
  const parentIds = [];

  Object.values(children).forEach((child = {}) => {
    if (kresId && child.kresId && String(child.kresId) !== String(kresId)) return;
    const childSinifId = String(child.sinifId || '');
    if (!childSinifId || !ids.includes(childSinifId)) return;
    parentIds.push(...getParentIdsFromChild(child));
  });

  return unique(parentIds);
}

exports.createNotificationOnAnnouncementCreate = functions
  .region('europe-west1')
  .database
  .ref('/duyurular/{announcementId}')
  .onCreate(async (snapshot, context) => {
    const announcementId = context.params.announcementId;
    const announcement = snapshot.val() || {};
    if (announcement.aktif === false) return null;

    const title = announcement.baslik || announcement.title || 'Yeni duyuru';
    const body = announcement.icerik || announcement.message || '';
    if (!body) return null;

    const sinifIds = unique([...arr(announcement.sinifIds), announcement.sinifId]);
    let hedefUserIds;
    if (sinifIds.length) {
      hedefUserIds = await getParentIdsForSiniflar(sinifIds, announcement.kresId);
      if (!hedefUserIds.length) return null;
    }

    await createNotificationRecord({
      kresId: announcement.kresId || '',
      hedefUserIds,
      hedefRol: hedefUserIds ? undefined : 'veli',
      baslik: `📢 ${title}`,
      mesaj: body,
      tip: 'duyuru',
      routeName: 'ParentAnnouncements',
      routeParams: { announcementId },
      source: 'duyurular',
      sourceId: announcementId,
      createdBy: announcement.olusturanId || 'cloud-function',
    });

    return null;
  });

exports.createNotificationOnEventCreate = functions
  .region('europe-west1')
  .database
  .ref('/etkinlikler/{eventId}')
  .onCreate(async (snapshot, context) => {
    const eventId = context.params.eventId;
    const event = snapshot.val() || {};
    if (event.aktif === false) return null;

    const title = event.baslik || event.title || 'Yeni etkinlik';
    const dateLabel = event.tarih ? ` (${event.tarih})` : '';

    const sinifIds = unique([...arr(event.sinifIds), event.sinifId]);
    let hedefUserIds;
    if (sinifIds.length) {
      hedefUserIds = await getParentIdsForSiniflar(sinifIds, event.kresId);
      if (!hedefUserIds.length) return null;
    }

    await createNotificationRecord({
      kresId: event.kresId || '',
      hedefUserIds,
      hedefRol: hedefUserIds ? undefined : 'veli',
      baslik: `🎉 ${title}`,
      mesaj: `Yeni bir etkinlik eklendi${dateLabel}.`,
      tip: 'etkinlik',
      routeName: 'ParentEvents',
      routeParams: { eventId },
      source: 'etkinlikler',
      sourceId: eventId,
      createdBy: event.olusturanId || 'cloud-function',
    });

    return null;
  });

// ============================================================
// FAZ 9 — Doğum günü bildirimi (madde 6)
// Sistemde doğum günü için hiç bildirim yoktu; TeacherBirthdaysScreen
// sadece pasif bir liste gösteriyordu, kimseye otomatik haber gitmiyordu.
// Her gün sabah 08:00'de (Türkiye saati) çalışıp bugün doğum günü olan
// çocukları bulur; hem velisine hem sınıfının öğretmenine bildirim atar.
// ============================================================

function parseBirthDateForCheck(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const tr = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (tr) return new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1]));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

exports.checkBirthdaysDaily = functions
  .region('europe-west1')
  .pubsub
  .schedule('every day 08:00')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const childrenSnap = await admin.database().ref('cocuklar').once('value');
    const children = childrenSnap.val() || {};

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const tasks = Object.entries(children).map(async ([childId, child = {}]) => {
      const birthValue = child.dogumTarihi || child.dogumGunu || child.birthDate;
      const birth = parseBirthDateForCheck(birthValue);
      if (!birth) return;
      if (birth.getMonth() !== todayMonth || birth.getDate() !== todayDate) return;

      const childName = getChildName(child);
      const age = today.getFullYear() - birth.getFullYear();

      // Veliye bildirim
      const parentIds = getParentIdsFromChild(child);
      if (parentIds.length) {
        await createNotificationRecord({
          kresId: child.kresId || '',
          hedefUserIds: parentIds,
          baslik: '🎂 Doğum günü kutlu olsun!',
          mesaj: `${childName} bugün ${age} yaşına giriyor! 🎉`,
          tip: 'dogumgunu',
          routeName: 'ParentSummary',
          source: 'dogumgunu',
          sourceId: childId,
          createdBy: 'cloud-function',
        });
      }

      // Sınıf öğretmenine bildirim
      if (child.sinifId) {
        await createNotificationRecord({
          kresId: child.kresId || '',
          hedefRoller: ['ogretmen'],
          hedefSinifIds: [child.sinifId],
          baslik: '🎂 Sınıfınızda doğum günü var',
          mesaj: `${childName} bugün doğum günü kutluyor (${age} yaşında).`,
          tip: 'dogumgunu',
          routeName: 'TeacherBirthdays',
          source: 'dogumgunu',
          sourceId: childId,
          createdBy: 'cloud-function',
        });
      }
    });

    await Promise.all(tasks);
    return null;
  });
