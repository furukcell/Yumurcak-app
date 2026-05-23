import { sendNotification, broadcastNotificationToParents } from '../../utils/notifications';
import { ref, get } from 'firebase/database';

const handleSave = async () => {
  if (!sleepDuration || !toiletCount) {
    return Alert.alert('Eksik Bilgi', 'Uyku süresi ve tuvalet sayısı zorunludur.');
  }

  setSaving(true);
  try {
    // Çocuğun veli bilgilerini al
    const childRef = ref(db, `cocuklar/${child.id}`);
    const childSnap = await get(childRef);
    const childData = childSnap.val();

    // Raporu kaydet
    const reportRef = ref(db, 'raporlar');
    await push(reportRef, {
      cocukId: child.id,
      sinifId: child.sinifId,
      teacherId: auth.currentUser.uid,
      date: new Date().toISOString().split('T')[0],
      mood,
      yemek,
      uyku: { duration: Number(sleepDuration), note: '' },
      tuvalet: { count: Number(toiletCount), note: '' },
      photos: [],
      note,
      createdAt: serverTimestamp() || Date.now(),
    });

    // Velilere bildirim gönder
    if (childData.parentIds && childData.parentIds.length > 0) {
      // Her veli için token al ve bildirim gönder
      for (const parentId of childData.parentIds) {
        const parentRef = ref(db, `users/${parentId}`);
        const parentSnap = await get(parentRef);
        const parentData = parentSnap.val();

        if (parentData?.pushToken) {
          await sendNotification(
            parentData.pushToken,
            'Yeni Günlük Rapor! 📝',
            `${child.name} için yeni rapor eklendi.`,
            { type: 'report', childId: child.id, reportId: reportRef.key }
          );
        }
      }
    }

    Alert.alert('Başarılı', 'Rapor kaydedildi ve veliye bildirildi.', [
      { text: 'Tamam', onPress: () => navigation.goBack() }
    ]);
  } catch (err) {
    Alert.alert('Hata', 'Rapor kaydedilemedi.');
    console.error(err);
  } finally {
    setSaving(false);
  }
};
