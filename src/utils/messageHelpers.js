// ============================================================
// YUMURCAK — messageHelpers.js
// Build fix + FAZ 16 message helper
// Konum: src/utils/messageHelpers.js
// ============================================================

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

export function normalizeConversationMeta(meta = {}) {
  return {
    ...(meta || {}),
    aktif: true,
  };
}
