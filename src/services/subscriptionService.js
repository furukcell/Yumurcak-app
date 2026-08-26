// ============================================================
// YUMURCAK — subscriptionService.js
// Abonelik kayıtlarını okuma/yazma için ortak servis.
// AdminSubscriptionScreen.js (tenant, Google Play satın alma) VE
// SuperAdminSubscriptionsScreen.js (manuel/IBAN tanımlama) buradan kullanır.
// ============================================================
import { get, onValue, push, ref, set, update } from 'firebase/database';
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

// ------------------------------------------------------------
// Öğrenci başına fiyatlama (kurumsal/özel talepler için).
// PACKAGE_TIERS'ın yerine geçmiyor — kurum 100+ öğrenci gibi
// paketlerin dışına taştığında ya da özel fiyat istendiğinde
// superadmin bu birim fiyat üzerinden onay verir.
// ------------------------------------------------------------
export const PER_STUDENT_PRICE = 48; // TL / öğrenci / ay
export const PER_STUDENT_TIER_ID = 'per_student';

// period: 'aylik' | 'yillik'. Yıllıkta paket sisteminin geri kalanıyla
// tutarlı olsun diye 10 aylık fiyat alınır (2 ay ücretsiz muadili).
export function computePerStudentPrice(studentCount, period = 'aylik') {
  const count = Math.max(0, Number(studentCount) || 0);
  const monthly = count * PER_STUDENT_PRICE;
  return period === 'yillik' ? monthly * 10 : monthly;
}

// activateManualSubscription'ın beklediği "tier" şekline uydurmak için
// öğrenci sayısına göre sanal bir tier objesi üretir.
function buildPerStudentTier(studentCount) {
  const count = Math.max(0, Number(studentCount) || 0);
  return {
    id: PER_STUDENT_TIER_ID,
    title: `${count} Öğrenci (Özel Fiyat)`,
    range: `${count} öğrenci`,
    minStudent: 0,
    maxStudent: count,
    monthly: computePerStudentPrice(count, 'aylik'),
    yearly: computePerStudentPrice(count, 'yillik'),
    desc: 'Öğrenci sayısına göre hesaplanan özel abonelik.',
    badge: 'Özel',
    color: '#6C3DEB',
  };
}

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

/**
 * Süperadmin, süresi geçmiş (grace_period) bir kurumun erişimini elle kısıtlar
 * ya da kısıtlamayı kaldırır. Otomatik hiçbir yerde çağrılmaz — sadece
 * SuperAdminSubscriptionsScreen'deki elle basılan buton bunu tetikler.
 */
export async function setManualAccessRestriction({ kresId, restricted, tanimlayanUid = '' }) {
  if (!kresId) throw new Error('kresId zorunludur.');
  await update(ref(database, `abonelikler/${kresId}`), {
    erisimKisitli: !!restricted,
    erisimKisitlayanUid: tanimlayanUid,
    erisimKisitTarihi: toDateStr(new Date()),
    updatedAt: Date.now(),
  });
}

/**
 * Süperadmin: manuel/IBAN abonelik için "Ödeme Geldi" işaretlemesi.
 * Süre dolup "Ödeme Bekleniyor" (grace_period) durumuna düşmüş bir aboneliği
 * bir sonraki döneme (aylık +1 ay / yıllık +1 yıl) uzatır, varsa erişim
 * kısıtlamasını kaldırır ve ödeme geçmişine kayıt düşer.
 */
export async function confirmManualPayment({ kresId, subscription, tanimlayanUid = '' }) {
  if (!kresId) throw new Error('kresId zorunludur.');
  if (!subscription) throw new Error('Abonelik kaydı bulunamadı.');

  const period = subscription.planPeriod === 'yillik' ? 'yillik' : 'aylik';
  const tier = getTierById(subscription.planTier);
  const now = new Date();
  const currentEnd = subscription.bitisTarihi ? new Date(subscription.bitisTarihi) : null;
  // Süre hâlâ gelecekteyse (erken ödeme), o tarihten; geçmişse bugünden uzat.
  const base = currentEnd && !Number.isNaN(currentEnd.getTime()) && currentEnd > now ? currentEnd : now;
  const months = period === 'yillik' ? 12 : 1;
  const newEndDate = toDateStr(addMonths(base, months));
  const price = subscription.fiyat != null && subscription.fiyat !== '' ? Number(subscription.fiyat) : (period === 'yillik' ? tier.yearly : tier.monthly);

  await update(ref(database, `abonelikler/${kresId}`), {
    durum: 'aktif',
    bitisTarihi: newEndDate,
    erisimKisitli: false,
    sonOdemeTarihi: toDateStr(now),
    sonOdemeIsaretleyenUid: tanimlayanUid || '',
    updatedAt: Date.now(),
  });

  await push(ref(database, `odemeGecmisi/${kresId}`), {
    kresId,
    kaynak: subscription.kaynak || MANUAL_SOURCE,
    tierId: tier.id,
    tierTitle: tier.title,
    period,
    fiyat: price,
    paraBirimi: 'TRY',
    odemeReferansi: subscription.odemeReferansi || '',
    manuelNot: '"Ödeme Geldi" tikiyle süre uzatıldı',
    tanimlayanUid: tanimlayanUid || '',
    tarih: toDateStr(now),
    createdAt: Date.now(),
  });
}

// ============================================================
// Manuel Abonelik Talebi (Yönetici → Superadmin onayı)
// Yol: abonelikTalepleri/{kresId}/{talepId}
// durum: 'bekliyor' | 'onaylandi' | 'reddedildi'
// Not: abonelikler/{kresId} yazma yetkisi database.rules.json'da
// kaynak==='manuel_iban' için sadece superadmin'e açık — bu yüzden
// talep oluşturma ile gerçek aktivasyon (approveManualRequest)
// ayrı adımlardır, yönetici asla doğrudan abonelikler'e yazmaz.
// ============================================================

/**
 * Yönetici tarafında: öğrenci sayısı + yüklenen dekont ile talep oluşturur.
 * dekontUrl, Firebase Storage'a yüklendikten sonraki download URL'idir
 * (bkz. AdminInstitutionSettingsScreen.js'deki logo yükleme örneği).
 */
export async function createManualRequest({
  kresId,
  kresAdi = '',
  ogrenciSayisi,
  period = 'aylik',
  dekontUrl = '',
  olusturanUid = '',
}) {
  if (!kresId) throw new Error('kresId zorunludur.');
  if (!ogrenciSayisi || Number(ogrenciSayisi) <= 0) throw new Error('Öğrenci sayısı zorunludur.');
  if (!dekontUrl) throw new Error('Dekont yüklenmeden talep oluşturulamaz.');

  const hesaplananTutar = computePerStudentPrice(ogrenciSayisi, period);

  const newRef = push(ref(database, `abonelikTalepleri/${kresId}`));
  await set(newRef, {
    kresId,
    kresAdi,
    ogrenciSayisi: Number(ogrenciSayisi),
    birimFiyat: PER_STUDENT_PRICE,
    period,
    hesaplananTutar,
    dekontUrl,
    durum: 'bekliyor',
    olusturanUid,
    olusturmaTarihi: toDateStr(new Date()),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return newRef.key;
}

/**
 * Superadmin tarafında: tüm kreşlerin bekleyen (+ geçmiş) taleplerini
 * gerçek zamanlı dinler. callback'e düz bir liste (en yeni üstte) döner.
 */
export function subscribeManualRequests(callback) {
  const talepRef = ref(database, 'abonelikTalepleri');
  const unsub = onValue(talepRef, (snap) => {
    const data = snap.val() || {};
    const list = [];
    Object.entries(data).forEach(([kresId, talepler]) => {
      Object.entries(talepler || {}).forEach(([talepId, talep]) => {
        list.push({ kresId, talepId, ...talep });
      });
    });
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  });
  return unsub;
}

/**
 * Superadmin bir talebi onaylar: hem abonelikler/{kresId} kaydını
 * (writeSubscriptionRecord üzerinden, per-student sanal tier ile) yazar,
 * hem de talebin durumunu 'onaylandi' yapar.
 */
export async function approveManualRequest({ kresId, talepId, tanimlayanUid = '', existingSubscription = null }) {
  if (!kresId || !talepId) throw new Error('kresId ve talepId zorunludur.');

  const talepSnap = await get(ref(database, `abonelikTalepleri/${kresId}/${talepId}`));
  const talep = talepSnap.val();
  if (!talep) throw new Error('Talep bulunamadı.');
  if (talep.durum === 'onaylandi') throw new Error('Bu talep zaten onaylanmış.');

  const tier = buildPerStudentTier(talep.ogrenciSayisi);
  const endDate = computeEndDate(talep.period);

  await writeSubscriptionRecord({
    kresId,
    tier,
    selectedPeriod: talep.period,
    durum: 'aktif',
    source: MANUAL_SOURCE,
    endDate,
    price: talep.hesaplananTutar,
    existingSubscription,
    manuelNot: `Öğrenci sayısına göre onaylandı (${talep.ogrenciSayisi} öğrenci × ${PER_STUDENT_PRICE} TL).`,
    odemeReferansi: talep.dekontUrl,
    tanimlayanUid,
  });

  await update(ref(database, `abonelikTalepleri/${kresId}/${talepId}`), {
    durum: 'onaylandi',
    onaylayanUid: tanimlayanUid,
    onayTarihi: toDateStr(new Date()),
    updatedAt: Date.now(),
  });
}

/**
 * Superadmin bir talebi reddeder — dekont/kayıt silinmez, sadece durum güncellenir
 * ki yönetici neden reddedildiğini görebilsin.
 */
export async function rejectManualRequest({ kresId, talepId, redNotu = '', tanimlayanUid = '' }) {
  if (!kresId || !talepId) throw new Error('kresId ve talepId zorunludur.');
  await update(ref(database, `abonelikTalepleri/${kresId}/${talepId}`), {
    durum: 'reddedildi',
    redNotu,
    onaylayanUid: tanimlayanUid,
    onayTarihi: toDateStr(new Date()),
    updatedAt: Date.now(),
  });
}

/**
 * Yönetici tarafında: kendi kreşinin talep geçmişini dinler
 * (bekliyor/onaylandı/reddedildi hepsi, en yeni üstte).
 */
export function subscribeKresManualRequests(kresId, callback) {
  if (!kresId) return () => {};
  const talepRef = ref(database, `abonelikTalepleri/${kresId}`);
  const unsub = onValue(talepRef, (snap) => {
    const data = snap.val() || {};
    const list = Object.entries(data)
      .map(([talepId, talep]) => ({ kresId, talepId, ...talep }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  });
  return unsub;
}
