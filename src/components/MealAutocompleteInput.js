// ============================================================
// YUMURCAK — MealAutocompleteInput.js
// FAZ 8: "Hazır Yemek Önerileri" — ActivityAutocompleteInput ile AYNI
// desen, sadece öğün türüne (kahvalti/ogle/araOgun/ikindi) göre filtreli
// yemek havuzunda arama yapıyor.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { searchMealsByPrefix } from '../services/mealLibrary';

export default function MealAutocompleteInput({
  ogun,
  value,
  onChangeText,
  onSelectSuggestion,
  onFocus,
  placeholder,
  theme,
  style,
}) {
  const palette = theme || { primary: '#6C3DEB', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8' };

  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!focused || String(value || '').trim().length < 2) {
      setSuggestions([]);
      return undefined;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await searchMealsByPrefix(ogun, value);
        setSuggestions(list);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [value, focused, ogun]);

  function handleSelect(item) {
    setSuggestions([]);
    onChangeText(item.metin);
    if (onSelectSuggestion) onSelectSuggestion(item);
  }

  const showDropdown = focused && (loading || suggestions.length > 0);

  return (
    <View style={{ zIndex: 5 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => { setFocused(true); if (onFocus) onFocus(); }}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={style}
        multiline
      />

      {showDropdown ? (
        <View style={[styles.dropdown, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {loading ? (
            <ActivityIndicator color={palette.primary} style={{ paddingVertical: 10 }} />
          ) : (
            suggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.suggestionRow, { borderColor: palette.border }]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.suggestionText, { color: palette.text }]} numberOfLines={1}>{item.metin}</Text>
                <Text style={[styles.suggestionMeta, { color: palette.muted }]}>{(item.toplamKullanim || 0).toLocaleString('tr-TR')}x</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: { borderWidth: 1, borderRadius: 14, marginTop: -6, marginBottom: 10, overflow: 'hidden' },
  suggestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  suggestionText: { flex: 1, fontWeight: '800', fontSize: 13, marginRight: 8 },
  suggestionMeta: { fontWeight: '700', fontSize: 11 },
});
