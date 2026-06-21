import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ref, update, serverTimestamp } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, useNodeList, useParentBase, LoadingScreen, EmptyState } from './parentShared';
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
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        if (Array.isArray(item.sinifIds)) return item.sinifIds.includes(sinifId);
        if (item.sinifId) return item.sinifId === sinifId;
        return true;
      })
      .sort((a, b) => String(b.createdAt || b.tarih || '').localeCompare(String(a.createdAt || a.tarih || '')));
  }, [polls, kresId, sinifId]);

  if (loading) return <LoadingScreen text="Anketler hazırlanıyor..." />;

  const vote = async (poll, option) => {
    if (!veliId || sendingId) return;
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
      {activePolls.length === 0 ? (
        <EmptyState icon="🗳️" title="Aktif anket yok" desc="Kurum yeni anket veya oylama açtığında burada görünecek." />
      ) : (
        activePolls.map((poll) => {
          const options = poll.secenekler || poll.options || [];
          const answered = !!poll.cevaplar?.[veliId];
          return (
            <View key={poll.id} style={styles.pollCard}>
              <Text style={styles.pollTitle}>{poll.baslik || poll.title || 'Anket'}</Text>
              {poll.aciklama || poll.description ? <Text style={styles.pollDesc}>{poll.aciklama || poll.description}</Text> : null}
              <View style={styles.optionsWrap}>
                {options.map((option, index) => {
                  const label = typeof option === 'string' ? option : option?.label || option?.text || `Seçenek ${index + 1}`;
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
              <Text style={styles.pollFoot}>{answered ? 'Cevaplandı' : 'Cevap bekliyor'}</Text>
            </View>
          );
        })
      )}
    </ScreenShell>
  );
}

const createStyles = (theme) => StyleSheet.create({
  pollCard: { backgroundColor: theme.card, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  pollTitle: { color: theme.text, fontSize: 17, fontWeight: '900' },
  pollDesc: { color: theme.muted, fontSize: 12.5, fontWeight: '700', lineHeight: 18, marginTop: 6 },
  optionsWrap: { gap: 8, marginTop: 14 },
  optionButton: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12 },
  optionSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  optionText: { color: theme.text, fontWeight: '900', fontSize: 13 },
  optionTextSelected: { color: '#FFFFFF' },
  pollFoot: { color: theme.muted, fontSize: 11, fontWeight: '800', marginTop: 10, textAlign: 'right' },
});
