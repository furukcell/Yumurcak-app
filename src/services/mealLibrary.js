// ============================================================
// YUMURCAK — mealLibrary.js
// FAZ 8: Hazır Yemek Önerileri
//
// activityLibrary.js ile AYNI desen: sadece okuma, yazma tamamen
// Cloud Functions tarafında (functions/index.js — updateMealPoolOnMealWrite)
// Admin SDK ile yapılıyor. `yemekHavuzu`'na client asla yazamıyor
// (database.rules.json: ".write": false).
// ============================================================
import { ref, query, orderByChild, startAt, endAt, limitToFirst, get } from 'firebase/database';
import { database } from '../config/firebase';
import { normalizeActivityName } from './activityLibrary';

const NODE_PATH = 'yemekHavuzu';

// Bir öğün türü (kahvalti/ogle/araOgun/ikindi) içinde, daha önce yazılmış
// yemek metinlerinde prefix (baştan eşleşme) araması yapar. Öğün türü ve
// metin, tek bir birleşik alanda (`searchKey = "{ogun}|{metinNormalized}"`)
// indexlendiği için RTDB'nin tek-alan orderByChild kısıtlamasına rağmen
// hem öğüne hem metne göre filtrelemeyi tek sorguda yapabiliyoruz.
export async function searchMealsByPrefix(ogun, searchText, { limit = 8 } = {}) {
  const prefix = normalizeActivityName(searchText);
  if (!ogun || prefix.length < 2) return [];

  const searchPrefix = `${ogun}|${prefix}`;

  try {
    const q = query(
      ref(database, NODE_PATH),
      orderByChild('searchKey'),
      startAt(searchPrefix),
      endAt(`${searchPrefix}\uf8ff`),
      limitToFirst(20)
    );
    const snap = await get(q);
    const data = snap.val() || {};
    const list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
    return list
      .sort((a, b) => (b.toplamKullanim || 0) - (a.toplamKullanim || 0))
      .slice(0, limit);
  } catch (err) {
    console.error('searchMealsByPrefix error', err);
    return [];
  }
}
