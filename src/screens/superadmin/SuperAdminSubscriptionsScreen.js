// ============================================================
// YUMURCAK — SuperAdminSubscriptionsScreen.js
// Superadmin: tüm kreşlerin aboneliklerini görüntüleme +
// manuel/IBAN abonelik tanımlama (Google Play dışı satış)
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useAuth } from '../../context/AuthContext';
import {
  PACKAGE_TIERS,
  activateManualSubscription,
  approveManualRequest,
  confirmManualPayment,
  formatPrice,
  getTierById,
  rejectManualRequest,
  setManualAccessRestriction,
  subscribeAllSubscriptions,
  subscribeManualRequests,
} from '../../services/subscriptionService';
import { getSubscriptionStatus } from '../../utils/subscriptionStatus';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  red: '#FF4D6D',
  redSoft: '#FFE8EE',
  gold: '#C98A00',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const TABS = {
  GOOGLE: 'google',
  MANUAL: 'manual',
  REQUESTS: 'requests',
};

export default function SuperAdminSubscriptionsScreen({ navigation }) {
  const { kullanici } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.REQUESTS);
  const [loading, setLoading] = useState(true);
  const [allSubs, setAllSubs] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedKres, setSelectedKres] = useState(null);
  const [saving, setSaving] = useState(false);
  const [manualRequests, setManualRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState('');

  useEffect(() => {
    const unsub = subscribeAllSubscriptions((list) => {
      setAllSubs(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeManualRequests((list) => {
      setManualRequests(list);
      setRequestsLoading(false);
    });
    return unsub;
  }, []);

  const pendingRequests = useMemo(
    () => manualRequests.filter((r) => r.durum === 'bekliyor'),
    [manualRequests]
  );
  const pastRequests = useMemo(
    () => manualRequests.filter((r) => r.durum !== 'bekliyor'),
    [manualRequests]
  );

  useEffect(() => {
    const unsub = subscribeAllSubscriptions((list) => {
      setAllSubs(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const googleList = useMemo(
    () => allSubs.filter((item) => item.subscription?.kaynak === 'revenuecat'),
    [allSubs]
  );

  const manualList = useMemo(
    () => allSubs.filter((item) => item.subscription?.kaynak === 'manuel_iban'),
    [allSubs]
  );

  const filteredKresListForPicker = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return allSubs;
    return allSubs.filter((item) => item.ad.toLowerCase().includes(q));
  }, [allSubs, searchText]);

  const openManualForm = (kresItem) => {
    setSelectedKres(kresItem);
    setModalVisible(true);
  };

  const handleApproveRequest = (req) => {
    Alert.alert(
      'Talebi Onayla',
      `${req.kresAdi || req.kresId} — ${req.ogrenciSayisi} öğrenci × ${formatPrice(req.birimFiyat)} = ${formatPrice(req.hesaplananTutar)} / ${req.period === 'yillik' ? 'yıl' : 'ay'}\n\nDekontu kontrol ettin mi? Onaylarsan abonelik hemen aktif olur.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            setProcessingRequestId(req.talepId);
            try {
              const kresRecord = allSubs.find((s) => s.kresId === req.kresId);
              await approveManualRequest({
                kresId: req.kresId,
                talepId: req.talepId,
                tanimlayanUid: kullanici?.uid || kullanici?.id || '',
                existingSubscription: kresRecord?.subscription || null,
              });
              Alert.alert('Başarılı', 'Abonelik aktif edildi.');
            } catch (err) {
              console.error(err);
              Alert.alert('Hata', err?.message || 'Talep onaylanamadı.');
            } finally {
              setProcessingRequestId('');
            }
          },
        },
      ]
    );
  };

  const handleRejectRequest = (req) => {
    Alert.prompt
      ? Alert.prompt(
          'Talebi Reddet',
          'Kısa bir ret notu yaz (yönetici görecek):',
          [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Reddet',
              style: 'destructive',
              onPress: async (redNotu) => {
                setProcessingRequestId(req.talepId);
                try {
                  await rejectManualRequest({
                    kresId: req.kresId,
                    talepId: req.talepId,
                    redNotu: redNotu || '',
                    tanimlayanUid: kullanici?.uid || kullanici?.id || '',
                  });
                } catch (err) {
                  console.error(err);
                  Alert.alert('Hata', 'Talep reddedilemedi.');
                } finally {
                  setProcessingRequestId('');
                }
              },
            },
          ],
          'plain-text'
        )
      : Alert.alert('Talebi Reddet', 'Emin misin?', [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Reddet',
            style: 'destructive',
            onPress: async () => {
              setProcessingRequestId(req.talepId);
              try {
                await rejectManualRequest({
                  kresId: req.kresId,
                  talepId: req.talepId,
                  tanimlayanUid: kullanici?.uid || kullanici?.id || '',
                });
              } catch (err) {
                console.error(err);
                Alert.alert('Hata', 'Talep reddedilemedi.');
              } finally {
                setProcessingRequestId('');
              }
            },
          },
        ]);
  };

  const currentList = activeTab === TABS.GOOGLE ? googleList : manualList;

  const handleToggleRestriction = (item, restrict) => {
    Alert.alert(
      restrict ? 'Erişimi Kısıtla' : 'Kısıtlamayı Kaldır',
      restrict
        ? `${item.ad} için erişimi kısıtlamak istediğine emin misin? Kurum ödeme yapana kadar uygulamayı kullanamaz.`
        : `${item.ad} için erişim kısıtlamasını kaldırmak istediğine emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: restrict ? 'Kısıtla' : 'Kaldır',
          style: restrict ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await setManualAccessRestriction({
                kresId: item.kresId,
                restricted: restrict,
                tanimlayanUid: kullanici?.uid || kullanici?.id || '',
              });
            } catch (err) {
              console.error(err);
              Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
            }
          },
        },
      ]
    );
  };

  const handleConfirmPayment = (item) => {
    const period = item.subscription?.planPeriod === 'yillik' ? 'yıl' : 'ay';
    Alert.alert(
      'Ödeme Geldi',
      `${item.ad} için ödemenin geldiğini onaylıyor musun? Onaylarsan abonelik süresi 1 ${period} uzatılır ve varsa erişim kısıtlaması kaldırılır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              await confirmManualPayment({
                kresId: item.kresId,
                subscription: item.subscription,
                tanimlayanUid: kullanici?.uid || kullanici?.id || '',
              });
            } catch (err) {
              console.error(err);
              Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.hero}>
        <TouchableOpacity style={styles.heroBack} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.heroBackText}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.heroIcon}>💎</Text>
        <Text style={styles.heroTitle}>Abonelik Yönetimi</Text>
        <Text style={styles.heroDesc}>Tüm kreşlerin abonelik durumu — Google Play ve Manuel/IBAN</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === TABS.REQUESTS && styles.tabButtonActive]}
          onPress={() => setActiveTab(TABS.REQUESTS)}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, activeTab === TABS.REQUESTS && styles.tabTextActive]}>
            Bekleyen Talepler ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === TABS.GOOGLE && styles.tabButtonActive]}
          onPress={() => setActiveTab(TABS.GOOGLE)}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, activeTab === TABS.GOOGLE && styles.tabTextActive]}>
            Google Play ({googleList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === TABS.MANUAL && styles.tabButtonActive]}
          onPress={() => setActiveTab(TABS.MANUAL)}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, activeTab === TABS.MANUAL && styles.tabTextActive]}>
            Manuel / IBAN ({manualList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === TABS.MANUAL ? (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Kreş ara (yeni abonelik tanımlamak için)"
            placeholderTextColor="#999"
          />
        </View>
      ) : null}

      {activeTab === TABS.REQUESTS ? (
        requestsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : (
          <FlatList
            data={[...pendingRequests, ...pastRequests]}
            keyExtractor={(item) => item.talepId}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>Henüz öğrenci-bazlı abonelik talebi yok.</Text>}
            renderItem={({ item }) => (
              <RequestRow
                item={item}
                processing={processingRequestId === item.talepId}
                onApprove={() => handleApproveRequest(item)}
                onReject={() => handleRejectRequest(item)}
              />
            )}
          />
        )
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTab === TABS.MANUAL && searchText.trim() ? filteredKresListForPicker : currentList}
          keyExtractor={(item) => item.kresId}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {activeTab === TABS.GOOGLE ? 'Google Play üzerinden abonelik bulunamadı.' : 'Henüz manuel abonelik yok. Aşağıdan kreş seçip tanımlayabilirsin.'}
            </Text>
          }
          renderItem={({ item }) => (
            <KresRow
              item={item}
              onPress={() => activeTab === TABS.MANUAL && openManualForm(item)}
              actionable={activeTab === TABS.MANUAL}
              onToggleRestriction={(restrict) => handleToggleRestriction(item, restrict)}
              onConfirmPayment={() => handleConfirmPayment(item)}
            />
          )}
        />
      )}

      <ManualSubscriptionModal
        visible={modalVisible}
        kresItem={selectedKres}
        saving={saving}
        onClose={() => setModalVisible(false)}
        onSave={async (formData) => {
          if (!selectedKres) return;
          setSaving(true);
          try {
            await activateManualSubscription({
              kresId: selectedKres.kresId,
              tierId: formData.tierId,
              period: formData.period,
              customEndDate: formData.customEndDate,
              price: formData.price,
              manuelNot: formData.manuelNot,
              odemeReferansi: formData.odemeReferansi,
              tanimlayanUid: kullanici?.uid || kullanici?.id || '',
              existingSubscription: selectedKres.subscription,
            });
            setModalVisible(false);
            Alert.alert('Başarılı', `${selectedKres.ad} için abonelik tanımlandı.`);
          } catch (err) {
            console.error(err);
            Alert.alert('Hata', 'Abonelik tanımlanamadı. Firebase kurallarını kontrol et.');
          } finally {
            setSaving(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

function KresRow({ item, onPress, actionable, onToggleRestriction, onConfirmPayment }) {
  const status = getSubscriptionStatus(item.subscription || {});
  const badgeColor = status.blocked
    ? THEME.red
    : status.severity === 'critical'
      ? THEME.red
      : status.severity === 'warning'
        ? THEME.orange
        : THEME.green;
  const badgeBg = status.blocked || status.severity === 'critical' ? THEME.redSoft : status.severity === 'warning' ? '#FFF4D8' : '#E8FBEA';
  const showRestrictionControls = status.key === 'grace_period' || status.key === 'blocked_manual';
  // "Ödeme Geldi" tiki sadece manuel/IBAN abonelikte ve süre geçtiğinde/kısıtlandığında görünür.
  const isManual = item.subscription?.kaynak === 'manuel_iban';
  const showConfirmPayment = isManual && (status.key === 'grace_period' || status.key === 'blocked_manual');

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={actionable ? 0.75 : 1} disabled={!actionable}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.ad}</Text>
        <Text style={styles.rowSub}>
          {item.subscription
            ? `${getTierById(item.subscription.planTier)?.title || item.subscription.plan} • Bitiş: ${item.subscription.bitisTarihi || item.subscription.demoBitisTarihi || '-'}`
            : 'Abonelik yok'}
        </Text>
        {item.subscription?.odemeReferansi ? (
          <Text style={styles.rowRef}>Ref: {item.subscription.odemeReferansi}</Text>
        ) : null}
        {status.key === 'grace_period' ? (
          <Text style={styles.graceText}>{status.daysOverdue} gündür ödenmedi</Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {showConfirmPayment ? (
            <TouchableOpacity
              style={styles.confirmPaymentButton}
              onPress={(e) => {
                e.stopPropagation?.();
                onConfirmPayment?.();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmPaymentButtonText}>✅ Ödeme Geldi</Text>
            </TouchableOpacity>
          ) : null}
          {showRestrictionControls ? (
            <TouchableOpacity
              style={status.key === 'blocked_manual' ? styles.unrestrictButton : styles.restrictButton}
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleRestriction?.(status.key !== 'blocked_manual');
              }}
              activeOpacity={0.85}
            >
              <Text style={status.key === 'blocked_manual' ? styles.unrestrictButtonText : styles.restrictButtonText}>
                {status.key === 'blocked_manual' ? 'Kısıtlamayı Kaldır' : 'Erişimi Kısıtla'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <Text style={[styles.rowBadge, { color: badgeColor, backgroundColor: badgeBg }]}>{status.label}</Text>
    </TouchableOpacity>
  );
}

function RequestRow({ item, processing, onApprove, onReject }) {
  const isPending = item.durum === 'bekliyor';
  const badgeColor = item.durum === 'onaylandi' ? THEME.green : item.durum === 'reddedildi' ? THEME.red : THEME.orange;
  const badgeBg = item.durum === 'onaylandi' ? '#E8FBEA' : item.durum === 'reddedildi' ? THEME.redSoft : '#FFF4D8';
  const badgeLabel = item.durum === 'onaylandi' ? 'Onaylandı' : item.durum === 'reddedildi' ? 'Reddedildi' : 'Bekliyor';

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.kresAdi || item.kresId}</Text>
          <Text style={styles.rowSub}>
            {item.ogrenciSayisi} öğrenci × {formatPrice(item.birimFiyat)} = {formatPrice(item.hesaplananTutar)} / {item.period === 'yillik' ? 'yıl' : 'ay'}
          </Text>
          <Text style={styles.rowRef}>{item.olusturmaTarihi}</Text>
        </View>
        <Text style={[styles.rowBadge, { color: badgeColor, backgroundColor: badgeBg }]}>{badgeLabel}</Text>
      </View>

      {item.dekontUrl ? <Image source={{ uri: item.dekontUrl }} style={styles.requestDekont} resizeMode="cover" /> : null}

      {item.durum === 'reddedildi' && item.redNotu ? (
        <Text style={styles.requestRedNot}>Ret notu: {item.redNotu}</Text>
      ) : null}

      {isPending ? (
        <View style={styles.requestActionRow}>
          <TouchableOpacity style={styles.rejectButton} onPress={onReject} disabled={processing} activeOpacity={0.85}>
            <Text style={styles.rejectButtonText}>Reddet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveButton} onPress={onApprove} disabled={processing} activeOpacity={0.85}>
            {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveButtonText}>Onayla ve Aktif Et</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function ManualSubscriptionModal({ visible, kresItem, saving, onClose, onSave }) {
  const [tierId, setTierId] = useState('baslangic');
  const [period, setPeriod] = useState('aylik');
  const [customEndDate, setCustomEndDate] = useState(''); // 'YYYY-MM-DD'
  const [price, setPrice] = useState('');
  const [manuelNot, setManuelNot] = useState('');
  const [odemeReferansi, setOdemeReferansi] = useState('');

  useEffect(() => {
    if (visible && kresItem) {
      const existing = kresItem.subscription;
      setTierId(existing?.planTier || 'baslangic');
      setPeriod('aylik');
      setCustomEndDate('');
      setPrice('');
      setManuelNot('');
      setOdemeReferansi('');
    }
  }, [visible, kresItem]);

  if (!kresItem) return null;

  const tier = getTierById(tierId);
  const suggestedPrice = period === 'yillik' ? tier.yearly : tier.monthly;

  const handleSave = () => {
    if (period === 'ozel' && !/^\d{4}-\d{2}-\d{2}$/.test(customEndDate.trim())) {
      return Alert.alert('Eksik Bilgi', 'Özel süre için bitiş tarihini YYYY-MM-DD formatında gir (örn: 2026-12-31).');
    }
    onSave({
      tierId,
      period,
      customEndDate: period === 'ozel' ? customEndDate.trim() : null,
      price: price.trim() ? price.trim() : suggestedPrice,
      manuelNot: manuelNot.trim(),
      odemeReferansi: odemeReferansi.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.modalCard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Text style={styles.modalTitle}>{kresItem.ad}</Text>
          <Text style={styles.modalSub}>Manuel / IBAN abonelik tanımla</Text>

          <Text style={styles.fieldLabel}>Paket</Text>
          <View style={styles.chipRow}>
            {PACKAGE_TIERS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, tierId === t.id && styles.chipActive]}
                onPress={() => setTierId(t.id)}
              >
                <Text style={[styles.chipText, tierId === t.id && styles.chipTextActive]}>{t.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Süre</Text>
          <View style={styles.chipRow}>
            {[
              { id: 'aylik', label: 'Aylık' },
              { id: 'yillik', label: 'Yıllık' },
              { id: 'ozel', label: 'Özel Tarih' },
            ].map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, period === p.id && styles.chipActive]}
                onPress={() => setPeriod(p.id)}
              >
                <Text style={[styles.chipText, period === p.id && styles.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {period === 'ozel' ? (
            <>
              <Text style={styles.fieldLabel}>Bitiş Tarihi (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={customEndDate}
                onChangeText={setCustomEndDate}
                placeholder="2026-12-31"
                placeholderTextColor="#999"
              />
            </>
          ) : null}

          <Text style={styles.fieldLabel}>Fiyat (boş bırakılırsa önerilen: {formatPrice(suggestedPrice)})</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder={String(suggestedPrice)}
            placeholderTextColor="#999"
            keyboardType="numeric"
          />

          <Text style={styles.fieldLabel}>Ödeme Referansı / Dekont No</Text>
          <TextInput
            style={styles.input}
            value={odemeReferansi}
            onChangeText={setOdemeReferansi}
            placeholder="Örn: 09.08.2026 EFT - Ayşe Yılmaz"
            placeholderTextColor="#999"
          />

          <Text style={styles.fieldLabel}>Not (opsiyonel)</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            value={manuelNot}
            onChangeText={setManuelNot}
            placeholder="Serbest not..."
            placeholderTextColor="#999"
            multiline
          />

          <View style={styles.modalButtonRow}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose} disabled={saving}>
              <Text style={styles.modalCancelText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSave} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Aboneliği Tanımla</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: THEME.primary, borderRadius: 26, padding: 20, margin: 16, marginBottom: 10 },
  heroBack: { alignSelf: 'flex-start', marginBottom: 10 },
  heroBackText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  heroIcon: { fontSize: 30 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 6 },
  heroDesc: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 4, lineHeight: 18 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 10 },
  tabButton: { flex: 1, backgroundColor: THEME.primarySoft, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  tabButtonActive: { backgroundColor: THEME.primary },
  tabText: { color: THEME.primary, fontWeight: '900', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, paddingVertical: 12, color: THEME.text, fontWeight: '700' },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 60 },
  emptyText: { color: THEME.muted, fontWeight: '700', textAlign: 'center', marginTop: 30, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.border, marginBottom: 10, gap: 10 },
  rowTitle: { color: THEME.text, fontSize: 15, fontWeight: '900' },
  rowSub: { color: THEME.muted, fontWeight: '700', marginTop: 3, fontSize: 12 },
  rowRef: { color: THEME.muted, fontWeight: '600', marginTop: 2, fontSize: 11, fontStyle: 'italic' },
  graceText: { color: THEME.red, fontWeight: '800', fontSize: 11, marginTop: 4 },
  restrictButton: { alignSelf: 'flex-start', backgroundColor: THEME.redSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  restrictButtonText: { color: THEME.red, fontWeight: '900', fontSize: 11 },
  unrestrictButton: { alignSelf: 'flex-start', backgroundColor: '#E8FBEA', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  unrestrictButtonText: { color: THEME.green, fontWeight: '900', fontSize: 11 },
  confirmPaymentButton: { alignSelf: 'flex-start', backgroundColor: '#E8FBEA', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  confirmPaymentButtonText: { color: THEME.green, fontWeight: '900', fontSize: 11 },
  rowBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, fontWeight: '900', fontSize: 11, overflow: 'hidden' },
  requestCard: { backgroundColor: THEME.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.border, marginBottom: 10 },
  requestTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  requestDekont: { width: '100%', height: 160, borderRadius: 14, marginTop: 10, backgroundColor: THEME.bg },
  requestRedNot: { color: THEME.red, fontWeight: '700', fontSize: 12, marginTop: 8 },
  requestActionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rejectButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: THEME.redSoft },
  rejectButtonText: { color: THEME.red, fontWeight: '900' },
  approveButton: { flex: 2, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: THEME.green },
  approveButtonText: { color: '#fff', fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: '90%' },
  modalTitle: { color: THEME.text, fontSize: 19, fontWeight: '900' },
  modalSub: { color: THEME.muted, fontWeight: '700', marginTop: 3, marginBottom: 14 },
  fieldLabel: { color: THEME.text, fontWeight: '800', fontSize: 13, marginBottom: 6, marginTop: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, backgroundColor: THEME.primarySoft },
  chipActive: { backgroundColor: THEME.primary },
  chipText: { color: THEME.primary, fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: '#F8F6FF', borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 13, paddingVertical: 11, color: THEME.text, fontWeight: '700' },
  modalButtonRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: THEME.primarySoft },
  modalCancelText: { color: THEME.primary, fontWeight: '900' },
  modalSave: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: THEME.primary },
  modalSaveText: { color: '#fff', fontWeight: '900' },
});
