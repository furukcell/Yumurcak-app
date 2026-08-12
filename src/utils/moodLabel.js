// ============================================================
// YUMURCAK — moodLabel.js
// Firebase'e öğretmen tarafından Türkçe yazılan ruh hali
// değerlerini ("Mutlu", "Neşeli", ...) veli tarafında aktif
// dile çevirmek için ortak yardımcı.
//
// Not: constants.js içindeki MOOD_LISTESI öğretmen ekranlarıyla
// da paylaşıldığı için (kapsam dışı) değiştirilmiyor; bu dosya
// sadece veli tarafındaki GÖRÜNTÜLEME metnini çevirir, DB'ye
// yazılan/eşleşen ham değere dokunmaz.
// ============================================================

const TURKISH_CHAR_MAP = {
  ı: 'i',
  İ: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
};

// "Neşeli" -> "neseli", "Üzgün" -> "uzgun" ...
export function moodToKey(rawMood) {
  if (!rawMood) return null;
  return String(rawMood)
    .trim()
    .toLowerCase()
    .replace(/[ışğüöçİŞĞÜÖÇ]/g, (ch) => TURKISH_CHAR_MAP[ch] || ch);
}

// i18n'de moodLabel karşılığı varsa çevrilmiş metni, yoksa ham
// değeri (ya da fallback'i) döndürür. Emoji eşlemesi gibi ham
// Türkçe değere ihtiyaç duyan yerlerde rawMood ayrıca saklanmalı.
export function translateMood(rawMood, t, fallback) {
  const key = moodToKey(rawMood);
  if (!key) return fallback !== undefined ? fallback : rawMood;

  const translated = t(`parent.development.moodLabel.${key}`, { defaultValue: '' });
  if (translated) return translated;

  return rawMood || (fallback !== undefined ? fallback : rawMood);
}
