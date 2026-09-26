// ============================================================
// YUMURCAK — constants.js
// Renkler, Firebase URL ve uygulama sabitleri
// FAZ 13: SUPERADMIN rolü eklendi
// ============================================================

export const DB_URL = 'https://yumurcak-app-default-rtdb.europe-west1.firebasedatabase.app';

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
  SUPERADMIN: 'superadmin',
  YONETICI:   'yonetici',
  OGRETMEN:   'ogretmen',
  VELI:       'veli',
  SERVISCI:   'servisci',
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
// YAŞ GRUPLARI (sınıf yaş grubu — standart liste, FAZ 7 kapsamında
// serbest metinden buraya taşındı: etkinlik havuzunda kreşler arası
// tutarsız yazım yüzünden yaş grubu eşleşmesi çalışmıyordu)
// ============================================================
export const YAS_GRUPLARI = [
  { key: '0-1',  label: '0-1 Yaş' },
  { key: '1-2',  label: '1-2 Yaş' },
  { key: '2-3',  label: '2-3 Yaş' },
  { key: '3-4',  label: '3-4 Yaş' },
  { key: '4-5',  label: '4-5 Yaş' },
  { key: '5-6',  label: '5-6 Yaş' },
  { key: 'karma', label: 'Karma (Farklı Yaşlar)' },
];

// ============================================================
// ETKİNLİK KATEGORİLERİ (FAZ 7 — Etkinlik Kütüphanesi)
// Not: label alanı geriye dönük uyumluluk ve t() erişimi olmayan yerler
// için sabit Türkçe olarak duruyor (bkz. weeklyBadges.js'teki AYNI desen).
// Ekranlarda bunun yerine getTranslatedEtkinlikKategorileri(t) kullanılmalı.
// ============================================================
export const ETKINLIK_KATEGORILERI = [
  { key: 'sanat',      label: 'Sanat',      emoji: '🎨' },
  { key: 'muzik',      label: 'Müzik',      emoji: '🎵' },
  { key: 'hareket',    label: 'Hareket',    emoji: '🏃' },
  { key: 'fen',        label: 'Fen',        emoji: '🧪' },
  { key: 'dil',        label: 'Dil',        emoji: '📖' },
  { key: 'drama',      label: 'Drama',      emoji: '🎭' },
  { key: 'matematik',  label: 'Matematik',  emoji: '🔢' },
  { key: 'diger',      label: 'Diğer',      emoji: '✨' },
];

export function getTranslatedEtkinlikKategorileri(t) {
  return ETKINLIK_KATEGORILERI.map((kat) => ({
    ...kat,
    label: t ? t(`constants.categories.${kat.key}`, kat.label) : kat.label,
  }));
}

// ============================================================
// ETKİNLİK TEMALARI (opsiyonel, FAZ 7)
// ============================================================
export const ETKINLIK_TEMALARI = [
  { key: 'sonbahar',        label: 'Sonbahar' },
  { key: 'kis',              label: 'Kış' },
  { key: 'ilkbahar',        label: 'İlkbahar' },
  { key: 'yaz',              label: 'Yaz' },
  { key: '23nisan',          label: '23 Nisan' },
  { key: '29ekim',           label: '29 Ekim' },
  { key: 'annelergunu',      label: 'Anneler Günü' },
  { key: 'babalargunu',      label: 'Babalar Günü' },
  { key: 'yerlimalihaftasi', label: 'Yerli Malı Haftası' },
];

// ============================================================
// DUYURU ŞABLONLARI (FAZ 9 — Öğretmen Verimlilik Araçları)
// Her şablon: sabit metin + {degisken} yer tutucuları içeren
// başlık/mesaj kalıbı ve doldurulması gereken alan listesi.
// AnnouncementTemplatePicker bu alanları forma çevirip kullanıcı
// doldurunca {degisken}'leri gerçek değerle değiştirir.
// ============================================================
export const DUYURU_SABLONLARI = [
  {
    key: 'aidat',
    label: 'Aidat',
    icon: '💳',
    alanlar: [
      { key: 'donem', label: 'Dönem (Ay/Yıl)', placeholder: 'Örn: Ağustos 2026' },
      { key: 'tutar', label: 'Tutar (TL)', placeholder: 'Örn: 3.500' },
      { key: 'sonOdeme', label: 'Son Ödeme Tarihi', placeholder: 'GG.AA.YYYY' },
    ],
    baslikSablonu: '{donem} Ayı Aidat Bilgilendirmesi',
    mesajSablonu:
      'Değerli velimiz, {donem} ayına ait aidat tutarı {tutar} TL\'dir. ' +
      'Son ödeme tarihi {sonOdeme} olup, ödemenizi bu tarihe kadar yapmanızı rica ederiz.',
  },
  {
    key: 'toplanti',
    label: 'Toplantı',
    icon: '🗓️',
    alanlar: [
      { key: 'konu', label: 'Toplantı Konusu', placeholder: 'Örn: Dönem Sonu Değerlendirme' },
      { key: 'tarih', label: 'Tarih', placeholder: 'GG.AA.YYYY' },
      { key: 'saat', label: 'Saat', placeholder: 'Örn: 17:30' },
      { key: 'yer', label: 'Yer', placeholder: 'Örn: Kreş Bahçesi / Zoom' },
    ],
    baslikSablonu: '{konu} - Veli Toplantısı',
    mesajSablonu:
      'Sayın velimiz, {tarih} tarihinde saat {saat}\'de {yer} adresinde ' +
      '"{konu}" konulu toplantımız gerçekleştirilecektir. Katılımınızı rica ederiz.',
  },
  {
    key: 'tatil',
    label: 'Tatil',
    icon: '🏖️',
    alanlar: [
      { key: 'sebep', label: 'Tatil Sebebi', placeholder: 'Örn: Kurban Bayramı' },
      { key: 'baslangic', label: 'Başlangıç Tarihi', placeholder: 'GG.AA.YYYY' },
      { key: 'bitis', label: 'Bitiş Tarihi', placeholder: 'GG.AA.YYYY' },
    ],
    baslikSablonu: '{sebep} Tatili Bilgilendirmesi',
    mesajSablonu:
      'Değerli velimiz, kurumumuz {sebep} nedeniyle {baslangic} - {bitis} ' +
      'tarihleri arasında kapalı olacaktır. İyi tatiller dileriz.',
  },
  {
    key: 'bilgilendirme',
    label: 'Veli Bilgilendirmesi',
    icon: '📌',
    alanlar: [
      { key: 'konu', label: 'Konu Başlığı', placeholder: 'Örn: Kıyafet Hatırlatması' },
      { key: 'aciklama', label: 'Açıklama', placeholder: 'Velilere iletilecek bilgi', textArea: true },
      { key: 'tarih', label: 'Tarih (opsiyonel)', placeholder: 'GG.AA.YYYY', optional: true },
    ],
    baslikSablonu: '{konu}',
    mesajSablonu: 'Değerli velimiz, {aciklama}',
  },
];

// ============================================================
// KAZANIM ÖNERİLERİ (FAZ 10 — Hazır Kazanımlar)
// Sabit, hazır kazanım etiketleri — öğretmen bunlardan seçer veya
// kendi metnini elle ekler. Kazanımlar dersProgramlari kaydına
// 'kazanimlar' (string dizisi) olarak yazılır — bu Türkçe metinler
// CANONICAL/depolanan değerlerdir, değiştirilmemeli (mevcut kayıtlarla
// eşleşme burada kırılır). Ekranda gösterilen etiket için bunun yerine
// getTranslatedKazanimOnerileri(t) kullanılmalı — her öğe {value, label}
// döner; value hep bu Türkçe metin (DB'ye yazılan/kontrol edilen), label
// görüntülenen çeviridir.
// ============================================================
export const KAZANIM_ONERILERI = [
  'İnce Motor',
  'Kaba Motor',
  'El-Göz Koordinasyonu',
  'Renk Algısı',
  'Şekil Algısı',
  'Yaratıcılık',
  'Dil Gelişimi',
  'Kelime Dağarcığı',
  'Sosyal Beceri',
  'Duygusal Gelişim',
  'Dikkat / Odaklanma',
  'Problem Çözme',
  'Sayı Kavramı',
  'Grup İçinde Uyum',
  'Öz Bakım Becerisi',
  'Denge ve Koordinasyon',
];

const KAZANIM_KEY_MAP = {
  'İnce Motor': 'inceMotor',
  'Kaba Motor': 'kabaMotor',
  'El-Göz Koordinasyonu': 'elGozKoordinasyonu',
  'Renk Algısı': 'renkAlgisi',
  'Şekil Algısı': 'sekilAlgisi',
  'Yaratıcılık': 'yaraticilik',
  'Dil Gelişimi': 'dilGelisimi',
  'Kelime Dağarcığı': 'kelimeDagarcigi',
  'Sosyal Beceri': 'sosyalBeceri',
  'Duygusal Gelişim': 'duygusalGelisim',
  'Dikkat / Odaklanma': 'dikkatOdaklanma',
  'Problem Çözme': 'problemCozme',
  'Sayı Kavramı': 'sayiKavrami',
  'Grup İçinde Uyum': 'grupIcindeUyum',
  'Öz Bakım Becerisi': 'ozBakimBecerisi',
  'Denge ve Koordinasyon': 'dengeVeKoordinasyon',
};

export function getTranslatedKazanimOnerileri(t) {
  return KAZANIM_ONERILERI.map((value) => ({
    value,
    label: t ? t(`constants.kazanimlar.${KAZANIM_KEY_MAP[value]}`, value) : value,
  }));
}

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
