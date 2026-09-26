const BADGE_DEFS = [
  { id: 'yardimsever_kalp', emoji: '🤝', trTitle: 'Yardımsever Kalp', trDesc: 'Arkadaşlarına destek oldu.' },
  { id: 'paylasimci_minik', emoji: '🧸', trTitle: 'Paylaşımcı Minik', trDesc: 'Oyuncaklarını ve materyallerini paylaştı.' },
  { id: 'cesur_yurek', emoji: '🦁', trTitle: 'Cesur Yürek', trDesc: 'Yeni bir etkinliğe cesaretle katıldı.' },
  { id: 'merakli_kasif', emoji: '🔍', trTitle: 'Meraklı Kaşif', trDesc: 'Yeni şeyler öğrenmeye merak gösterdi.' },
  { id: 'yaratici_ressam', emoji: '🎨', trTitle: 'Yaratıcı Ressam', trDesc: 'Sanat etkinliğinde güzel katılım gösterdi.' },
  { id: 'neseli_gunes', emoji: '😊', trTitle: 'Neşeli Güneş', trDesc: 'Sınıfa pozitif enerji kattı.' },
  { id: 'sorumluluk_sahibi', emoji: '✅', trTitle: 'Sorumluluk Sahibi', trDesc: 'Kendi eşyalarına ve sınıf düzenine dikkat etti.' },
  { id: 'sabirli_minik', emoji: '🌱', trTitle: 'Sabırlı Minik', trDesc: 'Sırasını bekledi ve sabır gösterdi.' },
  { id: 'kitap_dostu', emoji: '📚', trTitle: 'Kitap Dostu', trDesc: 'Hikaye ve kitap saatine ilgi gösterdi.' },
  { id: 'problem_cozucu', emoji: '🧩', trTitle: 'Problem Çözücü', trDesc: 'Oyunda veya etkinlikte çözüm üretmeye çalıştı.' },
  { id: 'guzel_iletisim', emoji: '💬', trTitle: 'Güzel İletişim', trDesc: 'Duygularını ve isteklerini güzel ifade etti.' },
  { id: 'katilim_yildizi', emoji: '👏', trTitle: 'Katılım Yıldızı', trDesc: 'Etkinliklere istekle katıldı.' },
];

// Geriye dönük uyumluluk: t() fonksiyonuna erişimi olmayan yerler (ör. ekran dışı
// yardımcı fonksiyonlar) için sabit Türkçe liste. Ekranlarda bunun yerine
// getTranslatedWeeklyBadges(t) kullanılmalı.
export const WEEKLY_BADGES = BADGE_DEFS.map((b) => ({ id: b.id, emoji: b.emoji, title: b.trTitle, desc: b.trDesc }));

export function getTranslatedWeeklyBadges(t) {
  return BADGE_DEFS.map((b) => ({
    id: b.id,
    emoji: b.emoji,
    title: t ? t(`teacher.weeklyStar.badges.${b.id}.title`, b.trTitle) : b.trTitle,
    desc: t ? t(`teacher.weeklyStar.badges.${b.id}.desc`, b.trDesc) : b.trDesc,
  }));
}

export function getWeeklyBadgeById(id, t) {
  const def = BADGE_DEFS.find((badge) => badge.id === id) || BADGE_DEFS[0];
  return {
    id: def.id,
    emoji: def.emoji,
    title: t ? t(`teacher.weeklyStar.badges.${def.id}.title`, def.trTitle) : def.trTitle,
    desc: t ? t(`teacher.weeklyStar.badges.${def.id}.desc`, def.trDesc) : def.trDesc,
  };
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
