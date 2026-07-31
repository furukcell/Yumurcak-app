import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useNodeList, useParentBase, LoadingScreen, EmptyState } from './parentShared';
import { bugunKey, tarihTr, uyumEmoji, uyumGunNo, uyumGorunurMu, uyumKalanGun, uyumOzet, uyumYazi, UYUM_GUN } from '../../utils/uyum';

const GREEN = '#18A957';
const BG = '#F4FBF5';
const CARD = '#FFFFFF';
const TEXT = '#12301E';
const MUTED = '#667A70';
const BORDER = '#DDEFE3';
const ORANGE = '#FF9F1C';

export default function ParentAdaptationScoreScreen({ navigation }) {
   
  const base = useParentBase();
  const { loading, selectedChild, childName, sinif, kresId } = base;
  const records = useNodeList('uyumKayitlari', kresId);

  const childRecords = useMemo(() => {
    if (!selectedChild?.id) return [];
    return records
      .filter((item) => String(item.cocukId || '') === String(selectedChild.id))
      .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  }, [records, selectedChild?.id]);

  if (loading) return <LoadingScreen text="Uyum skoru hazırlanıyor..." />;
  if (!selectedChild) return <EmptyWrap title="Çocuk bulunamadı" desc="Veliye bağlı çocuk kaydı bulunamadı." />;
  if (!uyumGorunurMu(selectedChild)) return <EmptyWrap title="Uyum modülü kapalı" desc="Bu çocuk için yeni başlangıç uyum takibi başlatılmamış." />;

  const today = bugunKey();
  const startDate = selectedChild.uyumBaslangicTarihi || today;
  const dayNo = String(selectedChild.uyumDurumu || '') === 'tamamlandi' ? UYUM_GUN : uyumGunNo(startDate, today);
  const daysLeft = String(selectedChild.uyumDurumu || '') === 'tamamlandi' ? 0 : uyumKalanGun(startDate, today);
  const summary = uyumOzet(childRecords);
  const hasRecords = childRecords.length > 0;
  const score = hasRecords ? Number(summary.skor || 0) : 0;
  const latest = summary.son || {};
  const donePercent = Math.min(100, Math.round((dayNo / UYUM_GUN) * 100));
  const completed = String(selectedChild.uyumDurumu || '') === 'tamamlandi';
  const scoreLabel = hasRecords ? `${score}` : '--';
  const scoreDesc = hasRecords ? (completed ? '30 günlük süreç tamamlandı' : uyumYazi(score)) : 'İlk öğretmen kaydı bekleniyor';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>‹</Text></TouchableOpacity>
          <Text style={styles.headerSpark}>⭐</Text>
          <Text style={styles.headerTitle}>Uyum Skoru</Text>
          <Text style={styles.childName}>{childName}</Text>
          <Text style={styles.childSub}>{sinif?.ad || 'Sınıf'} · {completed ? 'Süreç tamamlandı' : `Uyumun ${dayNo}. günü`}</Text>
          <View style={styles.dayPill}><Text style={styles.dayPillText}>{dayNo}. Gün / {UYUM_GUN}</Text></View>
        </View>

        <View style={styles.scoreCard}>
          <View style={[styles.fakeCircle, !hasRecords && styles.fakeCirclePending]}><Text style={styles.circleEmoji}>{hasRecords ? uyumEmoji(score) : '🌱'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scoreText}>{scoreLabel}<Text style={styles.scoreSmall}>/100</Text></Text>
            <Text style={styles.scoreTitle}>{hasRecords ? 'Uyum Skoru' : 'Skor Bekleniyor'}</Text>
            <Text style={styles.scoreDesc}>{scoreDesc}</Text>
          </View>
        </View>

        {!hasRecords ? (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>İlk kayıt bekleniyor</Text>
            <Text style={styles.pendingDesc}>Öğretmen ilk günlük uyum değerlendirmesini kaydettiğinde skor, emoji geçmişi ve notlar burada görünür.</Text>
          </View>
        ) : null}

        <View style={styles.progressCard}>
          <View style={styles.rowBetween}><Text style={styles.cardTitle}>{dayNo} / {UYUM_GUN} tamamlandı</Text><Text style={styles.greenText}>{completed ? 'Tamamlandı' : `${daysLeft} gün kaldı`}</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${donePercent}%` }]} /></View>
        </View>

        <View style={styles.weekCard}>
          <View style={styles.rowBetween}><Text style={styles.cardTitle}>Gün Gün Uyum</Text><Text style={styles.muted}>Bugün ⭐</Text></View>
          {[0, 1, 2, 3].map((week) => (
            <View key={week} style={styles.weekRow}>
              <Text style={styles.weekLabel}>{week + 1}. Hafta</Text>
              {Array.from({ length: week === 3 ? 9 : 7 }).map((_, i) => {
                const d = week * 7 + i + 1;
                const rec = childRecords.find((item) => Number(item.gunNo || 0) === d);
                const active = d === dayNo && !completed;
                const emoji = rec ? uyumEmoji(rec.skor) : '○';
                return <Text key={d} style={[styles.dayDot, active && styles.todayDot]}>{emoji}</Text>;
              })}
            </View>
          ))}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Bugünün Özeti</Text>
            <Info label="Ağladı mı?" value={hasRecords ? (Number(latest.aglamaDakika || 0) > 0 ? `${latest.aglamaDakika} dk` : 'Hayır') : 'Bekleniyor'} />
            <Info label="Yemek" value={hasRecords ? foodLabel(latest.yemekDurumu) : 'Bekleniyor'} />
            <Info label="Çıkış" value={hasRecords ? exitLabel(latest.cikisDurumu) : 'Bekleniyor'} />
            <Info label="Uyku" value={hasRecords ? (latest.uykuDakika ? `${latest.uykuDakika} dk` : '-') : 'Bekleniyor'} />
          </View>
          <View style={styles.noteCard}>
            <Text style={styles.cardTitle}>Öğretmen Notu</Text>
            <Text style={styles.noteText}>{hasRecords ? (latest.ogretmenNotu || 'Bugün için öğretmen notu henüz girilmedi.') : 'İlk uyum notu kaydedildiğinde burada görünür.'}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.infoCard}>
            <View style={styles.rowBetween}><Text style={styles.cardTitle}>Ağlama Trendi</Text><Text style={styles.badge}>{hasRecords ? `%${summary.aglamaAzalma} azaldı` : 'Bekleniyor'}</Text></View>
            <View style={styles.barRow}>{[1,2,3,4].map((w) => <Bar key={w} week={w} records={childRecords} />)}</View>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Dönüm Noktaları</Text>
            <Milestone done={hasMilestone(childRecords, 'ilkAyrilik')} label="İlk ayrılık" />
            <Milestone done={hasMilestone(childRecords, 'ilkGulumseme')} label="İlk gülümseyerek giriş" />
            <Milestone done={hasMilestone(childRecords, 'ilkArkadaslik')} label="İlk arkadaşlık" />
            <Milestone done={hasMilestone(childRecords, 'rahatVeda')} label="Rahat vedalaşma" />
          </View>
        </View>

        <View style={styles.countdownCard}>
          <Text style={styles.calendar}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.countdownTitle}>{completed ? 'Uyum süreci tamamlandı' : `${daysLeft} gün kaldı`}</Text>
            <Text style={styles.countdownDesc}>Başlangıç: {tarihTr(startDate)} · Kayıt: {summary.tamamlanan} gün</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyWrap({ title, desc }) {
  return <SafeAreaView style={styles.safeArea}><View style={styles.empty}><Text style={styles.emptyIcon}>🌱</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDesc}>{desc}</Text></View></SafeAreaView>;
}
function Info({ label, value }) { return <View style={styles.infoLine}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || '-'}</Text></View>; }
function Milestone({ done, label }) { return <View style={styles.mile}><Text style={[styles.mileDot, done && styles.mileDone]}>{done ? '✓' : '○'}</Text><Text style={styles.mileText}>{label}</Text></View>; }
function Bar({ week, records }) {
  const list = records.filter((r) => Math.ceil(Number(r.gunNo || 1) / 7) === week);
  const avg = list.length ? Math.round(list.reduce((s, r) => s + Number(r.aglamaDakika || 0), 0) / list.length) : 0;
  const h = Math.max(8, Math.min(80, avg));
  return <View style={styles.barWrap}><Text style={styles.barValue}>{avg}</Text><View style={[styles.bar, { height: h }]} /><Text style={styles.barLabel}>{week}. H</Text></View>;
}
function hasMilestone(records, key) { return records.some((r) => r?.milestones && r.milestones[key]); }
function foodLabel(v) { return ({ hepsi: 'Hepsini yedi', yarisi: 'Yarısını yedi', az: 'Az yedi', hic: 'Yemedi' }[v] || '-'); }
function exitLabel(v) { return ({ gulerek: 'Gülerek ayrıldı', huzunlu: 'Biraz hüzünlü', agladi: 'Ağladı' }[v] || '-'); }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 90 },
  header: { backgroundColor: '#BDF4C8', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, padding: 22, paddingTop: 18, marginHorizontal: -16, marginTop: -2, alignItems: 'center' },
  back: { position: 'absolute', left: 18, top: 18, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 32, color: '#0F6832', fontWeight: '800', marginTop: -2 }, headerSpark: { fontSize: 34 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#073B1E', marginTop: 6 }, childName: { fontSize: 22, fontWeight: '900', color: '#073B1E', marginTop: 12 }, childSub: { color: '#335A43', fontWeight: '700', marginTop: 5 },
  dayPill: { backgroundColor: 'rgba(255,255,255,0.76)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7, marginTop: 10 }, dayPillText: { color: '#0A7A37', fontWeight: '900' },
  scoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 26, padding: 22, marginTop: -18, borderWidth: 1, borderColor: BORDER, elevation: 3 },
  fakeCircle: { width: 132, height: 132, borderRadius: 66, borderWidth: 12, borderColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 22, backgroundColor: '#F1FFF4' }, fakeCirclePending: { borderColor: '#B9DEC4', backgroundColor: '#F8FFF9' }, circleEmoji: { fontSize: 42 },
  scoreText: { fontSize: 48, fontWeight: '900', color: '#075B28' }, scoreSmall: { fontSize: 22 }, scoreTitle: { fontSize: 20, fontWeight: '900', color: TEXT }, scoreDesc: { color: GREEN, fontWeight: '800', marginTop: 5 },
  pendingCard: { backgroundColor: '#F7FFF8', borderRadius: 22, padding: 16, marginTop: 14, borderWidth: 1, borderColor: BORDER }, pendingTitle: { color: TEXT, fontWeight: '900', fontSize: 17 }, pendingDesc: { color: MUTED, fontWeight: '700', lineHeight: 19, marginTop: 6 },
  progressCard: { backgroundColor: CARD, borderRadius: 22, padding: 16, marginTop: 14, borderWidth: 1, borderColor: BORDER }, rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardTitle: { fontSize: 16, fontWeight: '900', color: TEXT }, greenText: { color: GREEN, fontWeight: '900' }, muted: { color: MUTED, fontWeight: '700' },
  progressTrack: { height: 12, backgroundColor: '#E9EEE9', borderRadius: 99, marginTop: 13, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: GREEN, borderRadius: 99 },
  weekCard: { backgroundColor: CARD, borderRadius: 22, padding: 16, marginTop: 14, borderWidth: 1, borderColor: BORDER }, weekRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 }, weekLabel: { width: 70, color: TEXT, fontWeight: '800' }, dayDot: { width: 28, height: 28, marginRight: 5, textAlign: 'center', textAlignVertical: 'center', borderRadius: 14, backgroundColor: '#F2F7F1', overflow: 'hidden' }, todayDot: { borderWidth: 2, borderColor: GREEN, backgroundColor: '#E7FBEA' },
  twoCol: { flexDirection: 'row', gap: 12, marginTop: 14 }, infoCard: { flex: 1, backgroundColor: CARD, borderRadius: 22, padding: 15, borderWidth: 1, borderColor: BORDER }, noteCard: { flex: 1, backgroundColor: '#F5FFF6', borderRadius: 22, padding: 15, borderWidth: 1, borderColor: BORDER }, noteText: { color: TEXT, lineHeight: 20, marginTop: 12, fontWeight: '600' },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 9 }, infoLabel: { color: MUTED, fontWeight: '800' }, infoValue: { color: TEXT, fontWeight: '900' },
  badge: { backgroundColor: '#E8FAEC', color: GREEN, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, overflow: 'hidden' }, barRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, marginTop: 10 }, barWrap: { alignItems: 'center', flex: 1 }, bar: { width: 24, borderRadius: 8, backgroundColor: '#8EDB94' }, barValue: { color: TEXT, fontWeight: '800', fontSize: 11 }, barLabel: { color: MUTED, fontSize: 11, marginTop: 5 },
  mile: { flexDirection: 'row', alignItems: 'center', marginTop: 12 }, mileDot: { width: 24, height: 24, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', color: MUTED, borderWidth: 1, borderColor: '#C8D3CC' }, mileDone: { backgroundColor: GREEN, color: '#fff', borderColor: GREEN }, mileText: { marginLeft: 10, color: TEXT, fontWeight: '800', flex: 1 },
  countdownCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7E8', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#FFE1A8', marginTop: 16 }, calendar: { fontSize: 44, marginRight: 14 }, countdownTitle: { color: ORANGE, fontSize: 22, fontWeight: '900' }, countdownDesc: { color: TEXT, fontWeight: '700', marginTop: 5 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, emptyIcon: { fontSize: 54 }, emptyTitle: { marginTop: 12, fontSize: 21, fontWeight: '900', color: TEXT, textAlign: 'center' }, emptyDesc: { marginTop: 6, color: MUTED, textAlign: 'center', lineHeight: 20, fontWeight: '700' },
});
