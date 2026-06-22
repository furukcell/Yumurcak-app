// ============================================================
// YUMURCAK — PaymentListScreen.js
// Ödeme takibi — çocuk bazlı aylık ödeme durumu
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const DURUM_RENK = { odendi: '#20B45B', bekliyor: '#FF9F1C', gecikti: '#FF4D6D' };
const DURUM_ETIKET = { odendi: '✅ Ödendi', bekliyor: '⏳ Bekliyor', gecikti: '❗ Gecikti' };
const AY_ADLARI = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function pad2(value) { return String(value).padStart(2, '0'); }
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatMoney(value) {
  const number = Number(value || 0);
  return number ? `${number.toLocaleString('tr-TR')} ₺` : '-';
}

export default function PaymentListScreen() {
  const navigation = useNavigation();
  const { kullanici } = useAuth();
  const kresId = kullanici?.kresId || 'default-kres';
  const [odemeler, setOdemeler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let odemelerData = {};
    let cocuklarData = {};
    let odemelerLoaded = false;
    let cocuklarLoaded = false;

    function buildList() {
      if (!odemelerLoaded || !cocuklarLoaded) return;
      const liste = Object.entries(odemelerData)
        .filter(([, o]) => !o.kresId || o.kresId === kresId)
        .map(([id, o]) => {
          const cocuk = cocuklarData[o.cocukId] || {};
          const cocukAd = `${cocuk.ad || ''} ${cocuk.soyad || ''}`.trim() || cocuk.adSoyad || o.cocukAd || o.cocukId || 'Çocuk';
          const donem = o.donem || `${AY_ADLARI[o.ay] || o.ay || ''} ${o.yil || ''}`.trim() || 'Dönem yok';
          return { id, ...o, cocukAd, donem };
        });
      liste.sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
      setOdemeler(liste);
      setLoading(false);
    }

    const odemelerUnsub = onValue(ref(database, 'odemeler'), (snap) => {
      odemelerData = snap.val() || {};
      odemelerLoaded = true;
      buildList();
    });
    const cocuklarUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
      cocuklarData = snap.val() || {};
      cocuklarLoaded = true;
      buildList();
    });
    return () => { odemelerUnsub(); cocuklarUnsub(); };
  }, [kresId]);

  async function odendiYap(item) {
    if (!item?.id) return;
    setBusyId(item.id);
    try {
      await update(ref(database, `odemeler/${item.id}`), {
        durum: 'odendi',
        odemeTarihi: item.odemeTarihi || todayKey(),
        updatedAt: Date.now(),
      });
    } catch (e) {
      Alert.alert('Hata', 'Ödeme durumu güncellenemedi.');
    } finally {
      setBusyId(null);
    }
  }

  const renderItem = ({ item }) => {
    const durumRenk = DURUM_RENK[item.durum] || '#888';
    const durumEtiket = DURUM_ETIKET[item.durum] || item.durum || 'Bekliyor';
    const busy = busyId === item.id;
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => navigation.navigate('PaymentForm', { paymentId: item.id })} activeOpacity={0.8}>
          <View style={styles.cardTop}>
            <View style={styles.cardLeft}>
              <Text style={styles.cocukAd}>{item.cocukAd}</Text>
              <Text style={styles.baslik}>{item.baslik || item.aciklama || 'Aylık ücret'}</Text>
              <Text style={styles.donem}>{item.donem}</Text>
            </View>
            <View style={[styles.durumBadge, { backgroundColor: durumRenk + '22' }]}>
              <Text style={[styles.durumYazi, { color: durumRenk }]}>{durumEtiket}</Text>
            </View>
          </View>
          <View style={styles.cardBottom}>
            <Text style={styles.tutar}>{formatMoney(item.tutar)}</Text>
            <Text style={styles.tarih}>{item.odemeTarihi ? `📅 ${item.odemeTarihi}` : item.sonOdemeTarihi ? `Son: ${item.sonOdemeTarihi}` : ''}</Text>
          </View>
        </TouchableOpacity>
        {item.durum !== 'odendi' ? (
          <TouchableOpacity style={[styles.odendiBtn, busy && { opacity: 0.6 }]} onPress={() => odendiYap(item)} disabled={busy} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.odendiBtnText}>✅ Ödendi Yap</Text>}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3C3489" /></View>;

  const toplamOdendi = odemeler.filter((o) => o.durum === 'odendi').length;
  const toplamBekliyor = odemeler.filter((o) => o.durum === 'bekliyor').length;
  const toplamGecikti = odemeler.filter((o) => o.durum === 'gecikti').length;

  return (
    <SafeAreaView style={styles.safe}>
      {odemeler.length > 0 && (
        <View style={styles.ozetSerit}>
          <View style={styles.ozetKutu}><Text style={[styles.ozetSayi, { color: DURUM_RENK.odendi }]}>{toplamOdendi}</Text><Text style={styles.ozetEtiket}>Ödendi</Text></View>
          <View style={styles.ozetAyrac} />
          <View style={styles.ozetKutu}><Text style={[styles.ozetSayi, { color: DURUM_RENK.bekliyor }]}>{toplamBekliyor}</Text><Text style={styles.ozetEtiket}>Bekliyor</Text></View>
          <View style={styles.ozetAyrac} />
          <View style={styles.ozetKutu}><Text style={[styles.ozetSayi, { color: DURUM_RENK.gecikti }]}>{toplamGecikti}</Text><Text style={styles.ozetEtiket}>Gecikti</Text></View>
        </View>
      )}
      <View style={styles.container}>
        {odemeler.length === 0 ? (
          <View style={styles.bos}><Text style={styles.bosEmoji}>💳</Text><Text style={styles.bosYazi}>Henüz ödeme kaydı yok</Text><Text style={styles.bosAlt}>+ butonuyla yeni kayıt ekle</Text></View>
        ) : <FlatList data={odemeler} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} />}
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('PaymentForm')} activeOpacity={0.85}><Text style={styles.fabText}>+</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  ozetSerit: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  ozetKutu: { flex: 1, alignItems: 'center' },
  ozetSayi: { fontSize: 22, fontWeight: '900' },
  ozetEtiket: { fontSize: 11, color: '#888', fontWeight: '700', marginTop: 2 },
  ozetAyrac: { width: 1, backgroundColor: '#eee', marginVertical: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1, paddingRight: 10 },
  cocukAd: { fontSize: 15, fontWeight: '900', color: '#191A23', marginBottom: 3 },
  baslik: { fontSize: 13, color: '#3C3489', fontWeight: '800', marginBottom: 2 },
  donem: { fontSize: 13, color: '#888', fontWeight: '600' },
  durumBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  durumYazi: { fontSize: 12, fontWeight: '800' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tutar: { fontSize: 18, fontWeight: '900', color: '#3C3489' },
  tarih: { fontSize: 12, color: '#888', fontWeight: '700' },
  odendiBtn: { marginTop: 12, backgroundColor: '#20B45B', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  odendiBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 16, fontWeight: '700', color: '#666', marginBottom: 6 },
  bosAlt: { fontSize: 13, color: '#999' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: '#3C3489', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#3C3489', shadowOpacity: 0.35, shadowRadius: 10 },
  fabText: { fontSize: 32, color: '#fff', lineHeight: 36, fontWeight: '700' },
});