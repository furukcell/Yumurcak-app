import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ref, update, serverTimestamp } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, useNodeList, useParentBase, LoadingScreen, EmptyState, includesId, asArray } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';

const DEFAULT_POLL_ICON = '🗳️';

export default function ParentPollsScreen({ navigation }) {
  const base = useParentBase();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const polls = useNodeList('anketler');
  const [sendingId, setSendingId] = useState(null);
  const [expandedPollId, setExpandedPollId] = useState(null);

  const { loading, kresId, sinifId, kullanici } = base;
  const veliId = kullanici?.uid || kullanici?.id;

  const activePolls = useMemo(() => {
    return polls
      .filter(Boolean)
      .filter((item) => item.aktif !== false && item.active !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        if (item.sinifIds) return includesId(item.sinifIds, sinifId) || !sinifId;
        if (item.sinifId && sinifId) return item.sinifId === sinifId;
        return true;
      })
      .sort((a, b) => getSortValue(b) - getSortValue(a));
  }, [polls, kresId, sinifId]);

  const mainPoll = activePolls[0] || null;
  const otherPolls = activePolls.slice(1);

  if (loading) return <LoadingScreen text="Anketler hazırlanıyor..." />;

  const vote = async (poll, option) => {
    if (!veliId || !poll?.id || sendingId) return;
    setSendingId(poll.id);
    try {
      await update(ref(database, `anketler/${poll.id}/cevaplar/${veliId}`), {
        secenek: option,
        veliId,
        updatedAt: serverTimestamp(),
        createdAt: poll.cevaplar?.[veliId]?.createdAt || serverTimestamp(),
      });
    } catch (error) {
      Alert.alert('Hata', 'Cevap kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSendingId(null);
    }
  };

  const openPoll = (pollId) => {
    setExpandedPollId((current) => current === pollId ? null : pollId);
  };

  return (
    <ScreenShell title="Anketler" emoji="🗳️" navigation={navigation}>
      {!veliId ? (
        <EmptyState icon="👤" title="Veli bilgisi okunamadı" desc="Anketleri cevaplamak için veli hesabı gerekir." />
      ) : activePolls.length === 0 ? (
        <EmptyState icon="🗳️" title="Aktif anket yok" desc="Kurum yeni anket veya oylama açtığında burada görünecek." />
      ) : (
        <>
          <PollDetailCard
            poll={expandedPollId ? activePolls.find((item) => item.id === expandedPollId) || mainPoll : mainPoll}
            veliId={veliId}
            sendingId={sendingId}
            styles={styles}
            onVote={vote}
          />

          {otherPolls.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>📋</Text>
                <Text style={styles.sectionTitle}>Diğer anketler</Text>
              </View>

              {otherPolls.map((poll) => (
                <PollPreviewCard
                  key={poll.id}
                  poll={poll}
                  veliId={veliId}
                  styles={styles}
                  onPress={() => openPoll(poll.id)}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}

function PollDetailCard({ poll, veliId, sendingId, styles, onVote }) {
  if (!poll) return null;
  const options = normalizeOptions(poll.secenekler || poll.options);
  const answer = poll.cevaplar?.[veliId]?.secenek || '';
  const answered = !!answer;
  const desc = poll.aciklama || poll.description || '';
  const typeLabel = getTargetLabel(poll);

  return (
    <View style={styles.pollCardHero}>
      <View style={styles.chipRow}>
        <Text style={styles.activeChip}>● Aktif</Text>
        <Text style={styles.timeChip}>⏳ {getRemainingText(poll)}</Text>
        <Text style={styles.typeChip}>👨‍👩‍👧 {typeLabel}</Text>
      </View>

      <Text style={styles.pollTitleHero}>{poll.baslik || poll.title || 'Anket'}</Text>
      {desc ? <Text style={styles.pollDescHero}>{desc}</Text> : null}

      {options.length === 0 ? (
        <Text style={styles.noOptionText}>Bu anket için seçenek eklenmemiş.</Text>
      ) : (
        <View style={styles.optionsWrapHero}>
          {options.map((option, index) => {
            const selected = answer === option;
            return (
              <TouchableOpacity
                key={`${option}-${index}`}
                style={[styles.optionHero, selected && styles.optionHeroSelected]}
                onPress={() => onVote(poll, option)}
                disabled={sendingId === poll.id}
                activeOpacity={0.86}
              >
                <View style={[styles.optionCircle, selected && styles.optionCircleSelected]}>
                  <Text style={[styles.optionCircleText, selected && styles.optionCircleTextSelected]}>{selected ? '✓' : ''}</Text>
                </View>

                <View style={styles.optionTextBox}>
                  <Text style={[styles.optionHeroTitle, selected && styles.optionHeroTitleSelected]}>{option}</Text>
                  <Text style={[styles.optionHeroSub, selected && styles.optionHeroSubSelected]}>{getOptionSubtitle(option)}</Text>
                </View>

                <Text style={[styles.optionDecor, selected && styles.optionDecorSelected]}>{getOptionDecor(option, index)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={[styles.answerBox, answered ? styles.answerBoxDone : styles.answerBoxWaiting]}>
        <Text style={[styles.answerText, answered ? styles.answerTextDone : styles.answerTextWaiting]}>
          {answered ? '✅ Cevabın kaydedildi' : '⏳ Cevabın bekleniyor'}
        </Text>
        {answered ? (
          <Text style={styles.changeText}>Cevabı değiştir ›</Text>
        ) : null}
      </View>
    </View>
  );
}

function PollPreviewCard({ poll, veliId, styles, onPress }) {
  const answered = !!poll.cevaplar?.[veliId];
  const title = poll.baslik || poll.title || 'Anket';
  const desc = poll.aciklama || poll.description || 'Anket detayını görüntüle';

  return (
    <TouchableOpacity style={styles.previewCard} onPress={onPress} activeOpacity={0.86}>
      <View style={styles.previewIconWrap}>
        <Text style={styles.previewIcon}>{getPollIcon(title)}</Text>
      </View>
      <View style={styles.previewTextWrap}>
        <Text style={styles.previewTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.previewDesc} numberOfLines={1}>{desc}</Text>
      </View>
      <Text style={[styles.previewBadge, answered ? styles.previewBadgeDone : styles.previewBadgeWaiting]}>
        {answered ? '✓ Cevaplandı' : 'Cevapla'}
      </Text>
      <Text style={styles.previewArrow}>›</Text>
    </TouchableOpacity>
  );
}

function normalizeOptions(value) {
  return asArray(value)
    .map((option, index) => {
      if (typeof option === 'string') return option.trim();
      return String(option?.label || option?.text || option?.baslik || `Seçenek ${index + 1}`).trim();
    })
    .filter(Boolean);
}

function getSortValue(item) {
  const raw = item?.createdAt || item?.tarih || item?.updatedAt || '';
  if (typeof raw === 'number') return raw;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRemainingText(poll) {
  const rawEnd = poll?.bitisTarihi || poll?.expiresAt || poll?.endDate || poll?.sonTarih;
  if (!rawEnd) return 'Aktif';

  const end = typeof rawEnd === 'number' ? rawEnd : Date.parse(rawEnd);
  if (!Number.isFinite(end)) return 'Aktif';

  const diff = end - Date.now();
  if (diff <= 0) return 'Bugün son';

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days <= 1) return '1 gün kaldı';
  return `${days} gün kaldı`;
}

function getTargetLabel(poll) {
  if (poll?.sinifId || poll?.sinifIds) return 'Sınıf Anketi';
  return 'Kurum Anketi';
}

function getOptionSubtitle(option) {
  const normalized = String(option || '').toLocaleLowerCase('tr-TR');
  if (normalized.includes('evet')) return 'Bu seçeneği tercih ediyorum';
  if (normalized.includes('hayır') || normalized.includes('hayir')) return 'Bu seçeneği tercih etmiyorum';
  return 'Seçeneği işaretle';
}

function getOptionDecor(option, index) {
  const normalized = String(option || '').toLocaleLowerCase('tr-TR');
  if (normalized.includes('evet')) return '⭐';
  if (normalized.includes('hayır') || normalized.includes('hayir')) return '🚌';
  return index === 0 ? '✨' : DEFAULT_POLL_ICON;
}

function getPollIcon(title) {
  const normalized = String(title || '').toLocaleLowerCase('tr-TR');
  if (normalized.includes('servis')) return '🚌';
  if (normalized.includes('yaz') || normalized.includes('etkinlik')) return '📅';
  if (normalized.includes('yemek')) return '🍽️';
  if (normalized.includes('gezi')) return '🚌';
  return DEFAULT_POLL_ICON;
}

const createStyles = (theme) => {
  const t = theme || {};
  const primary = t.primary || '#0096C7';
  const card = t.card || '#FFFFFF';
  const bg = t.bg || '#E5F8FF';
  const border = t.border || '#DDEAF4';
  const text = t.text || '#14213D';
  const muted = t.muted || '#667085';

  return StyleSheet.create({
    pollCardHero: {
      backgroundColor: card,
      borderRadius: 30,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: border,
      shadowColor: '#000',
      shadowOpacity: 0.07,
      shadowRadius: 15,
      elevation: 4,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    activeChip: { backgroundColor: '#E9FAEE', color: '#129244', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, fontWeight: '900', fontSize: 12 },
    timeChip: { backgroundColor: '#FFF6DD', color: '#936100', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, fontWeight: '900', fontSize: 12 },
    typeChip: { backgroundColor: '#F0EDFF', color: '#4B3DC7', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, fontWeight: '900', fontSize: 12 },
    pollTitleHero: { color: text, fontSize: 27, fontWeight: '900', letterSpacing: -0.4 },
    pollDescHero: { color: muted, fontSize: 16, fontWeight: '700', lineHeight: 24, marginTop: 10 },
    optionsWrapHero: { gap: 12, marginTop: 22 },
    optionHero: { minHeight: 92, backgroundColor: '#F0FAFF', borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: '#CFEFFF' },
    optionHeroSelected: { backgroundColor: primary, borderColor: primary, shadowColor: primary, shadowOpacity: 0.22, shadowRadius: 10, elevation: 3 },
    optionCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.8, borderColor: '#B7C6D8', backgroundColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    optionCircleSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
    optionCircleText: { color: primary, fontWeight: '900', fontSize: 24 },
    optionCircleTextSelected: { color: primary },
    optionTextBox: { flex: 1, minWidth: 0 },
    optionHeroTitle: { color: text, fontWeight: '900', fontSize: 19 },
    optionHeroTitleSelected: { color: '#FFFFFF' },
    optionHeroSub: { color: muted, fontWeight: '700', fontSize: 13, marginTop: 5 },
    optionHeroSubSelected: { color: 'rgba(255,255,255,0.88)' },
    optionDecor: { fontSize: 34, opacity: 0.38, marginLeft: 8 },
    optionDecorSelected: { opacity: 0.24 },
    answerBox: { marginTop: 18, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
    answerBoxDone: { backgroundColor: '#EFFBF2', borderColor: '#CDF2D7' },
    answerBoxWaiting: { backgroundColor: '#FFF8E7', borderColor: '#FFE8A8' },
    answerText: { fontWeight: '900', fontSize: 14, flex: 1, paddingRight: 8 },
    answerTextDone: { color: '#12833A' },
    answerTextWaiting: { color: '#936100' },
    changeText: { color: primary, fontWeight: '900', fontSize: 13, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: '#B8E4FF', backgroundColor: '#F7FCFF', overflow: 'hidden' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 9 },
    sectionIcon: { fontSize: 21 },
    sectionTitle: { color: text, fontSize: 18, fontWeight: '900' },
    previewCard: { backgroundColor: card, borderRadius: 24, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    previewIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    previewIcon: { fontSize: 27 },
    previewTextWrap: { flex: 1, minWidth: 0 },
    previewTitle: { color: text, fontWeight: '900', fontSize: 16 },
    previewDesc: { color: muted, fontWeight: '700', fontSize: 12, marginTop: 4 },
    previewBadge: { borderRadius: 99, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: '900', marginLeft: 8 },
    previewBadgeDone: { backgroundColor: '#E9FAEE', color: '#129244' },
    previewBadgeWaiting: { backgroundColor: '#FFF6DD', color: '#936100' },
    previewArrow: { color: muted, fontSize: 30, fontWeight: '500', marginLeft: 8, marginTop: -2 },
    noOptionText: { color: muted, fontWeight: '800', marginTop: 16, fontSize: 13 },
  });
};