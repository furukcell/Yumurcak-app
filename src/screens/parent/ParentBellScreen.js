import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ref, push, serverTimestamp } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, useParentBase, LoadingScreen, EmptyState } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';

export default function ParentBellScreen({ navigation }) {
  const base = useParentBase();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [teslimTuru, setTeslimTuru] = useState('alacagim');
  const [sending, setSending] = useState(false);

  const { loading, selectedChild, childName, kresId, kresAdi, kullanici } = base;

  if (loading) return <LoadingScreen text="Kurum zili hazırlanıyor..." />;
  if (!selectedChild) {
    return (
      <ScreenShell title="Kurum Zili" emoji="🔔" navigation={navigation}>
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Kurum zili için veli hesabına bağlı çocuk gerekir." />
      </ScreenShell>
    );
  }

  const sendBell = async (durum) => {
    if (sending) return;
    setSending(true);
    try {
      await push(ref(database, 'kurumZili'), {
        kresId: kresId || null,
        cocukId: selectedChild.id,
        cocukAdi: childName,
        veliId: kullanici?.uid || kullanici?.id || null,
        veliAdi: `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() || kullanici?.kullaniciAdi || 'Veli',
        teslimTuru,
        durum,
        okundu: false,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Bildirim gönderildi', durum === 'geliyorum' ? 'Kuruma yaklaştığınız bildirildi.' : 'Kapıda olduğunuz bildirildi.');
    } catch (error) {
      Alert.alert('Hata', 'Bildirim gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenShell title="Kurum Zili" emoji="🔔" navigation={navigation} subtitle={kresAdi}>
      <View style={styles.childCard}>
        <Text style={styles.childIcon}>👧</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.childName}>{childName}</Text>
          <Text style={styles.childDesc}>Bildirim kuruma ve yetkili personele düşer.</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Teslim Türü</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeButton, teslimTuru === 'alacagim' && styles.typeButtonActive]}
          onPress={() => setTeslimTuru('alacagim')}
          activeOpacity={0.85}
        >
          <Text style={[styles.typeText, teslimTuru === 'alacagim' && styles.typeTextActive]}>👋 Alacağım</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, teslimTuru === 'birakacagim' && styles.typeButtonActive]}
          onPress={() => setTeslimTuru('birakacagim')}
          activeOpacity={0.85}
        >
          <Text style={[styles.typeText, teslimTuru === 'birakacagim' && styles.typeTextActive]}>🏫 Bırakacağım</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.bellCard, styles.yellowCard]} onPress={() => sendBell('geliyorum')} activeOpacity={0.88}>
        <View style={styles.circle}><Text style={styles.circleEmoji}>🚗</Text></View>
        <Text style={styles.bellTitle}>GELİYORUM</Text>
        <Text style={styles.bellDesc}>Kuruma yaklaşıyorum. Çocuğumu teslim için hazırlayınız.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.bellCard, styles.greenCard]} onPress={() => sendBell('kapidayim')} activeOpacity={0.88}>
        <View style={styles.circle}><Text style={styles.circleEmoji}>📍</Text></View>
        <Text style={styles.bellTitle}>KAPIDAYIM</Text>
        <Text style={styles.bellDesc}>Kapıdayım. Öğrenciyi teslim almak / teslim etmek istiyorum.</Text>
      </TouchableOpacity>

      {sending ? <Text style={styles.sendingText}>Gönderiliyor...</Text> : null}
    </ScreenShell>
  );
}

const createStyles = (theme) => StyleSheet.create({
  childCard: { backgroundColor: theme.card, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  childIcon: { fontSize: 36 },
  childName: { color: theme.text, fontSize: 18, fontWeight: '900' },
  childDesc: { color: theme.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  sectionTitle: { color: theme.text, fontSize: 17, fontWeight: '900', marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  typeButton: { flex: 1, backgroundColor: theme.card, borderRadius: 16, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  typeButtonActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  typeText: { color: theme.text, fontWeight: '900' },
  typeTextActive: { color: '#FFFFFF' },
  bellCard: { borderRadius: 28, padding: 22, alignItems: 'center', marginBottom: 16, minHeight: 230, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, elevation: 5 },
  yellowCard: { backgroundColor: '#FFC72C' },
  greenCard: { backgroundColor: theme.green || '#20B45B' },
  circle: { width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  circleEmoji: { fontSize: 54 },
  bellTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.28)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  bellDesc: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', lineHeight: 22, textAlign: 'center', marginTop: 12, textShadowColor: 'rgba(0,0,0,0.22)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  sendingText: { color: theme.muted, textAlign: 'center', fontWeight: '900', marginBottom: 16 },
});
