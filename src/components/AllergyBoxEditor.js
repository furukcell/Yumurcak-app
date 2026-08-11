// ============================================================
// YUMURCAK — AllergyBoxEditor.js
// Alerjiler artık tek bir metin alanına değil, her biri ayrı bir kutuya
// yazılıyor. "+" ile yeni kutu eklenir, çöp kutusu ile silinir.
// Veri modeli DEĞİŞMEDİ: dışarıya hâlâ "\n" ile ayrılmış tek bir string
// döner (mevcut `alerjiler` alanı, PDF/rapor kodları ve eski kayıtlarla
// tam uyumlu kalması için). Bu bileşen sadece görünümü kutulara böler.
// ============================================================
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

function toList(value) {
  const items = String(value || '')
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : [''];
}

function toValue(list) {
  return list.map((item) => (item || '').trim()).filter(Boolean).join('\n');
}

export default function AllergyBoxEditor({ value, onChange, accentColor = '#D92929', placeholder = 'Örn: Yumurta', addLabel = '+ Alerji Ekle' }) {
  const [list, setList] = useState(() => toList(value));

  // Dışarıdan (örn. Firebase'den ilk yükleme) değer değiştiğinde senkronize et.
  useEffect(() => {
    const incoming = toList(value);
    // Kullanıcı yazarken dıştan gelen aynı veriyle üzerine yazmayalım.
    if (toValue(incoming) !== toValue(list)) {
      setList(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (nextList) => {
    setList(nextList);
    onChange(toValue(nextList));
  };

  const updateAt = (index, text) => {
    const next = [...list];
    next[index] = text;
    emit(next);
  };

  const addBox = () => {
    emit([...list, '']);
  };

  const removeAt = (index) => {
    const next = list.filter((_, i) => i !== index);
    emit(next.length ? next : ['']);
  };

  return (
    <View style={styles.wrap}>
      {list.map((item, index) => (
        <View key={index} style={styles.row}>
          <TextInput
            style={[styles.input, { borderColor: `${accentColor}55` }]}
            value={item}
            onChangeText={(text) => updateAt(index, text)}
            placeholder={placeholder}
            placeholderTextColor="#A2A5B6"
          />
          {list.length > 1 || item ? (
            <TouchableOpacity style={styles.removeButton} onPress={() => removeAt(index)} activeOpacity={0.8}>
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
      <TouchableOpacity style={[styles.addButton, { borderColor: `${accentColor}66` }]} onPress={addBox} activeOpacity={0.85}>
        <Text style={[styles.addButtonText, { color: accentColor }]}>{addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 44, backgroundColor: '#fff', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, color: '#2A2A2A', fontWeight: '700', fontSize: 14 },
  removeButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F2F2F5', alignItems: 'center', justifyContent: 'center' },
  removeIcon: { color: '#9AA0AE', fontWeight: '900', fontSize: 14 },
  addButton: { alignSelf: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, marginTop: 2 },
  addButtonText: { fontWeight: '900', fontSize: 13 },
});
