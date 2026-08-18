import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { database } from '../../config/firebase';
import { ScreenShell, EmptyState, InfoRow, LoadingScreen, useParentBase, styles, toDateKey } from './parentShared';

function formatTime(zaman) {
  if (!zaman) return null;
  const d = new Date(zaman);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function ParentServiceScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild } = useParentBase();
  const [service, setService] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [gunlukDurum, setGunlukDurum] = useState(null);

  useEffect(() => {
    if (!selectedChild?.id) return undefined;
    const r = ref(database, `servisBilgileri/${selectedChild.id}`);
    const unsub = onValue(r, (snap) => setService(snap.val()));
    return () => unsub();
  }, [selectedChild?.id]);

  useEffect(() => {
    if (!service?.servisId) {
      setVehicle(null);
      return undefined;
    }
    const r = ref(database, `servisler/${service.servisId}`);
    const unsub = onValue(r, (snap) => setVehicle(snap.val()));
    return () => unsub();
  }, [service?.servisId]);

  useEffect(() => {
    if (!service?.servisId || !selectedChild?.id) {
      setGunlukDurum(null);
      return undefined;
    }
    const dateKey = toDateKey();
    const r = ref(database, `servisGunlukDurum/${dateKey}/${service.servisId}`);
    const unsub = onValue(r, (snap) => setGunlukDurum(snap.val()));
    return () => unsub();
  }, [service?.servisId, selectedChild?.id]);

  if (loading) return <LoadingScreen text={t('parent.service.loading')} />;

  const childDurum = (gunlukDurum?.cocuklar || {})[selectedChild?.id] || {};
  const alindiSaat = formatTime(childDurum.alindi?.zaman);
  const varmaSaat = formatTime(gunlukDurum?.kurumaVardi?.zaman);
  const birakildiSaat = formatTime(childDurum.birakildi?.zaman);

  return (
    <ScreenShell title={t('parent.service.title')} emoji="🚌" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.service.noChildTitle')} desc={t('parent.service.noChildDesc')} />
      ) : !service || service.servisKullaniyor === false ? (
        <EmptyState icon="🚌" title={t('parent.service.noServiceTitle')} desc={t('parent.service.noServiceDesc')} />
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('parent.service.cardTitle')}</Text>
            <InfoRow icon="✅" label={t('parent.service.statusLabel')} value={t('parent.service.statusValue')} />
            {vehicle ? (
              <InfoRow icon="🚐" label={t('parent.service.vehicleLabel')} value={vehicle.ad || vehicle.plaka} />
            ) : null}
            <InfoRow icon="🕗" label={t('parent.service.pickupTimeLabel')} value={service.alisSaati} />
            <InfoRow icon="🕔" label={t('parent.service.dropoffTimeLabel')} value={service.birakisSaati} />
            <InfoRow icon="📝" label={t('parent.service.noteLabel')} value={service.servisNotu} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('parent.service.todayTitle')}</Text>
            <InfoRow
              icon={alindiSaat ? '✅' : '⏳'}
              label={t('parent.service.pickedUpLabel')}
              value={alindiSaat || t('parent.service.notYetLabel')}
            />
            <InfoRow
              icon={varmaSaat ? '✅' : '⏳'}
              label={t('parent.service.arrivedLabel')}
              value={varmaSaat || t('parent.service.notYetLabel')}
            />
            <InfoRow
              icon={birakildiSaat ? '✅' : '⏳'}
              label={t('parent.service.droppedOffLabel')}
              value={birakildiSaat || t('parent.service.notYetLabel')}
            />
          </View>
        </>
      )}
    </ScreenShell>
  );
}
