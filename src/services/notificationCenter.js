import { get, onValue, push, ref, serverTimestamp, update } from 'firebase/database';
import { database } from '../config/firebase';
import { sendNotification } from '../utils/notifications';

const PATH = 'bildirimler';

export function getUserKey(kullanici) {
  return kullanici?.uid || kullanici?.id || kullanici?.authUid || '';
}

function arr(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'object') return Object.keys(value).filter((key) => value[key]).map(String);
  return [String(value)];
}

function cleanObject(value = {}) {
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (item !== undefined && item !== null && item !== '') acc[key] = item;
    return acc;
  }, {});
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

function item(id, data = {}) {
  return {
    id,
    ...data,
    baslik: data.baslik || data.title || 'Bildirim',
    mesaj: data.mesaj || data.aciklama || '',
    tip: data.tip || 'genel',
    routeName: data.routeName || data.hedefEkran || '',
    routeParams: data.routeParams || {},
    createdAt: Number(data.createdAt || data.tarih || 0),
    okunduBy: data.okunduBy || {},
  };
}

export function visibleToUser(bildirim, kullanici = {}) {
  const userKey = getUserKey(kullanici);
  const authKey = kullanici?.authUid || '';
  const role = kullanici?.rol || '';
  const kresId = kullanici?.kresId || '';
  const sinifId = kullanici?.sinifId || '';

  if (bildirim.kresId && kresId && bildirim.kresId !== kresId) return false;

  const userIds = [...arr(bildirim.hedefUserIds), ...arr(bildirim.kullaniciIds)];
  if (userIds.length) return userIds.includes(String(userKey)) || (authKey && userIds.includes(String(authKey)));

  const roles = [...arr(bildirim.hedefRol), ...arr(bildirim.hedefRoller)];
  if (roles.length && !roles.includes('all') && !roles.includes('herkes') && !roles.map(normalizeRole).includes(normalizeRole(role))) return false;

  const sinifIds = [...arr(bildirim.hedefSinifIds), ...arr(bildirim.sinifIds)];
  if (sinifIds.length && sinifId && !sinifIds.includes(String(sinifId))) return false;

  return true;
}

export function isRead(bildirim, kullanici = {}) {
  const userKey = getUserKey(kullanici);
  const authKey = kullanici?.authUid || '';
  return !!bildirim?.okunduBy?.[userKey] || (authKey ? !!bildirim?.okunduBy?.[authKey] : false);
}

export function listenNotifications(kullanici, callback) {
  return onValue(ref(database, PATH), (snap) => {
    const data = snap.val() || {};
    const list = Object.entries(data)
      .map(([id, value]) => item(id, value))
      .filter((n) => visibleToUser(n, kullanici))
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    callback(list);
  });
}

async function getTargetPushTokens(payload = {}) {
  const usersSnap = await get(ref(database, 'kullanicilar'));
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

  return unique(tokens);
}

export async function sendPushForNotification(notificationId, payload = {}) {
  try {
    const tokens = await getTargetPushTokens(payload);
    if (!tokens.length) return;

    const title = payload.baslik || payload.title || 'Bildirim';
    const body = payload.mesaj || payload.aciklama || '';
    const data = {
      notificationId,
      tip: payload.tip || 'genel',
      routeName: payload.routeName || '',
      routeParams: payload.routeParams || {},
    };

    await Promise.all(tokens.map((token) => sendNotification(token, title, body, data)));
  } catch (error) {
    console.warn('Push bildirim gönderilemedi:', error?.message || error);
  }
}

export async function createNotification(payload = {}) {
  const now = Date.now();
  const data = cleanObject({
    baslik: payload.baslik || payload.title || 'Bildirim',
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
    createdBy: payload.createdBy || '',
    createdAt: now,
    serverCreatedAt: serverTimestamp(),
    okunduBy: {},
  });

  const notificationRef = await push(ref(database, PATH), data);
  await sendPushForNotification(notificationRef.key, data);
  return notificationRef.key;
}

export async function createRoleNotification({ kresId, role, roles, baslik, mesaj, tip, routeName, routeParams, createdBy }) {
  return createNotification({
    kresId,
    hedefRol: role,
    hedefRoller: roles,
    baslik,
    mesaj,
    tip,
    routeName,
    routeParams,
    createdBy,
  });
}

export async function createUserNotification({ kresId, userIds, baslik, mesaj, tip, routeName, routeParams, createdBy }) {
  const ids = arr(userIds).filter(Boolean);
  if (!ids.length) return;

  return createNotification({
    kresId,
    hedefUserIds: ids,
    baslik,
    mesaj,
    tip,
    routeName,
    routeParams,
    createdBy,
  });
}

export async function readNotification(id, kullanici = {}) {
  const userKey = getUserKey(kullanici);
  if (!id || !userKey) return;
  await update(ref(database, `${PATH}/${id}/okunduBy`), { [userKey]: true });
}

export async function readAllNotifications(list = [], kullanici = {}) {
  const userKey = getUserKey(kullanici);
  if (!userKey || !list.length) return;
  const updates = {};
  list.forEach((n) => {
    updates[`${PATH}/${n.id}/okunduBy/${userKey}`] = true;
  });
  await update(ref(database), updates);
}

export function iconFor(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('mesaj')) return '💬';
  if (t.includes('duyuru')) return '📢';
  if (t.includes('odeme') || t.includes('ödeme')) return '💳';
  if (t.includes('rapor')) return '📋';
  if (t.includes('yoklama')) return '✅';
  if (t.includes('galeri')) return '🖼️';
  if (t.includes('zil')) return '🔔';
  if (t.includes('etkinlik')) return '🎉';
  if (t.includes('medikal')) return '🩺';
  return '🔔';
}
