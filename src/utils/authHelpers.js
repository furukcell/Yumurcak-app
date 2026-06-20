// ============================================================
// YUMURCAK — authHelpers.js
// FAZ 10: Firebase Auth geçiş yardımcıları
// ============================================================
import { get, ref } from 'firebase/database';
import { database } from '../config/firebase';

export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function usernameToEmail(username) {
  const clean = normalizeUsername(username);
  if (clean.includes('@')) return clean;

  const safe = clean
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9._-]/g, '');

  return `${safe || 'kullanici'}@yumurcak.local`;
}

export async function findUserIdByAuthUid(authUid) {
  if (!authUid) return null;

  const indexSnap = await get(ref(database, `authKullaniciIndex/${authUid}`));
  if (indexSnap.exists()) return indexSnap.val();

  const usersSnap = await get(ref(database, 'kullanicilar'));
  const users = usersSnap.val() || {};
  const found = Object.entries(users).find(([, user]) => user?.authUid === authUid);
  return found ? found[0] : null;
}

export async function getKresForUser(userData) {
  if (!userData?.kresId) return null;
  const kresSnap = await get(ref(database, `kresler/${userData.kresId}`));
  if (!kresSnap.exists()) return null;
  return { id: userData.kresId, ...kresSnap.val() };
}

export async function findLegacyUserByUsernameAndPassword(username, password) {
  const cleanUsername = normalizeUsername(username);
  const cleanPassword = normalizeUsername(password);

  const usersSnap = await get(ref(database, 'kullanicilar'));
  const users = usersSnap.val() || {};

  const list = Object.entries(users).map(([uid, user]) => ({ uid, id: uid, ...user }));

  const sameUsername = list.filter((user) => {
    const recordUsername = normalizeUsername(
      user.kullaniciAdi ??
      user.kullanici_adi ??
      user.username ??
      user.userName ??
      ''
    );
    return recordUsername === cleanUsername;
  });

  if (sameUsername.length === 0) return { status: 'not_found' };

  const matched = sameUsername.find((user) => {
    const recordPassword = normalizeUsername(
      user.sifre ??
      user['şifre'] ??
      user.password ??
      user.parola ??
      user.pass ??
      ''
    );
    return recordPassword === cleanPassword;
  });

  if (!matched) return { status: 'wrong_password', fields: Object.keys(sameUsername[0] || {}) };

  if (matched.aktif === false) return { status: 'passive' };

  return { status: 'ok', user: matched };
}
