import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import {
  iconFor,
  isRead,
  listenNotifications,
  readAllNotifications,
  readNotification,
} from '../../services/notificationCenter';

const THEME = {
  primary: '#6C3DEB',
  primarySoft: '#EFE8FF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
  red: '#FF4D6D',
  green: '#20B45B',
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { kullanici } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!kullanici) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = listenNotifications(kullanici, (list) => {
      setItems(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [kullanici]);

  const unreadCount = useMemo(() => items.filter((item) => !isRead(item, kullanici)).length, [items, kullanici]);

  const openNotification = async (item) => {
    try {
      await readNotification(item.id, kullanici);
    } catch (error) {
      console.warn('Bildirim okundu yapılamadı:', error);
    }

    if (!item.routeName) return;

    try {
      navigation.navigate(item.routeName, item.routeParams || {});
    } catch (error) {
      Alert.alert('Bilgi', 'Bu bildirimin ilgili ekranı şu an açılamıyor.');
    }
  };

  const markAllRead = async () => {
    try {
      await readAllNotifications(items, kullanici);
    } catch (error) {
      console.warn('Tüm bildirimler okundu yapılamadı:', error);
      Alert.alert('Hata', 'Bildirimler okundu yapılamadı.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Bildirimler</Text>
          <Text style={styles.subtitle}>{unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}</Text>
        </View>
        <TouchableOpacity style={styles.readAllButton} onPress={markAllRead} activeOpacity={0.82}>
          <Text style={styles.readAllText}>Okundu</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={THEME.primary} />
          <Text style={styles.centerText}>Bildirimler yükleniyor...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
          <Text style={styles.emptyDesc}>Duyuru, mesaj, ödeme ve rapor bildirimleri burada görünecek.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {items.map((item) => {
            const read = isRead(item, kullanici);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, !read && styles.unreadCard]}
                onPress={() => openNotification(item)}
                activeOpacity={0.86}
              >
                <View style={styles.iconBox}>
                  <Text style={styles.icon}>{iconFor(item.tip)}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.baslik}</Text>
                    {!read ? <View style={styles.dot} /> : null}
                  </View>
                  <Text style={styles.cardMessage} numberOfLines={2}>{item.mesaj}</Text>
                  <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>
                {item.routeName ? <Text style={styles.arrow}>›</Text> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function formatDate(value) {
  if (!value) return 'Tarih yok';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return 'Tarih yok';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 0,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 10 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.border },
  backText: { color: THEME.primary, fontSize: 34, lineHeight: 36, fontWeight: '900' },
  headerTextBlock: { flex: 1, minWidth: 0 },
  title: { color: THEME.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: THEME.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  readAllButton: { backgroundColor: THEME.primarySoft, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  readAllText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { marginTop: 10, color: THEME.muted, fontWeight: '800' },
  emptyBox: { margin: 18, backgroundColor: THEME.card, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  emptyIcon: { fontSize: 46, marginBottom: 10 },
  emptyTitle: { color: THEME.text, fontSize: 19, fontWeight: '900' },
  emptyDesc: { color: THEME.muted, textAlign: 'center', marginTop: 8, lineHeight: 20, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { backgroundColor: THEME.card, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', alignItems: 'center' },
  unreadCard: { borderColor: THEME.primary, backgroundColor: '#FBFAFF' },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  icon: { fontSize: 24 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, color: THEME.text, fontSize: 15, fontWeight: '900' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.red, marginLeft: 8 },
  cardMessage: { color: THEME.muted, fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 4 },
  cardDate: { color: '#9A9CAD', fontSize: 11, fontWeight: '800', marginTop: 7 },
  arrow: { color: THEME.primary, fontSize: 28, fontWeight: '900', marginLeft: 8 },
});