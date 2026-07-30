// ============================================================
// YUMURCAK — authHelpers.js
// FAZ 10: Firebase Auth geçiş yardımcıları
// FAZ 11: kullaniciAdiIndex ile login sızıntısı düzeltmesi
// FAZ 12: findUserIdByAuthUid fallback geri eklendi (index'te olmayan
// eski/eşleşmemiş hesaplar için — 'kullanicilar' node'unun rules'ı zaten
// üst seviyede "auth != null" ile açık, bu fallback ek bir sızıntı yaratmıyor)
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

  // Fallback: authKullaniciIndex'te yoksa (eski/eşleşmemiş hesap),
  // tüm kullanicilar node'u taranıp authUid alanına göre aranıyor.
  const usersSnap = await get(ref(database, 'kullanicilar'));
  const users = usersSnap.val() || {};
  const found = Object.entries(users).find(([, user]) => user?.authUid === authUid);

  if (found) {
    const [foundUserId] = found;
    // Bir dahaki sefere fallback'e düşmemek için index'i tamamlıyoruz.
    import('firebase/database').then(({ set: setRef }) => {
      setRef(ref(database, `authKullaniciIndex/${authUid}`), foundUserId).catch(() => {});
    }).catch(() => {});
    return foundUserId;
  }

  return null;
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

  // Önce küçük index (kullaniciAdiIndex/{username}: uid) üzerinden aranıyor.
  const indexSnap = await get(ref(database, `kullaniciAdiIndex/${cleanUsername}`));

  if (indexSnap.exists()) {
    const uid = indexSnap.val();
    const userSnap = await get(ref(database, `kullanicilar/${uid}`));
    if (userSnap.exists()) {
      const user = { uid, id: uid, ...userSnap.val() };
      const recordPassword = normalizeUsername(
        user.sifre ??
        user['şifre'] ??
        user.password ??
        user.parola ??
        user.pass ??
        ''
      );

      if (recordPassword !== cleanPassword) {
        return { status: 'wrong_password', fields: Object.keys(user || {}) };
      }
      if (user.aktif === false) return { status: 'passive' };
      return { status: 'ok', user };
    }
  }

  // Fallback: kullaniciAdiIndex'te yoksa (henüz index'lenmemiş eski hesap),
  // tüm kullanicilar node'u taranıp kullanıcı adına göre aranıyor.
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
