// ============================================================
// YUMURCAK — ParentScheduleScreen.js
// FAZ 4 — Veli tarafında ders programı ekranı yoktu, bu ekran onu ekliyor.
// Admin/öğretmen tarafında yayınlanan aylık ders programını, çocuğun
// sınıfına göre (forClass) salt okunur gösterir + PDF indirme/paylaşma.
// ============================================================
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, styles, THEME } from './parentShared';
import { formatDisplayDate } from '../../utils/dateFormat';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';

const NODE_PATH = 'dersProgramlari';
const KAYNAK = 'admin_aylik';

function getCurrentMonthKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(monthKey) {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const parts = String(monthKey || '').split('-');
  const year = parts[0];
  const monthIndex = Number(parts[1]) - 1;
  return `${months[monthIndex] || 'Ay'} ${year || ''}`.trim();
}

export default function ParentScheduleScreen({ navigation }) {
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

  if (loading) return <LoadingScreen text="Ders programı hazırlanıyor..." />;

  return (
    <ScreenShell title="Ders Programı" emoji="📘" navigation={navigation}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Ders programı için çocuğunuzun sınıfa bağlı olması gerekir." />
      ) : (
        <>
          <View style={localStyles.monthInfoCard}>
            <Text style={localStyles.monthInfoTitle}>📘 {formatMonthLabel(currentMonthKey)} Ders Programı</Text>
            <Text style={localStyles.monthInfoText}>Öğretmen/yönetici tarafından yayınlanan aylık program.</Text>
          </View>

          <MonthlyDocumentPdfBar
            kresId={kresId}
            nodePath={NODE_PATH}
            kaynak={KAYNAK}
            docType="ders"
            monthKey={currentMonthKey}
            monthLabel={formatMonthLabel(currentMonthKey)}
            theme={THEME}
          />

          {monthlySchedule.length === 0 ? (
            <EmptyState icon="📘" title="Ders programı yok" desc={`${formatMonthLabel(currentMonthKey)} için henüz bir ders programı yayınlanmadı.`} />
          ) : (
            monthlySchedule.map((item) => <ScheduleCard key={item.id} item={item} />)
          )}
        </>
      )}
    </ScreenShell>
  );
}

function ScheduleCard({ item }) {
  // FAZ — Çoklu Etkinlik Girişi: gün artık `etkinlikler` dizisi tutuyor.
  const etkinlikler = Array.isArray(item.etkinlikler) ? item.etkinlikler : [];
  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>📅 {formatDisplayDate(item.tarih)}</Text>
      {etkinlikler.length === 0 ? (
        <Text style={[styles.cardTitle, { marginTop: 8 }]}>Ders Programı</Text>
      ) : (
        etkinlikler.map((it, index) => (
          <View key={index} style={index > 0 ? { marginTop: 12 } : { marginTop: 8 }}>
            <Text style={[styles.badge, { backgroundColor: THEME.primarySoft, color: THEME.primary }]}>
              {it.kategori || 'Etkinlik'}
            </Text>
            <Text style={[styles.cardTitle, { marginTop: 8 }]}>{it.etkinlik || 'Ders Programı'}</Text>
            {it.tema ? <Text style={styles.cardText}>🎨 Tema: {it.tema}</Text> : null}
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
