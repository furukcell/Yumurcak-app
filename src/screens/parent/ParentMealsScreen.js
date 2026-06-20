import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, THEME, styles, GUNLER, GUN_LABEL, getDayKey } from './parentShared';

export default function ParentMealsScreen({ navigation }) {
  const { loading, kresId } = useParentBase();
  const yemekListeleriRaw = useNodeList('yemekListeleri');
  const [tab, setTab] = useState('today');

  const yemekListeleri = useMemo(() => {
    if (!kresId) return [];
    const now = new Date();
    const ucAyOnce = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    return yemekListeleriRaw
      .filter((item) => item.aktif !== false)
      .filter((item) => item.kresId === kresId)
      .filter((item) => {
        const d = item.baslangicTarihi ? new Date(item.baslangicTarihi) : item.createdAt ? new Date(item.createdAt) : null;
        return !d || d >= ucAyOnce;
      })
      .sort((a, b) => String(b.baslangicTarihi || b.createdAt || '').localeCompare(String(a.baslangicTarihi || a.createdAt || '')));
  }, [yemekListeleriRaw, kresId]);

  const todayMeals = useMemo(() => getTodayMeals(yemekListeleri), [yemekListeleri]);

  if (loading) return <LoadingScreen text="Yemek listesi hazırlanıyor..." />;

  return (
    <ScreenShell title="Yemek Listesi" emoji="🍽️" navigation={navigation}>
      <View style={{ flexDirection: 'row', backgroundColor: THEME.card, borderRadius: 16, padding: 4, marginBottom: 14 }}>
        <TouchableOpacity style={[tabStyle.base, tab === 'today' && tabStyle.active]} onPress={() => setTab('today')}>
          <Text style={[tabStyle.text, tab === 'today' && tabStyle.textActive]}>Bugünün Yemekleri</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[tabStyle.base, tab === 'list' && tabStyle.active]} onPress={() => setTab('list')}>
          <Text style={[tabStyle.text, tab === 'list' && tabStyle.textActive]}>Liste</Text>
        </TouchableOpacity>
      </View>

      {tab === 'today' ? (
        todayMeals ? (
          <View>
            <MealTodayCard icon="☀️" title="Kahvaltı" text={todayMeals.kahvalti} photoUrl={todayMeals.kahvaltiFotoUrl} />
            <MealTodayCard icon="🍽️" title="Öğle" text={todayMeals.ogle} photoUrl={todayMeals.ogleFotoUrl} />
            <MealTodayCard icon="🍎" title="İkindi" text={todayMeals.ikindi} photoUrl={todayMeals.ikindiFotoUrl} />
          </View>
        ) : (
          <EmptyState icon="🍽️" title="Bugünün menüsü yok" desc="Kreş bugünün yemeklerini girdiğinde burada görünecek." />
        )
      ) : yemekListeleri.length === 0 ? (
        <EmptyState icon="🍽️" title="Henüz yemek listesi yok" desc="Kreş yemek listesi girdiğinde burada görünecek." />
      ) : (
        yemekListeleri.map((item) => <MealListCard key={item.id} item={item} />)
      )}
    </ScreenShell>
  );
}

function getTodayMeals(lists) {
  const today = new Date();
  const todayKey = getDayKey(today);

  for (const meal of lists) {
    if (meal.tip === 'haftalik' && meal.ogunler?.[todayKey]) return meal.ogunler[todayKey];
    if (meal.tip === 'aylik' && meal.haftalar) {
      const haftaKeys = Object.keys(meal.haftalar).sort();
      for (const key of haftaKeys) {
        const gunData = meal.haftalar?.[key]?.gunler?.[todayKey];
        if (gunData) return gunData;
      }
    }
  }
  return null;
}

function MealTodayCard({ icon, title, text, photoUrl }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{icon} {title}</Text>
      {photoUrl ? <Image source={{ uri: photoUrl }} style={{ width: '100%', height: 150, borderRadius: 16, marginBottom: 10 }} /> : null}
      <Text style={styles.cardText}>{text || '-'}</Text>
    </View>
  );
}

function MealListCard({ item }) {
  const isWeekly = item.tip === 'haftalik';
  return (
    <View style={styles.card}>
      <Text style={[styles.badge, { backgroundColor: isWeekly ? '#EAFBF1' : THEME.primarySoft, color: isWeekly ? THEME.green : THEME.primary }]}>
        {isWeekly ? 'Haftalık' : 'Aylık'}
      </Text>
      <Text style={[styles.cardTitle, { marginTop: 10 }]}>{item.baslik || 'Yemek Listesi'}</Text>
      <Text style={styles.cardText}>{item.baslangicTarihi || '-'} – {item.bitisTarihi || '-'}</Text>
      <View style={{ marginTop: 10 }}>
        {isWeekly ? (
          GUNLER.map((gun) => {
            const d = item.ogunler?.[gun];
            if (!d) return null;
            return <Text key={gun} style={styles.cardText}>• {GUN_LABEL[gun]}: {d.kahvalti || '-'} / {d.ogle || '-'} / {d.ikindi || '-'}</Text>;
          })
        ) : (
          <Text style={styles.cardText}>Aylık liste detayları kreş tarafından girildiğinde burada özetlenir.</Text>
        )}
      </View>
    </View>
  );
}

const tabStyle = {
  base: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 13 },
  active: { backgroundColor: THEME.primary },
  text: { color: THEME.muted, fontWeight: '900', fontSize: 13 },
  textActive: { color: '#fff' },
};
