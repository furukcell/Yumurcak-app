// ============================================================
// YUMURCAK — ParentMealsScreen.js
// Günlük ve aylık yemek listesi görünümü
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';

function getCurrentMonthKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(monthKey) {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const parts = String(monthKey || '').split('-');
  const year = parts[0];
  const monthIndex = Number(parts[1]) - 1;
  return `${months[monthIndex] || 'Ay'} ${year || ''}`.trim();
}

function getMealDateKey(item) {
  return String(item?.tarih || item?.baslangicTarihi || '').slice(0, 10);
}

function isDateInLast7Days(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 6);

  const targetDate = new Date(`${dateKey}T00:00:00`);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate >= minDate && targetDate <= today;
}

function isRecentDailyMeal(item) {
  return item?.kaynak !== 'admin_aylik' && isDateInLast7Days(getMealDateKey(item));
}

function getMealText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.text || value.aciklama || '';
}

function getMealPhoto(value) {
  if (!value || typeof value === 'string') return '';
  return value.fotoUrl || value.photoUrl || value.imageUrl || '';
}

export default function ParentMealsScreen({ navigation }) {
  const { loading, selectedChild, kresId, sinifId } = useParentBase();
  const meals = useNodeList('yemekListeleri');
  const [tab, setTab] = useState('today');

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

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

  const dailyMeals = useMemo(() => {
    return visibleMeals.filter((item) => isRecentDailyMeal(item));
  }, [visibleMeals]);

  const monthlyMeals = useMemo(() => {
    return visibleMeals
      .filter((item) => item.kaynak === 'admin_aylik')
      .filter((item) => item.ayKey === currentMonthKey)
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [visibleMeals, currentMonthKey]);

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
            <TouchableOpacity
              style={[localStyles.tab, tab === 'monthly' && localStyles.tabActive]}
              onPress={() => setTab('monthly')}
            >
              <Text style={[localStyles.tabText, tab === 'monthly' && localStyles.tabTextActive]}>Aylık</Text>
            </TouchableOpacity>
          </View>

          {tab === 'today' ? (
            todayMeal ? (
              <MealCard item={todayMeal} />
            ) : (
              <EmptyState icon="🍽️" title="Bugün için yemek yok" desc="Öğretmen veya yönetici yemek listesi eklediğinde burada görünür." />
            )
          ) : tab === 'monthly' ? (
            monthlyMeals.length === 0 ? (
              <EmptyState icon="📅" title="Aylık yemek listesi yok" desc={`${formatMonthLabel(currentMonthKey)} için yönetici aylık liste yayınladığında burada görünür.`} />
            ) : (
              <>
                <View style={localStyles.monthInfoCard}>
                  <Text style={localStyles.monthInfoTitle}>📅 {formatMonthLabel(currentMonthKey)} Aylık Yemek Listesi</Text>
                  <Text style={localStyles.monthInfoText}>Yönetici tarafından yayınlanan kurum geneli aylık menü.</Text>
                </View>
                {monthlyMeals.map((item) => <MealCard key={item.id} item={item} />)}
              </>
            )
          ) : dailyMeals.length === 0 ? (
            <EmptyState icon="🍽️" title="Son 7 günlük yemek listesi yok" desc="Öğretmen günlük yemek listesi eklediğinde burada görünür." />
          ) : (
            dailyMeals.map((item) => <MealCard key={item.id} item={item} />)
          )}
        </>
      )}
    </ScreenShell>
  );
}

function MealCard({ item }) {
  const ogunler = item.ogunler || {};
  const isMonthly = item.kaynak === 'admin_aylik';

  return (
    <View style={styles.card}>
      <Text style={[styles.badge, { backgroundColor: THEME.primarySoft, color: THEME.primary }]}> 
        {isMonthly ? 'Aylık Liste' : item.sinifId ? 'Sınıf Listesi' : 'Kurum Listesi'}
      </Text>
      <Text style={[styles.cardTitle, { marginTop: 8 }]}>{item.baslik || 'Yemek Listesi'}</Text>
      <Text style={styles.cardText}>📅 {formatDisplayDate(item.tarih || item.baslangicTarihi)}</Text>
      {renderMeal('Kahvaltı', '🥐', ogunler.kahvalti)}
      {renderMeal('Öğle', '🍲', ogunler.ogle)}
      {renderMeal('Ara Öğün', '🍎', ogunler.araOgun)}
    </View>
  );
}

function renderMeal(label, icon, value) {
  const text = getMealText(value);
  const fotoUrl = getMealPhoto(value);

  if (!text && !fotoUrl) return null;

  return (
    <View style={localStyles.mealItem}>
      {text ? <Text style={styles.cardText}>{icon} {label}: {text}</Text> : <Text style={styles.cardText}>{icon} {label}</Text>}
      {fotoUrl ? <Image source={{ uri: fotoUrl }} style={localStyles.mealPhoto} /> : null}
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
    fontSize: 12,
  },
  tabTextActive: {
    color: '#FFF',
  },
  monthInfoCard: {
    backgroundColor: THEME.primarySoft,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  monthInfoTitle: {
    color: THEME.primary,
    fontWeight: '900',
    fontSize: 15,
  },
  monthInfoText: {
    color: THEME.muted,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
  },
  mealItem: {
    marginTop: 8,
  },
  mealPhoto: {
    width: '100%',
    height: 170,
    borderRadius: 14,
    marginTop: 8,
    backgroundColor: THEME.bg,
  },
};