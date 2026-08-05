// ============================================================
// YUMURCAK — AdminSubscriptionScreen.js
// Öğrenci sayısına göre abonelik / ödeme / promosyon ekranı
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { get, onValue, ref, set, update, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  REVENUECAT_ENTITLEMENT_ID,
  getRevenueCatExpiryDate,
  getRevenueCatPackageForPlan,
  getRevenueCatPackages,
  isRevenueCatPremiumActive,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '../../services/revenueCat';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  red: '#FF4D6D',
  gold: '#C98A00',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const PACKAGE_TIERS = [
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

// Built-in demo kodları sade tutulur. 3 aylık demo yok; tek standart demo 1 aydır.
const BUILT_IN_PROMOS = {
  PILOT1AY: { kod: 'PILOT1AY', tip: 'demo', sureAy: 1, aktif: true },
};

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('tr-TR')} TL`;
}

function getTierById(id) {
  return PACKAGE_TIERS.find((tier) => tier.id === id) || PACKAGE_TIERS[0];
}

function getSuggestedTier(studentCount) {
  return PACKAGE_TIERS.find((tier) => studentCount <= tier.maxStudent) || null;
}

function getPlanLabel(subscription) {
  if (!subscription?.planTier && !subscription?.plan) return 'Henüz yok';
  const tier = getTierById(subscription.planTier || String(subscription.plan || '').split('_')[0]);
  const plan = String(subscription.plan || '');
  const period = subscription.planPeriod || (plan.includes('yillik') ? 'yillik' : plan.includes('aylik') ? 'aylik' : '');
  if (!period || period === 'demo') return subscription.plan === 'demo' ? `${tier.title} / Demo` : (subscription.plan || tier.title);
  return `${tier.title} / ${period === 'yillik' ? 'Yıllık' : 'Aylık'}`;
}

export default function AdminSubscriptionScreen() {
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || 'kres001';
  const userId = kullanici?.uid || kullanici?.id || '';
  const revenueCatUserId = kresId || userId || 'anonymous';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rcLoading, setRcLoading] = useState(true);
  const [rcError, setRcError] = useState('');
  const [rcPackages, setRcPackages] = useState({ byId: {}, packages: [], monthly: null, yearly: null });
  const [kres, setKres] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [children, setChildren] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [period, setPeriod] = useState('aylik');

  useEffect(() => {
    const kresUnsub = onValue(ref(database, `kresler/${kresId}`), (snap) => {
      setKres(snap.val() || null);
    });

    const subUnsub = onValue(ref(database, `abonelikler/${kresId}`), (snap) => {
      setSubscription(snap.val() || null);
      setLoading(false);
    });

    const childQuery = query(ref(database, 'cocuklar'), orderByChild('kresId'), equalTo(kresId));
    const childUnsub = onValue(
      childQuery,
      (snap) => {
        const data = snap.val() || {};
        const list = Object.entries(data)
          .map(([id, item]) => ({ id, ...(item || {}) }))
          .filter((item) => item.aktif !== false && item.deleted !== true);
        setChildren(list);
      },
      () => setChildren([])
    );

    return () => {
      kresUnsub();
      subUnsub();
      childUnsub();
    };
  }, [kresId]);

  useEffect(() => {
    let alive = true;
    async function loadPackages() {
      setRcLoading(true);
      const result = await getRevenueCatPackages(revenueCatUserId);
      if (!alive) return;
      setRcPackages(result);
      setRcError(result.error || '');
      setRcLoading(false);
    }
    loadPackages();
    return () => { alive = false; };
  }, [revenueCatUserId]);

  const status = useMemo(() => getStatus(subscription), [subscription]);
  const remainingDays = useMemo(() => getRemainingDays(subscription), [subscription]);
  const studentCount = children.length;
  const suggestedTier = getSuggestedTier(studentCount);
  const activeTier = subscription?.planTier ? getTierById(subscription.planTier) : suggestedTier;
  const activeLimit = subscription?.planTier ? getTierById(subscription.planTier).maxStudent : suggestedTier?.maxStudent;
  const overLimit = activeLimit && studentCount > activeLimit;

  const writeSubscription = async ({ tier, selectedPeriod, durum, source, endDate, price, customerInfo, rcPackage }) => {
    await set(ref(database, `abonelikler/${kresId}`), {
      kresId,
      plan: durum === 'demo' ? 'demo' : `${tier.id}_${selectedPeriod}`,
      planTier: tier.id,
      planPeriod: durum === 'demo' ? 'demo' : selectedPeriod,
      ogrenciLimiti: tier.maxStudent,
      durum,
      baslangicTarihi: subscription?.baslangicTarihi || toDateStr(new Date()),
      bitisTarihi: endDate,
      demoBitisTarihi: durum === 'demo' ? endDate : '',
      fiyat: price,
      paraBirimi: 'TRY',
      kaynak: source,
      revenueCatCustomerId: revenueCatUserId,
      revenueCatEntitlement: REVENUECAT_ENTITLEMENT_ID,
      revenueCatPackageIdentifier: rcPackage?.identifier || '',
      revenueCatProductIdentifier: rcPackage?.product?.identifier || rcPackage?.product?.productIdentifier || '',
      revenueCatSyncedAt: customerInfo ? Date.now() : subscription?.revenueCatSyncedAt || '',
      createdAt: subscription?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  };

  const startTrial = async () => {
    if (subscription?.durum === 'aktif' || subscription?.durum === 'demo') {
      return Alert.alert('Bilgi', 'Bu kreşte zaten aktif/demo abonelik var.');
    }

    setSaving(true);
    try {
      const now = new Date();
      const tier = suggestedTier || PACKAGE_TIERS[0];
      await writeSubscription({
        tier,
        selectedPeriod: 'demo',
        durum: 'demo',
        source: 'ilk_1_ay_ucretsiz',
        endDate: toDateStr(addMonths(now, 1)),
        price: 0,
      });
      Alert.alert('Başarılı', 'İlk 1 ay ücretsiz demo başlatıldı.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Demo başlatılamadı.');
    } finally {
      setSaving(false);
    }
  };

  const selectPlan = async (tier, selectedPeriod) => {
    const price = selectedPeriod === 'yillik' ? tier.yearly : tier.monthly;
    const priceText = `${formatPrice(price)} / ${selectedPeriod === 'yillik' ? 'yıl' : 'ay'}`;
    const rcPackage = getRevenueCatPackageForPlan(rcPackages, tier.id, selectedPeriod);

    if (studentCount > tier.maxStudent) {
      const nextTier = getSuggestedTier(studentCount);
      return Alert.alert(
        'Paket Yetersiz',
        `${tier.title} paketi ${tier.range} içindir. Kurumda şu an ${studentCount} öğrenci var. ${nextTier ? `${nextTier.title} paketini seçmelisin.` : '100+ öğrenci için özel teklif gerekir.'}`
      );
    }

    if (!suggestedTier) {
      return Alert.alert('Özel Teklif', '100 üzeri öğrenci için özel teklif gerekir. Bu aşamada manuel görüşme ile ilerlenmeli.');
    }

    if (rcPackage) {
      Alert.alert(
        `${tier.title} ${selectedPeriod === 'yillik' ? 'Yıllık' : 'Aylık'}`,
        `${tier.range}\n${priceText}\n\nPaket yükseltme tamamlanınca yeni öğrenci limitiniz hemen aktif olur. Ücret farkı ve yenileme Google Play kurallarına göre uygulanır.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Satın Al', onPress: () => purchasePlan(tier, selectedPeriod, rcPackage) },
        ]
      );
      return;
    }

    Alert.alert(
      'Paket Henüz Hazır Değil',
      `${tier.title} paketi seçildi.\n${tier.range}\n${priceText}\n\nRevenueCat/Google Play paketi şu an okunamadı. Lütfen daha sonra tekrar deneyin.`,
      [
       { text: 'Tamam', style: 'cancel' },
      ]
    );
  };

  const purchasePlan = async (tier, selectedPeriod, rcPackage) => {
    setSaving(true);
    try {
      const result = await purchaseRevenueCatPackage(rcPackage, revenueCatUserId);
      await syncRevenueCatResult(result?.customerInfo, tier, selectedPeriod, rcPackage);
      Alert.alert('Başarılı', 'Abonelik aktif edildi.');
    } catch (err) {
      const userCancelled = err?.userCancelled || err?.code === 'PURCHASE_CANCELLED';
      if (!userCancelled) {
        console.warn('Satın alma hatası:', err);
        Alert.alert('Hata', 'Satın alma tamamlanamadı.');
      }
    } finally {
      setSaving(false);
    }
  };

  const restorePurchases = async () => {
    setSaving(true);
    try {
      const customerInfo = await restoreRevenueCatPurchases(revenueCatUserId);
      const active = isRevenueCatPremiumActive(customerInfo);
      if (!active) {
        Alert.alert('Abonelik Bulunamadı', 'Bu hesap için aktif abonelik bulunamadı.');
        return;
      }
      await syncRevenueCatResult(customerInfo, activeTier || PACKAGE_TIERS[0], subscription?.planPeriod || 'aylik');
      Alert.alert('Başarılı', 'Satın alma geri yüklendi.');
    } catch (err) {
      console.warn('Satın alma geri yükleme hatası:', err);
      Alert.alert('Hata', 'Satın alma geri yüklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const syncRevenueCatResult = async (customerInfo, tier, selectedPeriod, rcPackage = null) => {
    const active = isRevenueCatPremiumActive(customerInfo);
    if (!active) throw new Error('Abonelik hakkı aktif değil.');

    const now = new Date();
    const expiryDate = getRevenueCatExpiryDate(customerInfo) || toDateStr(selectedPeriod === 'yillik' ? addMonths(now, 12) : addMonths(now, 1));
    const price = selectedPeriod === 'yillik' ? tier.yearly : tier.monthly;

    await writeSubscription({
      tier,
      selectedPeriod,
      durum: 'aktif',
      source: 'revenuecat',
      endDate: expiryDate,
      price,
      customerInfo,
      rcPackage,
    });
  };

  const activateManual = async (tier, selectedPeriod) => {
    setSaving(true);
    try {
      const now = new Date();
      const end = selectedPeriod === 'yillik' ? addMonths(now, 12) : addMonths(now, 1);
      const price = selectedPeriod === 'yillik' ? tier.yearly : tier.monthly;
      await writeSubscription({
        tier,
        selectedPeriod,
        durum: 'aktif',
        source: 'manuel_admin',
        endDate: toDateStr(end),
        price,
      });
      Alert.alert('Başarılı', `${tier.title} ${selectedPeriod === 'yillik' ? 'yıllık' : 'aylık'} abonelik aktif edildi.`);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Abonelik aktif edilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return Alert.alert('Eksik Bilgi', 'Promosyon kodu gir.');

    setSaving(true);
    try {
      const usageKey = `${kresId}_${code}`;
      const usageSnap = await get(ref(database, `promosyonKullanimlari/${usageKey}`));
      if (usageSnap.exists()) {
        setSaving(false);
        return Alert.alert('Kod Kullanılmış', 'Bu promosyon kodu bu kreş için daha önce kullanılmış.');
      }

      let promo = BUILT_IN_PROMOS[code] || null;
      const promoSnap = await get(ref(database, `promosyonKodlari/${code}`));
      if (promoSnap.exists()) promo = promoSnap.val();

      if (!promo || promo.aktif === false) {
        setSaving(false);
        return Alert.alert('Geçersiz Kod', 'Promosyon kodu bulunamadı veya aktif değil.');
      }

      const used = Number(promo.kullanimSayisi || 0);
      const max = Number(promo.maksimumKullanim || 0);
      if (max > 0 && used >= max) {
        setSaving(false);
        return Alert.alert('Limit Doldu', 'Bu promosyon kodunun kullanım limiti dolmuş.');
      }

      const months = Math.min(Number(promo.sureAy || 1), 1);
      const now = new Date();
      const currentEnd = getCurrentEndDate(subscription);
      const startBase = currentEnd && currentEnd > now ? currentEnd : now;
      const end = addMonths(startBase, months);
      const tier = suggestedTier || PACKAGE_TIERS[0];

      await writeSubscription({
        tier,
        selectedPeriod: 'demo',
        durum: 'demo',
        source: `promo_${code}`,
        endDate: toDateStr(end),
        price: 0,
      });

      await set(ref(database, `promosyonKullanimlari/${usageKey}`), {
        kresId,
        kod: code,
        kullaniciId: userId,
        kullanildiAt: Date.now(),
        verilenAy: months,
      });

      if (promoSnap.exists()) {
        await update(ref(database, `promosyonKodlari/${code}`), {
          kullanimSayisi: used + 1,
          updatedAt: Date.now(),
        });
      }

      setPromoCode('');
      Alert.alert('Başarılı', `${code} kodu uygulandı. 1 ay demo tanımlandı.`);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Promosyon kodu uygulanamadı.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Abonelik bilgileri hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>💎</Text>
          <Text style={styles.heroTitle}>Abonelik / Ödeme</Text>
          <Text style={styles.heroDesc}>{kres?.ad || 'Kreş'} için öğrenci sayısına göre paket yönetimi</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <Text style={styles.statusTitle}>{status.label}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: status.bg, color: status.color }]}>{status.badge}</Text>
          </View>
          <Text style={styles.statusText}>Plan: {getPlanLabel(subscription)}</Text>
          <Text style={styles.statusText}>Bitiş: {subscription?.bitisTarihi || subscription?.demoBitisTarihi || '-'}</Text>
          <Text style={styles.statusText}>Kalan gün: {remainingDays}</Text>
        </View>

        <View style={[styles.usageCard, overLimit && styles.usageDanger]}>
          <View style={styles.usageTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.usageTitle}>Öğrenci Kullanımı</Text>
              <Text style={styles.usageSub}>Kayıtlı öğrenci sayısı paket limitine göre takip edilir.</Text>
            </View>
            <Text style={styles.usageCount}>{studentCount}/{activeLimit || '∞'}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${getUsagePercent(studentCount, activeLimit)}%`, backgroundColor: overLimit ? THEME.red : THEME.primary }]} />
          </View>
          <Text style={[styles.usageInfo, overLimit && { color: THEME.red }]}>
            {overLimit
              ? 'Mevcut paket öğrenci sayısı için yetersiz. Yeni öğrenci eklemek için üst pakete geçilmelidir.'
              : suggestedTier
                ? `Size uygun paket: ${suggestedTier.title} (${suggestedTier.range})`
                : '100+ öğrenci için özel teklif gerekir.'}
          </Text>
        </View>

        {!subscription ? (
          <TouchableOpacity style={styles.trialButton} onPress={startTrial} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.trialText}>İlk 1 Ay Ücretsiz Denemeyi Başlat</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.periodCard}>
          <Text style={styles.sectionTitle}>Ödeme Dönemi</Text>
          <View style={styles.periodRow}>
            <TouchableOpacity style={[styles.periodButton, period === 'aylik' && styles.periodButtonActive]} onPress={() => setPeriod('aylik')} activeOpacity={0.85}>
              <Text style={[styles.periodText, period === 'aylik' && styles.periodTextActive]}>Aylık</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.periodButton, period === 'yillik' && styles.periodButtonActive]} onPress={() => setPeriod('yillik')} activeOpacity={0.85}>
              <Text style={[styles.periodText, period === 'yillik' && styles.periodTextActive]}>Yıllık</Text>
              <Text style={[styles.periodMini, period === 'yillik' && styles.periodMiniActive]}>2 ay ücretsiz</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Öğrenci Sayısına Göre Paketler</Text>
        {PACKAGE_TIERS.map((tier) => (
          <PlanCard
            key={tier.id}
            tier={tier}
            period={period}
            studentCount={studentCount}
            active={subscription?.planTier === tier.id}
            suggested={suggestedTier?.id === tier.id}
            disabled={studentCount > tier.maxStudent}
            saving={saving || rcLoading}
            onPress={() => selectPlan(tier, period)}
          />
        ))}

        <View style={styles.specialCard}>
          <Text style={styles.specialTitle}>100+ öğrenci</Text>
          <Text style={styles.specialText}>Büyük kurumlar için özel teklif ile ilerlenir. Bu paket manuel satış veya özel kurumsal plan olarak yönetilebilir.</Text>
        </View>

        <TouchableOpacity style={[styles.restoreButton, saving && { opacity: 0.6 }]} onPress={restorePurchases} disabled={saving} activeOpacity={0.85}>
          <Text style={styles.restoreText}>Satın Almayı Geri Yükle</Text>
        </TouchableOpacity>

        {rcError ? <Text style={styles.paymentWarning}>Google Play ödeme bilgileri şu an alınamadı. Demo veya promosyon kodu ile devam edebilirsiniz.</Text> : null}

        <View style={styles.promoCard}>
          <Text style={styles.sectionTitle}>Promosyon Kodu</Text>
          <TextInput
            style={styles.input}
            value={promoCode}
            onChangeText={setPromoCode}
            placeholder="Promosyon kodu"
            placeholderTextColor="#999"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={[styles.applyButton, saving && { opacity: 0.6 }]} onPress={applyPromo} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.applyText}>Kodu Uygula</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
     </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PlanCard({ tier, period, studentCount, active, suggested, disabled, saving, onPress }) {
  const price = period === 'yillik' ? tier.yearly : tier.monthly;
  const suffix = period === 'yillik' ? '/ yıl' : '/ ay';

  return (
    <View style={[styles.planCard, tier.featured && styles.planFeatured, active && styles.planActive, disabled && styles.planDisabled]}>
      <View style={styles.planTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{tier.title}</Text>
          <Text style={styles.planRange}>{tier.range}</Text>
        </View>
        <View style={[styles.planBadge, { backgroundColor: `${tier.color}22` }]}>
          <Text style={[styles.planBadgeText, { color: tier.color }]}>{active ? 'Aktif' : suggested ? 'Uygun' : tier.badge}</Text>
        </View>
      </View>
      <Text style={styles.planDesc}>{tier.desc}</Text>
      <Text style={styles.planPrice}>{formatPrice(price)} <Text style={styles.planSuffix}>{suffix}</Text></Text>
      <Text style={styles.planSmall}>{period === 'yillik' ? 'Yıllık ödemede 2 ay ücretsiz' : 'Aylık yenilenir'}</Text>
      <TouchableOpacity style={[styles.planButton, disabled && styles.planButtonDisabled]} onPress={onPress} disabled={saving || disabled} activeOpacity={0.85}>
        <Text style={styles.planButtonText}>{disabled ? `${studentCount} öğrenci için yetersiz` : active ? 'Planı Yönet' : 'Paketi Seç'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function getStatus(subscription) {
  if (!subscription) return { label: 'Abonelik Yok', badge: 'Pasif', color: THEME.red, bg: '#FFE8EE' };
  if (subscription.durum === 'aktif') return { label: 'Aktif Abonelik', badge: 'Aktif', color: THEME.green, bg: '#E8FBEA' };
  if (subscription.durum === 'demo') return { label: 'Demo Kullanım', badge: 'Demo', color: THEME.orange, bg: '#FFF4D8' };
  return { label: 'Abonelik Pasif', badge: 'Pasif', color: THEME.red, bg: '#FFE8EE' };
}

function getCurrentEndDate(subscription) {
  const raw = subscription?.bitisTarihi || subscription?.demoBitisTarihi;
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRemainingDays(subscription) {
  const end = getCurrentEndDate(subscription);
  if (!end) return 0;
  const now = new Date();
  const diff = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toDateStr(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getUsagePercent(count, limit) {
  if (!limit) return 0;
  return Math.max(0, Math.min(100, Math.round((count / limit) * 100)));
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 18, paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 10, color: THEME.muted, fontWeight: '700' },
  hero: { backgroundColor: THEME.primary, borderRadius: 26, padding: 22, marginBottom: 16 },
  heroIcon: { fontSize: 34 },
  heroTitle: { color: '#fff', fontSize: 25, fontWeight: '900', marginTop: 8 },
  heroDesc: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 6, lineHeight: 20 },
  statusCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusTitle: { color: THEME.text, fontSize: 18, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, overflow: 'hidden', fontWeight: '900', fontSize: 12 },
  statusText: { color: THEME.muted, fontWeight: '800', marginTop: 5 },
  usageCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  usageDanger: { borderColor: THEME.red, backgroundColor: '#FFF7F8' },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  usageTitle: { color: THEME.text, fontSize: 17, fontWeight: '900' },
  usageSub: { color: THEME.muted, fontWeight: '700', marginTop: 4, lineHeight: 18 },
  usageCount: { color: THEME.primary, fontSize: 24, fontWeight: '900' },
  progressTrack: { height: 10, backgroundColor: THEME.primarySoft, borderRadius: 99, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  usageInfo: { color: THEME.muted, fontWeight: '800', marginTop: 9, lineHeight: 18 },
  trialButton: { backgroundColor: THEME.green, borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  trialText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  periodCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  sectionTitle: { color: THEME.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  periodRow: { flexDirection: 'row', gap: 10 },
  periodButton: { flex: 1, backgroundColor: THEME.primarySoft, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  periodButtonActive: { backgroundColor: THEME.primary },
  periodText: { color: THEME.primary, fontWeight: '900' },
  periodTextActive: { color: '#fff' },
  periodMini: { color: THEME.muted, fontWeight: '700', fontSize: 11, marginTop: 3 },
  periodMiniActive: { color: 'rgba(255,255,255,0.82)' },
  planCard: { backgroundColor: THEME.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
  planFeatured: { borderColor: THEME.primary },
  planActive: { borderColor: THEME.green, backgroundColor: '#F7FFF8' },
  planDisabled: { opacity: 0.58 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  planTitle: { color: THEME.text, fontSize: 19, fontWeight: '900' },
  planRange: { color: THEME.muted, fontWeight: '800', marginTop: 3 },
  planBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  planBadgeText: { fontWeight: '900', fontSize: 11 },
  planDesc: { color: THEME.muted, fontWeight: '700', marginTop: 11, lineHeight: 19 },
  planPrice: { color: THEME.text, fontSize: 27, fontWeight: '900', marginTop: 12 },
  planSuffix: { color: THEME.muted, fontSize: 13, fontWeight: '800' },
  planSmall: { color: THEME.muted, fontWeight: '800', fontSize: 12, marginTop: 4 },
  planButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  planButtonDisabled: { backgroundColor: THEME.muted },
  planButtonText: { color: '#fff', fontWeight: '900' },
  specialCard: { backgroundColor: '#FFF7E8', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#FFE1A8', marginBottom: 12 },
  specialTitle: { color: THEME.gold, fontSize: 18, fontWeight: '900' },
  specialText: { color: THEME.text, fontWeight: '700', lineHeight: 19, marginTop: 6 },
  restoreButton: { backgroundColor: THEME.primarySoft, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  restoreText: { color: THEME.primary, fontWeight: '900' },
  paymentWarning: { color: THEME.orange, fontWeight: '800', lineHeight: 18, marginBottom: 12 },
  promoCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: THEME.border },
  promoHint: { color: THEME.muted, fontWeight: '700', lineHeight: 18, marginTop: -4, marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 13, paddingVertical: 12, color: THEME.text, fontWeight: '800', marginBottom: 10 },
  applyButton: { backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  applyText: { color: '#fff', fontWeight: '900' },
});
