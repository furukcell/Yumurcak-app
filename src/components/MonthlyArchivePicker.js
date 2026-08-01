// ============================================================
// YUMURCAK — MonthlyArchivePicker.js
// Faz 5: "Hangi aylarda veri var?" göstergesi. Kullanıcı ay ay elle
// ileri/geri gezmek zorunda kalmasın diye, yayınlanmış (aktif) kayıt
// bulunan ayları listeler; bir aya dokununca o aya doğrudan atlar
// (shiftMonth gibi +/-1 değil, hedef aya direkt).
// ============================================================
import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { listPublishedMonths, parseMonthKey } from '../services/monthlyDocuments';

export default function MonthlyArchivePicker({ kresId, nodePath, kaynak, matchExtra, currentMonthKey, onSelectMonth, theme }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState([]);
  const palette = theme || { primary: '#6C3DEB', primarySoft: '#EFE8FF', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8' };

  async function openArchive() {
    setOpen(true);
    setLoading(true);
    try {
      const list = await listPublishedMonths({ nodePath, kresId, kaynak, matchExtra });
      setMonths(list);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(monthKey) {
    setOpen(false);
    onSelectMonth(parseMonthKey(monthKey));
  }

  return (
    <>
      <TouchableOpacity style={[styles.trigger, { backgroundColor: palette.primarySoft }]} onPress={openArchive} activeOpacity={0.85}>
        <Text style={[styles.triggerText, { color: palette.primary }]}>🗂 Arşiv</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: palette.text }]}>Yayınlanmış Aylar</Text>
              <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.8}>
                <Text style={[styles.close, { color: palette.primary }]}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={palette.primary} style={{ marginVertical: 20 }} />
            ) : months.length === 0 ? (
              <Text style={[styles.empty, { color: palette.muted }]}>Henüz yayınlanmış bir ay yok.</Text>
            ) : (
              months.map((item) => (
                <TouchableOpacity
                  key={item.monthKey}
                  style={[
                    styles.row,
                    { borderColor: palette.border },
                    item.monthKey === currentMonthKey && { backgroundColor: palette.primarySoft },
                  ]}
                  onPress={() => handleSelect(item.monthKey)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rowLabel, { color: palette.text }]}>{item.monthLabel}</Text>
                  <Text style={[styles.rowCount, { color: palette.muted }]}>{item.count} gün</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  triggerText: { fontWeight: '900', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 420, maxHeight: '70%', borderRadius: 22, borderWidth: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '900' },
  close: { fontWeight: '900' },
  empty: { textAlign: 'center', paddingVertical: 20, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  rowLabel: { fontWeight: '800', fontSize: 14 },
  rowCount: { fontWeight: '700', fontSize: 12 },
});
