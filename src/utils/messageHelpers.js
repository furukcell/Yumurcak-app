// ============================================================
// YUMURCAK — messageHelpers.js
// Build fix + FAZ 16 message helper + FAZ 17 toplam okunmamış sayaç
// Konum: src/utils/messageHelpers.js
// ============================================================
import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { database } from '../config/firebase';

export const MESSAGE_PAGE_SIZE = 20;

export function safeUnread(meta, userId) {
  if (!meta || !userId) return 0;
  const value = meta?.okunmamisSayac?.[userId];
  const number = Number(value || 0);
  return Number.isNaN(number) ? 0 : number;
}

export function getParticipantIds(meta = {}) {
  const set = new Set();

  if (meta.katilimcilar && typeof meta.katilimcilar === 'object') {
    Object.keys(meta.katilimcilar).forEach((id) => id && set.add(id));
  }

  [
    meta.adminId,
    meta.hedefId,
    meta.veliId,
    meta.ogretmenId,
    meta.gonderenId,
    meta.aliciId,
  ].forEach((id) => id && set.add(id));

  return Array.from(set);
}

export function isReadByOtherParticipant(message, conversation, currentUserId) {
  if (!message || !conversation || !currentUserId) return false;
  if (message.gonderenId !== currentUserId) return false;

  const sonOkuma = conversation.sonOkuma || {};
  return Object.entries(sonOkuma).some(([userId, readAt]) => {
    if (userId === currentUserId) return false;
    return Number(readAt || 0) >= Number(message.createdAt || 0);
  });
}

export function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (sameDay) return time;

  return `${date.toLocaleDateString('tr-TR')} ${time}`;
}

export function mergeMessages(...groups) {
  const map = new Map();

  groups.flat().forEach((msg) => {
    if (!msg || !msg.id) return;
    map.set(msg.id, { ...(map.get(msg.id) || {}), ...msg });
  });

  return Array.from(map.values()).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
}

function cleanFirebaseValue(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value
      .map((item) => cleanFirebaseValue(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, entry) => {
      const key = entry[0];
      const item = entry[1];
      const cleaned = cleanFirebaseValue(item);

      if (cleaned !== undefined) {
        acc[key] = cleaned;
      }

      return acc;
    }, {});
  }

  return value;
}

export function normalizeConversationMeta(meta = {}) {
  return cleanFirebaseValue({
    ...(meta || {}),
    aktif: true,
  });
}

// ============================================================
// FAZ 17: Toplam okunmamış mesaj sayacı (ana sayfa badge'leri için)
// 'mesajKonusmalari' düğümünü dinler, kullanıcının katıldığı
// her görüşmedeki okunmamisSayac/{userId} değerlerini toplar.
// Admin / Öğretmen / Veli dashboard'larında "Mesajlar" kartına
// badge basmak için kullanılır.
// ============================================================
export function useUnreadMessagesCount(userId) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!userId) {
      setTotal(0);
      return undefined;
    }

    const unsub = onValue(ref(database, 'mesajKonusmalari'), (snapshot) => {
      const data = snapshot.val() || {};
      let sum = 0;

      Object.values(data).forEach((meta) => {
        sum += safeUnread(meta, userId);
      });

      setTotal(sum);
    });

    return () => unsub();
  }, [userId]);

  return total;
}
