// ============================================================
// YUMURCAK — DailyChecklistCard.js
// FAZ 9: "Günlük Kontrol Paneli" — öğretmenin ana ekranında o güne ait
// tamamlanması gereken işlemleri gösteren kart. Yoklama/Günlük Rapor/
// Yemek Listesi/Bugünün Etkinliği zaten useTeacherData ile çekilmiş
// veriden hesaplanıyor (ekstra Firebase sorgusu yok). Fotoğraf Galerisi
// tek başına ekstra, kresId'ye göre filtrelenmiş bir sorgu gerektiriyor
// (galeri node'u useTeacherData içinde çekilmiyor), o yüzden bu component
// kendi hafif listener'ını kuruyor — mevcut hook'a dokunulmadı.
//
// NOT: Orijinal plandaki örnekte "Duyuru" maddesi de vardı, ama duyuru
// oluşturma yetkisi sadece yöneticide (öğretmen sadece görüntüler) —
// o yüzden öğretmenin gerçekten yapabileceği bir iş olan "Bugünün
// Etkinliği" (ders programı) ile değiştirildi.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../config/firebase';

function bugununTarihi() {
  return new Date().toISOString().split('T')[0];
}

function gununBaslangiciMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function useTodayGalleryCount(kresId, currentClass, classChildren) {
  const [count, setCount] = useState(0);
  const childIds = useMemo(() => new Set(classChildren.map((c) => String(c.id))), [classChildren]);

  useEffect(() => {
    if (!kresId) {
      setCount(0);
      return undefined;
    }

    const q = query(ref(database, 'galeri'), orderByChild('kresId'), equalTo(kresId));
    const unsub = onValue(q, (snapshot) => {
      const data = snapshot.val() || {};
      const start = gununBaslangiciMs();

      const bugunkuSayi = Object.values(data).filter((item) => {
        if (!item || Number(item.createdAt || 0) < start) return false;
        const itemClassId = item.classId || item.sinifId;
        if (currentClass?.id && String(itemClassId || '') === String(currentClass.id)) return true;
        const studentIds = [].concat(item.studentId || item.cocukIds || item.cocukId || []).filter(Boolean);
        return studentIds.some((id) => childIds.has(String(id)));
      }).length;

      setCount(bugunkuSayi);
    }, () => setCount(0));

    return () => unsub();
  }, [kresId, currentClass?.id, childIds]);

  return count;
}

export default function DailyChecklistCard({ kresId, currentClass, classChildren, reports, attendance, meals, schedules, theme }) {
  const palette = theme || { primary: '#27500A', primarySoft: '#EAF5E4', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8' };
  const today = bugununTarihi();
  const childCount = classChildren.length;

  const attendanceCount = useMemo(
    () => new Set(attendance.filter((item) => item.tarih === today && item.sinifId === currentClass?.id).map((item) => item.cocukId)).size,
    [attendance, today, currentClass?.id]
  );

  const reportCount = useMemo(
    () => new Set(reports.filter((item) => item.tarih === today).map((item) => item.cocukId)).size,
    [reports, today]
  );

  const hasTodayMeal = useMemo(() => {
    return meals.some((item) => {
      if (item.tarih !== today || item.aktif === false) return false;
      if (item.kresId && kresId && item.kresId !== kresId) return false;
      if (item.sinifId && currentClass?.id && item.sinifId !== currentClass.id) return false;
      const oguns = item.ogunler || {};
      return Object.values(oguns).some((deger) => {
        if (!deger) return false;
        if (typeof deger === 'string') return deger.trim().length > 0;
        return !!(String(deger.text || '').trim() || deger.fotoUrl);
      });
    });
  }, [meals, today, kresId, currentClass?.id]);

  const hasTodaySchedule = useMemo(() => {
    return schedules.some((item) => {
      if (item.tarih !== today || item.aktif === false) return false;
      if (item.sinifId !== currentClass?.id) return false;
      return !!(String(item.etkinlik || '').trim() || String(item.aciklama || '').trim());
    });
  }, [schedules, today, currentClass?.id]);

  const galleryCount = useTodayGalleryCount(kresId, currentClass, classChildren);

  const maddeler = [
    {
      key: 'yoklama',
      icon: '✅',
      label: 'Yoklama',
      tamam: childCount > 0 && attendanceCount >= childCount,
      detay: childCount > 0 ? `${attendanceCount}/${childCount}` : 'Sınıfta çocuk yok',
    },
    {
      key: 'rapor',
      icon: '📝',
      label: 'Günlük Rapor',
      tamam: childCount > 0 && reportCount >= childCount,
      detay: childCount > 0 ? `${reportCount}/${childCount}` : 'Sınıfta çocuk yok',
    },
    {
      key: 'yemek',
      icon: '🍽️',
      label: 'Yemek Listesi',
      tamam: hasTodayMeal,
      detay: hasTodayMeal ? 'Girildi' : 'Girilmedi',
    },
    {
      key: 'etkinlik',
      icon: '📚',
      label: 'Bugünün Etkinliği',
      tamam: hasTodaySchedule,
      detay: hasTodaySchedule ? 'Girildi' : 'Girilmedi',
    },
    {
      key: 'galeri',
      icon: '🖼️',
      label: 'Fotoğraf Galerisi',
      tamam: galleryCount > 0,
      detay: galleryCount > 0 ? `${galleryCount} paylaşım` : 'Paylaşım yok',
    },
  ];

  const tamamlanan = maddeler.filter((m) => m.tamam).length;

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: palette.text }]}>Bugünün Kontrol Listesi</Text>
        <Text style={[styles.counter, { color: palette.primary }]}>{tamamlanan}/{maddeler.length}</Text>
      </View>

      {maddeler.map((madde) => (
        <View key={madde.key} style={styles.row}>
          <Text style={styles.rowIcon}>{madde.tamam ? '☑️' : '☐'}</Text>
          <Text style={styles.rowEmoji}>{madde.icon}</Text>
          <Text style={[styles.rowLabel, { color: palette.text }, madde.tamam && styles.rowLabelDone]}>{madde.label}</Text>
          <Text style={[styles.rowDetay, { color: madde.tamam ? palette.primary : palette.muted }]}>{madde.detay}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, padding: 16, marginBottom: 22 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '900' },
  counter: { fontSize: 15, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowIcon: { fontSize: 16, marginRight: 8 },
  rowEmoji: { fontSize: 16, marginRight: 8 },
  rowLabel: { flex: 1, fontWeight: '800', fontSize: 14 },
  rowLabelDone: { textDecorationLine: 'line-through', opacity: 0.7 },
  rowDetay: { fontWeight: '800', fontSize: 12 },
});
