// ============================================================
// YUMURCAK — MealChipListInput.js
// Bir öğün kutusunu (kahvalti/ogle/araOgun) tek satır serbest metin yerine
// çoklu "yemek chip"i olarak düzenlemeyi sağlar. Her chip mealLibrary
// havuzuna AYRI AYRI yazılır (Cloud Function tarafında), böylece
// istatistik ve autocomplete kombinasyon değil tek yemek bazında çalışır.
// ============================================================
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MealAutocompleteInput from './MealAutocompleteInput';

export default function MealChipListInput({ ogun, values, onChange, placeholder, theme }) {
  const palette = theme || { primary: '#6C3DEB', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8', bg: '#F7F6FB' };
  const list = Array.isArray(values) ? values : [];

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function commitDraft(text) {
    const trimmed = String(text ?? draft).trim();
    if (trimmed) onChange([...list, trimmed]);
    setDraft('');
    setAdding(false);
  }

  function removeAt(index) {
    onChange(list.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.wrap}>
      {list.length > 0 ? (
        <View style={styles.chipRow}>
          {list.map((item, index) => (
            <View key={`${item}-${index}`} style={[styles.chip, { backgroundColor: palette.primarySoft || 'rgba(108,61,235,0.1)', borderColor: palette.border }]}>
              <Text style={[styles.chipText, { color: palette.text }]} numberOfLines={1}>{item}</Text>
              <TouchableOpacity onPress={() => removeAt(index)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={[styles.chipRemove, { color: palette.muted }]}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      {adding ? (
        <View style={styles.addRow}>
          <View style={{ flex: 1 }}>
            <MealAutocompleteInput
              ogun={ogun}
              value={draft}
              onChangeText={setDraft}
              onSelectSuggestion={(item) => commitDraft(item.metin)}
              placeholder={placeholder}
              theme={palette}
              style={[styles.input, { backgroundColor: palette.bg, borderColor: palette.border, color: palette.text }]}
            />
          </View>
          <TouchableOpacity style={[styles.addConfirm, { backgroundColor: palette.primary }]} onPress={() => commitDraft()} activeOpacity={0.85}>
            <Text style={styles.addConfirmText}>Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addCancel} onPress={() => { setDraft(''); setAdding(false); }} activeOpacity={0.85}>
            <Text style={[styles.addCancelText, { color: palette.muted }]}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.addButton, { borderColor: palette.border, backgroundColor: palette.bg }]} onPress={() => setAdding(true)} activeOpacity={0.85}>
          <Text style={[styles.addButtonText, { color: palette.primary }]}>+ {placeholder || 'Ekle'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, maxWidth: '100%' },
  chipText: { fontWeight: '800', fontSize: 13, maxWidth: 200 },
  chipRemove: { fontWeight: '900', fontSize: 15, marginLeft: 2 },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontWeight: '700' },
  addConfirm: { paddingHorizontal: 14, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addConfirmText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  addCancel: { height: 46, justifyContent: 'center', paddingHorizontal: 4 },
  addCancelText: { fontWeight: '800', fontSize: 12 },
  addButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  addButtonText: { fontWeight: '900', fontSize: 13 },
});
