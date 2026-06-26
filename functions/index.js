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
