// ============================================================
// YUMURCAK — ParentContactScreen.js
// FAZ 4: Kurum / yönetici / sınıf / öğretmen bilgileri canlı gelir
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenShell, InfoRow, LoadingScreen, useParentBase, styles, THEME } from './parentShared';

export default function ParentContactScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, kres, yonetici, ogretmen, sinif } = useParentBase();

  if (loading) return <LoadingScreen text={t('parent.contact.loading')} />;

  const kurumAdi = kres?.ad || t('parent.contact.institutionFallback');
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
    <ScreenShell title={t('parent.contact.title')} emoji="☎️" navigation={navigation}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏫 {kurumAdi}</Text>
        <InfoRow icon="📍" label={t('parent.contact.address')} value={kres?.adres} />
        <InfoRow icon="☎️" label={t('parent.contact.institutionPhone')} value={kurumTelefon} />
        <InfoRow icon="✉️" label={t('parent.contact.email')} value={kres?.email} />
        <InfoRow icon="🌐" label={t('parent.contact.website')} value={kres?.website} />
        <InfoRow icon="⏰" label={t('parent.contact.workingHours')} value={kres?.calismaSaatleri} />
        {kres?.not ? <InfoRow icon="📝" label={t('parent.contact.note')} value={kres.not} /> : null}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity style={[local.button, { backgroundColor: THEME.primary }]} onPress={() => callPhone(kurumTelefon, t)}>
            <Text style={local.buttonText}>{t('parent.contact.callInstitution')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[local.button, { backgroundColor: THEME.green }]} onPress={() => whatsapp(kurumWhatsapp, t)}>
            <Text style={local.buttonText}>{t('parent.contact.whatsapp')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('parent.contact.administratorTitle')}</Text>
        <InfoRow icon="👤" label={t('parent.contact.fullName')} value={adminName} />
        <InfoRow icon="☎️" label={t('parent.contact.phone')} value={adminPhone} />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => callPhone(adminPhone, t)}>
          <Text style={styles.secondaryButtonText}>{t('parent.contact.callAdministrator')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('parent.contact.teacherAndClassTitle')}</Text>
        <InfoRow icon="🏫" label={t('parent.contact.className')} value={sinif?.ad} />
        <InfoRow icon="👩‍🏫" label={t('parent.contact.teacher')} value={teacherName} />
        <InfoRow icon="☎️" label={t('parent.contact.teacherPhone')} value={teacherPhone} />
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ParentMessages')}
        >
          <Text style={styles.secondaryButtonText}>{t('parent.contact.sendMessage')}</Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}

function onlyDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function callPhone(phone, t) {
  const digits = onlyDigits(phone);
  if (!digits) return Alert.alert(t('parent.contact.noPhoneTitle'), t('parent.contact.noPhoneDesc'));
  Linking.openURL(`tel:${digits}`);
}

function whatsapp(phone, t) {
  const digits = onlyDigits(phone);
  if (!digits) return Alert.alert(t('parent.contact.noPhoneTitle'), t('parent.contact.noWhatsappDesc'));
  const normalized = digits.startsWith('90') ? digits : `90${digits}`;
  Linking.openURL(`https://wa.me/${normalized}`);
}

const local = {
  button: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '900' },
};
