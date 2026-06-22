import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ref, update, serverTimestamp } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, useNodeList, useParentBase, LoadingScreen, EmptyState, includesId, asArray } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';

export default function ParentPollsScreen({ navigation }) {
  const base = useParentBase();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const polls = useNodeList('anketler');
  const [sendingId, setSendingId] = useState(null);

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

  if (loading) return <LoadingScreen text="Anketler hazırlanıyor..." />;

  const vote = async (poll, option) => {
    if (!veliId || !poll?.id || sendingId) return;
    setSendingId(poll.id);
    try {
      await update(ref(database, `anketler/${poll.id}/cevaplar/${veliId}`), {
        secenek: option,
        veliId,
        createdAt: serverTimestamp(),
      });
      Alert.alert('Cevabınız kaydedildi', 'Anket cevabınız kuruma iletildi.');
    } catch (error) {
      Alert.alert('Hata', 'Cevap kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <ScreenShell title="Anketler" emoji="🗳️" navigation={navigation}>
      {!veliId ? (
        <EmptyState icon="👤" title="Veli bilgisi okunamadı" desc="Anketleri cevaplamak için veli hesabı gerekir." />
      ) : activePolls.length === 0 ? (
        <EmptyState icon="🗳️" title="Aktif anket yok" desc="Kurum yeni anket veya oylama açtığında burada görünecek." />
      ) : (
        activePolls.map((poll) => {
          const options = normalizeOptions(poll.secenekler || poll.options);
          const answered = !!poll.cevaplar?.[veliId];
          return (
            <View key={poll.id} style={styles.pollCard}>
              <Text style={styles.pollTitle}>{poll.baslik || poll.title || 'Anket'}</Text>
              {poll.aciklama || poll.description ? <Text style={styles.pollDesc}>{poll.aciklama || poll.description}</Text> : null}
              {options.length === 0 ? (
                <Text style={styles.noOptionText}>Bu anket için seçenek eklenmemiş.</Text>
              ) : (
                <View style={styles.optionsWrap}>
                  {options.map((label, index) => {
                    const selected = poll.cevaplar?.[veliId]?.secenek === label;
                    return (
                      <TouchableOpacity
                        key={`${label}-${index}`}
                        style={[styles.optionButton, selected && styles.optionSelected]}
                        onPress={() => vote(poll, label)}
                        disabled={sendingId === poll.id}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{selected ? '✓ ' : ''}{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={styles.pollFoot}>{answered ? 'Cevaplandı' : 'Cevap bekliyor'}</Text>
            </View>
          );
        })
      )}
    </ScreenShell>
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

const createStyles = (theme) => {
  const t = theme || {};
  return StyleSheet.create({
    pollCard: { backgroundColor: t.card, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.border },
    pollTitle: { color: t.text, fontSize: 17, fontWeight: '900' },
    pollDesc: { color: t.muted, fontSize: 12.5, fontWeight: '700', lineHeight: 18, marginTop: 6 },
    optionsWrap: { gap: 8, marginTop: 14 },
    optionButton: { backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12 },
    optionSelected: { backgroundColor: t.primary, borderColor: t.primary },
    optionText: { color: t.text, fontWeight: '900', fontSize: 13 },
    optionTextSelected: { color: '#FFFFFF' },
    noOptionText: { color: t.muted, fontWeight: '800', marginTop: 12, fontSize: 12 },
    pollFoot: { color: t.muted, fontSize: 11, fontWeight: '800', marginTop: 10, textAlign: 'right' },
  });
};
