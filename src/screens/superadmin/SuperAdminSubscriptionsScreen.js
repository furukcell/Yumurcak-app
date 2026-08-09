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
  formatPrice,
  getTierById,
  subscribeAllSubscriptions,
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
};

export default function SuperAdminSubscriptionsScreen() {
  const { kullanici } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.MANUAL);
  const [loading, setLoading] = useState(true);
  const [allSubs, setAllSubs] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedKres, setSelectedKres] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const currentList = activeTab === TABS.GOOGLE ? googleList : manualList;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>💎</Text>
        <Text style={styles.heroTitle}>Abonelik Yönetimi</Text>
        <Text style={styles.heroDesc}>Tüm kreşlerin abonelik durumu — Google Play ve Manuel/IBAN</Text>
      </View>

      <View style={styles.tabRow}>
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

      {loading ? (
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

function KresRow({ item, onPress, actionable }) {
  const status = getSubscriptionStatus(item.subscription || {});
  const badgeColor = status.blocked
    ? THEME.red
    : status.severity === 'critical'
      ? THEME.red
      : status.severity === 'warning'
        ? THEME.orange
        : THEME.green;
  const badgeBg = status.blocked || status.severity === 'critical' ? THEME.redSoft : status.severity === 'warning' ? '#FFF4D8' : '#E8FBEA';

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
      </View>
      <Text style={[styles.rowBadge, { color: badgeColor, backgroundColor: badgeBg }]}>{status.label}</Text>
    </TouchableOpacity>
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
  rowBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, fontWeight: '900', fontSize: 11, overflow: 'hidden' },
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
    
