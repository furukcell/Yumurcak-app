// ============================================================
// YUMURCAK — ActivityBalanceCard.js
// FAZ 10: "Etkinlik Dengesi Analizi" — seçili ayda sınıfta yapılan
// etkinliklerin kategori bazlı dağılımını gösterir (mevcut dersProgramlari
// verisinden, yapay zeka YOK — saf sayma/gruplama). Hiç yapılmayan
// kategoriler öneri olarak ayrıca listelenir. Varsayılan KAPALI durumda
// başlıyor, dokununca açılıyor — ekranı kalabalıklaştırmasın diye.
// ============================================================
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getTranslatedEtkinlikKategorileri } from '../constants';

export default function ActivityBalanceCard({ schedules, monthKey, monthLabel, theme }) {
  const { t } = useTranslation();
  const palette = theme || { primary: '#27500A', primarySoft: '#EAF5E4', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8' };
  const [open, setOpen] = useState(false);

  const { dagilim, toplam, eksikKategoriler } = useMemo(() => {
    const buAyGunleri = (schedules || []).filter((item) => item?.ayKey === monthKey && item?.aktif !== false);
    // FAZ — Çoklu Etkinlik Girişi: bir gün artık birden fazla etkinlik
    // taşıyabildiği için önce tüm günlerin etkinlik listelerini düzleştiriyoruz.
    const buAyEtkinlikleri = buAyGunleri.flatMap((gun) => (Array.isArray(gun.etkinlikler) ? gun.etkinlikler : []));

    const sayilar = getTranslatedEtkinlikKategorileri(t).map((kat) => ({
      ...kat,
      sayi: buAyEtkinlikleri.filter((item) => (item.kategori || 'diger') === kat.key).length,
    }));

    const enYuksek = Math.max(1, ...sayilar.map((k) => k.sayi));
    const siraliDagilim = [...sayilar].sort((a, b) => b.sayi - a.sayi).map((k) => ({ ...k, oran: k.sayi / enYuksek }));

    return {
      dagilim: siraliDagilim,
      toplam: buAyEtkinlikleri.length,
      eksikKategoriler: sayilar.filter((k) => k.sayi === 0).map((k) => `${k.emoji} ${k.label}`),
    };
  }, [schedules, monthKey, t]);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <TouchableOpacity style={styles.headerRow} onPress={() => setOpen((v) => !v)} activeOpacity={0.85}>
        <Text style={[styles.title, { color: palette.text }]}>{t('components.activityBalanceCard.title', { month: monthLabel })}</Text>
        <Text style={[styles.chevron, { color: palette.primary }]}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {!open ? (
        <Text style={[styles.summary, { color: palette.muted }]}>
          {toplam > 0 ? t('components.activityBalanceCard.summaryWithCount', { count: toplam }) : t('components.activityBalanceCard.summaryEmpty')}
        </Text>
      ) : (
        <>
          {toplam === 0 ? (
            <Text style={[styles.summary, { color: palette.muted }]}>{t('components.activityBalanceCard.noDataYet')}</Text>
          ) : (
            <>
              {dagilim.map((kat) => (
                <View key={kat.key} style={styles.row}>
                  <Text style={styles.rowLabel}>{kat.emoji} {kat.label}</Text>
                  <View style={[styles.barTrack, { backgroundColor: palette.border }]}>
                    <View style={[styles.barFill, { width: `${Math.max(kat.oran * 100, kat.sayi > 0 ? 6 : 0)}%`, backgroundColor: palette.primary }]} />
                  </View>
                  <Text style={[styles.rowCount, { color: palette.text }]}>{kat.sayi}</Text>
                </View>
              ))}

              {eksikKategoriler.length > 0 ? (
                <View style={[styles.suggestionBox, { backgroundColor: palette.primarySoft }]}>
                  <Text style={[styles.suggestionText, { color: palette.primary }]}>
                    {t('components.activityBalanceCard.missingCategories', { list: eksikKategoriler.join(', ') })}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, padding: 16, marginBottom: 22 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '900', flex: 1, marginRight: 8 },
  chevron: { fontSize: 13, fontWeight: '900' },
  summary: { fontSize: 12, fontWeight: '700', marginTop: 6 },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  rowLabel: { width: 96, fontSize: 12, fontWeight: '800', color: '#333' },
  barTrack: { flex: 1, height: 10, borderRadius: 6, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  rowCount: { width: 20, textAlign: 'right', fontSize: 13, fontWeight: '900' },

  suggestionBox: { borderRadius: 14, padding: 12, marginTop: 16 },
  suggestionText: { fontSize: 12, fontWeight: '800', lineHeight: 18 },
});
