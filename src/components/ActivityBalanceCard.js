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
import { ETKINLIK_KATEGORILERI } from '../constants';

export default function ActivityBalanceCard({ schedules, monthKey, monthLabel, theme }) {
  const palette = theme || { primary: '#27500A', primarySoft: '#EAF5E4', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8' };
  const [open, setOpen] = useState(false);

  const { dagilim, toplam, eksikKategoriler } = useMemo(() => {
    const buAyKayitlari = (schedules || []).filter((item) => item?.ayKey === monthKey && item?.aktif !== false);

    const sayilar = ETKINLIK_KATEGORILERI.map((kat) => ({
      ...kat,
      sayi: buAyKayitlari.filter((item) => (item.kategori || 'diger') === kat.key).length,
    }));

    const enYuksek = Math.max(1, ...sayilar.map((k) => k.sayi));
    const siraliDagilim = [...sayilar].sort((a, b) => b.sayi - a.sayi).map((k) => ({ ...k, oran: k.sayi / enYuksek }));

    return {
      dagilim: siraliDagilim,
      toplam: buAyKayitlari.length,
      eksikKategoriler: sayilar.filter((k) => k.sayi === 0).map((k) => `${k.emoji} ${k.label}`),
    };
  }, [schedules, monthKey]);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <TouchableOpacity style={styles.headerRow} onPress={() => setOpen((v) => !v)} activeOpacity={0.85}>
        <Text style={[styles.title, { color: palette.text }]}>📊 Etkinlik Dengesi — {monthLabel}</Text>
        <Text style={[styles.chevron, { color: palette.primary }]}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {!open ? (
        <Text style={[styles.summary, { color: palette.muted }]}>
          {toplam > 0 ? `Bu ay ${toplam} etkinlik girildi — detay için dokun.` : 'Bu ay henüz etkinlik girilmedi.'}
        </Text>
      ) : (
        <>
          {toplam === 0 ? (
            <Text style={[styles.summary, { color: palette.muted }]}>Bu ay için henüz yayınlanmış etkinlik yok, analiz için veri gerekiyor.</Text>
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
                    💡 Bu ay hiç girilmemiş kategoriler: {eksikKategoriler.join(', ')}
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
