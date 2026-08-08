// ============================================================
// DailyCommentCard.js
// ParentSummaryScreen.js içindeki "Günlük kısa yorum" kartı,
// kendi başına çalışan bir component olarak ayrıldı.
// Cümle üretim mantığı (buildDailyComment) ve ona özel tüm
// yardımcılar burada yaşıyor — Summary ekranı sadece veriyi
// prop olarak geçiyor, metni kendi üretmiyor.
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MOOD_LISTESI } from '../constants';

const MEAL_LOCATIVE = {
  kahvalti: 'kahvaltıda',
  ogle: 'öğle yemeğinde',
  araOgun: 'ara öğünde',
};

const MEAL_VERB_PHRASES = {
  bitirdi: 'iyi yedi',
  az_yedi: 'az yedi',
  yemedi: 'pek iştahlı değildi',
};

const MEAL_EMOJI = {
  bitirdi: '🙂',
  az_yedi: '😐',
  yemedi: '😕',
};

const MEAL_ORDER = { bitirdi: 0, az_yedi: 1, yemedi: 2 };

function joinTurkish(list) {
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} ve ${list[list.length - 1]}`;
}

function capitalizeFirst(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getMoodEmoji(mood) {
  const found = MOOD_LISTESI.find((m) => m.label.toLowerCase() === String(mood || '').toLowerCase());
  return found?.emoji || '';
}

// Bugünün öğün durumlarını dünkü ile kıyaslar; belirgin bir fark yoksa
// (gürültü olmasın diye) hiçbir şey söylemez.
function buildMealTrend(todaySummary, yesterdaySummary) {
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
  if (diff >= 0.5) return 'Dünküne göre bugün iştahı daha iyiydi.';
  if (diff <= -0.5) return 'Dünküne göre bugün iştahı biraz daha azdı.';
  return '';
}

function buildDailyComment({ childFirstName, mood, mealsSummary, yesterdayMealsSummary, sleep, schedules, events, note }) {
  const sentences = [];
  const namePrefix = childFirstName ? `${childFirstName} bugün` : 'Bugün';
  let openerUsed = false;

  // 1) Ruh hali — çocuğun adıyla açılış cümlesi
  if (mood && mood !== 'Bekleniyor') {
    const emoji = getMoodEmoji(mood);
    sentences.push(`${namePrefix} ${emoji ? emoji + ' ' : ''}${mood.toLowerCase()} görünüyordu.`);
    openerUsed = true;
  }

  // 2) Öğünler — önce iyi geçenler, sonra iştahsız olanlar; her biri kendi
  // emojisi ve yumuşak bir ifadeyle, tek tek anlatılır.
  const mealFragments = (mealsSummary || [])
    .filter((item) => MEAL_VERB_PHRASES[item.status])
    .sort((a, b) => MEAL_ORDER[a.status] - MEAL_ORDER[b.status])
    .map((item) => {
      const place = MEAL_LOCATIVE[item.key] || item.label;
      const menuPart = item.menu ? ` (${item.menu})` : '';
      return `${MEAL_EMOJI[item.status]} ${place}${menuPart} ${MEAL_VERB_PHRASES[item.status]}`;
    });

  if (mealFragments.length > 0) {
    const mealSentence = `${joinTurkish(mealFragments)}.`;
    sentences.push(openerUsed ? capitalizeFirst(mealSentence) : `${namePrefix} ${mealSentence}`);
    openerUsed = true;

    const trend = buildMealTrend(mealsSummary || [], yesterdayMealsSummary || []);
    if (trend) sentences.push(trend);
  }

  // 3) Uyku bilgisi
  if (sleep && sleep !== 'Bekleniyor') {
    const sleepText = /saat/i.test(sleep) ? `😴 ${sleep} uyudu.` : `😴 Uyku durumu: ${sleep}.`;
    sentences.push(openerUsed ? sleepText : `${namePrefix} ${sleepText}`);
    openerUsed = true;
  }

  // 4) Bugünkü ders programı ve etkinlikler, başlıklarıyla birlikte
  const programTitles = [...(schedules || []), ...(events || [])]
    .map((item) => item.baslik || item.dersAdi || item.etkinlikAdi || item.ad || '')
    .filter(Boolean);
  if (programTitles.length > 0) {
    const programText = programTitles.length === 1
      ? `programda "${programTitles[0]}" vardı.`
      : `programda ${programTitles.map((t) => `"${t}"`).join(', ')} yer aldı.`;
    sentences.push(openerUsed ? `Bugün ${programText}` : `${namePrefix} ${programText}`);
    openerUsed = true;
  }

  const hasRealNote = note && note !== 'Bugün için öğretmen notu henüz girilmedi.';
  if (hasRealNote) {
    sentences.push(`Öğretmen notu: ${note}`);
  }

  if (sentences.length === 0) {
    return childFirstName ? `${childFirstName} için bugün henüz bilgi girilmedi.` : 'Bugün için henüz bilgi girilmedi.';
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
          <Text style={styles.commentTitle}>✨ Günlük kısa yorum</Text>
          <Text style={[styles.todayTag, styles.pendingTag]}>17:00’de hazır</Text>
        </View>
        <Text style={styles.commentText}>
          {childFirstName ? `${childFirstName} için günlük` : 'Günlük'} özet, öğretmenin bugün girdiği bilgilere göre bugün saat 17:00’de otomatik oluşturulacak.
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
    });

  return (
    <View style={styles.commentCard}>
      <View style={styles.commentHead}>
        <Text style={styles.commentTitle}>✨ Günlük kısa yorum</Text>
        <Text style={styles.todayTag}>Bugün</Text>
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
