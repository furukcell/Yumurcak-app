// ============================================================
// DailyCommentCard.js
// ParentSummaryScreen.js içindeki "Günlük kısa yorum" kartı,
// kendi başına çalışan bir component olarak ayrıldı.
// Cümle üretim mantığı (buildDailyComment) ve ona özel tüm
// yardımcılar burada yaşıyor — Summary ekranı sadece veriyi
// prop olarak geçiyor, metni kendi üretmiyor.
//
// Not: mood (ruh hali) ve sleep (uyku) değerleri öğretmenin
// serbest girdiği ham veridir, otomatik çevrilmez — sadece
// bu dosyadaki sabit cümle kalıpları (t() ile) çevriliyor.
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MOOD_LISTESI } from '../constants';

const MEAL_ORDER = { bitirdi: 0, az_yedi: 1, yemedi: 2 };
const MEAL_EMOJI = {
  bitirdi: '🙂',
  az_yedi: '😐',
  yemedi: '😕',
};

function joinList(list, t) {
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} ${t('common.and')} ${list[list.length - 1]}`;
}

function capitalizeFirst(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getMoodEmoji(mood) {
  const found = MOOD_LISTESI.find((m) => m.label.toLowerCase() === String(mood || '').toLowerCase());
  return found?.emoji || '';
}

function buildMealFragmentText(item, t) {
  const place = t(`parent.dailyComment.mealPlace.${item.key}`, { defaultValue: item.label });
  const verb = t(`parent.dailyComment.mealVerb.${item.status}`);
  const menu = item.menu ? ` (${item.menu})` : '';
  return t('parent.dailyComment.mealFragment', { emoji: MEAL_EMOJI[item.status], place, verb, menu });
}

// Bugünün öğün durumlarını dünkü ile kıyaslar; belirgin bir fark yoksa
// (gürültü olmasın diye) hiçbir şey söylemez.
function buildMealTrend(todaySummary, yesterdaySummary, t) {
  const scoreOf = (summary) => {
    const scored = summary
      .filter((item) => MEAL_ORDER[item.status] !== undefined)
      .map((item) => 2 - MEAL_ORDER[item.status]); // bitirdi:2, az_yedi:1, yemedi:0
    if (scored.length === 0) return null;
    return scored.reduce((sum, val) => sum + val, 0) / scored.length;
  };
  const todayScore = scoreOf(todaySummary);
  const yesterdayScore = scoreOf(yesterdaySummary);
  if (todayScore === null || yesterdayScore === null) return '';
  const diff = todayScore - yesterdayScore;
  if (diff >= 0.5) return t('parent.dailyComment.trendBetter');
  if (diff <= -0.5) return t('parent.dailyComment.trendWorse');
  return '';
}

function buildDailyComment({ childFirstName, mood, mealsSummary, yesterdayMealsSummary, sleep, schedules, events, note, t }) {
  const sentences = [];
  const name = childFirstName || t('parent.dailyComment.defaultChildName');
  const opener = t('parent.dailyComment.opener', { name });
  let openerUsed = false;

  const pushSentence = (body) => {
    sentences.push(openerUsed ? capitalizeFirst(body) : `${opener} ${body}`);
    openerUsed = true;
  };

  // 1) Ruh hali — çocuğun adıyla açılış cümlesi
  if (mood && mood !== 'Bekleniyor') {
    const emoji = getMoodEmoji(mood);
    pushSentence(t('parent.dailyComment.moodBody', { emoji: emoji ? `${emoji} ` : '', mood: mood.toLowerCase() }));
  }

  // 2) Öğünler — önce iyi geçenler, sonra iştahsız olanlar; her biri kendi
  // emojisi ve yumuşak bir ifadeyle, tek tek anlatılır.
  const mealFragments = (mealsSummary || [])
    .filter((item) => MEAL_ORDER[item.status] !== undefined)
    .sort((a, b) => MEAL_ORDER[a.status] - MEAL_ORDER[b.status])
    .map((item) => buildMealFragmentText(item, t));

  if (mealFragments.length > 0) {
    pushSentence(t('parent.dailyComment.mealsBody', { meals: joinList(mealFragments, t) }));

    const trend = buildMealTrend(mealsSummary || [], yesterdayMealsSummary || [], t);
    if (trend) sentences.push(trend);
  }

  // 3) Uyku bilgisi
  if (sleep && sleep !== 'Bekleniyor') {
    const sleepBody = /saat/i.test(sleep)
      ? t('parent.dailyComment.sleepDuration', { sleep })
      : t('parent.dailyComment.sleepStatus', { sleep });
    pushSentence(sleepBody);
  }

  // 4) Bugünkü ders programı ve etkinlikler, başlıklarıyla birlikte
  const programTitles = [...(schedules || []), ...(events || [])]
    .map((item) => item.baslik || item.dersAdi || item.etkinlikAdi || item.ad || '')
    .filter(Boolean);
  if (programTitles.length > 0) {
    const programBody = programTitles.length === 1
      ? t('parent.dailyComment.programBodySingle', { title: programTitles[0] })
      : t('parent.dailyComment.programBodyMultiple', { titles: programTitles.map((title) => `"${title}"`).join(', ') });
    pushSentence(programBody);
  }

  const hasRealNote = note && note !== 'Bugün için öğretmen notu henüz girilmedi.';
  if (hasRealNote) {
    sentences.push(t('parent.dailyComment.teacherNote', { note }));
  }

  if (sentences.length === 0) {
    return t('parent.dailyComment.noInfo', { name });
  }

  return sentences.join(' ');
}

export default function DailyCommentCard({
  theme,
  childFirstName,
  mood,
  mealsSummary,
  yesterdayMealsSummary,
  sleep,
  schedules,
  events,
  note,
  aiComment,
}) {
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const currentHour = new Date().getHours();
  const isAfter5PM = currentHour >= 17;
  const hasAiComment = typeof aiComment === 'string' && aiComment.trim().length > 0;

  // 17:00'den önce, AI özeti henüz gelmediyse: eski şablon YERİNE bekleme
  // mesajı gösterilir. Şablon sadece 17:00 sonrası AI bir sebeple gelmezse
  // (Gemini hatası vb.) güvenlik ağı olarak devreye girer.
  if (!hasAiComment && !isAfter5PM) {
    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHead}>
          <Text style={styles.commentTitle}>✨ {t('parent.dailyComment.title')}</Text>
          <Text style={[styles.todayTag, styles.pendingTag]}>{t('parent.dailyComment.readyBadge')}</Text>
        </View>
        <Text style={styles.commentText}>
          {t('parent.dailyComment.pendingText', { name: childFirstName || t('parent.dailyComment.defaultChildName') })}
        </Text>
      </View>
    );
  }

  const dailyComment = hasAiComment
    ? aiComment.trim()
    : buildDailyComment({
      childFirstName,
      mood,
      mealsSummary,
      yesterdayMealsSummary,
      sleep,
      schedules,
      events,
      note,
      t,
    });

  return (
    <View style={styles.commentCard}>
      <View style={styles.commentHead}>
        <Text style={styles.commentTitle}>✨ {t('parent.dailyComment.title')}</Text>
        <Text style={styles.todayTag}>{t('common.today')}</Text>
      </View>
      <Text style={styles.commentText}>{dailyComment}</Text>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  commentCard: { backgroundColor: theme.card, borderRadius: 22, padding: 15, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: theme.primary, borderWidth: 1, borderColor: theme.border },
  commentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  commentTitle: { color: theme.primary, fontSize: 13, fontWeight: '900' },
  todayTag: { color: '#FFF', backgroundColor: theme.primary, fontSize: 10, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, overflow: 'hidden' },
  pendingTag: { backgroundColor: theme.muted },
  commentText: { color: theme.text, fontSize: 13.5, lineHeight: 20, fontWeight: '700' },
});
