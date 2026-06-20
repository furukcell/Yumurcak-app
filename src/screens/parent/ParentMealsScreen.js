// ============================================================
// YUMURCAK — ParentMealsScreen.js
// FAZ 3: Sınıf yemek listesi varsa onu, yoksa kurum listesini gösterir
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';

export default function ParentMealsScreen({ navigation }) {
  const { loading, selectedChild, kresId, sinifId } = useParentBase();
  const meals = useNodeList('yemekListeleri');
  const [tab, setTab] = useState('today');

  const visibleMeals = useMemo(() => {
    const active = meals
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => !item.sinifId || item.sinifId === sinifId);

    const classMeals = active.filter((item) => item.sinifId === sinifId);
    const generalMeals = active.filter((item) => !item.sinifId);

    return [...classMeals, ...generalMeals]
      .sort((a, b) => String(b.tarih || b.baslangicTarihi || b.createdAt || '').localeCompare(String(a.tarih || a.baslangicTarihi || a.createdAt || '')));
  }, [meals, kresId, sinifId]);

  const today = new Date().toISOString().split('T')[0];
  const todayMeal = visibleMeals.find((item) => item.tarih === today) || null;

  if (loading) return <LoadingScreen text="Yemek listesi hazırlanıyor..." />;

  return (
    <ScreenShell title="Yemek Listesi" emoji="🍽️" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Yemek listesi için çocuğunuzun sınıfa bağlı olması gerekir." />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              style={[localStyles.tab, tab === 'today' && localStyles.tabActive]}
              onPress={() => setTab('today')}
            >
              <Text style={[localStyles.tabText, tab === 'today' && localStyles.tabTextActive]}>Bugün</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[localStyles.tab, tab === 'list' && localStyles.tabActive]}
              onPress={() => setTab('list')}
            >
              <Text style={[localStyles.tabText, tab === 'list' && localStyles.tabTextActive]}>Liste</Text>
            </TouchableOpacity>
          </View>

          {tab === 'today' ? (
            todayMeal ? (
              <MealCard item={todayMeal} />
            ) : (
              <EmptyState icon="🍽️" title="Bugün için yemek yok" desc="Öğretmen veya yönetici yemek listesi eklediğinde burada görünür." />
            )
          ) : visibleMeals.length === 0 ? (
            <EmptyState icon="🍽️" title="Yemek listesi yok" desc="Liste eklendiğinde burada görünür." />
          ) : (
            visibleMeals.map((item) => <MealCard key={item.id} item={item} />)
          )}
        </>
      )}
    </ScreenShell>
  );
}

function MealCard({ item }) {
  const ogunler = item.ogunler || {};
  return (
    <View style={styles.card}>
      <Text style={[styles.badge, { backgroundColor: THEME.primarySoft, color: THEME.primary }]}>
        {item.sinifId ? 'Sınıf Listesi' : 'Kurum Listesi'}
      </Text>
      <Text style={[styles.cardTitle, { marginTop: 8 }]}>{item.baslik || 'Yemek Listesi'}</Text>
      <Text style={styles.cardText}>📅 {item.tarih || item.baslangicTarihi || '-'}</Text>
      {ogunler.kahvalti ? <Text style={styles.cardText}>🥐 Kahvaltı: {ogunler.kahvalti}</Text> : null}
      {ogunler.ogle ? <Text style={styles.cardText}>🍲 Öğle: {ogunler.ogle}</Text> : null}
      {ogunler.araOgun ? <Text style={styles.cardText}>🍎 Ara Öğün: {ogunler.araOgun}</Text> : null}
    </View>
  );
}

const localStyles = {
  tab: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tabActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  tabText: {
    color: THEME.text,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#FFF',
  },
};
