// ============================================================
// YUMURCAK — OgretmenScreen.js
// Öğretmen ana ekranı — yakında gelecek
// ============================================================

import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { RENKLER } from '../constants';

export function OgretmenEkrani({ kullanici, kres, cikisYap }) {
  return (
    <SafeAreaView style={s.con}>
      <View style={s.ic}>
        <Text style={s.emoji}>👩‍🏫</Text>
        <Text style={s.baslik}>Öğretmen Paneli</Text>
        <Text style={s.alt}>{kres?.ad || 'Kreş'}</Text>
        <Text style={s.alt}>Hoş geldin, {kullanici?.ad}!</Text>
        <Text style={{ color: RENKLER.altMetin, marginTop: 20 }}>
          Yakında burada sınıf yönetimi olacak 🚀
        </Text>
        <TouchableOpacity style={s.btn} onPress={cikisYap}>
          <Text style={s.btnY}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  con: { flex: 1, backgroundColor: RENKLER.arkaplan },
  ic: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emoji: { fontSize: 64, marginBottom: 16 },
  baslik: { fontSize: 24, fontWeight: '800', color: RENKLER.metin },
  alt: { fontSize: 14, color: RENKLER.altMetin, marginTop: 6 },
  btn: { backgroundColor: RENKLER.hata, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, marginTop: 32 },
  btnY: { color: '#FFF', fontWeight: '700' },
});
