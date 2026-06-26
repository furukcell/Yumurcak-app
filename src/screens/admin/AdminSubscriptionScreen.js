// ============================================================
// YUMURCAK — AdminSubscriptionScreen.js
// Öğrenci sayısına göre abonelik / ödeme / promosyon ekranı
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { get, onValue, ref, set, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  REVENUECAT_ENTITLEMENT_ID,
  getRevenueCatExpiryDate,
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

const BUILT_IN_PROMOS = {
  PILOT1AY: { kod: 'PILOT1AY', tip: 'demo', sureAy: 1, aktif: true },
  PILOT3AY: { kod: 'PILOT3AY', tip: 'demo', sureAy: 3, aktif: true },
  KRES2026: { kod: 'KRES2026', tip: 'demo', sureAy: 3, aktif: true },
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
  const period = subscription.planPeriod || (String(subscription.plan || '').includes('yillik') ? 'yillik' : String(subscription.plan || '').includes('aylik') ? 'aylik' : '');
  if (!period) return subscription.plan || tier.title;
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
  const [rcPackages, setRcPackages] = useState({ monthly: null, yearly: null });

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

    const childUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, item]) => ({ id, ...(item || {}) }))
        .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
        .filter((item) => item.aktif !== false && item.deleted !== true);
      setChildren(list);
    });

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
      setRcPackages({ monthly: result.monthly, yearly: result.yearly });
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

  const startTrial = async () => {
    if (subscription?.durum === 'aktif' || subscription?.durum === 'demo') {
      return Alert.alert('Bilgi', 'Bu kreşte zaten aktif/demo abonelik var.');
    }

    setSaving(true);
    try {
      const now = new Date();
      const end = addMonths(now, 1);
      const tier = suggestedTier || PACKAGE_TIERS[0];

      await set(ref(database, `abonelikler/${kresId}`), {
        kresId,
        plan: 'demo',
        planTier: tier.id,
        planPeriod: 'demo',
        ogrenciLimiti: tier.maxStudent,
        durum: 'demo',
        baslangicTarihi: toDateStr(now),
        bitisTarihi: toDateStr(end),
        demoBitisTarihi: toDateStr(end),
        fiyat: 0,
        paraBirimi: 'TRY',
        kaynak: 'ilk_1_ay_ucretsiz',
        revenueCatCustomerId: revenueCatUserId,
        revenueCatEntitlement: REVENUECAT_ENTITLEMENT_ID,
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
    const rcPackage = selectedPeriod === 'yillik' ? rcPackages.yearly : rcPackages.monthly;

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
      `${tier.title} paketi seçildi.\n${tier.range}\n${priceText}\n\nGoogle Play ödeme ürünü hazırlanıyor. Şimdilik demo veya manuel aktif etme ile devam edebilirsiniz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Manuel Aktif Et', onPress: () => activateManual(tier, selectedPeriod) },
      ]
    );
  };

  const purchasePlan = async (tier, selectedPeriod, rcPackage) => {
    setSaving(true);
    try {
      const result = await purchaseRevenueCatPackage(rcPackage, revenueCatUserId);
      await syncRevenueCatResult(result?.customerInfo, tier, selectedPeriod);
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

  const syncRevenueCatResult = async (customerInfo, tier, selectedPeriod) => {
    const active = isRevenueCatPremiumActive(customerInfo);
    if (!active) throw new Error('Abonelik hakkı aktif değil.');

    const now = new Date();
    const expiryDate = getRevenueCatExpiryDate(customerInfo) || toDateStr(selectedPeriod === 'yillik' ? addMonths(now, 12) : addMonths(now, 1));
    const price = selectedPeriod === 'yillik' ? tier.yearly : tier.monthly;

    await set(ref(database, `abonelikler/${kresId}`), {
      kresId,
      plan: `${tier.id}_${selectedPeriod}`,
      planTier: tier.id,
      planPeriod: selectedPeriod,
      ogrenciLimiti: tier.maxStudent,
      durum: 'aktif',
      baslangicTarihi: subscription?.baslangicTarihi || toDateStr(now),
      bitisTarihi: expiryDate,
      demoBitisTarihi: '',
      fiyat: price,
      paraBirimi: 'TRY',
      kaynak: 'revenuecat',
      revenueCatCustomerId: revenueCatUserId,
      revenueCatEntitlement: REVENUECAT_ENTITLEMENT_ID,
      revenueCatSyncedAt: Date.now(),
      createdAt: subscription?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  };

  const activateManual = async (tier, selectedPeriod) => {
    setSaving(true);
    try {
      const now = new Date();
      const end = selectedPeriod === 'yillik' ? addMonths(now, 12) : addMonths(now, 1);
      const price = selectedPeriod === 'yillik' ? tier.yearly : tier.monthly;

      await set(ref(database, `abonelikler/${kresId}`), {
        kresId,
        plan: `${tier.id}_${selectedPeriod}`,
        planTier: tier.id,
        planPeriod: selectedPeriod,
        ogrenciLimiti: tier.maxStudent,
        durum: 'aktif',
        baslangicTarihi: toDateStr(now),
        bitisTarihi: toDateStr(end),
        demoBitisTarihi: '',
        fiyat: price,
        paraBirimi: 'TRY',
        kaynak: 'manuel_admin',
        revenueCatCustomerId: revenueCatUserId,
        revenueCatEntitlement: REVENUECAT_ENTITLEMENT_ID,
        createdAt: subscription?.createdAt || Date.now(),
        updatedAt: Date.now(),
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

      const months = Number(promo.sureAy || 1);
      const now = new Date();
      const currentEnd = getCurrentEndDate(subscription);
      const startBase = currentEnd && currentEnd > now ? currentEnd : now;
      const end = addMonths(startBase, months);
      const tier = suggestedTier || PACKAGE_TIERS[0];

      await set(ref(database, `abonelikler/${kresId}`), {
        kresId,
        plan: 'demo',
        planTier: tier.id,
        planPeriod: 'demo',
        ogrenciLimiti: tier.maxStudent,
        durum: 'demo',
        baslangicTarihi: subscription?.baslangicTarihi || toDateStr(now),
        bitisTarihi: toDateStr(end),
        demoBitisTarihi: toDateStr(end),
        fiyat: 0,
        paraBirimi: 'TRY',
        kaynak: `promo_${code}`,
        revenueCatCustomerId: subscription?.revenueCatCustomerId || revenueCatUserId,
        revenueCatEntitlement: REVENUECAT_ENTITLEMENT_ID,
        createdAt: subscription?.createdAt || Date.now(),
        updatedAt: Date.now(),
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
      Alert.alert('Başarılı', `${code} kodu uygulandı. ${months} ay demo tanımlandı.`);
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
            <View>
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
          <Text style={styles.specialText}>Büyük kurumlar için özel teklif ile ilerlenir. Bu paket ileride manuel satış veya özel kurumsal plan olarak yönetilebilir.</Text>
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
    </SafeAreaView>
  );
}

function PlanCard({ tier, period, studentCount, active, suggested, disabled, saving, onPress }) {
  const price = period === 'yillik' ? tier.yearly : tier.monthly;
  const periodText = period === 'yillik' ? '/ yıl' : '/ ay';
  const isAvailable = !disabled;

  return (
    <TouchableOpacity style={[styles.planCard, tier.featured && styles.featuredPlan, active && styles.activePlan, disabled && styles.disabledPlan]} onPress={onPress} disabled={saving} activeOpacity={0.85}>
      <View style={styles.planHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{tier.title}</Text>
          <Text style={styles.planRange}>{tier.range}</Text>
        </View>
        <Text style={[styles.bestBadge, { color: tier.color, backgroundColor: `${tier.color}18` }]}>{active ? 'Aktif' : suggested ? 'Uygun' : tier.badge}</Text>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.planPrice}>{formatPrice(price)}</Text>
        <Text style={styles.planPeriod}>{periodText}</Text>
      </View>

      <Text style={styles.planDesc}>{tier.desc}</Text>
      <Text style={[styles.limitText, !isAvailable && { color: THEME.red }]}>
        {isAvailable ? `Mevcut öğrenci: ${studentCount}/${tier.maxStudent}` : `Bu paket ${studentCount} öğrenci için yetersiz`}
      </Text>
    </TouchableOpacity>
  );
}

function getStatus(sub) {
  if (!sub) return { label: 'Abonelik Yok', badge: 'Başlatılmadı', color: THEME.muted, bg: '#F0F0F4' };
  if (sub.durum === 'aktif') return { label: 'Abonelik Aktif', badge: 'Aktif', color: THEME.green, bg: '#E8F9EF' };
  if (sub.durum === 'demo') return { label: 'Demo Kullanım', badge: 'Demo', color: THEME.orange, bg: '#FFF4E1' };
  return { label: 'Abonelik Pasif', badge: 'Pasif', color: THEME.red, bg: '#FFE8EC' };
}

function getCurrentEndDate(sub) {
  if (!sub) return null;
  const value = sub.bitisTarihi || sub.demoBitisTarihi;
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getRemainingDays(sub) {
  const end = getCurrentEndDate(sub);
  if (!end) return '-';
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getUsagePercent(count, limit) {
  if (!limit) return 0;
  return Math.min(100, Math.round((count / limit) * 100));
}

function addMonths(date, count) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + count);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '700' },
  content: { padding: 18, paddingBottom: 38 },
  hero: { backgroundColor: THEME.primary, borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 18 },
  heroIcon: { fontSize: 42, marginBottom: 8 },
  heroTitle: { color: '#FFF', fontWeight: '900', fontSize: 22 },
  heroDesc: { color: 'rgba(255,255,255,0.82)', marginTop: 5, fontWeight: '700', textAlign: 'center' },
  statusCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, fontWeight: '900', overflow: 'hidden' },
  statusText: { color: THEME.muted, fontWeight: '700', marginTop: 4 },
  usageCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  usageDanger: { borderColor: THEME.red, borderWidth: 1.5 },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
  usageTitle: { color: THEME.text, fontSize: 18, fontWeight: '900' },
  usageSub: { color: THEME.muted, fontWeight: '700', lineHeight: 18, marginTop: 4 },
  usageCount: { color: THEME.primary, fontSize: 24, fontWeight: '900' },
  progressTrack: { height: 10, backgroundColor: THEME.primarySoft, borderRadius: 99, overflow: 'hidden', marginTop: 13 },
  progressFill: { height: '100%', borderRadius: 99 },
  usageInfo: { color: THEME.muted, fontWeight: '800', marginTop: 9, lineHeight: 18 },
  trialButton: { backgroundColor: THEME.green, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 18 },
  trialText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  periodCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: THEME.border, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 10 },
  periodRow: { flexDirection: 'row', backgroundColor: THEME.bg, borderRadius: 16, padding: 5, gap: 6 },
  periodButton: { flex: 1, borderRadius: 13, paddingVertical: 11, alignItems: 'center' },
  periodButtonActive: { backgroundColor: THEME.primary },
  periodText: { color: THEME.primary, fontWeight: '900' },
  periodTextActive: { color: '#FFF' },
  periodMini: { color: THEME.muted, fontSize: 10, fontWeight: '800', marginTop: 2 },
  periodMiniActive: { color: 'rgba(255,255,255,0.82)' },
  planCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
  featuredPlan: { borderColor: THEME.primary, borderWidth: 1.5 },
  activePlan: { backgroundColor: '#FBF8FF' },
  disabledPlan: { opacity: 0.58 },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bestBadge: { alignSelf: 'flex-start', fontWeight: '900', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, overflow: 'hidden', fontSize: 12 },
  planTitle: { color: THEME.text, fontSize: 20, fontWeight: '900' },
  planRange: { color: THEME.muted, fontSize: 12.5, fontWeight: '800', marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  planPrice: { color: THEME.primary, fontSize: 27, fontWeight: '900' },
  planPeriod: { color: THEME.muted, fontWeight: '800', marginLeft: 4, marginBottom: 4 },
  planDesc: { color: THEME.muted, fontWeight: '700', marginTop: 8, lineHeight: 18 },
  limitText: { color: THEME.green, fontWeight: '900', marginTop: 10 },
  specialCard: { backgroundColor: '#FFF7E8', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#FFE0A3', marginBottom: 14 },
  specialTitle: { color: THEME.gold, fontSize: 17, fontWeight: '900' },
  specialText: { color: THEME.text, fontWeight: '700', lineHeight: 19, marginTop: 5 },
  restoreButton: { backgroundColor: THEME.primarySoft, borderRadius: 14, padding: 13, alignItems: 'center', marginBottom: 14 },
  restoreText: { color: THEME.primary, fontWeight: '900' },
  paymentWarning: { color: THEME.orange, fontWeight: '800', lineHeight: 18, marginBottom: 14, textAlign: 'center' },
  promoCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  input: { backgroundColor: THEME.bg, borderRadius: 14, padding: 13, color: THEME.text, borderWidth: 1, borderColor: THEME.border, fontWeight: '800', marginBottom: 10 },
  applyButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  applyText: { color: '#FFF', fontWeight: '900' },
});
