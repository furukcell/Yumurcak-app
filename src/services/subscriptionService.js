// ============================================================
// YUMURCAK — subscriptionService.js
// Abonelik kayıtlarını okuma/yazma için ortak servis.
// AdminSubscriptionScreen.js (tenant, Google Play satın alma) VE
// SuperAdminSubscriptionsScreen.js (manuel/IBAN tanımlama) buradan kullanır.
// ============================================================
import { get, onValue, push, ref, set } from 'firebase/database';
import { database } from '../config/firebase';
import { REVENUECAT_ENTITLEMENT_ID } from './revenueCat';

export const PACKAGE_TIERS = [
  {
    id: 'baslangic',
    title: 'Başlangıç',
    range: '0 - 30 öğrenci',
    minStudent: 0,
    maxStudent: 30,
    monthly: 1000,
    yearly: 10000,
    desc: 'Küçük kreşler için ideal başlangıç paketi.',
    badge: 'Ekonomik',
    color: '#20B45B',
  },
  {
    id: 'profesyonel',
    title: 'Profesyonel',
    range: '31 - 50 öğrenci',
    minStudent: 31,
    maxStudent: 50,
    monthly: 1500,
    yearly: 15000,
    desc: 'Büyüyen kurumlar için dengeli paket.',
    badge: 'Önerilen',
    color: '#6C3DEB',
    featured: true,
  },
  {
    id: 'kurum',
    title: 'Kurum',
    range: '51 - 100 öğrenci',
    minStudent: 51,
    maxStudent: 100,
    monthly: 3000,
    yearly: 30000,
    desc: 'Yoğun kullanımlı büyük kreşler için.',
    badge: 'Büyük Kreş',
    color: '#C98A00',
  },
];

// Manuel/IBAN abonelikler için ayrı kaynak değeri.
// database.rules.json içinde bu değer sadece superadmin tarafından yazılabilir.
export const MANUAL_SOURCE = 'manuel_iban';

export function getTierById(id) {
  return PACKAGE_TIERS.find((tier) => tier.id === id) || PACKAGE_TIERS[0];
}

export function getSuggestedTier(studentCount) {
  return PACKAGE_TIERS.find((tier) => studentCount <= tier.maxStudent) || null;
}

export function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('tr-TR')} TL`;
}

export function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function toDateStr(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// period: 'aylik' | 'yillik' | 'ozel'
// customEndDate sadece period === 'ozel' iken kullanılır (Date objesi veya 'YYYY-MM-DD' string)
export function computeEndDate(period, customEndDate = null, fromDate = new Date()) {
  if (period === 'ozel' && customEndDate) {
    return typeof customEndDate === 'string' ? customEndDate : toDateStr(customEndDate);
  }
  const months = period === 'yillik' ? 12 : 1;
  return toDateStr(addMonths(fromDate, months));
}

/**
 * Abonelik kaydını Firebase'e yazar. Hem tenant (RevenueCat/demo/promo)
 * hem superadmin (manuel/IBAN) akışları bu fonksiyonu kullanır.
 */
export async function writeSubscriptionRecord({
  kresId,
  tier,
  selectedPeriod,
  durum,
  source,
  endDate,
  price,
  customerInfo = null,
  rcPackage = null,
  existingSubscription = null,
  manuelNot = '',
  odemeReferansi = '',
  tanimlayanUid = '',
}) {
  if (!kresId) throw new Error('kresId zorunludur.');
  if (!tier) throw new Error('Paket (tier) zorunludur.');

  await set(ref(database, `abonelikler/${kresId}`), {
    kresId,
    plan: durum === 'demo' ? 'demo' : `${tier.id}_${selectedPeriod}`,
    planTier: tier.id,
    planPeriod: durum === 'demo' ? 'demo' : selectedPeriod,
    ogrenciLimiti: tier.maxStudent,
    durum,
    baslangicTarihi: existingSubscription?.baslangicTarihi || toDateStr(new Date()),
    bitisTarihi: endDate,
    demoBitisTarihi: durum === 'demo' ? endDate : '',
    fiyat: price,
    paraBirimi: 'TRY',
    kaynak: source,
    manuelNot: manuelNot || '',
    odemeReferansi: odemeReferansi || '',
    tanimlayanUid: tanimlayanUid || '',
    revenueCatCustomerId: existingSubscription?.revenueCatCustomerId || kresId,
    revenueCatEntitlement: REVENUECAT_ENTITLEMENT_ID,
    revenueCatPackageIdentifier: rcPackage?.identifier || existingSubscription?.revenueCatPackageIdentifier || '',
    revenueCatProductIdentifier:
      rcPackage?.product?.identifier || rcPackage?.product?.productIdentifier || existingSubscription?.revenueCatProductIdentifier || '',
    revenueCatSyncedAt: customerInfo ? Date.now() : existingSubscription?.revenueCatSyncedAt || '',
    createdAt: existingSubscription?.createdAt || Date.now(),
    updatedAt: Date.now(),
  });

  // Ciro/istatistik ekranı için ödeme geçmişi kaydı.
  // Demo (0 TL) kayıtları loglamıyoruz, sadece gerçek ödemeler.
  if (price && Number(price) > 0) {
    await push(ref(database, `odemeGecmisi/${kresId}`), {
      kresId,
      kaynak: source, // 'revenuecat' | 'manuel_iban' | 'manuel_admin' | ...
      tierId: tier.id,
      tierTitle: tier.title,
      period: selectedPeriod,
      fiyat: Number(price),
      paraBirimi: 'TRY',
      odemeReferansi: odemeReferansi || '',
      manuelNot: manuelNot || '',
      tanimlayanUid: tanimlayanUid || '',
      tarih: toDateStr(new Date()),
      createdAt: Date.now(),
    });
  }
}

/**
 * Superadmin manuel/IBAN abonelik tanımlama kısayolu.
 */
export async function activateManualSubscription({
  kresId,
  tierId,
  period, // 'aylik' | 'yillik' | 'ozel'
  customEndDate = null,
  price,
  manuelNot = '',
  odemeReferansi = '',
  tanimlayanUid = '',
  existingSubscription = null,
}) {
  const tier = getTierById(tierId);
  const endDate = computeEndDate(period, customEndDate);
  const finalPrice = price != null && price !== '' ? Number(price) : (period === 'yillik' ? tier.yearly : tier.monthly);

  await writeSubscriptionRecord({
    kresId,
    tier,
    selectedPeriod: period === 'ozel' ? 'ozel' : period,
    durum: 'aktif',
    source: MANUAL_SOURCE,
    endDate,
    price: finalPrice,
    existingSubscription,
    manuelNot,
    odemeReferansi,
    tanimlayanUid,
  });
}

/**
 * Tüm kreşleri + abonelik kayıtlarını birlikte döner (superadmin listesi için).
 */
export async function getAllSubscriptionsWithKresInfo() {
  const [kreslerSnap, abonelikSnap] = await Promise.all([
    get(ref(database, 'kresler')),
    get(ref(database, 'abonelikler')),
  ]);

  const kresler = kreslerSnap.val() || {};
  const abonelikler = abonelikSnap.val() || {};

  return Object.entries(kresler).map(([kresId, kres]) => ({
    kresId,
    ad: kres?.ad || kresId,
    subscription: abonelikler[kresId] || null,
  }));
}

/**
 * Gerçek zamanlı dinleme (opsiyonel, liste ekranı için).
 */
export function subscribeAllSubscriptions(callback) {
  const kreslerRef = ref(database, 'kresler');
  const abonelikRef = ref(database, 'abonelikler');

  let kresler = {};
  let abonelikler = {};

  const emit = () => {
    const list = Object.entries(kresler).map(([kresId, kres]) => ({
      kresId,
      ad: kres?.ad || kresId,
      subscription: abonelikler[kresId] || null,
    }));
    callback(list);
  };

  const unsubKresler = onValue(kreslerRef, (snap) => {
    kresler = snap.val() || {};
    emit();
  });

  const unsubAbonelik = onValue(abonelikRef, (snap) => {
    abonelikler = snap.val() || {};
    emit();
  });

  return () => {
    unsubKresler();
    unsubAbonelik();
  };
}

/**
 * İstatistik ekranı için: tüm ödeme geçmişini kaynak bazında (google/manuel)
 * toplayıp ciro özeti çıkarır. Google Play ciro rakamları, kullanıcı uygulamayı
 * açıp senkronize ettikçe kaydedildiği için RevenueCat panelindeki kesin
 * rakamla küçük farklar gösterebilir — arka planda sessizce yenilenen
 * abonelikler burada anlık yakalanmaz. Kesin Google Play cirosu için
 * RevenueCat dashboard referans alınmalı, buradaki rakam yaklaşık/işletme takibi içindir.
 */
export async function getRevenueSummary({ startDate = null, endDate = null } = {}) {
  const snap = await get(ref(database, 'odemeGecmisi'));
  const data = snap.val() || {};

  let googleTotal = 0;
  let googleCount = 0;
  let manualTotal = 0;
  let manualCount = 0;
  const entries = [];

  Object.entries(data).forEach(([kresId, payments]) => {
    Object.entries(payments || {}).forEach(([paymentId, payment]) => {
      const tarih = payment?.tarih || '';
      if (startDate && tarih < startDate) return;
      if (endDate && tarih > endDate) return;

      const fiyat = Number(payment?.fiyat || 0);
      entries.push({ kresId, paymentId, ...payment });

      if (payment?.kaynak === 'revenuecat') {
        googleTotal += fiyat;
        googleCount += 1;
      } else if (payment?.kaynak === 'manuel_iban' || payment?.kaynak === 'manuel_admin') {
        manualTotal += fiyat;
        manualCount += 1;
      }
    });
  });

  return {
    googleTotal,
    googleCount,
    manualTotal,
    manualCount,
    grandTotal: googleTotal + manualTotal,
    entries: entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
  };
}
