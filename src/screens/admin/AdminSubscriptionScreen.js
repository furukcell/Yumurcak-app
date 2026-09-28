// ============================================================
// YUMURCAK — AdminSubscriptionScreen.js
// Öğrenci sayısına göre abonelik / ödeme / promosyon ekranı
// ============================================================
import i18n from '../../i18n';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';
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
import {
  PACKAGE_TIERS,
  formatPrice,
  getSuggestedTier,
  getTierById,
} from '../../services/subscriptionService';
import { getSubscriptionEndDate, getSubscriptionStatus } from '../../utils/subscriptionStatus';

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

// Built-in demo kodları sade tutulur. 3 aylık demo yok; tek standart demo 1 aydır.
const BUILT_IN_PROMOS = {
  PILOT1AY: { kod: 'PILOT1AY', tip: 'demo', sureAy: 1, aktif: true },
};

function getPlanLabel(subscription) {
  if (!subscription?.planTier && !subscription?.plan) return i18n.t('admin.subscription.notSet');
  const tier = getTierById(subscription.planTier || String(subscription.plan || '').split('_')[0]);
  const plan = String(subscription.plan || '');
  const period = subscription.planPeriod || (plan.includes('yillik') ? 'yillik' : plan.includes('aylik') ? 'aylik' : '');
  if (!period || period === 'demo') return subscription.plan === 'demo' ? `${getTierTitle(tier)} / Demo` : (subscription.plan || tier.title);
  return `${tier.title} / ${period === 'yillik' ? i18n.t('admin.subscription.yearly') : i18n.t('admin.subscription.monthly')}`;
}

export default function AdminSubscriptionScreen() {
  const headerHeight = useHeaderHeight();
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

  const status = useMemo(() => getSubscriptionStatus(subscription), [subscription]);
  const remainingDays = status.remainingDays ?? 0;
  const statusColors = useMemo(() => getStatusColors(status), [status]);
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
      return Alert.alert(i18n.t('common.info'), i18n.t('admin.subscription.alreadyActive'));
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
      Alert.alert(i18n.t('common.success'), i18n.t('admin.subscription.trialStarted'));
    } catch (err) {
      console.error(err);
      Alert.alert(i18n.t('common.error'), i18n.t('admin.subscription.trialFailed'));
    } finally {
      setSaving(false);
    }
  };

  const selectPlan = async (tier, selectedPeriod) => {
    const price = selectedPeriod === 'yillik' ? tier.yearly : tier.monthly;
    const priceText = `${formatPrice(price)} / ${selectedPeriod === 'yillik' ? i18n.t('admin.subscription.year') : i18n.t('admin.subscription.month')}`;
    const rcPackage = getRevenueCatPackageForPlan(rcPackages, tier.id, selectedPeriod);

    if (studentCount > tier.maxStudent) {
      const nextTier = getSuggestedTier(studentCount);
      return Alert.alert(
        i18n.t('admin.subscription.packageInsufficient'),
        i18n.t('admin.subscription.packageInsufficientDesc', { tier: tier.title, range: getTierRange(tier), count: studentCount, nextTier: getTierTitle(nextTier) || '' })
      );
    }

    if (!suggestedTier) {
      return Alert.alert(i18n.t('admin.subscription.specialOffer'), i18n.t('admin.subscription.over100'));
    }

    if (rcPackage) {
      Alert.alert(
        `${tier.title} ${selectedPeriod === 'yillik' ? i18n.t('admin.subscription.yearly') : i18n.t('admin.subscription.monthly')}`,
        i18n.t('admin.subscription.purchaseConfirmDesc', { range: getTierRange(tier), price: priceText }),
        [
          { text: i18n.t('admin.subscription.cancel'), style: 'cancel' },
          { text: i18n.t('admin.subscription.buy'), onPress: () => purchasePlan(tier, selectedPeriod, rcPackage) },
        ]
      );
      return;
    }

    Alert.alert(
      i18n.t('admin.subscription.packageNotReady'),
      i18n.t('admin.subscription.packageNotReadyDesc', { tier: tier.title, range: tier.range, price: priceText }),
      [
       { text: i18n.t('admin.subscription.ok'), style: 'cancel' },
      ]
    );
  };

  const purchasePlan = async (tier, selectedPeriod, rcPackage) => {
    setSaving(true);
    try {
      const result = await purchaseRevenueCatPackage(rcPackage, revenueCatUserId);
      await syncRevenueCatResult(result?.customerInfo, tier, selectedPeriod, rcPackage);
      Alert.alert(i18n.t('common.success'), i18n.t('admin.subscription.activated'));
    } catch (err) {
      const userCancelled = err?.userCancelled || err?.code === 'PURCHASE_CANCELLED';
      if (!userCancelled) {
        console.warn('Satın alma hatası:', err);
        Alert.alert(i18n.t('common.error'), i18n.t('admin.subscription.purchaseFailed'));
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
        Alert.alert(i18n.t('admin.subscription.subscriptionNotFound'), i18n.t('admin.subscription.subscriptionNotFoundDesc'));
        return;
      }
      await syncRevenueCatResult(customerInfo, activeTier || PACKAGE_TIERS[0], subscription?.planPeriod || 'aylik');
      Alert.alert(i18n.t('common.success'), i18n.t('admin.subscription.restoreSuccess'));
    } catch (err) {
      console.warn('Satın alma geri yükleme hatası:', err);
      Alert.alert(i18n.t('common.error'), i18n.t('admin.subscription.restoreFailed'));
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
      Alert.alert(i18n.t('common.success'), i18n.t('admin.subscription.periodActivated', { tier: tier.title, period: selectedPeriod === 'yillik' ? i18n.t('admin.subscription.yearly') : i18n.t('admin.subscription.monthly') }));
    } catch (err) {
      console.error(err);
      Alert.alert(i18n.t('common.error'), i18n.t('admin.subscription.activationFailed'));
    } finally {
      setSaving(false);
    }
  };

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return Alert.alert(i18n.t('common.missingInfo'), `${i18n.t('admin.subscription.promoPlaceholder')} gir.`);

    setSaving(true);
    try {
      const usageKey = `${kresId}_${code}`;
      const usageSnap = await get(ref(database, `promosyonKullanimlari/${usageKey}`));
      if (usageSnap.exists()) {
        setSaving(false);
        return Alert.alert(i18n.t('admin.subscription.codeUsed'), i18n.t('admin.subscription.promoAlreadyUsed'));
      }

      let promo = BUILT_IN_PROMOS[code] || null;
      const promoSnap = await get(ref(database, `promosyonKodlari/${code}`));
      if (promoSnap.exists()) promo = promoSnap.val();

      if (!promo || promo.aktif === false) {
        setSaving(false);
        return Alert.alert(i18n.t('admin.subscription.invalidCode'), i18n.t('admin.subscription.promoInvalid'));
      }

      const used = Number(promo.kullanimSayisi || 0);
      const max = Number(promo.maksimumKullanim || 0);
      if (max > 0 && used >= max) {
        setSaving(false);
        return Alert.alert(i18n.t('admin.subscription.limitReached'), i18n.t('admin.subscription.promoLimitReached'));
      }

      const months = Math.min(Number(promo.sureAy || 1), 1);
      const now = new Date();
      const currentEnd = getSubscriptionEndDate(subscription);
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
      Alert.alert(i18n.t('common.success'), i18n.t('admin.subscription.promoApplied', { code }));
    } catch (err) {
      console.error(err);
      Alert.alert(i18n.t('common.error'), i18n.t('admin.subscription.promoFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>{i18n.t('admin.subscription.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>💎</Text>
          <Text style={styles.heroTitle}>{i18n.t('admin.subscription.title')}</Text>
          <Text style={styles.heroDesc}>{i18n.t('admin.subscription.heroDesc', { institution: kres?.ad || i18n.t('admin.subscription.institutionFallback') })}</Text>
        </View>

        <View style={[styles.statusCard, (status.key === 'grace_period' || status.key === 'expired') && styles.statusCardDanger]}>
          <View style={styles.statusTop}>
            <Text style={styles.statusTitle}>{status.label}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: statusColors.bg, color: statusColors.color }]}>{statusColors.badge}</Text>
          </View>
          <Text style={styles.statusText}>{i18n.t('admin.subscription.planLabel')}: {getPlanLabel(subscription)}</Text>
          <Text style={styles.statusText}>{i18n.t('admin.subscription.endLabel')}: {subscription?.bitisTarihi || subscription?.demoBitisTarihi || '-'}</Text>
          {status.key === 'grace_period' ? (
            <Text style={[styles.statusText, { color: THEME.red, fontWeight: '900' }]}>
              {i18n.t('admin.subscription.overdueLabel')}: {status.daysOverdue}. {i18n.t('admin.subscription.day')} — {status.message}
            </Text>
          ) : (
            <Text style={styles.statusText}>{i18n.t('admin.subscription.remainingDays')}: {remainingDays}</Text>
          )}
        </View>

        <View style={[styles.usageCard, overLimit && styles.usageDanger]}>
          <View style={styles.usageTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.usageTitle}>{i18n.t('admin.subscription.usageTitle')}</Text>
              <Text style={styles.usageSub}>{i18n.t('admin.subscription.usageDesc')}</Text>
            </View>
            <Text style={styles.usageCount}>{studentCount}/{activeLimit || '∞'}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${getUsagePercent(studentCount, activeLimit)}%`, backgroundColor: overLimit ? THEME.red : THEME.primary }]} />
          </View>
          <Text style={[styles.usageInfo, overLimit && { color: THEME.red }]}>
            {overLimit
              ? i18n.t('admin.subscription.overLimit')
              : suggestedTier
                ? i18n.t('admin.subscription.suitablePlan', { tier: getTierTitle(suggestedTier), range: getTierRange(suggestedTier) })
                : i18n.t('admin.subscription.specialOfferDesc')}
          </Text>
        </View>

        {!subscription ? (
          <TouchableOpacity style={styles.trialButton} onPress={startTrial} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.trialText}>{i18n.t('admin.subscription.startTrial')}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.periodCard}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.subscription.paymentPeriod')}</Text>
          <View style={styles.periodRow}>
            <TouchableOpacity style={[styles.periodButton, period === 'aylik' && styles.periodButtonActive]} onPress={() => setPeriod('aylik')} activeOpacity={0.85}>
              <Text style={[styles.periodText, period === 'aylik' && styles.periodTextActive]}>{i18n.t('admin.subscription.monthly')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.periodButton, period === 'yillik' && styles.periodButtonActive]} onPress={() => setPeriod('yillik')} activeOpacity={0.85}>
              <Text style={[styles.periodText, period === 'yillik' && styles.periodTextActive]}>{i18n.t('admin.subscription.yearly')}</Text>
              <Text style={[styles.periodMini, period === 'yillik' && styles.periodMiniActive]}>{i18n.t('admin.subscription.twoMonthsFree')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{i18n.t('admin.subscription.packagesTitle')}</Text>
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
          <Text style={styles.specialTitle}>{i18n.t('admin.subscription.specialTitle')}</Text>
          <Text style={styles.specialText}>{i18n.t('admin.subscription.specialDesc')}</Text>
        </View>

        <TouchableOpacity style={[styles.restoreButton, saving && { opacity: 0.6 }]} onPress={restorePurchases} disabled={saving} activeOpacity={0.85}>
          <Text style={styles.restoreText}>{i18n.t('admin.subscription.restore')}</Text>
        </TouchableOpacity>

        {rcError ? <Text style={styles.paymentWarning}>{i18n.t('admin.subscription.paymentWarning')}</Text> : null}

        <View style={styles.promoCard}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.subscription.promoTitle')}</Text>
          <TextInput
            style={styles.input}
            value={promoCode}
            onChangeText={setPromoCode}
            placeholder={i18n.t('admin.subscription.promoPlaceholder')}
            placeholderTextColor="#999"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={[styles.applyButton, saving && { opacity: 0.6 }]} onPress={applyPromo} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.applyText}>{i18n.t('admin.subscription.applyPromo')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
     </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PlanCard({ tier, period, studentCount, active, suggested, disabled, saving, onPress }) {
  const price = period === 'yillik' ? tier.yearly : tier.monthly;
  const suffix = period === 'yillik' ? `/ ${i18n.t('admin.subscription.year')}` : `/ ${i18n.t('admin.subscription.month')}`;

  return (
    <View style={[styles.planCard, tier.featured && styles.planFeatured, active && styles.planActive, disabled && styles.planDisabled]}>
      <View style={styles.planTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{tier.title}</Text>
          <Text style={styles.planRange}>{tier.range}</Text>
        </View>
        <View style={[styles.planBadge, { backgroundColor: `${tier.color}22` }]}>
          <Text style={[styles.planBadgeText, { color: tier.color }]}>{active ? i18n.t('admin.subscription.active') : suggested ? i18n.t('admin.subscription.suitable') : i18n.t(`admin.subscription.tiers.${tier.id}.badge`)}</Text>
        </View>
      </View>
      <Text style={styles.planDesc}>{i18n.t(`admin.subscription.tiers.${tier.id}.desc`)}</Text>
      <Text style={styles.planPrice}>{formatPrice(price)} <Text style={styles.planSuffix}>{suffix}</Text></Text>
      <Text style={styles.planSmall}>{period === 'yillik' ? i18n.t('admin.subscription.yearlyPaymentInfo') : i18n.t('admin.subscription.monthlyPaymentInfo')}</Text>
      <TouchableOpacity style={[styles.planButton, disabled && styles.planButtonDisabled]} onPress={onPress} disabled={saving || disabled} activeOpacity={0.85}>
        <Text style={styles.planButtonText}>{disabled ? i18n.t('admin.subscription.insufficientForStudents', { count: studentCount }) : active ? i18n.t('admin.subscription.managePlan') : i18n.t('admin.subscription.selectPlan')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// status.key: none | expired | grace_period | expiring_soon | demo | active | passive
// status.severity (sadece expiring_soon/grace_period'da): 'critical' | 'warning'
function getTierTitle(tier) { return i18n.t(`admin.subscription.tiers.${tier?.id}.title`, { defaultValue: tier?.title || '' }); }
function getTierRange(tier) { return i18n.t(`admin.subscription.tiers.${tier?.id}.range`, { defaultValue: tier?.range || '' }); }

function getStatusColors(status) {
  switch (status.key) {
    case 'active':
      return { badge: i18n.t('admin.subscription.statusActive'), color: THEME.green, bg: '#E8FBEA' };
    case 'demo':
      return { badge: i18n.t('admin.subscription.statusDemo'), color: THEME.orange, bg: '#FFF4D8' };
    case 'expiring_soon':
      return status.severity === 'critical'
        ? { badge: 'Son Günler', color: THEME.red, bg: '#FFE8EE' }
        : { badge: 'Yaklaşıyor', color: THEME.orange, bg: '#FFF4D8' };
    case 'grace_period':
      return { badge: i18n.t('admin.subscription.statusPaymentLate'), color: THEME.red, bg: '#FFE8EE' };
    case 'blocked_manual':
      return { badge: i18n.t('admin.subscription.statusRestricted'), color: THEME.red, bg: '#FFE8EE' };
    case 'expired':
      return { badge: i18n.t('admin.subscription.statusExpired'), color: THEME.red, bg: '#FFE8EE' };
    case 'none':
    case 'passive':
    default:
      return { badge: i18n.t('admin.subscription.statusPassive'), color: THEME.red, bg: '#FFE8EE' };
  }
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
  statusCardDanger: { borderColor: THEME.red, backgroundColor: '#FFF7F8' },
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
