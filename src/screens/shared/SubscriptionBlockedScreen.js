// ============================================================
// YUMURCAK — SubscriptionBlockedScreen.js
// FAZ 15: Öğretmen/veli abonelik kilit ekranı
// ============================================================
import React from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getSubscriptionStatus } from '../../utils/subscriptionStatus';

const THEME = {
  bg: '#F8F6FF',
  card: '#FFFFFF',
  text: '#191A23',
  muted: '#707386',
  primary: '#6C3DEB',
  red: '#FF4D6D',
  border: '#EEEAF8',
};

export default function SubscriptionBlockedScreen({ subscription }) {
  const { kullanici, kres, cikisYap } = useAuth();
  const status = getSubscriptionStatus(subscription);

  const roleText = kullanici?.rol === 'ogretmen' ? 'Öğretmen Paneli' : 'Veli Paneli';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.kicker}>{roleText}</Text>
          <Text style={styles.title}>Kurum aboneliği pasif</Text>

          <Text style={styles.desc}>
            {kres?.ad || kres?.kresAdi || 'Kurum'} için abonelik aktif olmadığı için bu ekran geçici olarak kullanılamıyor.
          </Text>

          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Durum</Text>
            <Text style={styles.statusValue}>{status.label}</Text>
          </View>

          <Text style={styles.helpText}>
            Abonelik yenilendiğinde öğretmen ve veli ekranları otomatik tekrar açılır. Kurum yöneticisi abonelik ekranından yenileme yapmalıdır.
          </Text>

          <TouchableOpacity style={styles.logoutButton} onPress={cikisYap} activeOpacity={0.85}>
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  wrap: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
  },
  icon: {
    fontSize: 58,
    marginBottom: 10,
  },
  kicker: {
    color: THEME.primary,
    fontWeight: '900',
    letterSpacing: 1.4,
    fontSize: 12,
    marginBottom: 8,
  },
  title: {
    color: THEME.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  desc: {
    color: THEME.muted,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
  },
  statusBox: {
    width: '100%',
    backgroundColor: '#FFF0F3',
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#FFD6DF',
  },
  statusLabel: {
    color: THEME.muted,
    fontWeight: '800',
    fontSize: 12,
  },
  statusValue: {
    color: THEME.red,
    fontWeight: '900',
    fontSize: 18,
    marginTop: 4,
  },
  helpText: {
    color: THEME.muted,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 16,
  },
  logoutButton: {
    backgroundColor: THEME.primary,
    borderRadius: 17,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
    minWidth: 160,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFF',
    fontWeight: '900',
  },
});
