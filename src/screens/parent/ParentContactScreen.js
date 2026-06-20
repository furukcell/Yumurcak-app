// ============================================================
// YUMURCAK — ParentContactScreen.js
// FAZ 4: Kurum / yönetici / sınıf / öğretmen bilgileri canlı gelir
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { ScreenShell, InfoRow, LoadingScreen, useParentBase, styles, THEME } from './parentShared';

export default function ParentContactScreen({ navigation }) {
  const { loading, kres, yonetici, ogretmen, sinif } = useParentBase();

  if (loading) return <LoadingScreen text="İletişim bilgileri hazırlanıyor..." />;

  const kurumAdi = kres?.ad || 'Kurum';
  const kurumTelefon = kres?.telefon || '';
  const kurumWhatsapp = kres?.whatsapp || kurumTelefon;
  const adminName =
    kres?.yoneticiAd ||
    `${yonetici?.ad || ''} ${yonetici?.soyad || ''}`.trim() ||
    '-';
  const adminPhone = kres?.yoneticiTelefon || yonetici?.telefon || kurumTelefon || '';
  const teacherName = `${ogretmen?.ad || ''} ${ogretmen?.soyad || ''}`.trim() || '-';
  const teacherPhone = ogretmen?.telefon || '';

  return (
    <ScreenShell title="Kurum İletişim" emoji="☎️" navigation={navigation}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏫 {kurumAdi}</Text>
        <InfoRow icon="📍" label="Adres" value={kres?.adres} />
        <InfoRow icon="☎️" label="Kurum Telefon" value={kurumTelefon} />
        <InfoRow icon="✉️" label="E-posta" value={kres?.email} />
        <InfoRow icon="🌐" label="Website" value={kres?.website} />
        <InfoRow icon="⏰" label="Çalışma Saatleri" value={kres?.calismaSaatleri} />
        {kres?.not ? <InfoRow icon="📝" label="Not" value={kres.not} /> : null}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity style={[local.button, { backgroundColor: THEME.primary }]} onPress={() => callPhone(kurumTelefon)}>
            <Text style={local.buttonText}>Kurumu Ara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[local.button, { backgroundColor: THEME.green }]} onPress={() => whatsapp(kurumWhatsapp)}>
            <Text style={local.buttonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Yönetici</Text>
        <InfoRow icon="👤" label="Ad Soyad" value={adminName} />
        <InfoRow icon="☎️" label="Telefon" value={adminPhone} />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => callPhone(adminPhone)}>
          <Text style={styles.secondaryButtonText}>Yöneticiyi Ara</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>👩‍🏫 Öğretmen ve Sınıf</Text>
        <InfoRow icon="🏫" label="Sınıf" value={sinif?.ad} />
        <InfoRow icon="👩‍🏫" label="Öğretmen" value={teacherName} />
        <InfoRow icon="☎️" label="Öğretmen Telefon" value={teacherPhone} />
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ParentMessages')}
        >
          <Text style={styles.secondaryButtonText}>Mesaj Gönder</Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}

function onlyDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function callPhone(phone) {
  const digits = onlyDigits(phone);
  if (!digits) return Alert.alert('Telefon yok', 'Aranacak telefon numarası bulunamadı.');
  Linking.openURL(`tel:${digits}`);
}

function whatsapp(phone) {
  const digits = onlyDigits(phone);
  if (!digits) return Alert.alert('Telefon yok', 'WhatsApp için telefon numarası bulunamadı.');
  const normalized = digits.startsWith('90') ? digits : `90${digits}`;
  Linking.openURL(`https://wa.me/${normalized}`);
}

const local = {
  button: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '900' },
};
