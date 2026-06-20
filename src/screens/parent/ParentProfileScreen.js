import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScreenShell, InfoRow, EmptyState, LoadingScreen, useParentBase, styles } from './parentShared';

export default function ParentProfileScreen({ navigation }) {
  const { loading, selectedChild, childName, parentName, kullanici, sinif, ogretmen, cikisYap } = useParentBase();

  if (loading) return <LoadingScreen text="Profil hazırlanıyor..." />;

  return (
    <ScreenShell title="Profil" emoji="👤" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Yönetici panelinden çocuğa bu veli bağlanmalı." />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👧 {childName}</Text>
          <Text style={styles.cardText}>{selectedChild?.yas || selectedChild?.dogumTarihi || 'Kreş öğrencisi'}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Veli Bilgileri</Text>
        <InfoRow icon="👤" label="Veli" value={parentName} />
        <InfoRow icon="☎️" label="Telefon" value={kullanici?.telefon} />
        <InfoRow icon="✉️" label="Kullanıcı" value={kullanici?.kullaniciAdi} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kurum Bilgileri</Text>
        <InfoRow icon="🏫" label="Sınıf" value={sinif?.ad || selectedChild?.sinifAdi || selectedChild?.sinifId} />
        <InfoRow icon="👩‍🏫" label="Öğretmen" value={`${ogretmen?.ad || ''} ${ogretmen?.soyad || ''}`.trim()} />
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={cikisYap} activeOpacity={0.85}>
        <Text style={styles.secondaryButtonText}>↩ Çıkış Yap</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}
