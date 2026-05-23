import { broadcastNotificationToParents } from '../../utils/notifications';

const handleSend = async () => {
  if (!title.trim() || !message.trim()) {
    return Alert.alert('Hata', 'Başlık ve mesaj alanları boş olamaz.');
  }

  setLoading(true);
  try {
    const id = announcementId || generateId();
    const data = {
      title,
      message,
      kresId: 'default-kres',
      sentBy: auth.currentUser.uid,
      priority: isUrgent ? 'urgent' : 'normal',
      targetRole: 'all',
      createdAt: serverTimestamp() || Date.now()
    };

    if (announcementId) {
      await set(ref(db, `duyurular/${announcementId}`), data);
    } else {
      await push(ref(db, 'duyurular'), data);
    }

    // Tüm velilere bildirim gönder
    await broadcastNotificationToParents(
      isUrgent ? '🚨 ACİL DUYURU' : '📢 Yeni Duyuru',
      title,
      { type: 'announcement', announcementId: id }
    );

    Alert.alert('Başarılı', 'Duyuru gönderildi ve velilere bildirildi!', [
      { text: 'Tamam', onPress: () => navigation?.goBack() }
    ]);
  } catch (err) {
    Alert.alert('Hata', 'Bir sorun oluştu.');
    console.error(err);
  } finally {
    setLoading(false);
  }
};
