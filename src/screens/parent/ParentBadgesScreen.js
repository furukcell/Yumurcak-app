import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase } from './parentShared';
import { useAppTheme } from '../../theme/ThemeProvider';
import { sortWeeklyBadgesNewestFirst } from '../../utils/weeklyBadges';

function cleanText(value, fallback = '') {
  return String(value || fallback || '').trim();
}

function getMonthKeyFromRecord(item) {
  const raw = item.weekKey || item.haftaKey || item.haftaBaslangic || item.createdAt || '';
  if (typeof raw === 'number') return new Date(raw).toISOString().slice(0, 7);
  return String(raw).slice(0, 7);
}

function getWeekLabel(item) {
  return item.haftaLabel || item.weekLabel || `${item.haftaBaslangic || '-'} - ${item.haftaBitis || '-'}`;
}

export default function ParentBadgesScreen({ navigation }) {
  const { t } = useTranslation();
 const base = useParentBase();
 const { theme } = useAppTheme();
 const styles = useMemo(() => createStyles(theme), [theme]);

 const { loading, selectedChild, childName, kresId } = base;
 const records = useNodeList('haftaninRozetleri', kresId);

  const childBadges = useMemo(() => {
    if (!selectedChild?.id) return [];
    return (records || [])
      .filter((item) => item.aktif !== false)
      .filter((item) => String(item.cocukId || '') === String(selectedChild.id))
      .sort(sortWeeklyBadgesNewestFirst);
  }, [records, selectedChild?.id]);

  const nowMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthCount = childBadges.filter((item) => getMonthKeyFromRecord(item) === nowMonthKey).length;
  const latestBadge = childBadges[0] || null;

  const groupedBadges = useMemo(() => {
    const groups = [];
    childBadges.forEach((item) => {
      const key = item.weekKey || item.haftaKey || item.haftaLabel || item.id;
      let group = groups.find((entry) => entry.key === key);
      if (!group) {
        group = { key, label: getWeekLabel(item), items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    return groups;
  }, [childBadges]);

  if (loading) return <LoadingScreen text={t('parent.badges.loading')} />;

  return (
    <ScreenShell title={t('parent.dashboard.myBadges')} emoji="🏅" navigation={navigation} subtitle={childName}>
      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.badges.noChildTitle')} desc={t('parent.badges.noChildDesc')} />
      ) : childBadges.length === 0 ? (
        <EmptyState icon="🏅" title={t('parent.badges.emptyTitle')} desc={t('parent.badges.emptyDesc')} />
      ) : (
        <>
          <View style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{childName}</Text>
              <Text style={styles.heroText}>{t('parent.badges.heroText')}</Text>
            </View>
            <Text style={styles.heroEmoji}>{latestBadge?.badgeEmoji || latestBadge?.rozetEmoji || '🏅'}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{childBadges.length}</Text>
              <Text style={styles.statLabel}>{t('parent.badges.totalBadges')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{thisMonthCount}</Text>
              <Text style={styles.statLabel}>{t('parent.badges.thisMonth')}</Text>
            </View>
          </View>

          {latestBadge ? (
            <View style={styles.latestCard}>
              <Text style={styles.latestHeader}>{t('parent.badges.latestBadge')}</Text>
              <View style={styles.latestRow}>
                <Text style={styles.latestEmoji}>{latestBadge.badgeEmoji || latestBadge.rozetEmoji || '🌟'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.latestTitle}>{cleanText(latestBadge.badgeTitle || latestBadge.rozetAdi, t('parent.summary.badge'))}</Text>
                  <Text style={styles.latestSub}>{getWeekLabel(latestBadge)}</Text>
                  {latestBadge.note || latestBadge.not ? <Text style={styles.latestNote}>{latestBadge.note || latestBadge.not}</Text> : null}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔒 {t('parent.badges.justForYouTitle')}</Text>
            <Text style={styles.infoText}>{t('parent.badges.justForYouDesc', { childName })}</Text>
          </View>

          {groupedBadges.map((group) => (
            <View key={group.key} style={styles.weekCard}>
              <View style={styles.weekHeader}>
                <Text style={styles.weekTitle}>📅 {group.label}</Text>
                <Text style={styles.weekCount}>{t('parent.badges.badgeCount', { count: group.items.length })}</Text>
              </View>
              {group.items.map((item) => (
                <BadgeRow key={item.id || `${item.weekKey}_${item.badgeId}`} item={item} styles={styles} t={t} />
              ))}
            </View>
          ))}
        </>
      )}
    </ScreenShell>
  );
}

function BadgeRow({ item, styles, t }) {
  const title = cleanText(item.badgeTitle || item.rozetAdi, t('parent.badges.defaultBadgeTitle'));
  const desc = cleanText(item.badgeDesc || item.rozetAciklama, t('parent.badges.defaultBadgeDesc'));
  const note = cleanText(item.note || item.not, '');
  const teacher = cleanText(item.ogretmenAdi || item.kaydedenAd || '', '');

  return (
    <View style={styles.badgeRow}>
      <View style={styles.badgeEmojiWrap}>
        <Text style={styles.badgeEmoji}>{item.badgeEmoji || item.rozetEmoji || '🌟'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.badgeTitle}>{title}</Text>
        <Text style={styles.badgeDesc}>{desc}</Text>
        {note ? <Text style={styles.badgeNote}>“{note}”</Text> : null}
        <Text style={styles.badgeMeta}>{getWeekLabel(item)}{teacher ? ` · ${teacher}` : ''}</Text>
      </View>
    </View>
  );
}

function createStyles(theme) {
  const t = theme || {};
  return StyleSheet.create({
    heroCard: {
      backgroundColor: t.primary || '#6C3DEB',
      borderRadius: 26,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      shadowColor: t.primary || '#6C3DEB',
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 5,
    },
    heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
    heroText: { color: 'rgba(255,255,255,0.84)', fontWeight: '700', lineHeight: 19, marginTop: 6 },
    heroEmoji: { fontSize: 46, marginLeft: 12 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    statCard: { flex: 1, backgroundColor: t.card || '#FFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: t.border || '#EEEAF8', alignItems: 'center' },
    statNumber: { color: t.primary || '#6C3DEB', fontSize: 26, fontWeight: '900' },
    statLabel: { color: t.muted || '#707386', fontWeight: '800', marginTop: 4 },
    latestCard: { backgroundColor: '#FFF7E8', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#FFE1A8', marginBottom: 12 },
    latestHeader: { color: '#A66C00', fontWeight: '900', marginBottom: 10, fontSize: 15 },
    latestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    latestEmoji: { fontSize: 40 },
    latestTitle: { color: t.text || '#191A23', fontWeight: '900', fontSize: 17 },
    latestSub: { color: t.muted || '#707386', fontWeight: '800', marginTop: 3 },
    latestNote: { color: '#704900', fontWeight: '700', lineHeight: 18, marginTop: 7 },
    infoCard: { backgroundColor: '#F1E6FF', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#D7BFFF', marginBottom: 12 },
    infoTitle: { color: t.primary || '#6C3DEB', fontWeight: '900', marginBottom: 5 },
    infoText: { color: t.text || '#191A23', fontWeight: '700', lineHeight: 19 },
    weekCard: { backgroundColor: t.card || '#FFF', borderRadius: 22, padding: 14, borderWidth: 1, borderColor: t.border || '#EEEAF8', marginBottom: 12 },
    weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 },
    weekTitle: { color: t.text || '#191A23', fontWeight: '900', fontSize: 15, flex: 1 },
    weekCount: { color: t.primary || '#6C3DEB', backgroundColor: t.primarySoft || '#EFE8FF', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, overflow: 'hidden', fontWeight: '900', fontSize: 11 },
    badgeRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.border || '#EEEAF8' },
    badgeEmojiWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF4D8', alignItems: 'center', justifyContent: 'center' },
    badgeEmoji: { fontSize: 25 },
    badgeTitle: { color: t.text || '#191A23', fontWeight: '900', fontSize: 15 },
    badgeDesc: { color: t.muted || '#707386', fontWeight: '700', lineHeight: 18, marginTop: 3 },
    badgeNote: { color: t.text || '#191A23', fontWeight: '700', lineHeight: 18, marginTop: 7, backgroundColor: t.bg || '#F8F6FF', padding: 9, borderRadius: 12 },
    badgeMeta: { color: t.muted || '#707386', fontWeight: '800', fontSize: 11, marginTop: 7 },
  });
}
