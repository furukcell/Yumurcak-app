// ============================================================
// YUMURCAK — ParentBulletinScreen.js
// FAZ 8: "Aylık Bülten" — veli tarafı. Sadece o ay için yayınlanmış
// (aktif) bülteni gösteriyor + ParentMealsScreen'deki "Aylık" sekmesiyle
// AYNI desende Yazdır/Paylaş/İndir barı.
// ============================================================
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, THEME } from './parentShared';
import MonthlyDocumentPdfBar from '../../components/MonthlyDocumentPdfBar';
import { getMonthKey, getMonthLabel } from '../../services/monthlyDocuments';

export default function ParentBulletinScreen({ navigation }) {
  const { loading, kresId } = useParentBase();
  const bultenler = useNodeList('aylikBultenler', kresId);

  const monthKey = useMemo(() => getMonthKey(new Date()), []);
  const monthLabel = useMemo(() => getMonthLabel(new Date()), []);

  const currentBulletin = useMemo(() => {
    return bultenler
      .filter((item) => item.aktif !== false)
      .filter((item) => item.kaynak === 'admin_aylik')
      .find((item) => item.ayKey === monthKey) || null;
  }, [bultenler, monthKey]);

  if (loading) return <LoadingScreen text="Bülten hazırlanıyor..." />;

  return (
    <ScreenShell title="Aylık Bülten" emoji="📰" navigation={navigation}>
      {!currentBulletin ? (
        <EmptyState icon="📰" title="Bu ay için bülten yok" desc={`${monthLabel} için kurum bülteni yayınlandığında burada görünür.`} />
      ) : (
        <>
          <MonthlyDocumentPdfBar
            kresId={kresId}
            nodePath="aylikBultenler"
            kaynak="admin_aylik"
            docType="bulten"
            monthKey={monthKey}
            monthLabel={monthLabel}
            theme={THEME}
          />

          <Text style={local.title}>{currentBulletin.baslik || `${monthLabel} Bülteni`}</Text>

          {(currentBulletin.bolumler || []).map((section, index) => (
            String(section?.icerik || '').trim() ? (
              <View key={`${index}-${section.baslik}`} style={local.section}>
                {section.baslik ? <Text style={local.sectionTitle}>{section.baslik}</Text> : null}
                <Text style={local.sectionContent}>{section.icerik}</Text>
              </View>
            ) : null
          ))}
        </>
      )}
    </ScreenShell>
  );
}

const local = StyleSheet.create({
  title: { color: THEME.text, fontSize: 20, fontWeight: '900', marginTop: 4, marginBottom: 14 },
  section: { backgroundColor: THEME.card, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, padding: 16, marginBottom: 12 },
  sectionTitle: { color: THEME.primary, fontSize: 14, fontWeight: '900', marginBottom: 8 },
  sectionContent: { color: THEME.text, fontSize: 14, fontWeight: '600', lineHeight: 21 },
});
