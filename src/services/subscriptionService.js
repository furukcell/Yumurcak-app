// ============================================================
// YUMURCAK — subscriptionService.js
// Abonelik kayıtlarını okuma/yazma için ortak servis.
// AdminSubscriptionScreen.js (tenant, Google Play satın alma) VE
// SuperAdminSubscriptionsScreen.js (manuel/IBAN tanımlama) buradan kullanır.
// ============================================================
import { get, onValue, ref, set } from 'firebase/database';
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
