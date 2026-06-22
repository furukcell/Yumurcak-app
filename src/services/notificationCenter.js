import { onValue, ref, update } from 'firebase/database';
import { database } from '../config/firebase';

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
  if (roles.length && !roles.includes('all') && !roles.includes('herkes') && !roles.includes(String(role))) return false;

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
