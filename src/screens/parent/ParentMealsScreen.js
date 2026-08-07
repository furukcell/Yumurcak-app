// ============================================================
// YUMURCAK — ParentMealsScreen.js
// Günlük ve aylık yemek listesi görünümü
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';
import MealTodayCard, { getMealText, getMealPhoto } from '../../components/MealTodayCard';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';

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
  return item?.kaynak !== 'admin_aylik' && item?.kaynak !== 'ogretmen_aylik' && item?.kaynak !== 'aylik_plan' && isDateInLast7Days(getMealDateKey(item));
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function buildEmptyTodayMeal(kresId, sinifId, childName) {
  const today = getTodayKey();
  return {
    kresId: kresId || '',
    sinifId: sinifId || '',
    tip: 'gunluk',
    tarih: today,
    baslik: `${childName || 'Sınıf'} Günlük Yemek Listesi`,
    ogunler: {},
    aktif: true,
    createdAt: Date.now(),
  };
}

function hasMealValue(value) {
  return !!(getMealText(value) || getMealPhoto(value));
}

function mergeMealValue(monthlyValue, dailyValue) {
  return hasMealValue(dailyValue) ? dailyValue : (monthlyValue || {});
}

function mergeTodayMeal({ kresId, sinifId, childName, monthlyMeal, dailyMeal }) {
  const emptyMeal = buildEmptyTodayMeal(kresId, sinifId, childName);
  const base = monthlyMeal || emptyMeal;
  const dailyOguns = dailyMeal?.ogunler || {};
  const monthlyOguns = monthlyMeal?.ogunler || {};

  return {
    ...base,
    ...(dailyMeal || {}),
    id: dailyMeal?.id || '',
    dailySourceId: dailyMeal?.id || '',
    monthlySourceId: monthlyMeal?.id || '',
    kaynak: dailyMeal?.kaynak || (monthlyMeal ? 'aylik_plan' : ''),
    tip: dailyMeal?.tip || 'gunluk',
    tarih: getTodayKey(),
    baslik: dailyMeal?.baslik || monthlyMeal?.baslik || emptyMeal.baslik,
    ogunler: {
      kahvalti: mergeMealValue(monthlyOguns.kahvalti, dailyOguns.kahvalti),
      ogle: mergeMealValue(monthlyOguns.ogle, dailyOguns.ogle),
      araOgun: mergeMealValue(monthlyOguns.araOgun, dailyOguns.araOgun),
    },
  };
}

export default function ParentMealsScreen({ navigation }) {
  const { loading, selectedChild, kresId, sinifId } = useParentBase();
  const meals = useNodeList('yemekListeleri', kresId);
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
    // Önce BU SINIFA özel öğretmen yayını, o ay için hiç yoksa admin'in
    // kurum geneli yayınına düş — ikisi artık ayrı kayıtlar (ogretmen_aylik / admin_aylik).
    const classMonthly = visibleMeals
      .filter((item) => item.kaynak === 'ogretmen_aylik' && item.sinifId === sinifId)
      .filter((item) => item.ayKey === currentMonthKey);
    const source = classMonthly.length > 0
      ? classMonthly
      : visibleMeals.filter((item) => item.kaynak === 'admin_aylik').filter((item) => item.ayKey === currentMonthKey);
    return source.sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [visibleMeals, currentMonthKey, sinifId]);
  const isClassMonthly = monthlyMeals.length > 0 && monthlyMeals[0]?.kaynak === 'ogretmen_aylik';

  const today = getTodayKey();
  const todayDailyMeal = visibleMeals.find((item) => item.tarih === today && item.kaynak !== 'admin_aylik' && item.kaynak !== 'ogretmen_aylik') || null;
  const todayOwnClassMonthlyMeal = visibleMeals.find((item) => item.tarih === today && item.kaynak === 'ogretmen_aylik' && item.sinifId === sinifId) || null;
  const todayInstitutionMonthlyMeal = visibleMeals.find((item) => item.tarih === today && item.kaynak === 'admin_aylik') || null;
  const todayMonthlyMeal = todayOwnClassMonthlyMeal || todayInstitutionMonthlyMeal;
  const todayMeal = mergeTodayMeal({
    kresId,
    sinifId,
    childName: selectedChild?.ad || selectedChild?.adSoyad || selectedChild?.isim,
    monthlyMeal: todayMonthlyMeal,
    dailyMeal: todayDailyMeal,
  });

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
            <MealTodayCard
              item={todayMeal}
              className={todayMeal?.hedefAdi || todayMeal?.sinifAdi || selectedChild?.sinifAdi || ''}
              title="Günlük Yemek Listesi"
            />
          ) : tab === 'monthly' ? (
            monthlyMeals.length === 0 ? (
              <EmptyState icon="📅" title="Aylık yemek listesi yok" desc={`${formatMonthLabel(currentMonthKey)} için yönetici aylık liste yayınladığında burada görünür.`} />
            ) : (
              <>
                <View style={localStyles.monthInfoCard}>
                  <Text style={localStyles.monthInfoTitle}>📅 {formatMonthLabel(currentMonthKey)} Aylık Yemek Listesi</Text>
                  <Text style={localStyles.monthInfoText}>
                    {isClassMonthly ? 'Sınıf öğretmeni tarafından yayınlanan aylık menü.' : 'Yönetici tarafından yayınlanan kurum geneli aylık menü.'}
                  </Text>
                </View>
                <MonthlyDocumentPdfBar
                  kresId={kresId}
                  nodePath="yemekListeleri"
                  kaynak={isClassMonthly ? 'ogretmen_aylik' : 'admin_aylik'}
                  sinifId={isClassMonthly ? sinifId : undefined}
                  docType="yemek"
                  monthKey={currentMonthKey}
                  monthLabel={formatMonthLabel(currentMonthKey)}
                  theme={THEME}
                />
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
  const isMonthly = item.kaynak === 'admin_aylik' || item.kaynak === 'ogretmen_aylik';

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
