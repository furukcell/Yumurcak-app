import React, { useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { THEME_LIST } from '../../theme/themes';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import AppSuccessToast from '../../components/AppSuccessToast';

export default function AdminThemeScreen() {
  const themeData = useAppTheme();
  const theme = themeData.theme;
  const themeId = themeData.themeId;
  const patternEnabled = themeData.patternEnabled;
  const saveSchoolTheme = themeData.saveSchoolTheme;

  const selectedState = useState(themeId);
  const selectedThemeId = selectedState[0];
  const setSelectedThemeId = selectedState[1];

  const patternState = useState(patternEnabled);
  const localPatternEnabled = patternState[0];
  const setLocalPatternEnabled = patternState[1];

  const savingState = useState(false);
  const saving = savingState[0];
  const setSaving = savingState[1];

  const successToastState = useState(false);
  const successToast = successToastState[0];
  const setSuccessToast = successToastState[1];

  const selectedTheme = THEME_LIST.find(function (item) { return item.id === selectedThemeId; }) || theme;

  async function handleSave() {
    try {
      setSaving(true);
      await saveSchoolTheme(selectedThemeId, localPatternEnabled);
      setSuccessToast(true);
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Tema kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  function renderThemeCard({ item }) {
    const active = selectedThemeId === item.id;

    return React.createElement(
      TouchableOpacity,
      {
        activeOpacity: 0.86,
        onPress: function () { setSelectedThemeId(item.id); },
        style: [
          styles.themeCard,
          {
            backgroundColor: item.card,
            borderColor: active ? item.primary : item.border,
            borderWidth: active ? 2 : 1,
          },
        ],
      },
      React.createElement(
        View,
        { style: [styles.preview, { backgroundColor: item.primary }] },
        React.createElement(View, { style: styles.fakeCard }),
        React.createElement(
          View,
          { style: styles.fakeRow },
          React.createElement(View, { style: styles.fakeBox }),
          React.createElement(View, { style: styles.fakeBox }),
          React.createElement(View, { style: styles.fakeBox })
        )
      ),
      React.createElement(Text, { style: [styles.themeName, { color: item.text }] }, item.name),
      React.createElement(Text, { style: [styles.themeSubtitle, { color: item.muted }] }, item.subtitle),
      active
        ? React.createElement(
            View,
            { style: [styles.activeBadge, { backgroundColor: item.primary }] },
            React.createElement(Text, { style: styles.activeText }, 'Seçili')
          )
        : null
    );
  }

  return React.createElement(
    ThemedBackground,
    null,
    React.createElement(
      SafeAreaView,
      { style: styles.safeArea },
      React.createElement(AppSuccessToast, {
        visible: successToast,
        message: 'Kreş teması güncellendi',
        onHide: function () { setSuccessToast(false); },
      }),
      React.createElement(
        View,
        { style: styles.container },
        React.createElement(Text, { style: [styles.title, { color: theme.text }] }, 'Tema Ayarları'),
        React.createElement(
          Text,
          { style: [styles.subtitle, { color: theme.muted }] },
          'Bu seçim aynı kreşe bağlı veli ve öğretmen ekranlarına uygulanır.'
        ),
        React.createElement(
          View,
          { style: [styles.optionRow, { backgroundColor: theme.card, borderColor: theme.border }] },
          React.createElement(
            View,
            { style: { flex: 1 } },
            React.createElement(Text, { style: [styles.optionTitle, { color: theme.text }] }, 'Arka plan figürleri'),
            React.createElement(
              Text,
              { style: [styles.optionDesc, { color: theme.muted }] },
              'Hayvan ve şekil desenleri ana ekranda hafif görünür.'
            )
          ),
          React.createElement(Switch, {
            value: localPatternEnabled,
            onValueChange: setLocalPatternEnabled,
          })
        ),
        React.createElement(FlatList, {
          data: THEME_LIST,
          keyExtractor: function (item) { return item.id; },
          numColumns: 2,
          columnWrapperStyle: styles.column,
          contentContainerStyle: styles.list,
          renderItem: renderThemeCard,
        }),
        React.createElement(
          TouchableOpacity,
          {
            disabled: saving,
            onPress: handleSave,
            style: [
              styles.saveButton,
              {
                backgroundColor: selectedTheme.primary,
                opacity: saving ? 0.6 : 1,
              },
            ],
          },
          React.createElement(Text, { style: styles.saveText }, saving ? 'Kaydediliyor...' : 'Bu Temayı Kullan')
        )
      )
    )
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 18, paddingTop: 18 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  optionRow: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  optionTitle: { fontSize: 15, fontWeight: '900' },
  optionDesc: { marginTop: 3, fontSize: 11, fontWeight: '600', maxWidth: 220 },
  list: { paddingTop: 16, paddingBottom: 96 },
  column: { gap: 12 },
  themeCard: { flex: 1, minHeight: 165, borderRadius: 20, padding: 12, marginBottom: 12 },
  preview: { height: 78, borderRadius: 16, padding: 10, justifyContent: 'flex-end' },
  fakeCard: { height: 26, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  fakeRow: { flexDirection: 'row', gap: 5 },
  fakeBox: { flex: 1, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.45)' },
  themeName: { marginTop: 10, fontSize: 14, fontWeight: '900' },
  themeSubtitle: { marginTop: 3, fontSize: 11, fontWeight: '600' },
  activeBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  activeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  saveButton: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 24,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});