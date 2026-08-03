// ============================================================
// YUMURCAK — AdminGeziFormListScreen.js
// FAZ 8: "Gezi Formu" — yemek/ders gibi AY BAZLI değil, her gezi kendi
// bağımsız kaydı olan bir belge türü (bkz. AdminGeziFormEditScreen.js).
// Bu ekran sadece kresId'ye ait tüm gezi formlarını listeler.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';

import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import ThemedBackground from '../../components/ThemedBackground';

function formatDateTr(dateKey) {
  const parts = String(dateKey || '').split('-');
  if (parts.length !== 3) return dateKey || '';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export default function AdminGeziFormListScreen({ navigation }) {
  const { kullanici } = useAuth();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const kresId = kullanici?.kresId;

  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);

  useEffect(() => {
    if (!kresId) {
      setLoading(false);
      return undefined;
    }
    const q = query(ref(database, 'geziFormlari'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, value]) => ({ id, ...value }))
        .filter((item) => item.aktif !== false)
        .sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
      setForms(list);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [kresId]);

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.backText}>‹ Geri</Text>
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Gezi Formları</Text>
              <Text style={styles.subtitle}>{forms.length} form</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.newButton}
            onPress={() => navigation.navigate('AdminGeziFormEdit', {})}
            activeOpacity={0.85}
          >
            <Text style={styles.newButtonText}>+ Yeni Gezi Formu</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
          ) : forms.length === 0 ? (
            <Text style={styles.emptyText}>Henüz gezi formu oluşturulmadı.</Text>
          ) : (
            forms.map((form) => (
              <TouchableOpacity
                key={form.id}
                style={styles.card}
                onPress={() => navigation.navigate('AdminGeziFormEdit', { formId: form.id })}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{form.baslik || 'İsimsiz Gezi'}</Text>
                  <Text style={styles.cardMeta}>{formatDateTr(form.tarih)} · {form.hedefYer || ''}</Text>
                  {form.sinifAd ? <Text style={styles.cardClass}>{form.sinifAd}</Text> : null}
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    screen: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 16, paddingBottom: 36 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    backButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: theme.border },
    backText: { color: theme.primary, fontWeight: '900', fontSize: 15 },
    headerTextWrap: { flex: 1, minWidth: 0 },
    title: { color: theme.primary, fontSize: 24, fontWeight: '900' },
    subtitle: { color: theme.muted, fontSize: 13, fontWeight: '700', marginTop: 3 },
    newButton: { backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
    newButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
    emptyText: { color: theme.muted, textAlign: 'center', marginTop: 30, fontWeight: '700' },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 10 },
    cardTitle: { fontSize: 15, fontWeight: '900', color: theme.text },
    cardMeta: { fontSize: 12, fontWeight: '700', color: theme.muted, marginTop: 3 },
    cardClass: { fontSize: 11, fontWeight: '700', color: theme.primary, marginTop: 3 },
    cardArrow: { fontSize: 22, color: theme.muted, fontWeight: '900', marginLeft: 8 },
  });
}
