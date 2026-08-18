// ============================================================
// YUMURCAK — AdminVehicleListScreen.js
// Servis araçları (plaka + atanmış servis görevlisi) listesi.
// Her araç bir "servisci" rolündeki kullanıcıya bağlanır;
// AdminServiceScreen'de çocuklar bu araçlara atanır (FAZ sonraki adım).
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ref, onValue, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';

export default function AdminVehicleListScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const kresId = kullanici?.kresId;

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [servisciMap, setServisciMap] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!kresId) {
      setLoading(false);
      return undefined;
    }

    const vehiclesQuery = query(ref(database, 'servisler'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(vehiclesQuery, async (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));

      const servisciIds = Array.from(new Set(list.map((v) => v.servisciId).filter(Boolean)));
      const servisciResults = await Promise.all(
        servisciIds.map((id) => get(ref(database, `kullanicilar/${id}`)).then((s) => (s.exists() ? [id, s.val()] : null)))
      );
      setServisciMap(Object.fromEntries(servisciResults.filter(Boolean)));

      list.sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));
      setVehicles(list);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [kresId]);

  function handleDelete(vehicle) {
    Alert.alert(
      'Servis Aracını Sil',
      `"${vehicle.ad || vehicle.plaka}" silinsin mi? Bu araca atanmış çocukların servis ataması kaldırılmayacak, ayrıca kontrol edip yeniden atamanız gerekir.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(vehicle.id);
            try {
              await remove(ref(database, `servisler/${vehicle.id}`));
            } catch (error) {
              console.log(error);
              Alert.alert('Hata', 'Araç silinemedi.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Servis Araçları</Text>
              <Text style={styles.subtitle}>{vehicles.length} araç kayıtlı</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AdminVehicleForm')}
            activeOpacity={0.85}
          >
            <Text style={styles.addButtonText}>+ Yeni Servis Aracı Ekle</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
          ) : vehicles.length === 0 ? (
            <Text style={styles.emptyText}>Henüz servis aracı eklenmedi.</Text>
          ) : (
            vehicles.map((vehicle) => {
              const servisci = servisciMap[vehicle.servisciId];
              return (
                <TouchableOpacity
                  key={vehicle.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('AdminVehicleForm', { vehicleId: vehicle.id })}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehicleName}>{vehicle.ad || 'İsimsiz Servis'}</Text>
                      <Text style={styles.vehiclePlaka}>{vehicle.plaka || 'Plaka girilmemiş'}</Text>
                    </View>
                    <TouchableOpacity
                      disabled={deletingId === vehicle.id}
                      style={styles.deleteButton}
                      onPress={() => handleDelete(vehicle)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.deleteButtonText}>{deletingId === vehicle.id ? '...' : '🗑️'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.servisciText}>
                    {servisci ? `👤 ${servisci.ad || servisci.kullaniciAdi}` : '⚠️ Görevli hesabı bulunamadı'}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
    screen: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 16, paddingBottom: 36 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    backButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: theme.border },
    backText: { color: theme.primary, fontWeight: '900', fontSize: 15 },
    headerTextWrap: { flex: 1, minWidth: 0 },
    title: { color: theme.primary, fontSize: 24, fontWeight: '900' },
    subtitle: { color: theme.muted, fontSize: 13, fontWeight: '700', marginTop: 3 },
    addButton: { backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
    addButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
    emptyText: { color: theme.muted, textAlign: 'center', marginTop: 30, fontWeight: '700' },
    card: { backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 12 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    vehicleName: { fontSize: 16, fontWeight: '900', color: theme.text },
    vehiclePlaka: { fontSize: 13, fontWeight: '700', color: theme.muted, marginTop: 2 },
    deleteButton: { paddingHorizontal: 10, paddingVertical: 6 },
    deleteButtonText: { fontSize: 18 },
    servisciText: { fontSize: 13, fontWeight: '700', color: theme.text, marginTop: 4 },
  });
}
