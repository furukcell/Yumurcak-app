// ============================================================
// YUMURCAK — ChildReportScreen.js (PARENT)
// Veli günlük rapor görüntüleme
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { database } from '../../config/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { translateMood } from '../../utils/moodLabel';
import { getMealText } from '../../components/MealTodayCard';

const THEME = { primary:'#6C3DEB', primarySoft:'#EFE8FF', green:'#20B45B', text:'#191A23', muted:'#707386', bg:'#F8F6FF', card:'#FFFFFF', border:'#EEEAF8' };
const MEALS = [
  { key:'kahvalti', icon:'🥐' },
  { key:'ogle', icon:'🍲' },
  { key:'araOgun', icon:'🍎' },
];

function valueToNames(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(valueToNames);
  if (typeof value === 'string') return value.split(',').map((x) => x.trim()).filter(Boolean);
  if (typeof value === 'object') {
    if (value.text || value.aciklama) return valueToNames(value.text || value.aciklama);
    if (value.urunler && typeof value.urunler === 'object') return Object.keys(value.urunler);
  }
  return [];
}

function menuItemsForDate(meals, date, sinifId) {
  const active = (meals || [])
    .filter((item) => item?.aktif !== false && item?.tarih === date)
    .filter((item) => !item?.sinifId || item.sinifId === sinifId);
  const classMonthly = active.filter((item) => item.kaynak === 'ogretmen_aylik' && item.sinifId === sinifId);
  const institutionMonthly = active.filter((item) => item.kaynak === 'admin_aylik');
  const daily = active.filter((item) => item.kaynak !== 'ogretmen_aylik' && item.kaynak !== 'admin_aylik');
  const pick = (list) => [...list].sort((a,b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0] || null;
  const monthly = pick(classMonthly) || pick(institutionMonthly);
  const dailyMeal = pick(daily);
  const result = {};
  MEALS.forEach(({ key }) => {
    const reportMenu = valueToNames(dailyMeal?.ogunler?.[key]);
    const monthlyMenu = valueToNames(monthly?.ogunler?.[key]);
    result[key] = reportMenu.length ? reportMenu : monthlyMenu;
  });
  return result;
}

export default function ChildReportScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { child } = route.params || {};
  const [reports, setReports] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const kresId = child?.kresId;
    if (!kresId) { setReports([]); setMeals([]); setLoading(false); return undefined; }
    const reportsQ = query(ref(database, 'gunlukRaporlar'), orderByChild('kresId'), equalTo(kresId));
    const mealsQ = query(ref(database, 'yemekListeleri'), orderByChild('kresId'), equalTo(kresId));
    const unsubscribeReports = onValue(reportsQ, (snapshot) => {
      const data = snapshot.val() || {};
      const childReports = Object.entries(data)
        .filter(([, item]) => item?.cocukId === child.id)
        .map(([id, item]) => ({ id, ...item }))
        .sort((a,b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
      setReports(childReports);
      setLoading(false);
    }, () => { setReports([]); setLoading(false); });
    const unsubscribeMeals = onValue(mealsQ, (snapshot) => {
      const data = snapshot.val() || {};
      setMeals(Object.entries(data).map(([id, item]) => ({ id, ...item })));
    }, () => setMeals([]));
    return () => { unsubscribeReports(); unsubscribeMeals(); };
  }, [child?.id, child?.kresId]);

  const getMoodIcon = (mood) => ({ Mutlu:'😊', Neşeli:'😄', Normal:'😐', Üzgün:'😢', Yorgun:'😴', Hasta:'🤒', Sinirli:'😠', Heyecanlı:'🥳' }[mood] || '😊');

  const renderMealItemsSection = (item) => {
    const menu = menuItemsForDate(meals, item.tarih, child?.sinifId);
    const sections = MEALS.map((meal) => {
      const reported = item.yemek?.[meal.key]?.urunler || {};
      const reportedNames = Object.keys(reported);
      const names = Array.from(new Set([...menu[meal.key], ...reportedNames]));
      return { ...meal, names, reported };
    }).filter((meal) => meal.names.length);
    if (!sections.length) return null;
    return <View style={styles.mealItemsBox}>
      {sections.map((meal) => <View key={meal.key} style={styles.mealItemsRow}>
        <Text style={styles.mealItemsIcon}>{meal.icon}</Text>
        <View style={styles.mealItemsChips}>
          {meal.names.map((name) => {
            const hasStatus = Object.prototype.hasOwnProperty.call(meal.reported, name);
            const eaten = meal.reported[name];
            return <View key={name} style={[styles.mealItemChip, hasStatus ? (eaten ? styles.mealItemChipYedi : styles.mealItemChipYemedi) : styles.mealItemChipMenu]}>
              <Text style={styles.mealItemChipText}>{hasStatus ? (eaten ? '✓ ' : '✗ ') : ''}{name}</Text>
            </View>;
          })}
        </View>
      </View>)}
    </View>;
  };

  const renderItem = ({ item, index }) => {
    const moodText = translateMood(item.mood, t, t('parent.childReport.moodFallback'));
    return <View style={styles.timelineRow}>
      <View style={styles.timelineRail}><View style={styles.timelineDot}/><View style={styles.timelineLine}/></View>
      <View style={styles.card}>
        <View style={styles.cardHeader}><View><Text style={styles.dateText}>{index === 0 ? t('parent.childReport.today') : item.tarih || t('parent.childReport.reportFallback')}</Text><Text style={styles.dateSubText}>{item.tarih || '-'}</Text></View><View style={styles.moodBadge}><Text style={styles.moodIcon}>{getMoodIcon(item.mood)}</Text><Text style={styles.moodLabel}>{moodText}</Text></View></View>
        <View style={styles.metricsRow}>
          <Metric icon="🍽️" label={t('parent.childReport.breakfast')} value={item.yemek?.kahvalti ? '✅' : '❌'}/>
          <Metric icon="🥗" label={t('parent.childReport.lunch')} value={item.yemek?.ogle ? '✅' : '❌'}/>
          <Metric icon="🍎" label={t('parent.childReport.snack')} value={item.yemek?.araOgun ? '✅' : '❌'}/>
          <Metric icon="💤" label={t('parent.childReport.sleep')} value={item.uyku?.sure != null ? t('parent.childReport.hoursValue', { count:item.uyku.sure }) : '-'}/>
          <Metric icon="🚽" label={t('parent.childReport.toilet')} value={item.tuvalet?.sayi != null ? t('parent.childReport.timesValue', { count:item.tuvalet.sayi }) : '-'} last/>
        </View>
        {renderMealItemsSection(item)}
        {item.not ? <View style={styles.noteBox}><Text style={styles.noteAvatar}>👩‍🏫</Text><View style={{flex:1}}><Text style={styles.noteTitle}>{t('parent.childReport.teacherNote')}</Text><Text style={styles.noteText}>{item.not}</Text></View></View> : null}
      </View>
    </View>;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={THEME.primary}/><Text style={styles.loadingText}>{t('parent.childReport.loading')}</Text></View>;
  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backArrow}>‹</Text><Text style={styles.backLabel}>{t('parent.childReport.back')}</Text></TouchableOpacity><Text style={styles.headerTitle}>{child?.ad || child?.adSoyad || t('parent.childReport.headerFallback')}</Text><View style={styles.headerSpacer}/></View>
    {reports.length === 0 ? <View style={styles.emptyState}><Text style={styles.emptyIcon}>📝</Text><Text style={styles.emptyTitle}>{t('parent.childReport.noReportsTitle')}</Text><Text style={styles.emptyDesc}>{t('parent.childReport.noReportsDesc')}</Text></View> : <FlatList data={reports} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}/>} 
  </SafeAreaView>;
}

function Metric({ icon, label, value, last }) { return <View style={[styles.metricItem, last && { borderRightWidth:0 }]}><Text style={styles.metricIcon}>{icon}</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:THEME.bg}, center:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:THEME.bg}, loadingText:{marginTop:12,color:THEME.muted,fontWeight:'600'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingTop:14,paddingBottom:14,backgroundColor:THEME.card,borderBottomWidth:1,borderBottomColor:THEME.border},
  backButton:{flexDirection:'row',alignItems:'center',paddingRight:8}, backArrow:{fontSize:28,color:THEME.primary,fontWeight:'700',lineHeight:32,marginRight:2}, backLabel:{fontSize:15,color:THEME.primary,fontWeight:'800'}, headerTitle:{fontSize:18,fontWeight:'900',color:THEME.text}, headerSpacer:{width:60},
  list:{paddingHorizontal:18,paddingTop:20,paddingBottom:40}, timelineRow:{flexDirection:'row',marginBottom:16}, timelineRail:{width:28,alignItems:'center'}, timelineDot:{width:12,height:12,borderRadius:6,backgroundColor:THEME.primary,marginTop:20}, timelineLine:{flex:1,width:2,backgroundColor:'#DED2FF',marginTop:4},
  card:{flex:1,backgroundColor:THEME.card,borderRadius:22,padding:16,borderWidth:1,borderColor:THEME.border,shadowColor:'#000',shadowOpacity:.05,shadowRadius:12,elevation:2}, cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}, dateText:{fontSize:16,fontWeight:'900',color:THEME.text}, dateSubText:{fontSize:12,color:THEME.muted,marginTop:2}, moodBadge:{backgroundColor:THEME.primarySoft,borderRadius:14,paddingHorizontal:10,paddingVertical:6,alignItems:'center'}, moodIcon:{fontSize:20}, moodLabel:{fontSize:10,color:THEME.primary,fontWeight:'900',marginTop:2},
  metricsRow:{flexDirection:'row',borderTopWidth:1,borderBottomWidth:1,borderColor:THEME.border,paddingVertical:12,marginBottom:12}, metricItem:{flex:1,alignItems:'center',borderRightWidth:1,borderRightColor:THEME.border}, metricIcon:{fontSize:18,marginBottom:4}, metricLabel:{fontSize:9,color:THEME.muted,fontWeight:'800',marginBottom:3}, metricValue:{fontSize:11,color:THEME.text,fontWeight:'900'},
  mealItemsBox:{marginTop:4,marginBottom:4}, mealItemsRow:{flexDirection:'row',alignItems:'flex-start',marginBottom:6}, mealItemsIcon:{fontSize:14,marginRight:6,marginTop:3}, mealItemsChips:{flex:1,flexDirection:'row',flexWrap:'wrap',gap:6}, mealItemChip:{paddingHorizontal:9,paddingVertical:4,borderRadius:99,borderWidth:1}, mealItemChipYedi:{backgroundColor:'#E4F9EE',borderColor:'#20B45B'}, mealItemChipYemedi:{backgroundColor:'#FFE9E9',borderColor:'#FF4444'}, mealItemChipMenu:{backgroundColor:'#F7F7FB',borderColor:THEME.border}, mealItemChipText:{fontSize:11,fontWeight:'800',color:THEME.text},
  noteBox:{flexDirection:'row',alignItems:'flex-start'}, noteAvatar:{fontSize:26,marginRight:9}, noteTitle:{fontSize:11,color:THEME.muted,fontWeight:'900',marginBottom:3}, noteText:{fontSize:12,color:THEME.text,lineHeight:17}, emptyState:{flex:1,justifyContent:'center',alignItems:'center',padding:40}, emptyIcon:{fontSize:48,marginBottom:14}, emptyTitle:{fontSize:18,fontWeight:'900',color:THEME.text,marginBottom:8}, emptyDesc:{fontSize:13,color:THEME.muted,textAlign:'center',lineHeight:19}
});