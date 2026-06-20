import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, EmptyState, InfoRow, LoadingScreen, useParentBase, styles } from './parentShared';

export default function ParentServiceScreen({ navigation }) {
  const { loading, selectedChild } = useParentBase();
  const [service, setService] = useState(null);

  useEffect(() => {
    if (!selectedChild?.id) return undefined;
    const r = ref(database, `servisBilgileri/${selectedChild.id}`);
    const unsub = onValue(r, (snap) => setService(snap.val()));
    return () => unsub();
  }, [selectedChild?.id]);

  if (loading) return <LoadingScreen text="Servis bilgisi hazırlanıyor..." />;

  return (
    <ScreenShell title="Servis" emoji="🚌" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Servis bilgisi için çocuk bağlantısı gerekir." />
      ) : !service || service.servisKullaniyor === false ? (
        <EmptyState icon="🚌" title="Servis kullanmıyorsunuz" desc="Yönetici servis bilgisi eklediğinde burada görünecek." />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Servis Bilgileri</Text>
          <InfoRow icon="✅" label="Durum" value="Servis kullanıyor" />
          <InfoRow icon="🕗" label="Alış saati" value={service.alisSaati} />
          <InfoRow icon="🕔" label="Bırakış saati" value={service.birakisSaati} />
          <InfoRow icon="📝" label="Not" value={service.servisNotu} />
        </View>
      )}
    </ScreenShell>
  );
}
