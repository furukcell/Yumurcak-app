// ============================================================
// YUMURCAK — authHelpers.js
// FAZ 10: Firebase Auth geçiş yardımcıları
// FAZ 11: kullaniciAdiIndex ile login sızıntısı düzeltmesi
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

  // Fallback: authKullaniciIndex'te yoksa kullaniciAdiIndex üzerinden de bulunamaz
  // (o index username bazlı, authUid bazlı değil). Bu durumda güvenli bir
  // alternatif yok; null dönüyoruz. Bu satıra düşülmesi normalde beklenmez,
  // beklenirse addUserIndexUpdates'te authKullaniciIndex yazımı kontrol edilmeli.
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

  // Artık tüm 'kullanicilar' node'u çekilmiyor. Önce küçük bir index
  // (kullaniciAdiIndex/{username}: uid) üzerinden ilgili kullanıcının
  // id'si bulunuyor, sonra sadece o tek kullanıcı kaydı çekiliyor.
  const indexSnap = await get(ref(database, `kullaniciAdiIndex/${cleanUsername}`));
  if (!indexSnap.exists()) return { status: 'not_found' };

  const uid = indexSnap.val();
  const userSnap = await get(ref(database, `kullanicilar/${uid}`));
  if (!userSnap.exists()) return { status: 'not_found' };

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
