// ============================================================
// YUMURCAK — constants.js
// Renkler, Firebase URL ve uygulama sabitleri
// ============================================================

export const DB_URL = 'https://PROJE-ADINIZ-default-rtdb.firebaseio.com';

// ============================================================
// RENK PALETİ
// ============================================================
export const RENKLER = {
  turuncu:    '#FF6B35',
  mint:       '#4ECDC4',
  sari:       '#FFE66D',
  mor:        '#A855F7',
  pembe:      '#FF6B9D',
  arkaplan:   '#FAFAFA',
  kart:       '#FFFFFF',
  metin:      '#2D3436',
  altMetin:   '#636E72',
  sinir:      '#E8E8E0',
  basari:     '#00B894',
  hata:       '#FF4444',
  uyari:      '#FDCB6E',
};

// ============================================================
// ROL SABİTLERİ
// ============================================================
export const ROLLER = {
  YONETICI:   'yonetici',
  OGRETMEN:   'ogretmen',
  COCUK:      'cocuk',     // veliler bu hesapla girer
};

// ============================================================
// MOOD SEÇENEKLERİ
// ============================================================
export const MOOD_LISTESI = [
  { emoji: '😊', label: 'Mutlu' },
  { emoji: '😄', label: 'Neşeli' },
  { emoji: '😐', label: 'Normal' },
  { emoji: '😢', label: 'Üzgün' },
  { emoji: '😴', label: 'Yorgun' },
  { emoji: '🤒', label: 'Hasta' },
  { emoji: '😠', label: 'Sinirli' },
  { emoji: '🥳', label: 'Heyecanlı' },
];

// ============================================================
// ÖĞÜN TİPLERİ
// ============================================================
export const OGUN_LISTESI = [
  { key: 'kahvalti',  label: 'Kahvaltı',    emoji: '🥐' },
  { key: 'ogle',     label: 'Öğle Yemeği', emoji: '🍽️' },
  { key: 'araOgun',  label: 'Ara Öğün',    emoji: '🍎' },
  { key: 'ikindi',   label: 'İkindi',       emoji: '🥛' },
];

// ============================================================
// YARDIMCI: Zaman formatlama
// ============================================================
export function zamanOncesi(tarih) {
  if (!tarih) return '';
  const fark = Date.now() - tarih;
  const dakika = Math.floor(fark / 60000);
  const saat   = Math.floor(fark / 3600000);
  const gun    = Math.floor(fark / 86400000);
  if (dakika < 1)  return 'Az önce';
  if (dakika < 60) return `${dakika} dk önce`;
  if (saat < 24)   return `${saat} saat önce`;
  return `${gun} gün önce`;
}

// ============================================================
// YARDIMCI: Bugünün tarihi (GG.AA.YYYY)
// ============================================================
export function bugunTarih() {
  return new Date().toLocaleDateString('tr-TR');
}
