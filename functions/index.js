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

async function getParentIdsForChildIds(childIds = []) {
  const ids = unique(childIds);
  if (!ids.length) return [];

  const parentIds = [];
  await Promise.all(ids.map(async (childId) => {
    const snap = await admin.database().ref(`cocuklar/${childId}`).once('value');
    const child = snap.val() || {};
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

    const childSnap = await admin.database().ref(`cocuklar/${childId}`).once('value');
    const child = childSnap.val() || {};
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

    const childSnap = await admin.database().ref(`cocuklar/${childId}`).once('value');
    const child = childSnap.val() || {};
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
