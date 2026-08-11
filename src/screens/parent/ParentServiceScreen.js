import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { database } from '../../config/firebase';
import { ScreenShell, EmptyState, InfoRow, LoadingScreen, useParentBase, styles } from './parentShared';

export default function ParentServiceScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild } = useParentBase();
  const [service, setService] = useState(null);

  useEffect(() => {
    if (!selectedChild?.id) return undefined;
    const r = ref(database, `servisBilgileri/${selectedChild.id}`);
    const unsub = onValue(r, (snap) => setService(snap.val()));
    return () => unsub();
  }, [selectedChild?.id]);

  if (loading) return <LoadingScreen text={t('parent.service.loading')} />;

  return (
    <ScreenShell title={t('parent.service.title')} emoji="🚌" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.service.noChildTitle')} desc={t('parent.service.noChildDesc')} />
      ) : !service || service.servisKullaniyor === false ? (
        <EmptyState icon="🚌" title={t('parent.service.noServiceTitle')} desc={t('parent.service.noServiceDesc')} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('parent.service.cardTitle')}</Text>
          <InfoRow icon="✅" label={t('parent.service.statusLabel')} value={t('parent.service.statusValue')} />
          <InfoRow icon="🕗" label={t('parent.service.pickupTimeLabel')} value={service.alisSaati} />
          <InfoRow icon="🕔" label={t('parent.service.dropoffTimeLabel')} value={service.birakisSaati} />
          <InfoRow icon="📝" label={t('parent.service.noteLabel')} value={service.servisNotu} />
        </View>
      )}
    </ScreenShell>
  );
}
