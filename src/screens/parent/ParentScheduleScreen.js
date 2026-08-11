// ============================================================
// YUMURCAK — ParentScheduleScreen.js
// FAZ 4 — Veli tarafında ders programı ekranı yoktu, bu ekran onu ekliyor.
// Admin/öğretmen tarafında yayınlanan aylık ders programını, çocuğun
// sınıfına göre (forClass) salt okunur gösterir + PDF indirme/paylaşma.
// ============================================================
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';

const NODE_PATH = 'dersProgramlari';
const KAYNAK = 'admin_aylik';
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function getCurrentMonthKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(monthKey, t) {
  const parts = String(monthKey || '').split('-');
  const year = parts[0];
  const monthIndex = Number(parts[1]) - 1;
  const monthName = MONTH_KEYS[monthIndex] ? t(`common.months.${MONTH_KEYS[monthIndex]}`) : t('parent.schedule.monthFallback');
  return `${monthName} ${year || ''}`.trim();
}

export default function ParentScheduleScreen({ navigation }) {
  const { t } = useTranslation();
  const { loading, selectedChild, kresId, sinifId } = useParentBase();
  const records = useNodeList(NODE_PATH, kresId);

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  const monthlySchedule = useMemo(() => {
    return records
      .filter((item) => item.aktif !== false)
      .filter((item) => item.kaynak === KAYNAK)
      .filter((item) => item.ayKey === currentMonthKey)
      .filter((item) => !item.sinifId || item.sinifId === sinifId)
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [records, currentMonthKey, sinifId]);

  if (loading) return <LoadingScreen text={t('parent.schedule.loading')} />;

  return (
    <ScreenShell title={t('parent.schedule.title')} emoji="📘" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title={t('parent.schedule.noChildTitle')} desc={t('parent.schedule.noChildDesc')} />
      ) : (
        <>
          <View style={localStyles.monthInfoCard}>
            <Text style={localStyles.monthInfoTitle}>📘 {t('parent.schedule.monthlyProgramTitle', { month: formatMonthLabel(currentMonthKey, t) })}</Text>
            <Text style={localStyles.monthInfoText}>{t('parent.schedule.monthlyProgramDesc')}</Text>
          </View>

          <MonthlyDocumentPdfBar
            kresId={kresId}
            nodePath={NODE_PATH}
            kaynak={KAYNAK}
            docType="ders"
            monthKey={currentMonthKey}
            monthLabel={formatMonthLabel(currentMonthKey, t)}
            theme={THEME}
          />

          {monthlySchedule.length === 0 ? (
            <EmptyState icon="📘" title={t('parent.schedule.emptyTitle')} desc={t('parent.schedule.emptyDesc', { month: formatMonthLabel(currentMonthKey, t) })} />
          ) : (
            monthlySchedule.map((item) => <ScheduleCard key={item.id} item={item} t={t} />)
          )}
        </>
      )}
    </ScreenShell>
  );
}

function ScheduleCard({ item, t }) {
  // FAZ — Çoklu Etkinlik Girişi: gün artık `etkinlikler` dizisi tutuyor.
  const etkinlikler = Array.isArray(item.etkinlikler) ? item.etkinlikler : [];
  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>📅 {formatDisplayDate(item.tarih)}</Text>
      {etkinlikler.length === 0 ? (
        <Text style={[styles.cardTitle, { marginTop: 8 }]}>{t('parent.schedule.title')}</Text>
      ) : (
        etkinlikler.map((it, index) => (
          <View key={index} style={index > 0 ? { marginTop: 12 } : { marginTop: 8 }}>
            <Text style={[styles.badge, { backgroundColor: THEME.primarySoft, color: THEME.primary }]}>
              {it.kategori || t('parent.schedule.defaultCategory')}
            </Text>
            <Text style={[styles.cardTitle, { marginTop: 8 }]}>{it.etkinlik || t('parent.schedule.title')}</Text>
            {it.tema ? <Text style={styles.cardText}>🎨 {t('parent.schedule.theme')}: {it.tema}</Text> : null}
            {it.aciklama ? <Text style={styles.cardText}>{it.aciklama}</Text> : null}
          </View>
        ))
      )}
    </View>
  );
}

const localStyles = {
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
};
