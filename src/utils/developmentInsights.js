// Aylık gelişim raporu için kural bazlı (AI'sız) hesaplama ve yorum motoru.
// ParentDevelopmentScreen.js bu dosyadaki fonksiyonları kullanarak "Aylık gelişim özeti"
// metnini ve ilgili sayısal özetleri üretir. Saf fonksiyonlardır (React'ten bağımsız),
// bu yüzden ekrandan ayrı test edilebilir.

import { isAbsentStatus } from '../screens/parent/parentShared';
import i18n from '../i18n';

// Öğretmen tarafında ChildReportScreen.js, MOOD_LISTESI'ndeki (src/constants.js)
// label değerlerinden birini (örn. "Neşeli") aynen "mood"/"ruhHali" alanına yazıyor.
// Eskiden buradaki liste bu gerçek değerlerle örtüşmüyordu (örn. "iyi", "sakin",
// "huzursuz" hiç kullanılmıyor; "Neşeli", "Hasta", "Sinirli", "Heyecanlı" hiç
// tanınmıyordu) — aşağıdaki liste gerçek MOOD_LISTESI ile birebir eşleşiyor.
// Not: bu obje hâlâ "key -> Türkçe değer" eşlemesi olarak kalıyor (öğretmen
// tarafındaki ham veri Türkçe yazıldığı için), ama ekranda gösterilirken
// i18n.t('parent.development.moodLabel.<key>') üzerinden çevrilebiliyor —
// bkz. getMoodLabel() aşağıda.
export const MOOD_LABELS = {
  mutlu: 'Mutlu',
  neseli: 'Neşeli',
  normal: 'Normal',
  uzgun: 'Üzgün',
  yorgun: 'Yorgun',
  hasta: 'Hasta',
  sinirli: 'Sinirli',
  heyecanli: 'Heyecanlı',
};

export function getMoodLabel(key) {
  return i18n.t(`parent.development.moodLabel.${key}`, { defaultValue: MOOD_LABELS[key] || key });
}

// Yorum motorunda "olumlu"/"olumsuz" gün sayımı için kategori ataması.
// yorgun bilinçli olarak nötr bırakıldı (ne olumlu ne olumsuz sayılıyor).
const POSITIVE_MOODS = ['mutlu', 'neseli', 'heyecanli'];
const NEGATIVE_MOODS = ['uzgun', 'sinirli', 'hasta'];

const MEAL_KEYS = ['kahvalti', 'ogle', 'araOgun'];

// Belirgin/hafif eşikleri: bu sayıların altındaki değişimler yoruma hiç girmiyor,
// gereksiz "değişim yok" doldurma cümlesi üretmemek için.
const THRESHOLDS = {
  attendanceRate: { light: 5, strong: 15 }, // yüzde puan
  moodRate: { light: 5, strong: 15 }, // yüzde puan
  negativeMoodCount: { light: 1, strong: 2 }, // gün sayısı
  sleepMinutes: { light: 5, strong: 15 }, // dakika
  mealRate: { light: 5, strong: 15 }, // yüzde puan
  eventCount: { light: 1, strong: 3 }, // adet
};

// MOOD_LISTESI label'larının doğrudan karşılığı (gerçek veri formatı budur).
const MOOD_KEY_BY_LABEL = {
  mutlu: 'mutlu',
  neşeli: 'neseli',
  normal: 'normal',
  üzgün: 'uzgun',
  yorgun: 'yorgun',
  hasta: 'hasta',
  sinirli: 'sinirli',
  heyecanlı: 'heyecanli',
};

export function normalizeMood(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (!raw) return 'bekleniyor';
  if (MOOD_KEY_BY_LABEL[raw]) return MOOD_KEY_BY_LABEL[raw];
  // Doğrudan eşleşme yoksa (eski/serbest metin veri ihtimaline karşı) esnek arama.
  if (raw.includes('mutlu')) return 'mutlu';
  if (raw.includes('neşeli') || raw.includes('nese')) return 'neseli';
  if (raw.includes('sinirli')) return 'sinirli';
  if (raw.includes('hasta')) return 'hasta';
  if (raw.includes('üzg') || raw.includes('uzg')) return 'uzgun';
  if (raw.includes('yorgun')) return 'yorgun';
  if (raw.includes('heyecan')) return 'heyecanli';
  if (raw.includes('normal')) return 'normal';
  return raw;
}


export function extractSleepHours(item) {
  const value = item?.uyku?.sure || item?.uykuSuresi || item?.uykuSaat || item?.uyku || item?.uykuDurumu;
  if (typeof value === 'number') return value;
  const text = String(value || '').replace(',', '.');
  const match = text.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function isGoodMeal(value) {
  const raw = String(value || '').toLowerCase();
  return raw.includes('bitirdi') || raw.includes('iyi') || raw.includes('yedi') || raw.includes('tamam');
}

export function buildMealStats(reports) {
  return reports.reduce((acc, item) => {
    const yemek = item.yemek || item.yemekDurumu || {};
    MEAL_KEYS.forEach((key) => {
      const raw = yemek?.[key]?.durum || yemek?.[key] || item?.[key];
      if (!raw) return;
      acc.total += 1;
      if (isGoodMeal(raw)) acc.good += 1;
    });
    return acc;
  }, { good: 0, total: 0 });
}

export function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function formatSleep(value) {
  if (!value) return i18n.t('parent.development.noRecord');
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (hours <= 0) return i18n.t('parent.development.minutesShort', { minutes });
  if (minutes <= 0) return i18n.t('parent.development.hoursShort', { hours });
  return i18n.t('parent.development.hoursMinutesShort', { hours, minutes });
}

export function getPhysicalValue(item, key) {
  const value = item?.[key];
  if (typeof value === 'number') return value;
  const text = String(value || '').replace(',', '.');
  const match = text.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function buildDelta(current, previous, key) {
  const now = getPhysicalValue(current, key);
  const before = getPhysicalValue(previous, key);
  if (!now || !before) return i18n.t('parent.development.noPreviousRecord');
  const diff = Number((now - before).toFixed(1));
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `${diff}`;
  return i18n.t('parent.development.noChange');
}

// Filtrelenmiş (o aya ait) ham listelerden tek bir aylık özet objesi üretir.
// Hem mevcut ay hem önceki ay için aynı fonksiyon çağrılır, böylece iki ayın
// sayıları birebir aynı mantıkla hesaplanmış olur ve karşılaştırılabilir.
export function computeMonthlyAggregate({ reports = [], attendance = [], events = [], menuDays = 0 }) {
  const presentDays = attendance.filter((item) => !isAbsentStatus(item.durum || item.status)).length;
  const absentDays = attendance.filter((item) => isAbsentStatus(item.durum || item.status)).length;
  const attendanceTotal = attendance.length;

  const moodCounts = reports.reduce((acc, item) => {
    const key = normalizeMood(item.mood || item.ruhHali || item.durum || item.genelDurum);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0] || ['bekleniyor', 0];
  const positiveMoodDays = POSITIVE_MOODS.reduce((sum, key) => sum + (moodCounts[key] || 0), 0);
  const negativeMoodDays = NEGATIVE_MOODS.reduce((sum, key) => sum + (moodCounts[key] || 0), 0);

  const sleepValues = reports
    .map((item) => extractSleepHours(item))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageSleep = sleepValues.length ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length : 0;

  const mealStats = buildMealStats(reports);

  return {
    reportDays: reports.length,
    presentDays,
    absentDays,
    attendanceTotal,
    moodCounts,
    topMood,
    positiveMoodDays,
    negativeMoodDays,
    averageSleep,
    sleepDays: sleepValues.length,
    mealGoodTotal: mealStats.good,
    mealTotal: mealStats.total,
    menuDays,
    eventCount: events.length,
  };
}

function tierLabel(diff, thresholds) {
  const abs = Math.abs(diff);
  if (abs >= thresholds.strong) return 'strong';
  if (abs >= thresholds.light) return 'light';
  return 'none';
}

// Ay-karşılaştırmalı, kademeli aylık gelişim yorumu üretir.
// current: bu ayın computeMonthlyAggregate() çıktısı (zorunlu)
// previous: önceki ayın computeMonthlyAggregate() çıktısı (yoksa null geçilebilir,
//   bu durumda eski davranışa (sadece o ayı anlatan) otomatik döner)
export function buildMonthlyComment({ childName, current, previous }) {
  const name = String(childName || 'Çocuğunuz').split(' ')[0] || 'Çocuğunuz';
  const parts = [];

  const currentRate = percent(current.presentDays, current.attendanceTotal);
  const previousRate = previous ? percent(previous.presentDays, previous.attendanceTotal) : null;

  // --- Katılım ---
  if (current.attendanceTotal === 0) {
    parts.push(`${name} için bu ay yoklama kaydı henüz yeterli değil.`);
  } else if (previous && previous.attendanceTotal > 0) {
    const diff = currentRate - previousRate;
    const tier = tierLabel(diff, THRESHOLDS.attendanceRate);
    if (tier === 'none') {
      parts.push(currentRate >= 80
        ? `${name} bu ay da geçen aya benzer şekilde düzenli katılım gösterdi.`
        : `${name} için katılım geçen aya göre benzer seyrediyor, takip etmekte fayda var.`);
    } else if (diff > 0) {
      parts.push(tier === 'strong'
        ? `${name} bu ay katılımda belirgin bir artış gösterdi (geçen ay %${previousRate} → bu ay %${currentRate}).`
        : `${name} bu ay geçen aya göre biraz daha düzenli geldi (%${previousRate} → %${currentRate}).`);
    } else {
      parts.push(tier === 'strong'
        ? `Bu ay katılımda geçen aya göre belirgin bir düşüş var (%${previousRate} → %${currentRate}); bir sebebi olup olmadığını kontrol etmekte fayda olabilir.`
        : `Bu ay katılım geçen aya göre biraz azalmış (%${previousRate} → %${currentRate}).`);
    }
  } else if (currentRate >= 80) {
    parts.push(`${name} bu ay kreşe düzenli katılım göstermiş.`);
  } else {
    parts.push(`${name} için bu ay katılım tarafında takip edilmesi gereken birkaç gün görünüyor.`);
  }

  // --- Ruh hali ---
  if (current.reportDays > 0) {
    const moodLabel = MOOD_LABELS[current.topMood?.[0]] || current.topMood?.[0] || 'genel durum';
    let moodSentence = `Ruh hali kayıtlarında en çok "${moodLabel}" öne çıkıyor.`;

    if (previous && previous.reportDays > 0) {
      const negDiff = current.negativeMoodDays - previous.negativeMoodDays;
      const negTier = tierLabel(negDiff, THRESHOLDS.negativeMoodCount);
      if (negTier === 'strong' && negDiff > 0) {
        moodSentence += ` Üzgün/sinirli/hasta gün sayısı geçen aya göre arttı (${previous.negativeMoodDays} → ${current.negativeMoodDays} gün), bunu göz önünde bulundurmak iyi olabilir.`;
      } else if (negTier !== 'none' && negDiff < 0) {
        moodSentence += ` Üzgün/sinirli/hasta gün sayısı geçen aya göre azaldı (${previous.negativeMoodDays} → ${current.negativeMoodDays} gün).`;
      }
    }
    parts.push(moodSentence);
  }

  // --- Yemek ---
  if (current.mealTotal > 0) {
    const currentMealRate = percent(current.mealGoodTotal, current.mealTotal);
    if (previous && previous.mealTotal > 0) {
      const previousMealRate = percent(previous.mealGoodTotal, previous.mealTotal);
      const diff = currentMealRate - previousMealRate;
      const tier = tierLabel(diff, THRESHOLDS.mealRate);
      if (tier === 'strong') {
        parts.push(diff > 0
          ? `Yemek düzeninde geçen aya göre belirgin bir iyileşme var (%${previousMealRate} → %${currentMealRate}).`
          : `Yemek tarafında geçen aya göre bir gerileme görünüyor (%${previousMealRate} → %${currentMealRate}), bazı günlerde destek gerekebilir.`);
      } else if (tier === 'light') {
        parts.push(diff > 0
          ? `Yemek düzeni geçen aya göre biraz daha iyi görünüyor.`
          : `Yemek düzeni geçen aya göre hafif düşüş gösteriyor.`);
      } else {
        parts.push(currentMealRate >= 70
          ? 'Yemek düzeni geçen ay olduğu gibi olumlu seyrediyor.'
          : 'Yemek düzeni geçen aya benzer, bazı günlerde destek gerekebilir.');
      }
    } else {
      parts.push(currentMealRate >= 70 ? 'Yemek düzeni genel olarak olumlu görünüyor.' : 'Yemek tarafında bazı günlerde destek gerekebilir.');
    }
  }

  // --- Uyku ---
  if (current.averageSleep > 0) {
    if (previous && previous.averageSleep > 0) {
      const diffMinutes = Math.round((current.averageSleep - previous.averageSleep) * 60);
      const tier = tierLabel(diffMinutes, THRESHOLDS.sleepMinutes);
      if (tier === 'none') {
        parts.push(`Uyku ortalaması geçen aya benzer, ${formatSleep(current.averageSleep)} civarında.`);
      } else if (diffMinutes > 0) {
        parts.push(`Uyku süresi geçen aya göre ${tier === 'strong' ? 'belirgin şekilde' : 'biraz'} uzadı (${formatSleep(previous.averageSleep)} → ${formatSleep(current.averageSleep)}).`);
      } else {
        parts.push(`Uyku süresi geçen aya göre ${tier === 'strong' ? 'belirgin şekilde' : 'biraz'} kısaldı (${formatSleep(previous.averageSleep)} → ${formatSleep(current.averageSleep)}).`);
      }
    } else {
      parts.push(`Uyku ortalaması ${formatSleep(current.averageSleep)} civarında.`);
    }
  }

  // --- Etkinlik ---
  if (current.eventCount > 0 || (previous && previous.eventCount > 0)) {
    if (previous) {
      const diff = current.eventCount - previous.eventCount;
      const tier = tierLabel(diff, THRESHOLDS.eventCount);
      if (tier === 'none') {
        parts.push(`Bu ay ${current.eventCount} etkinlik kaydı bulunuyor.`);
      } else if (diff > 0) {
        parts.push(`Etkinlik katılımı geçen aya göre arttı (${previous.eventCount} → ${current.eventCount}).`);
      } else {
        parts.push(`Etkinlik katılımı geçen aya göre azaldı (${previous.eventCount} → ${current.eventCount}).`);
      }
    } else {
      parts.push(`Bu ay ${current.eventCount} etkinlik kaydı bulunuyor; sosyal ve sınıf içi katılım takip edilebilir.`);
    }
  }

  return parts.join(' ');
}
