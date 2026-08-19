// ============================================================
// YUMURCAK — todayMenu.js
// FAZ — Ürün Bazlı Yemek Takibi: TeacherMealsScreen.js içindeki
// "bugünün menüsü" hesaplama mantığı (pickFreshestMeal + aylık/günlük
// birleştirme önceliği) buraya taşındı, ChildReportScreen de aynı
// mantığı kullanabilsin diye. TeacherMealsScreen kendi local kopyasını
// hâlâ kullanıyor (foto/metin birleştirme ile ilgili ek alanları var);
// burası sadece "bugün hangi ürünler menüde" sorusuna cevap veriyor.
// ============================================================
import { todayString } from '../screens/teacher/teacherShared';

export const MONTHLY_KAYNAK = 'ogretmen_aylik';
export const INSTITUTION_KAYNAK = 'admin_aylik';

const MEAL_KEYS = ['kahvalti', 'ogle', 'araOgun'];

export function toMealArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? [text] : [];
}

function hasMealValue(value) {
  if (toMealArray(value).length > 0) return true;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return !!(value.fotoUrl || value.photoUrl || value.imageUrl);
  }
  return false;
}

function pickFreshestMeal(list) {
  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => {
    const aHas = MEAL_KEYS.some((key) => hasMealValue(a?.ogunler?.[key])) ? 1 : 0;
    const bHas = MEAL_KEYS.some((key) => hasMealValue(b?.ogunler?.[key])) ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
  });
  return sorted[0];
}

// Bugün için her öğünde hangi ürünlerin menüde olduğunu hesaplar.
// meals: useTeacherData()'dan gelen ham 'yemekListeleri' listesi.
// Dönüş: { kahvalti: ['Yumurta','Zeytin','Peynir'], ogle: [...], araOgun: [...] }
export function computeTodayMenuItems({ meals, kresId, currentClass }) {
  const today = todayString();

  const visibleMeals = (meals || [])
    .filter((item) => item.aktif !== false)
    .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
    .filter((item) => !item.sinifId || item.sinifId === currentClass?.id);

  const todayDailyMeal = pickFreshestMeal(
    visibleMeals.filter((item) => item.tarih === today && item.kaynak !== INSTITUTION_KAYNAK && item.kaynak !== MONTHLY_KAYNAK)
  );
  // Önce BU SINIFA özel öğretmen aylık yayını, yoksa admin'in kurum geneli yayını
  // (TeacherMealsScreen'deki öncelik sırasıyla aynı).
  const todayOwnClassMonthlyMeal = pickFreshestMeal(
    visibleMeals.filter((item) => item.tarih === today && item.kaynak === MONTHLY_KAYNAK && item.sinifId === currentClass?.id)
  );
  const todayInstitutionMonthlyMeal = pickFreshestMeal(
    visibleMeals.filter((item) => item.tarih === today && item.kaynak === INSTITUTION_KAYNAK)
  );
  const todayMonthlyMeal = todayOwnClassMonthlyMeal || todayInstitutionMonthlyMeal;

  const result = {};
  MEAL_KEYS.forEach((key) => {
    const dailyItems = toMealArray(todayDailyMeal?.ogunler?.[key]);
    const monthlyItems = toMealArray(todayMonthlyMeal?.ogunler?.[key]);
    // Günlük kayıt o öğün için ürün içeriyorsa onu, yoksa aylık listeyi kullan.
    result[key] = dailyItems.length > 0 ? dailyItems : monthlyItems;
  });
  return result;
}
