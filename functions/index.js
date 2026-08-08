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

exports.sendPollAnswerReminders = functions
  .region('europe-west1')
  .pubsub
  .schedule('every 60 minutes')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;

    const [pollsSnap, usersSnap] = await Promise.all([
      admin.database().ref('anketler').once('value'),
      admin.database().ref('kullanicilar').once('value'),
    ]);

    const polls = pollsSnap.val() || {};
    const users = usersSnap.val() || {};
    const now = Date.now();

    const tasks = Object.entries(polls).map(async ([pollId, poll = {}]) => {
      if (poll.aktif === false) return;
      if (poll.hatirlatmaGonderildi) return;

      const createdAt = Number(poll.createdAt || 0);
      if (!createdAt || now - createdAt < REMINDER_DELAY_MS) return;

      const pollKresId = String(poll.kresId || poll.kurumId || '');

      const unansweredIds = [];
      Object.entries(users).forEach(([userId, user = {}]) => {
        if (normalizeRole(user.rol) !== 'veli') return;
        const userKresId = String(user.kresId || '');
        if (pollKresId && userKresId && userKresId !== pollKresId) return;

        const authUid = String(user.authUid || '');
        const answered = !!(poll.cevaplar && (poll.cevaplar[userId] || (authUid && poll.cevaplar[authUid])));
        if (answered) return;

        unansweredIds.push(authUid || userId);
      });

      const targetIds = unique(unansweredIds);

      if (targetIds.length) {
        await createNotificationRecord({
          kresId: pollKresId,
          hedefUserIds: targetIds,
          baslik: '\ud83d\uddf3\ufe0f Anket hat\u0131rlatmas\u0131',
          mesaj: `"${poll.baslik || poll.title || 'Anket'}" anketine hen\u00fcz cevap vermediniz.`,
          tip: 'anket_hatirlatma',
          routeName: 'ParentPolls',
          routeParams: { pollId },
          source: 'anketler_hatirlatma',
          sourceId: pollId,
          createdBy: 'cloud-function',
        });
      }

      await admin.database().ref(`anketler/${pollId}`).update({
        hatirlatmaGonderildi: true,
        hatirlatmaGonderildiAt: admin.database.ServerValue.TIMESTAMP,
      });
    });

    await Promise.all(tasks);
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

    // FAZ FIX — Aylık toplu yayın (admin veya öğretmen "Yayınla" dediğinde)
    // tek update() çağrısıyla o ayın dolu olan HER günü için ayrı bir kayıt
    // oluşturuyor. Bu da bu onCreate tetikleyicisinin gün sayısı kadar
    // (örn. 10 gün doluysa 10 kez) çalışıp aynı sayıda bildirim atmasına
    // sebep oluyordu. "admin_aylik" kaynaklı kayıtlar için bildirimi burada
    // atlıyoruz; o durumda tek bildirim zaten yayınlayan ekranın kendisi
    // (AdminMonthlyMealScreen / TeacherMealsScreen) tarafından bir kez
    // gönderiliyor. Tekil (örn. öğretmenin günlük girdiği) kayıtlar için
    // bu tetikleyici olduğu gibi çalışmaya devam eder.
    if (meal.kaynak === 'admin_aylik' || meal.kaynak === 'ogretmen_aylik') return null;

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

// `ogunler.{key}` üç şekilde gelebilir: aylık liste artık bir DİZİ (çoklu
// yemek chip'i), öğretmenin günlük ekranı ise `{ text, fotoUrl, ... }`
// objesi — bkz. src/components/MealTodayCard.js içindeki `getMealText`.
// Bu fonksiyon hepsini tek bir düz metin dizisine indirger.
function extractMealList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  const trimmed = String(value.text || value.aciklama || '').trim();
  return trimmed ? [trimmed] : [];
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

    // FAZ — Çoklu Etkinlik Girişi: bir gün artık TEK etkinlik değil,
    // `etkinlikler` dizisi (her biri kendi kategori/tema/kazanımlarıyla).
    const afterItems = Array.isArray(after.etkinlikler) ? after.etkinlikler : [];
    if (afterItems.length === 0) return null;

    const beforeItems = before && Array.isArray(before.etkinlikler) ? before.etkinlikler : [];
    // Aynı (isim+kategori) zaten kayıtlıysa (örn. sadece açıklama düzenlendiyse)
    // tekrar saymıyoruz — çift sayım riskini önlüyor.
    const beforeKeySet = new Set(
      beforeItems
        .filter((item) => item && String(item.etkinlik || '').trim())
        .map((item) => `${normalizeActivityName(item.etkinlik)}|${item.kategori || 'diger'}`)
    );

    const kresId = after.kresId || '';

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

    for (const item of afterItems) {
      const activityName = String(item?.etkinlik || '').trim();
      if (!activityName) continue;

      const afterKategori = item.kategori || 'diger';
      const key = `${normalizeActivityName(activityName)}|${afterKategori}`;
      if (before && beforeKeySet.has(key)) continue; // değişmemiş, tekrar sayma

      const slug = slugifyActivityName(activityName);
      if (!slug) continue;

      const tema = item.tema || null;
      const adNormalized = normalizeActivityName(activityName);
      const poolRef = admin.database().ref(`etkinlikHavuzu/${slug}`);
      const metaRef = admin.database().ref(`_etkinlikHavuzuMeta/${slug}`);

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
      // FAZ — Çoklu Yemek Girişi: aylık liste artık öğün başına DİZİ
      // (öğretmenin günlük ekranı hâlâ tekil obje yazabiliyor — extractMealList
      // ikisini de tek bir metin dizisine indirger). Her yemek AYRI sayılır;
      // sadece bu yazımda YENİ eklenen yemekler havuzda artırılır — listede
      // zaten duran bir yemek her kayıtta tekrar sayılmasın diye.
      const afterList = extractMealList(ogunlerAfter[ogun]);
      if (afterList.length === 0) continue;

      const beforeList = extractMealList(ogunlerBefore[ogun]);
      const beforeSet = new Set(beforeList.map((item) => normalizeActivityName(item)));

      for (const metin of afterList) {
        const metinNormalized = normalizeActivityName(metin);
        if (before && beforeSet.has(metinNormalized)) continue; // zaten listedeydi, tekrar sayma

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

// ============================================================
// FAZ 8.1 — İlaç Takip Formu "Hatırlatma Saati"
// Formda opsiyonel bir saat girilebiliyor (ör: "14:30"). Bu zamanlanmış
// fonksiyon her dakika çalışır, o anki İstanbul saatine eşleşen aktif
// formları bulur, öğretmene + veliye bildirim gönderir. Aynı gün için
// tekrar tekrar bildirim gitmesin diye kayitlar/{gün}/hatirlaticiGonderildi
// bayrağı kullanılır.
// ============================================================
function getIstanbulNow() {
  const timeStr = new Date().toLocaleString('en-US', {
    timeZone: 'Europe/Istanbul',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  let [hour, minute] = timeStr.split(':').map((n) => parseInt(n, 10));
  if (hour === 24) hour = 0;
  return {
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    dateKey: dateStr,
  };
}

exports.sendMedicationReminderEveryMinute = functions
  .region('europe-west1')
  .pubsub
  .schedule('every 1 minutes')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const { time: currentTime, dateKey: today } = getIstanbulNow();

    const formsSnap = await admin.database().ref('ilacTakipFormlari').once('value');
    const forms = formsSnap.val() || {};

    const tasks = Object.entries(forms).map(async ([formId, form = {}]) => {
      if (form.aktif === false) return;
      if (!form.hatirlaticiSaat || form.hatirlaticiSaat !== currentTime) return;
      if (!form.cocukId) return;

      const baslangic = form.baslangicTarihi || '';
      const bitis = form.bitisTarihi || '';
      if (baslangic && today < baslangic) return;
      if (bitis && today > bitis) return;

      const alreadySent = form.kayitlar?.[today]?.hatirlaticiGonderildi;
      if (alreadySent) return;

      // Aynı gün için tekrar tetiklenmesin diye önce bayrağı işaretle.
      await admin.database().ref(`ilacTakipFormlari/${formId}/kayitlar/${today}`).update({
        hatirlaticiGonderildi: true,
        hatirlaticiSaatGonderim: currentTime,
      });

      const child = await getChild(form.cocukId);
      const childName = form.cocukAdi || getChildName(child);
      const kresId = form.kresId || child.kresId || '';

      const parentIds = getParentIdsFromChild(child);
      if (parentIds.length) {
        await createNotificationRecord({
          kresId,
          hedefUserIds: parentIds,
          hedefCocukIds: [form.cocukId],
          baslik: '⏰ İlaç saati geldi',
          mesaj: `${childName} için "${form.ilacAdi || 'ilaç'}" verilme saati (${currentTime}) geldi.`,
          tip: 'ilac_takip',
          routeName: 'ParentMedical',
          source: 'ilacTakipFormlari',
          sourceId: formId,
          createdBy: 'cloud-function',
        });
      }

      const sinifId = form.sinifId || child.sinifId;
      if (sinifId) {
        await createNotificationRecord({
          kresId,
          hedefRoller: ['ogretmen'],
          hedefSinifIds: [sinifId],
          baslik: '⏰ İlaç saati geldi',
          mesaj: `${childName} için "${form.ilacAdi || 'ilaç'}" verilme saati (${currentTime}) geldi.`,
          tip: 'ilac_takip',
          routeName: 'TeacherMedicationFormDetail',
          routeParams: { formId },
          source: 'ilacTakipFormlari',
          sourceId: formId,
          createdBy: 'cloud-function',
        });
      }
    });

    await Promise.all(tasks);
    return null;
  });

// ============================================================
// FAZ 18 — Galeri ve yemek fotoğrafları otomatik temizlik
// Galeri/yemek fotoğrafları uygulamada 24 saat sonra zaten gizleniyor
// (client tarafında filtreleniyor). Ama Storage + Realtime DB'de
// kalıcı olarak duruyorlardı. Bu iki zamanlanmış fonksiyon, yüklenmeden
// 48 saat (2 gün) sonra hem Storage dosyalarını hem de ilgili DB
// kayıtlarını temizler.
// ============================================================

const CLEANUP_AFTER_MS = 48 * 60 * 60 * 1000; // 2 gün

async function deleteStorageFileSafe(path) {
  if (!path) return;
  try {
    await admin.storage().bucket().file(path).delete();
  } catch (error) {
    // Dosya zaten silinmişse (404) sorun değil, sessizce geç.
    if (error?.code !== 404 && error?.code !== 'storage/object-not-found') {
      console.warn('Storage dosyası silinemedi:', path, error?.message || error);
    }
  }
}

exports.cleanupExpiredGalleryDaily = functions
  .region('europe-west1')
  .pubsub
  .schedule('every day 04:00')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const now = Date.now();
    const snapshot = await admin.database().ref('galeri').once('value');
    const gallery = snapshot.val() || {};

    const tasks = Object.entries(gallery).map(async ([galleryId, item = {}]) => {
      const createdAt = Number(item.createdAt || 0);
      if (!createdAt || now - createdAt < CLEANUP_AFTER_MS) return;

      const mediaItems = Array.isArray(item.mediaItems)
        ? item.mediaItems
        : Object.values(item.mediaItems || {});

      // Storage'daki tüm medya dosyalarını sil.
      await Promise.all([
        ...mediaItems.map((media) => deleteStorageFileSafe(media?.storagePath)),
        deleteStorageFileSafe(item.storagePath),
      ]);

      // Realtime DB kayıtlarını (ana kayıt + index node'ları) sil.
      const childIds = Array.isArray(item.cocukIds)
        ? item.cocukIds
        : arr(item.cocukIds || item.cocukId || item.studentId);

      await Promise.all([
        admin.database().ref(`galeri/${galleryId}`).remove(),
        item.kresId
          ? admin.database().ref(`kresGalerileri/${item.kresId}/${galleryId}`).remove().catch(() => null)
          : Promise.resolve(),
        (item.classId || item.sinifId)
          ? admin.database().ref(`sinifGalerileri/${item.classId || item.sinifId}/${galleryId}`).remove().catch(() => null)
          : Promise.resolve(),
        ...childIds.map((childId) =>
          admin.database().ref(`cocukGalerileri/${childId}/${galleryId}`).remove().catch(() => null)
        ),
      ]);

      console.log(`Süresi dolan galeri kaydı silindi: ${galleryId}`);
    });

    await Promise.all(tasks);
    return null;
  });

exports.cleanupExpiredMealPhotosDaily = functions
  .region('europe-west1')
  .pubsub
  .schedule('every day 04:15')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const now = Date.now();
    const snapshot = await admin.database().ref('yemekListeleri').once('value');
    const lists = snapshot.val() || {};

    const tasks = [];

    Object.entries(lists).forEach(([listId, item = {}]) => {
      const ogunler = item.ogunler || {};

      Object.entries(ogunler).forEach(([mealKey, meal = {}]) => {
        const fotoPath = meal?.fotoPath;
        if (!fotoPath) return;

        // Fotoğrafın ne zaman yüklendiğini bulmak için önce öğünün
        // kendi updatedAt'ine, o yoksa listenin createdAt'ine bak.
        const uploadedAt = Number(meal.updatedAt || item.createdAt || 0);
        if (!uploadedAt || now - uploadedAt < CLEANUP_AFTER_MS) return;

        tasks.push(
          deleteStorageFileSafe(fotoPath).then(() =>
            admin
              .database()
              .ref(`yemekListeleri/${listId}/ogunler/${mealKey}`)
              .update({ fotoUrl: '', fotoPath: '' })
          )
        );

        console.log(`Süresi dolan yemek fotoğrafı silindi: ${listId}/${mealKey}`);
      });
    });

    await Promise.all(tasks);
    return null;
  });

// ============================================================
// generateDailyAiComments — FAZ 21: AI destekli günlük özet
//
// Öğretmen gün içinde parça parça veri girer (rapor, yemek listesi,
// ders programı, etkinlik, rozet, boy/kilo ölçümü) — bu yüzden "rapor
// kaydedilince" değil, her gün TEK SEFER, Türkiye saatiyle 17:00'de
// çalışır. O ana kadar girilmiş TÜM verileri toplayıp Gemini'ye
// gönderir, veliye gösterilecek doğal bir günlük özet üretir.
//
// Sonuç gunlukRaporlar'a değil, ayrı bir node'a yazılır
// (gunlukYorumlar/{cocukId}/{tarih}) — çünkü rapor hiç girilmemiş
// olsa bile (sadece yemek listesi/program girilmiş olabilir) yine de
// bir özet üretilebilmeli.
//
// Bir çocuk için o gün HİÇBİR veri girilmemişse Gemini'ye hiç
// gidilmez (gereksiz çağrı yapılmaz, ücretsiz kotayı boşa harcamaz).
// Bir çocukta hata olursa diğerlerini etkilemez (try/catch + Promise.all).
// ============================================================

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const GEMINI_SYSTEM_PROMPT = `Sen bir Türk anaokulu/kreş öğretmenisin. Görevin, sana verilen günlük verilere
dayanarak veliye gönderilecek kısa, sıcak, gerçek bir öğretmenin elle yazdığı gibi hissettiren bir günlük
özet yazmak.

Kurallar:
- 2 ila 4 cümle yaz, ne çok kısa ne çok uzun.
- Sade, günlük konuşma diliyle Türkçe yaz; resmi/robotik ifadelerden kaçın.
- Cümle yapısını, açılışı ve kelime seçimini HER SEFERİNDE farklılaştır — art arda gelen özetler
  birbirinin kalıbı gibi durmasın.
- En fazla 2-3 emoji kullan, abartma.
- Sana verilen alan adlarını (mood, durum, tarih vb.) veya ham veriyi olduğu gibi tekrar etme; hepsini
  doğal cümlelere çevir.
- Geçmiş günlerle ilgili bilgi verilmişse, uygun olduğunda kısa bir kıyas yapabilirsin (ör. bu hafta
  genel olarak nasıl geçtiği), ama zorunlu değil — veri azsa kıyas yapma.
- Madde işareti, başlık, markdown kullanma. Sadece düz metin döndür, başka hiçbir açıklama ekleme.`;

function istanbulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

// Yemek listesi / ders programı gibi sınıf bazlı, gün başına tek kayıt
// beklenen belgeler için: kreşi tutan, sınıfa özel olanı sınıf-geneline
// tercih eden, birden fazlaysa en yeni (createdAt) olanı seçen ortak seçici.
function pickBestForChild(list, child) {
  const scoped = list.filter((item) => item.aktif !== false && (!item.kresId || item.kresId === child.kresId));
  const classMatch = scoped.filter((item) => item.sinifId && item.sinifId === child.sinifId);
  const pool = classMatch.length ? classMatch : scoped.filter((item) => !item.sinifId);
  if (!pool.length) return null;
  return pool.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
}

function pickEventsForChild(list, child) {
  return list
    .filter((item) => item.aktif !== false && (!item.kresId || item.kresId === child.kresId))
    .filter((item) => {
      if (Array.isArray(item.sinifIds)) return item.sinifIds.includes(child.sinifId);
      if (item.sinifId) return item.sinifId === child.sinifId;
      return true;
    });
}

const MEAL_DURUM_LABELS = { bitirdi: 'iyi yedi', az_yedi: 'az yedi', yemedi: 'yemedi' };

function formatMealsForPrompt(yemek = {}) {
  const parts = ['kahvalti', 'ogle', 'araOgun']
    .map((key) => {
      const durum = yemek?.[key]?.durum;
      if (!durum) return null;
      const label = { kahvalti: 'Kahvaltı', ogle: 'Öğle', araOgun: 'Ara öğün' }[key];
      return `${label}: ${MEAL_DURUM_LABELS[durum] || durum}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function buildPromptForChild({ child, todayReport, historyReports, todayMeal, todaySchedule, todayEvents, todayBadge, todayGrowth, todayAttendance, todayUyum, todayMedication }) {
  const childName = getChildName(child) || 'Çocuk';
  const lines = [`Çocuğun adı: ${childName}`];

  if (todayAttendance) {
    const durumLabel = { geldi: 'okula geldi', gelmedi: 'okula gelmedi (devamsız)', gec: 'okula geç geldi' }[todayAttendance.durum] || todayAttendance.durum;
    lines.push(`Bugünkü devam durumu: ${durumLabel}`);
    if (todayAttendance.durum === 'gelmedi') {
      lines.push('ÖNEMLİ: Çocuk bugün okula gelmedi. Aşağıdaki diğer bilgileri (varsa) yok say, sadece kısa (1 cümle) "bugün okulda yoktu, yarın görüşmek üzere" tarzı bir not yaz.');
      return lines.join('\n');
    }
  }

  if (todayReport) {
    if (todayReport.ruhHali || todayReport.mood) lines.push(`Bugünkü ruh hali: ${todayReport.ruhHali || todayReport.mood}`);
    const mealText = formatMealsForPrompt(todayReport.yemek);
    if (mealText) lines.push(`Öğün durumu: ${mealText}`);
    if (todayReport.uyku?.sure) lines.push(`Uyku süresi: ${todayReport.uyku.sure} saat`);
    if (todayReport.tuvalet?.sayi) lines.push(`Tuvalet sayısı: ${todayReport.tuvalet.sayi}`);
    if (todayReport.not) lines.push(`Öğretmenin serbest notu: "${todayReport.not}"`);
  } else {
    lines.push('Bugün için öğretmen henüz günlük rapor girmedi.');
  }

  if (todayMeal?.ogunler) {
    const menu = ['kahvalti', 'ogle', 'araOgun']
      .map((key) => todayMeal.ogunler[key])
      .filter(Boolean)
      .join(', ');
    if (menu) lines.push(`Bugünün kurum yemek menüsü: ${menu}`);
  }

  const scheduleTitle = todaySchedule?.etkinlik || todaySchedule?.baslik;
  if (scheduleTitle) lines.push(`Bugünkü ders programı: ${scheduleTitle}`);

  if (todayEvents.length) {
    lines.push(`Bugünkü etkinlik(ler): ${todayEvents.map((e) => e.baslik).filter(Boolean).join(', ')}`);
  }

  if (todayBadge) {
    lines.push(`Bugün "Haftanın Yıldızı" rozeti aldı: ${todayBadge.badgeTitle || todayBadge.rozetAdi || ''}`.trim());
  }

  if (todayGrowth) {
    const growthParts = [];
    if (todayGrowth.boy) growthParts.push(`boy: ${todayGrowth.boy} cm`);
    if (todayGrowth.kilo) growthParts.push(`kilo: ${todayGrowth.kilo} kg`);
    if (todayGrowth.basCevresi) growthParts.push(`baş çevresi: ${todayGrowth.basCevresi} cm`);
    if (growthParts.length) lines.push(`Bugün gelişim ölçümü yapıldı (${growthParts.join(', ')})`);
  }

  if (todayUyum) {
    const uyumParts = [];
    if (todayUyum.gunNo) uyumParts.push(`uyum sürecinin ${todayUyum.gunNo}. günü`);
    if (todayUyum.sabahDurumu) uyumParts.push(`sabah durumu: ${todayUyum.sabahDurumu}`);
    if (todayUyum.aglamaDakika) uyumParts.push(`ağlama: ${todayUyum.aglamaDakika} dk`);
    if (todayUyum.yemekDurumu) uyumParts.push(`yemek: ${todayUyum.yemekDurumu}`);
    if (todayUyum.oyunDurumu) uyumParts.push(`oyun: ${todayUyum.oyunDurumu}`);
    if (todayUyum.cikisDurumu) uyumParts.push(`çıkış: ${todayUyum.cikisDurumu}`);
    if (uyumParts.length) lines.push(`Uyum takibi (${uyumParts.join(', ')})`);
    if (todayUyum.ogretmenNotu) lines.push(`Uyum takibi öğretmen notu: "${todayUyum.ogretmenNotu}"`);
  }

  if (todayMedication) {
    lines.push(`Bugün ilacı verildi: ${todayMedication.ilacAdi}${todayMedication.saat ? ` (saat ${todayMedication.saat})` : ''}`);
  }

  const recentHistory = historyReports.slice(-7);
  if (recentHistory.length) {
    const historyLines = recentHistory.map((r) => {
      const mealText = formatMealsForPrompt(r.yemek);
      const bits = [r.ruhHali || r.mood, mealText].filter(Boolean).join(' / ');
      return `${r.tarih}: ${bits || 'veri az'}`;
    });
    lines.push(`Son günlerin özeti (kıyaslamak istersen kullanabilirsin):\n${historyLines.join('\n')}`);
  }

  return lines.join('\n');
}

async function callGemini(promptText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY tanımlı değil (Firebase secret eksik).');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 220 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API hata ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) throw new Error('Gemini boş yanıt döndü.');
  return text;
}

exports.generateDailyAiComments = functions
  .region('europe-west1')
  .runWith({ secrets: ['GEMINI_API_KEY'], timeoutSeconds: 300 })
  .pubsub
  .schedule('every day 17:00')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const todayKey = istanbulDateKey();
    const historyCutoff = istanbulDateKey(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000));

    const [childrenSnap, reportsSnap, mealsSnap, schedulesSnap, eventsSnap, badgesSnap, growthSnap, attendanceSnap, uyumSnap, medicationSnap] = await Promise.all([
      admin.database().ref('cocuklar').once('value'),
      admin.database().ref('gunlukRaporlar').orderByChild('tarih').startAt(historyCutoff).endAt(todayKey).once('value'),
      admin.database().ref('yemekListeleri').orderByChild('tarih').equalTo(todayKey).once('value'),
      admin.database().ref('dersProgramlari').orderByChild('tarih').equalTo(todayKey).once('value'),
      admin.database().ref('etkinlikler').orderByChild('tarih').equalTo(todayKey).once('value'),
      admin.database().ref('haftaninRozetleri').once('value'),
      admin.database().ref('fizikselGelisim').orderByChild('tarih').equalTo(todayKey).once('value'),
      admin.database().ref('yoklamalar').orderByChild('tarih').equalTo(todayKey).once('value'),
      admin.database().ref('uyumKayitlari').orderByChild('tarih').equalTo(todayKey).once('value'),
      admin.database().ref('ilacTakipFormlari').once('value'),
    ]);

    const children = childrenSnap.val() || {};
    const allReports = Object.values(reportsSnap.val() || {});
    const todayMeals = Object.values(mealsSnap.val() || {});
    const todaySchedules = Object.values(schedulesSnap.val() || {});
    const todayEventsAll = Object.values(eventsSnap.val() || {});
    const allBadges = Object.values(badgesSnap.val() || {});
    const todayGrowths = Object.values(growthSnap.val() || {});
    const todayAttendanceAll = Object.values(attendanceSnap.val() || {});
    const todayUyumAll = Object.values(uyumSnap.val() || {});
    const allMedicationForms = Object.values(medicationSnap.val() || {});

    const tasks = Object.entries(children).map(async ([childId, child = {}]) => {
      try {
        const childReports = allReports.filter((r) => (r.cocukId || r.childId) === childId);
        const todayReport = childReports.find((r) => r.tarih === todayKey) || null;
        const historyReports = childReports
          .filter((r) => r.tarih && r.tarih !== todayKey)
          .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));

        const todayMeal = pickBestForChild(todayMeals, child);
        const todaySchedule = pickBestForChild(todaySchedules, child);
        const todayEvents = pickEventsForChild(todayEventsAll, child);
        const todayGrowth = todayGrowths.find((g) => g.cocukId === childId) || null;
        const todayBadge = allBadges.find((b) => b.cocukId === childId && istanbulDateKey(new Date(b.createdAt || 0)) === todayKey) || null;
        const todayAttendance = todayAttendanceAll.find((a) => a.cocukId === childId) || null;
        const todayUyum = todayUyumAll.find((u) => u.cocukId === childId) || null;
        const todayMedForm = allMedicationForms.find((m) => m.cocukId === childId && m.aktif !== false && m.kayitlar?.[todayKey]?.verildi);
        const todayMedication = todayMedForm
          ? { ilacAdi: todayMedForm.ilacAdi, saat: todayMedForm.kayitlar[todayKey].saat }
          : null;

        const hasAnyData = !!todayReport || !!todayMeal || !!todaySchedule || todayEvents.length > 0 || !!todayBadge
          || !!todayGrowth || !!todayAttendance || !!todayUyum || !!todayMedication;
        if (!hasAnyData) return;

        const promptText = buildPromptForChild({
          child,
          todayReport,
          historyReports,
          todayMeal,
          todaySchedule,
          todayEvents,
          todayBadge,
          todayGrowth,
          todayAttendance,
          todayUyum,
          todayMedication,
        });

        const yorum = await callGemini(promptText);

        await admin.database().ref(`gunlukYorumlar/${childId}/${todayKey}`).set({
          yorum,
          cocukId: childId,
          kresId: child.kresId || '',
          tarih: todayKey,
          model: GEMINI_MODEL,
          createdAt: admin.database.ServerValue.TIMESTAMP,
        });
      } catch (err) {
        console.error(`generateDailyAiComments — çocuk ${childId} için hata:`, err && err.message ? err.message : err);
      }
    });

    await Promise.all(tasks);
    return null;
  });
