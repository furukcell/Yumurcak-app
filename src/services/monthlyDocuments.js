// ============================================================
// YUMURCAK — monthlyDocuments.js
// Aylık, gün-bazlı belgeler (Yemek Listesi, Ders Programı, ileride
// Nöbet Çizelgesi vb.) için ORTAK servis katmanı.
//
// Firestore KULLANILMIYOR — proje Realtime Database üzerinde
// çalıştığı için bu servis de RTDB ile konuşur.
//
// "Tek veri girişi" mantığı burada kurulur:
//   - Bir ay için gün gün taslak doldurulur (local state, ekranda)
//   - "Yayınla" denince o ayın günleri tek seferde DB'ye yazılır,
//     aynı ay/kaynak için önceki yayın pasife alınır (aktif:false)
//   - Veli tarafı sadece aktif kayıtları okur
//   - Aynı kayıtlar hem PDF/önizleme üretimi hem de "bugünün özeti"
//     kartları için tek kaynak olarak kullanılır
// ============================================================
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '../config/firebase';

export const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function getMonthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function getMonthLabel(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function shiftMonth(date, direction) {
  return new Date(date.getFullYear(), date.getMonth() + direction, 1);
}

export function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

// Ayın tüm günlerini üretir. weekday: 0=Pazar .. 6=Cumartesi (JS Date.getDay())
export function getDaysOfMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const total = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: total }, (_, index) => {
    const day = index + 1;
    return {
      day,
      dateKey: `${year}-${pad2(month + 1)}-${pad2(day)}`,
      label: `${pad2(day)} ${MONTH_NAMES[month]}`,
      weekday: new Date(year, month, day).getDay(),
    };
  });
}

export function createInitialValues(days, emptyValueFactory) {
  return days.reduce((acc, day) => {
    acc[day.dateKey] = emptyValueFactory();
    return acc;
  }, {});
}

// Bir node'un (yemekListeleri, dersProgramlari, ...) tamamını tek seferlik okur.
export function fetchNodeSnapshotOnce(nodePath) {
  return new Promise((resolve) => {
    let unsub = null;
    unsub = onValue(
      ref(database, nodePath),
      (snap) => {
        if (unsub) unsub();
        resolve(snap.val() || {});
      },
      () => {
        if (unsub) unsub();
        resolve({});
      }
    );
  });
}

// matchExtra: opsiyonel ek filtre (örn. sınıf bazlı belgelerde sinifId eşleşmesi).
// Verilmezse sadece kresId + ayKey + kaynak bakılır (kurum geneli belgeler için yeterli).
function isSameActivePublication(item, { kresId, monthKey, kaynak, matchExtra }) {
  if (!item) return false;
  if (item.kresId !== kresId) return false;
  if (item.ayKey !== monthKey) return false;
  if (item.kaynak !== kaynak) return false;
  if (item.aktif === false) return false;
  if (typeof matchExtra === 'function' && !matchExtra(item)) return false;
  return true;
}

// snapshotValue verilmişse (zaten dinleniyorsa) tekrar okumadan sayar.
export function countPublished(snapshotValue, filter) {
  return Object.values(snapshotValue || {}).filter((item) => isSameActivePublication(item, filter)).length;
}

// Sınıf bazlı belgeler için kısayol: aynı filtreye sinifId eşleşmesini ekler.
export function forClass(sinifId) {
  return (item) => item?.sinifId === sinifId;
}

// Bir ayı yayınlar: aynı ay/kaynak için eski kayıtları pasife alır,
// içi dolu her gün için yeni bir kayıt yazar. Tek transaction gibi
// tek update() çağrısıyla yapılır.
//
// hasContent(value) -> boolean : o günün taslağı boş mu dolu mu
// buildRecord({ day, value, kresId, monthKey, monthLabel, kaynak, now }) -> DB'ye yazılacak obje
export async function publishMonth({ nodePath, kresId, monthKey, monthLabel, kaynak, days, values, hasContent, buildRecord, matchExtra }) {
  const snapshotValue = await fetchNodeSnapshotOnce(nodePath);
  const updates = {};
  const now = Date.now();

  Object.entries(snapshotValue).forEach(([id, item]) => {
    if (isSameActivePublication(item, { kresId, monthKey, kaynak, matchExtra })) {
      updates[`${nodePath}/${id}/aktif`] = false;
      updates[`${nodePath}/${id}/updatedAt`] = now;
    }
  });

  let publishedCount = 0;
  days.forEach((day) => {
    const value = values[day.dateKey];
    if (!hasContent(value)) return;
    const key = push(ref(database, nodePath)).key;
    updates[`${nodePath}/${key}`] = buildRecord({ day, value, kresId, monthKey, monthLabel, kaynak, now });
    publishedCount += 1;
  });

  if (Object.keys(updates).length === 0) return 0;
  await update(ref(database), updates);
  return publishedCount;
}

export async function unpublishMonth({ nodePath, kresId, monthKey, kaynak, matchExtra }) {
  const snapshotValue = await fetchNodeSnapshotOnce(nodePath);
  const updates = {};
  const now = Date.now();

  Object.entries(snapshotValue).forEach(([id, item]) => {
    if (isSameActivePublication(item, { kresId, monthKey, kaynak, matchExtra })) {
      updates[`${nodePath}/${id}/aktif`] = false;
      updates[`${nodePath}/${id}/updatedAt`] = now;
    }
  });

  if (Object.keys(updates).length === 0) return 0;
  await update(ref(database), updates);
  return Object.keys(updates).length / 2;
}

// "Geçen Ayı Kopyala": önceki ayın yayınlanmış (aktif) kayıtlarını
// gün numarasına göre eşleyip mevcut ayın taslak değerlerine dönüştürür.
// valueMapper(prevRecord) -> bu ayın taslak value şekli
export async function copyFromPreviousMonth({ nodePath, kresId, kaynak, currentMonthDate, days, valueMapper, matchExtra }) {
  const prevDate = shiftMonth(currentMonthDate, -1);
  const prevMonthKey = getMonthKey(prevDate);
  const snapshotValue = await fetchNodeSnapshotOnce(nodePath);
  const prevItemsByDay = {};

  Object.values(snapshotValue).forEach((item) => {
    if (isSameActivePublication(item, { kresId, monthKey: prevMonthKey, kaynak, matchExtra })) {
      const dayNum = Number(String(item.tarih || '').slice(-2));
      if (dayNum) prevItemsByDay[dayNum] = item;
    }
  });

  const nextValues = {};
  let found = 0;
  days.forEach((day) => {
    const prevItem = prevItemsByDay[day.day];
    if (prevItem) {
      nextValues[day.dateKey] = valueMapper(prevItem);
      found += 1;
    }
  });

  return { values: nextValues, prevMonthKey, found };
}
