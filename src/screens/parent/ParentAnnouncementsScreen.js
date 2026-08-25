// ============================================================
// YUMURCAK — ParentAnnouncementsScreen.js
// Veli duyuruları - modern kartlı görünüm
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, THEME } from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';

function targetRoleOf(item) {
  return item.targetRole || item.hedefRol || item.hedefTipi || 'all';
}

function labelOf(item, t) {
  const role = targetRoleOf(item);
  if (role === 'sinif') return t('parent.announcements.classAnnouncement');
  if (role === 'veli') return t('parent.announcements.parentAnnouncement');
  return t('parent.announcements.institutionAnnouncement');
}

function titleOf(item, t) {
  return item.baslik || item.title || t('parent.announcements.defaultTitle');
}

function textOf(item) {
  return item.icerik || item.message || item.metin || item.aciklama || '-';
}

function isImportant(item, t) {
  const title = titleOf(item, t).toLocaleLowerCase('tr-TR');
  const text = textOf(item).toLocaleLowerCase('tr-TR');
  return item.onemli === true || item.important === true || title.includes('önem') || text.includes('önem');
}

function timeTextOf(item) {
  const raw = item.createdAt || item.updatedAt || item.tarih;
  if (!raw) return '';
  const date = typeof raw === 'number' ? new Date(raw) : new Date(String(raw));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ParentAnnouncementsScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild, kresId, sinifId } = useParentBase();
  
  const announcements = useNodeList('duyurular', kresId);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const visible = useMemo(() => {
    return announcements
      .filter((item) => item.aktif !== false)
      .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
      .filter((item) => {
        const targetRole = targetRoleOf(item);
        if (targetRole === 'ogretmen') return false;
        if (targetRole === 'veli') return true;
        if (targetRole === 'sinif') return !!sinifId && item.sinifId === sinifId;
        return !item.sinifId || item.sinifId === sinifId;
      })
      .filter((item) => {
        if (filter === 'class') return targetRoleOf(item) === 'sinif';
        if (filter === 'school') return targetRoleOf(item) !== 'sinif';
        if (filter === 'important') return isImportant(item, t);
        return true;
      })
      .sort((a, b) => Number(b.createdAt || b.tarih || 0) - Number(a.createdAt || a.tarih || 0));
  }, [announcements, kresId, sinifId, filter, t]);

  if (loading) return <LoadingScreen text={t('parent.announcements.loading')} />;

  return (
    <ScreenShell title={t('parent.announcements.title')} emoji="📣" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.announcements.noChildTitle')} desc={t('parent.announcements.noChildDesc')} />
      ) : announcements.length === 0 ? (
        <EmptyState icon="📣" title={t('parent.announcements.emptyTitle')} desc={t('parent.announcements.emptyDesc')} />
      ) : (
        <>
          <View style={local.filterRow}>
            <FilterChip active={filter === 'all'} label={`▦ ${t('parent.announcements.filterAll')}`} onPress={() => setFilter('all')} />
            <FilterChip active={filter === 'class'} label={`👥 ${t('parent.announcements.filterClass')}`} onPress={() => setFilter('class')} />
            <FilterChip active={filter === 'school'} label={`🏫 ${t('parent.announcements.filterInstitution')}`} onPress={() => setFilter('school')} />
            <FilterChip active={filter === 'important'} label={`★ ${t('parent.announcements.filterImportant')}`} onPress={() => setFilter('important')} />
          </View>

          <View style={local.infoBanner}>
            <View style={local.bannerIconBox}><Text style={local.bannerIcon}>🔔</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={local.bannerTitle}>{t('parent.announcements.bannerTitle')}</Text>
              <Text style={local.bannerText}>{t('parent.announcements.bannerText')}</Text>
            </View>
          </View>

          {visible.length === 0 ? (
            <EmptyState icon="🔎" title={t('parent.announcements.noResultsTitle')} desc={t('parent.announcements.noResultsDesc')} />
          ) : (
            visible.map((item) => {
              const role = targetRoleOf(item);
              const isClass = role === 'sinif';
              const expanded = expandedId === item.id;
              const dateText = item.tarih ? formatDisplayDate(item.tarih) : formatDisplayDate(item.createdAt || item.updatedAt || '');
              const timeText = timeTextOf(item);
              const important = isImportant(item, t);

              return (
                <TouchableOpacity key={item.id} style={local.card} onPress={() => setExpandedId(expanded ? null : item.id)} activeOpacity={0.88}>
                  <View style={local.cardTopRow}>
                    <Text style={[local.typePill, isClass ? local.classPill : local.schoolPill]}>{isClass ? '👥 ' : '🏫 '}{labelOf(item, t)}</Text>
                    {important ? <Text style={local.importantPill}>★ {t('parent.announcements.important')}</Text> : null}
                  </View>
                  <Text style={local.title}>{titleOf(item, t)}</Text>
                  <Text style={local.desc} numberOfLines={expanded ? 0 : 2}>{textOf(item)}</Text>
                  <View style={local.bottomRow}>
                    <View style={[local.dateIconBox, isClass ? local.classDateIcon : local.schoolDateIcon]}><Text style={local.dateIcon}>📅</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={local.dateText}>{dateText || t('parent.announcements.noDate')}</Text>
                      {timeText ? <Text style={local.timeText}>{timeText}</Text> : null}
                      {item.senderName ? <Text style={local.timeText}>{item.senderName}</Text> : null}
                    </View>
                    <View style={[local.detailButton, isClass ? local.detailButtonBlue : local.detailButtonGreen]}>
                      <Text style={[local.detailButtonText, isClass ? local.detailTextBlue : local.detailTextGreen]}>{expanded ? t('parent.announcements.close') : t('parent.announcements.seeDetails')}</Text>
                      <Text style={[local.detailArrow, isClass ? local.detailTextBlue : local.detailTextGreen]}>{expanded ? '⌃' : '›'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </>
      )}
    </ScreenShell>
  );
}

function FilterChip({ active, label, onPress }) {
  return (
    <TouchableOpacity style={[local.filterChip, active && local.filterChipActive]} onPress={onPress} activeOpacity={0.86}>
      <Text style={[local.filterText, active && local.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const local = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filterChip: { flexGrow: 1, backgroundColor: '#F7FCFF', borderWidth: 1, borderColor: '#BFE6FF', borderRadius: 18, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center' },
  filterChipActive: { backgroundColor: '#1976F3', borderColor: '#1976F3' },
  filterText: { color: THEME.text, fontWeight: '900', fontSize: 13 },
  filterTextActive: { color: '#FFF' },
  infoBanner: { backgroundColor: '#EAF7FF', borderWidth: 1, borderColor: '#BFE6FF', borderRadius: 22, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  bannerIconBox: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#D8EEFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bannerIcon: { fontSize: 28 },
  bannerTitle: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  bannerText: { color: THEME.muted, fontWeight: '700', marginTop: 4, lineHeight: 18 },
  card: { backgroundColor: THEME.card, borderRadius: 25, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 13, elevation: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  typePill: { borderRadius: 99, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, fontWeight: '900', fontSize: 12 },
  classPill: { backgroundColor: '#E4F1FF', color: '#1976F3' },
  schoolPill: { backgroundColor: '#E9FAEE', color: '#16A05A' },
  importantPill: { backgroundColor: '#FFE7EE', color: '#E33355', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, fontWeight: '900', fontSize: 12 },
  title: { color: THEME.text, fontSize: 20, fontWeight: '900', marginBottom: 8 },
  desc: { color: THEME.muted, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  dateIconBox: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  classDateIcon: { backgroundColor: '#E9F5FF' },
  schoolDateIcon: { backgroundColor: '#EAF9F0' },
  dateIcon: { fontSize: 24 },
  dateText: { color: THEME.text, fontWeight: '900', fontSize: 14 },
  timeText: { color: THEME.muted, fontWeight: '700', fontSize: 12, marginTop: 3 },
  detailButton: { minWidth: 112, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  detailButtonBlue: { backgroundColor: '#EEF7FF' },
  detailButtonGreen: { backgroundColor: '#EDFAF2' },
  detailButtonText: { fontWeight: '900', fontSize: 13 },
  detailArrow: { fontWeight: '900', fontSize: 20, marginTop: -2 },
  detailTextBlue: { color: '#1976F3' },
  detailTextGreen: { color: '#16A05A' },
});
