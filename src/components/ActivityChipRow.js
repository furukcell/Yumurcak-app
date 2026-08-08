// ============================================================
// YUMURCAK — ActivityChipRow.js
// Bir günün etkinlik listesini (artık tek etkinlik değil, birden çok
// etkinlik chip'i) gösterir. Chip'e dokununca o etkinlik düzenlemek için
// seçilir (ekranın kendi modalındaki form bu seçime göre doldurulur),
// × ile kaldırılır, "+ Yeni Etkinlik" ile boş bir chip eklenip otomatik seçilir.
// ============================================================
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ETKINLIK_KATEGORILERI } from '../constants';

function kategoriEmoji(key) {
  const found = ETKINLIK_KATEGORILERI.find((item) => item.key === key);
  return found ? found.emoji : '📌';
}

export default function ActivityChipRow({ items, activeIndex, onSelect, onAdd, onRemove, theme }) {
  const palette = theme || { primary: '#6C3DEB', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8', bg: '#F7F6FB' };
  const list = Array.isArray(items) ? items : [];

  return (
    <View style={styles.wrap}>
      <View style={styles.chipRow}>
        {list.map((item, index) => {
          const active = index === activeIndex;
          const label = String(item?.etkinlik || '').trim() || 'Yeni Ders';
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.chip,
                { borderColor: palette.border, backgroundColor: active ? palette.primary : (palette.primarySoft || 'rgba(108,61,235,0.1)') },
              ]}
              onPress={() => onSelect(index)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : palette.text }]} numberOfLines={1}>
                {kategoriEmoji(item?.kategori)} {label}
              </Text>
              <TouchableOpacity onPress={() => onRemove(index)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={[styles.chipRemove, { color: active ? '#fff' : palette.muted }]}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={[styles.addButton, { borderColor: palette.border, backgroundColor: palette.bg }]} onPress={onAdd} activeOpacity={0.85}>
        <Text style={[styles.addButtonText, { color: palette.primary }]}>+ Yeni Ders Ekle</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, maxWidth: '100%' },
  chipText: { fontWeight: '800', fontSize: 13, maxWidth: 180 },
  chipRemove: { fontWeight: '900', fontSize: 15, marginLeft: 2 },
  addButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  addButtonText: { fontWeight: '900', fontSize: 13 },
});
