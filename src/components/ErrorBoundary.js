// ============================================================
// YUMURCAK — ErrorBoundary.js
// Render sırasında beklenmeyen bir JS hatası fırlatılırsa (ör. beklenmedik
// veri şekli), React Native production/release build'de (Hermes) bunu
// KIRMIZI hata ekranıyla göstermez — sadece ekranı boş/siyah bırakır,
// çünkü o kırmızı ekran sadece development modunda çalışır.
// Bu bileşen olmadan, tek bir ekrandaki küçük bir render hatası bile
// kullanıcıya "siyah ekran" olarak yansır ve uygulamayı kapatıp açmaktan
// başka çare kalmaz. ErrorBoundary bu hatayı yakalar ve kullanıcıya
// toparlanabilir ("Tekrar Dene") bir ekran gösterir.
// ============================================================
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { push, ref, serverTimestamp } from 'firebase/database';
import crashlytics from '@react-native-firebase/crashlytics';
import { database } from '../config/firebase';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Hem konsola hem Firebase Realtime Database'e (hataLoglari) hem de
    // Crashlytics'e yazıyoruz. Crashlytics render sırasında oluşan bu
    // JS hatasını da "non-fatal" olarak kaydeder; component stack'i de
    // breadcrumb olarak ekliyoruz ki Crashlytics panelinde hangi ekranda
    // olduğu da görünsün.
    console.warn('ErrorBoundary yakaladı:', error?.message || error, errorInfo?.componentStack);

    try {
      crashlytics().log(`ErrorBoundary: ${String(errorInfo?.componentStack || '').slice(0, 500)}`);
      crashlytics().recordError(error instanceof Error ? error : new Error(String(error)));
    } catch (crashlyticsError) {
      console.warn('Crashlytics\'e yazılamadı:', crashlyticsError);
    }

    // Production build'de console.warn hiçbir yerde görünmüyor, bu yüzden
    // hatayı en azından Firebase'e de yazıyoruz ki bir dahaki sefere tam
    // mesaj ve component stack elimizde olsun.
    try {
      push(ref(database, 'hataLoglari'), {
        mesaj: String(error?.message || error || 'Bilinmeyen hata'),
        stack: String(error?.stack || ''),
        componentStack: String(errorInfo?.componentStack || ''),
        zaman: serverTimestamp(),
      });
    } catch (logError) {
      console.warn('Hata loglanamadı:', logError);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.icon}>😵‍💫</Text>
          <Text style={styles.title}>Bir şeyler ters gitti</Text>
          <Text style={styles.desc}>
            Bu ekran beklenmeyen bir hatayla karşılaştı. Tekrar denemek genelde sorunu çözer.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F8F6FF' },
  icon: { fontSize: 48, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '900', color: '#191A23', marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 14, fontWeight: '600', color: '#707386', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  button: { backgroundColor: '#6C3DEB', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28 },
  buttonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});
