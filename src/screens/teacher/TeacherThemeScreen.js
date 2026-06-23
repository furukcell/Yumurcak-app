import React, { useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { THEME_LIST } from '../../theme/themes';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';
import { useTeacherData, LoadingState } from './teacherShared';

export default function TeacherThemeScreen({ navigation }) {
  const { loading, currentClass } = useTeacherData();
  const themeData = useAppTheme();
  const theme = themeData.theme;
  const themeId = themeData.themeId;
  const patternEnabled = themeData.patternEnabled;
  const saveClassTheme = themeData.saveClassTheme;

  const selectedState = useState(themeId);
  const selectedThemeId = selectedState[0];
  const setSelectedThemeId = selectedState[1];

  const patternState = useState(patternEnabled);
  const localPatternEnabled = patternState[0];
  const setLocalPatternEnabled = patternState[1];

  const savingState = useState(false);
  const saving = savingState[0];
  const setSaving = savingState[1];

  const selectedTheme = THEME_LIST.find(function (item) { return item.id === selectedThemeId; }) || theme;

  async function handleSave() {
    if (!currentClass?.id) {
      Alert.alert('Sınıf bulunamadı', 'Tema kaydetmek için öğretmenin bir sınıfa bağlı olması gerekir.');
      return;
    }

    try {
      setSaving(true);
      await saveClassTheme(currentClass.id, selectedThemeId, localPatternEnabled);
      Alert.alert('Tamamlandı', 'Sınıf teması güncellendi.');
    } catch (error) {
      console.log(error);
      Alert.alert('Hata', 'Sınıf teması kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  function renderThemeCard({ item }) {
    const active = selectedThemeId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => setSelectedThemeId(item.id)}
        style={[styles.themeCard, { backgroundColor: item.card, borderColor: active ? item.primary : item.border, borderWidth: active ? 2 : 1 }]}
      >
        <View style={[styles.preview, { backgroundColor: item.primary }]}> 
          <View style={styles.fakeCard} />
          <View style={styles.fakeRow}>
            <View style={styles.fakeBox} />
            <View style={styles.fakeBox} />
            <View style={styles.fakeBox} />
          </View>
        </View>
        <Text style={[styles.themeName, { color: item.text }]}>{item.name}</Text>
        <Text style={[styles.themeSubtitle, { color: item.muted }]}>{item.subtitle}</Text>
        {active ? (
          <View style={[styles.activeBadge, { backgroundColor: item.primary }]}> 
            <Text style={styles.activeText}>Seçili</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  if (loading) return <LoadingState text="Tema ayarları hazırlanıyor..." />;

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={[styles.backText, { color: theme.primary }]}>‹ Geri</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>Tema Ayarları</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Text style={[styles.subtitle, { color: theme.muted }]}>Bu seçim sadece {currentClass?.ad || 'bu sınıfa'} bağlı öğretmen ve velilere uygulanır.</Text>

          <View style={[styles.optionRow, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Arka plan figürleri</Text>
              <Text style={[styles.optionDesc, { color: theme.muted }]}>Hayvan ve şekil desenleri sınıf ekranlarında hafif görünür.</Text>
            </View>
            <Switch value={localPatternEnabled} onValueChange={setLocalPatternEnabled} />
          </View>

          <FlatList
            data={THEME_LIST}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.list}
            renderItem={renderThemeCard}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity disabled={saving} onPress={handleSave} style={[styles.saveButton, { backgroundColor: selectedTheme.primary, opacity: saving ? 0.6 : 1 }]}> 
            <Text style={styles.saveText}>{saving ? 'Kaydediliyor...' : 'Bu Temayı Sınıfa Uygula'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 18, paddingTop: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  backText: { fontSize: 13, fontWeight: '900' },
  title: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '900' },
  headerSpacer: { width: 68 },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  optionRow: { marginTop: 18, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
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
  activeBadge: { position: 'absolute', right: 10, top: 10, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  activeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  saveButton: { position: 'absolute', left: 18, right: 18, bottom: 24, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
