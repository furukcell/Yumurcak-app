import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { ScreenShell, InfoRow, LoadingScreen, useParentBase, styles, THEME } from './parentShared';

export default function ParentContactScreen({ navigation }) {
  const { loading, kres, yonetici, ogretmen, sinif } = useParentBase();

  if (loading) return <LoadingScreen text="İletişim bilgileri hazırlanıyor..." />;

  const adminName = `${yonetici?.ad || ''} ${yonetici?.soyad || ''}`.trim() || '-';
  const teacherName = `${ogretmen?.ad || ''} ${ogretmen?.soyad || ''}`.trim() || '-';
  const adminPhone = yonetici?.telefon || kres?.telefon || '';

  return (
    <ScreenShell title="Kurum İletişim" emoji="☎️" navigation={navigation}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{kres?.ad || 'Kurum'}</Text>
        <InfoRow icon="📍" label="Adres" value={kres?.adres} />
        <InfoRow icon="☎️" label="Kurum Telefon" value={kres?.telefon} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Yönetici</Text>
        <InfoRow icon="👤" label="Ad Soyad" value={adminName} />
        <InfoRow icon="☎️" label="Telefon" value={adminPhone} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity style={[local.button, { backgroundColor: THEME.primary }]} onPress={() => callPhone(adminPhone)}>
            <Text style={local.buttonText}>Ara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[local.button, { backgroundColor: THEME.green }]} onPress={() => whatsapp(adminPhone)}>
            <Text style={local.buttonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Öğretmen</Text>
        <InfoRow icon="🏫" label="Sınıf" value={sinif?.ad} />
        <InfoRow icon="👩‍🏫" label="Ad Soyad" value={teacherName} />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => Alert.alert('Mesajlar', 'Uygulama içi mesajlaşma yakında aktif olacak.')}>
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
