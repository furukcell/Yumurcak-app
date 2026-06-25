export const WEEKLY_BADGES = [
  { id: 'yardimsever_kalp', emoji: '🤝', title: 'Yardımsever Kalp', desc: 'Arkadaşlarına destek oldu.' },
  { id: 'paylasimci_minik', emoji: '🧸', title: 'Paylaşımcı Minik', desc: 'Oyuncaklarını ve materyallerini paylaştı.' },
  { id: 'cesur_yurek', emoji: '🦁', title: 'Cesur Yürek', desc: 'Yeni bir etkinliğe cesaretle katıldı.' },
  { id: 'merakli_kasif', emoji: '🔍', title: 'Meraklı Kaşif', desc: 'Yeni şeyler öğrenmeye merak gösterdi.' },
  { id: 'yaratici_ressam', emoji: '🎨', title: 'Yaratıcı Ressam', desc: 'Sanat etkinliğinde güzel katılım gösterdi.' },
  { id: 'neseli_gunes', emoji: '😊', title: 'Neşeli Güneş', desc: 'Sınıfa pozitif enerji kattı.' },
  { id: 'sorumluluk_sahibi', emoji: '✅', title: 'Sorumluluk Sahibi', desc: 'Kendi eşyalarına ve sınıf düzenine dikkat etti.' },
  { id: 'sabirli_minik', emoji: '🌱', title: 'Sabırlı Minik', desc: 'Sırasını bekledi ve sabır gösterdi.' },
  { id: 'kitap_dostu', emoji: '📚', title: 'Kitap Dostu', desc: 'Hikaye ve kitap saatine ilgi gösterdi.' },
  { id: 'problem_cozucu', emoji: '🧩', title: 'Problem Çözücü', desc: 'Oyunda veya etkinlikte çözüm üretmeye çalıştı.' },
  { id: 'guzel_iletisim', emoji: '💬', title: 'Güzel İletişim', desc: 'Duygularını ve isteklerini güzel ifade etti.' },
  { id: 'katilim_yildizi', emoji: '👏', title: 'Katılım Yıldızı', desc: 'Etkinliklere istekle katıldı.' },
];

export function getWeeklyBadgeById(id) {
  return WEEKLY_BADGES.find((badge) => badge.id === id) || WEEKLY_BADGES[0];
}

export function getMonday(date = new Date()) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const day = target.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  target.setDate(target.getDate() + diff);
  return target;
}

export function getFriday(date = new Date()) {
  const monday = getMonday(date);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday;
}

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekKey(date = new Date()) {
  return toDateKey(getMonday(date));
}

export function getWeekRange(date = new Date()) {
  const start = getMonday(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startKey: toDateKey(start),
    endKey: toDateKey(end),
    label: `${formatShortDate(start)} - ${formatShortDate(end)}`,
  };
}

export function isFriday(date = new Date()) {
  return date.getDay() === 5;
}

export function formatShortDate(dateOrKey) {
  const date = typeof dateOrKey === 'string' ? parseDateKey(dateOrKey) : dateOrKey;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function parseDateKey(key) {
  const parts = String(key || '').split('-');
  if (parts.length !== 3) return null;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildWeeklyBadgeRecordId(weekKey, childId) {
  return `${weekKey}_${childId}`;
}

export function sortWeeklyBadgesNewestFirst(a, b) {
  return String(b.weekKey || b.haftaKey || b.createdAt || '').localeCompare(String(a.weekKey || a.haftaKey || a.createdAt || ''));
}
