// ============================================================
// YUMURCAK — AdminSubscriptionScreen.js
// FAZ 5: Abonelik / Ödeme / Promosyon ekranı
// RevenueCat Android altyapısı bağlandı
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

const MONTHLY_PRICE = 1500;
const YEARLY_PRICE = 15000;

const BUILT_IN_PROMOS = {
  PILOT1AY: { kod: 'PILOT1AY', tip: 'demo', sureAy: 1, aktif: true },
  PILOT3AY: { kod: 'PILOT3AY', tip: 'demo', sureAy: 3, aktif: true },
  KRES2026: { kod: 'KRES2026', tip: 'demo', sureAy: 3, aktif: true },
};

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('tr-TR')} TL`;
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
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    const kresUnsub = onValue(ref(database, `kresler/${kresId}`), (snap) => {
      setKres(snap.val() || null);
    });

    const subUnsub = onValue(ref(database, `abonelikler/${kresId}`), (snap) => {
      setSubscription(snap.val() || null);
      setLoading(false);
    });

    return () => {
      kresUnsub();
      subUnsub();
    };
  }, [kresId]);

  useEffect(() => {
    let alive = true;

    async function loadRevenueCat() {
      setRcLoading(true);
      const result = await getRevenueCatPackages(revenueCatUserId);
      if (!alive) return;
      setRcPackages({ monthly: result.monthly, yearly: result.yearly });
      setRcError(result.error || '');
      setRcLoading(false);
    }

    loadRevenueCat();
    return () => { alive = false; };
  }, [revenueCatUserId]);

  const status = useMemo(() => getStatus(subscription), [subscription]);
  const remainingDays = useMemo(() => getRemainingDays(subscription), [subscription]);

  const startTrial = async () => {
    if (subscription?.durum === 'aktif' || subscription?.durum === 'demo') {
      return Alert.alert('Bilgi', 'Bu kreşte zaten aktif/demo abonelik var.');
    }

    setSaving(true);
    try {
      const now = new Date();
      const end = addMonths(now, 1);

      await set(ref(database, `abonelikler/${kresId}`), {
        kresId,
        plan: 'demo',
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

  const selectPlan = async (plan) => {
    const isYearly = plan === 'yillik';
    const priceText = isYearly ? `${formatPrice(YEARLY_PRICE)} / yıl` : `${formatPrice(MONTHLY_PRICE)} / ay`;
    const rcPackage = isYearly ? rcPackages.yearly : rcPackages.monthly;

    if (rcPackage) {
      Alert.alert(
        `${isYearly ? 'Yıllık' : 'Aylık'} Paket`,
        `${priceText}\n\nRevenueCat satın alma ekranı açılacak.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Satın Al', onPress: () => purchasePlan(plan, rcPackage) },
        ]
      );
      return;
    }

    Alert.alert(
      'RevenueCat Ürünü Hazır Değil',
      `${isYearly ? 'Yıllık' : 'Aylık'} paket seçildi.\n\n${priceText}\n\nGoogle Play ürünleri RevenueCat'e bağlanınca buradan gerçek ödeme alınacak. Şimdilik demo/promo kod veya manuel aktif etme kullanılabilir.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Manuel Aktif Et', onPress: () => activateManual(plan) },
      ]
    );
  };

  const purchasePlan = async (plan, rcPackage) => {
    setSaving(true);
    try {
      const result = await purchaseRevenueCatPackage(rcPackage, revenueCatUserId);
      await syncRevenueCatResult(result?.customerInfo, plan);
      Alert.alert('Başarılı', 'RevenueCat aboneliği aktif edildi.');
    } catch (err) {
      const userCancelled = err?.userCancelled || err?.code === 'PURCHASE_CANCELLED';
      if (!userCancelled) {
        console.warn('RevenueCat satın alma hatası:', err);
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
        Alert.alert('Abonelik Bulunamadı', 'Bu hesap için aktif RevenueCat aboneliği bulunamadı.');
        return;
      }
      await syncRevenueCatResult(customerInfo, subscription?.plan || 'revenuecat');
      Alert.alert('Başarılı', 'Satın alma geri yüklendi.');
    } catch (err) {
      console.warn('RevenueCat restore hatası:', err);
      Alert.alert('Hata', 'Satın alma geri yüklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const syncRevenueCatResult = async (customerInfo, plan) => {
    const active = isRevenueCatPremiumActive(customerInfo);
    if (!active) throw new Error('RevenueCat entitlement aktif değil.');

    const now = new Date();
    const expiryDate = getRevenueCatExpiryDate(customerInfo) || toDateStr(plan === 'yillik' ? addMonths(now, 12) : addMonths(now, 1));
    const finalPlan = plan === 'yillik' ? 'yillik' : plan === 'aylik' ? 'aylik' : 'revenuecat';

    await set(ref(database, `abonelikler/${kresId}`), {
      kresId,
      plan: finalPlan,
      durum: 'aktif',
      baslangicTarihi: subscription?.baslangicTarihi || toDateStr(now),
      bitisTarihi: expiryDate,
      demoBitisTarihi: '',
      fiyat: finalPlan === 'yillik' ? YEARLY_PRICE : MONTHLY_PRICE,
      paraBirimi: 'TRY',
      kaynak: 'revenuecat',
      revenueCatCustomerId: revenueCatUserId,
      revenueCatEntitlement: REVENUECAT_ENTITLEMENT_ID,
      revenueCatSyncedAt: Date.now(),
      createdAt: subscription?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  };

  const activateManual = async (plan) => {
    setSaving(true);
    try {
      const now = new Date();
      const end = plan === 'yillik' ? addMonths(now, 12) : addMonths(now, 1);

      await set(ref(database, `abonelikler/${kresId}`), {
        kresId,
        plan,
        durum: 'aktif',
        baslangicTarihi: toDateStr(now),
        bitisTarihi: toDateStr(end),
        demoBitisTarihi: '',
        fiyat: plan === 'yillik' ? YEARLY_PRICE : MONTHLY_PRICE,
        paraBirimi: 'TRY',
        kaynak: 'manuel_admin',
        revenueCatCustomerId: revenueCatUserId,
        revenueCatEntitlement: REVENUECAT_ENTITLEMENT_ID,
        createdAt: subscription?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });

      Alert.alert('Başarılı', plan === 'yillik' ? 'Yıllık abonelik aktif edildi.' : 'Aylık abonelik aktif edildi.');
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
      if (promoSnap.exists()) {
        promo = promoSnap.val();
      }

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

      await set(ref(database, `abonelikler/${kresId}`), {
        kresId,
        plan: 'demo',
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
          <Text style={styles.heroDesc}>{kres?.ad || 'Kreş'} için kullanım durumu</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <Text style={styles.statusTitle}>{status.label}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: status.bg, color: status.color }]}>{status.badge}</Text>
          </View>
          <Text style={styles.statusText}>Plan: {subscription?.plan || 'Henüz yok'}</Text>
          <Text style={styles.statusText}>Bitiş: {subscription?.bitisTarihi || subscription?.demoBitisTarihi || '-'}</Text>
          <Text style={styles.statusText}>Kalan gün: {remainingDays}</Text>
          <Text style={styles.statusText}>Kaynak: {subscription?.kaynak || '-'}</Text>
        </View>

        <View style={styles.rcCard}>
          <View style={styles.statusTop}>
            <Text style={styles.rcTitle}>RevenueCat Durumu</Text>
            <Text style={[styles.rcBadge, { backgroundColor: rcPackages.monthly || rcPackages.yearly ? '#E8F9EF' : '#FFF4E1', color: rcPackages.monthly || rcPackages.yearly ? THEME.green : THEME.orange }]}>
              {rcLoading ? 'Kontrol' : rcPackages.monthly || rcPackages.yearly ? 'Bağlı' : 'Ürün Bekliyor'}
            </Text>
          </View>
          <Text style={styles.rcText}>Offering: default</Text>
          <Text style={styles.rcText}>Entitlement: {REVENUECAT_ENTITLEMENT_ID}</Text>
          {rcError ? <Text style={styles.rcWarning}>{rcError}</Text> : null}
          <TouchableOpacity style={[styles.restoreButton, saving && { opacity: 0.6 }]} onPress={restorePurchases} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.restoreText}>Satın Almayı Geri Yükle</Text>
          </TouchableOpacity>
        </View>

        {!subscription ? (
          <TouchableOpacity style={styles.trialButton} onPress={startTrial} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.trialText}>İlk 1 Ay Ücretsiz Denemeyi Başlat</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>Paketler</Text>
        <View style={styles.planRow}>
          <PlanCard
            title="Aylık"
            price={formatPrice(MONTHLY_PRICE)}
            period="/ ay"
            desc={rcPackages.monthly ? 'RevenueCat ile satın al' : 'Google Play ürünü bekliyor'}
            rcReady={!!rcPackages.monthly}
            onPress={() => selectPlan('aylik')}
          />
          <PlanCard
            title="Yıllık"
            price={formatPrice(YEARLY_PRICE)}
            period="/ yıl"
            desc={rcPackages.yearly ? 'RevenueCat ile satın al' : 'Google Play ürünü bekliyor'}
            featured
            rcReady={!!rcPackages.yearly}
            onPress={() => selectPlan('yillik')}
          />
        </View>

        <View style={styles.promoCard}>
          <Text style={styles.sectionTitle}>Promosyon Kodu</Text>
          <Text style={styles.promoDesc}>Pilot kreşler için demo süresi tanımla. Örn: PILOT1AY, PILOT3AY</Text>
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

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>RevenueCat Hazırlığı</Text>
          <Text style={styles.noteText}>Android SDK key bağlandı.</Text>
          <Text style={styles.noteText}>Product ID: yumurcak_aylik_1500 ve yumurcak_yillik_15000</Text>
          <Text style={styles.noteText}>Google Play ürünleri bağlanınca gerçek ödeme aktif olur.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({ title, price, period, desc, featured, rcReady, onPress }) {
  return (
    <TouchableOpacity style={[styles.planCard, featured && styles.featuredPlan]} onPress={onPress} activeOpacity={0.85}>
      {featured ? <Text style={styles.bestBadge}>Avantajlı</Text> : null}
      {rcReady ? <Text style={styles.rcMiniBadge}>RevenueCat</Text> : null}
      <Text style={styles.planTitle}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
        <Text style={styles.planPrice}>{price}</Text>
        <Text style={styles.planPeriod}>{period}</Text>
      </View>
      <Text style={styles.planDesc}>{desc}</Text>
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
  rcCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  rcTitle: { color: THEME.text, fontSize: 17, fontWeight: '900' },
  rcBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, fontWeight: '900', overflow: 'hidden' },
  rcText: { color: THEME.muted, fontWeight: '800', marginTop: 4 },
  rcWarning: { color: THEME.orange, fontWeight: '800', marginTop: 8, lineHeight: 18 },
  restoreButton: { marginTop: 12, backgroundColor: THEME.primarySoft, borderRadius: 14, padding: 13, alignItems: 'center' },
  restoreText: { color: THEME.primary, fontWeight: '900' },
  trialButton: { backgroundColor: THEME.green, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 18 },
  trialText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 10 },
  planRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  planCard: { flex: 1, backgroundColor: THEME.card, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: THEME.border, minHeight: 164 },
  featuredPlan: { borderColor: THEME.gold, borderWidth: 2 },
  bestBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF5D9', color: THEME.gold, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  rcMiniBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F9EF', color: THEME.green, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  planTitle: { color: THEME.text, fontSize: 17, fontWeight: '900' },
  planPrice: { color: THEME.primary, fontSize: 22, fontWeight: '900' },
  planPeriod: { color: THEME.muted, fontWeight: '800', marginLeft: 3, marginBottom: 2 },
  planDesc: { color: THEME.muted, fontWeight: '700', marginTop: 8 },
  promoCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  promoDesc: { color: THEME.muted, fontWeight: '700', lineHeight: 20, marginBottom: 10 },
  input: { backgroundColor: THEME.bg, borderRadius: 14, padding: 13, color: THEME.text, borderWidth: 1, borderColor: THEME.border, fontWeight: '800', marginBottom: 10 },
  applyButton: { backgroundColor: THEME.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  applyText: { color: '#FFF', fontWeight: '900' },
  noteCard: { backgroundColor: '#FFF5D9', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#FFE1A1' },
  noteTitle: { color: THEME.gold, fontWeight: '900', fontSize: 16, marginBottom: 6 },
  noteText: { color: '#7A5A00', fontWeight: '700', lineHeight: 20 },
});
