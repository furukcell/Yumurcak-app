// ============================================================
// YUMURCAK — ActivityLibraryPicker.js
// FAZ 7: "Etkinlik Öner" — kategoriye/yaş grubuna göre en çok kullanılan
// etkinlikleri gösteren, dokununca günün etkinlik alanına tek dokunuşla
// yazan modal picker. MonthlyArchivePicker ile AYNI desende (trigger
// butonu + modal, kendi state'ini kendi yönetir).
// ============================================================
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ETKINLIK_KATEGORILERI } from '../constants';
import { searchActivityLibrary } from '../services/activityLibrary';

export default function ActivityLibraryPicker({ yasGrubu, initialKategori, onSelect, theme }) {
  const palette = theme || { primary: '#6C3DEB', primarySoft: '#EFE8FF', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8', bg: '#FAFAFA' };

  const [open, setOpen] = useState(false);
  const [kategori, setKategori] = useState(initialKategori || ETKINLIK_KATEGORILERI[0].key);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const list = await searchActivityLibrary({ kategori, yasGrubu, searchText });
        if (!cancelled) setResults(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, kategori, searchText, yasGrubu]);

  function openPicker() {
    setKategori(initialKategori || ETKINLIK_KATEGORILERI[0].key);
    setSearchText('');
    setOpen(true);
  }

  function handleSelect(item) {
    setOpen(false);
    onSelect(item.ad);
  }

  return (
    <>
      <TouchableOpacity style={[styles.trigger, { backgroundColor: palette.primarySoft }]} onPress={openPicker} activeOpacity={0.85}>
        <Text style={[styles.triggerText, { color: palette.primary }]}>💡 Etkinlik Öner</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: palette.text }]}>Etkinlik Öner</Text>
              <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.8}>
                <Text style={[styles.close, { color: palette.primary }]}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ gap: 8 }}>
              {ETKINLIK_KATEGORILERI.map((item) => {
                const active = item.key === kategori;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.chip,
                      { borderColor: palette.border },
                      active && { backgroundColor: palette.primary, borderColor: palette.primary },
                    ]}
                    onPress={() => setKategori(item.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, { color: active ? '#FFF' : palette.text }]}>{item.emoji} {item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Etkinlik ara..."
              placeholderTextColor={palette.muted}
              style={[styles.searchInput, { backgroundColor: palette.bg, borderColor: palette.border, color: palette.text }]}
            />

            <ScrollView style={styles.resultsScroll} keyboardShouldPersistTaps="handled">
              {loading ? (
                <ActivityIndicator color={palette.primary} style={{ marginVertical: 20 }} />
              ) : results.length === 0 ? (
                <Text style={[styles.empty, { color: palette.muted }]}>
                  Bu kategoride henüz yeterli veri yok. İlk sen ekle!
                </Text>
              ) : (
                results.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.row, { borderColor: palette.border }]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={1}>{item.ad}</Text>
                    <Text style={[styles.rowStats, { color: palette.muted }]}>
                      {(item.toplamKullanim || 0).toLocaleString('tr-TR')} kullanım · {(item.kresSayisi || 0).toLocaleString('tr-TR')} kreşte uygulandı
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
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
  sheet: { width: '100%', maxWidth: 460, maxHeight: '80%', borderRadius: 22, borderWidth: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '900' },
  close: { fontWeight: '900' },
  chipRow: { flexGrow: 0, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontWeight: '800', fontSize: 12 },
  searchInput: { minHeight: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, fontWeight: '700', marginBottom: 10 },
  resultsScroll: { maxHeight: 320 },
  empty: { textAlign: 'center', paddingVertical: 20, fontWeight: '700' },
  row: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  rowTitle: { fontWeight: '900', fontSize: 14, marginBottom: 4 },
  rowStats: { fontWeight: '700', fontSize: 11 },
});
