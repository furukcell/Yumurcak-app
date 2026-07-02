import { get, ref, update } from 'firebase/database';
import { database } from '../config/firebase';

const BACKFILL_VERSION = 1;
const MISSING_KRES_FALLBACK_ID = 'kres001';

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

function getRoleIndexGroup(role) {
  switch (role) {
    case 'yonetici':
      return 'yoneticiler';
    case 'ogretmen':
      return 'ogretmenler';
    case 'veli':
      return 'veliler';
    case 'superadmin':
      return 'superadminler';
    default:
      return 'diger';
  }
}

function matchesKres(item, kresId) {
  if (!item) return false;
  if (item.kresId === kresId) return true;
  return !item.kresId && kresId === MISSING_KRES_FALLBACK_ID;
}

function addUserIndexes(updates, userId, user, kresId) {
  if (!userId || !matchesKres(user, kresId)) return;
  const group = getRoleIndexGroup(user.rol);
  updates[`kresKullanicilari/${kresId}/${group}/${userId}`] = true;
  updates[`kullaniciKresleri/${userId}/${kresId}`] = true;
}

function addClassIndexes(updates, classId, classItem, kresId) {
  if (!classId || !matchesKres(classItem, kresId)) return;
  updates[`kresSiniflari/${kresId}/${classId}`] = true;
  const teacherIds = asArray(classItem.ogretmenIds).length > 0 ? asArray(classItem.ogretmenIds) : asArray(classItem.ogretmenId);
  teacherIds.forEach((teacherId) => {
    if (teacherId) updates[`ogretmenSiniflari/${teacherId}/${classId}`] = true;
  });
}

function addChildIndexes(updates, childId, child, kresId) {
  if (!childId || !matchesKres(child, kresId)) return;
  updates[`kresCocuklari/${kresId}/${childId}`] = true;
  if (child.sinifId) updates[`sinifCocuklari/${child.sinifId}/${childId}`] = true;
  const parentIds = [...asArray(child.veliIds), child.veliId, child.parentId].filter(Boolean);
  parentIds.forEach((parentId) => {
    updates[`veliCocuklari/${parentId}/${childId}`] = true;
  });
}

function addGalleryIndexes(updates, galleryId, item, kresId) {
  if (!galleryId || !matchesKres(item, kresId)) return;
  updates[`kresGalerileri/${kresId}/${galleryId}`] = true;
  const classId = item.classId || item.sinifId;
  if (classId) updates[`sinifGalerileri/${classId}/${galleryId}`] = true;
  const childIds = [...asArray(item.cocukIds), item.cocukId, item.studentId].filter(Boolean);
  childIds.forEach((childId) => {
    updates[`cocukGalerileri/${childId}/${galleryId}`] = true;
  });
}

export async function rebuildKresRealtimeIndexes(kresId) {
  if (!kresId) return { updated: 0 };

  const snapshot = await get(ref(database));
  const data = safeObject(snapshot.val());
  const updates = {};
  const stats = {
    sinifSayisi: 0,
    cocukSayisi: 0,
    ogretmenSayisi: 0,
    veliSayisi: 0,
  };

  Object.entries(safeObject(data.kullanicilar)).forEach(([userId, userValue]) => {
    const user = safeObject(userValue);
    if (!matchesKres(user, kresId)) return;
    addUserIndexes(updates, userId, user, kresId);
    if (user.rol === 'ogretmen') stats.ogretmenSayisi += 1;
    if (user.rol === 'veli') stats.veliSayisi += 1;
  });

  Object.entries(safeObject(data.siniflar)).forEach(([classId, classValue]) => {
    const classItem = safeObject(classValue);
    if (!matchesKres(classItem, kresId)) return;
    addClassIndexes(updates, classId, classItem, kresId);
    stats.sinifSayisi += 1;
  });

  Object.entries(safeObject(data.cocuklar)).forEach(([childId, childValue]) => {
    const child = safeObject(childValue);
    if (!matchesKres(child, kresId)) return;
    addChildIndexes(updates, childId, child, kresId);
    stats.cocukSayisi += 1;
  });

  Object.entries(safeObject(data.galeri)).forEach(([galleryId, galleryValue]) => {
    addGalleryIndexes(updates, galleryId, safeObject(galleryValue), kresId);
  });

  updates[`kresOzetleri/${kresId}`] = {
    ...stats,
    updatedAt: Date.now(),
    source: 'client-backfill',
  };
  updates[`indexBackfills/${kresId}`] = {
    version: BACKFILL_VERSION,
    lastRunAt: Date.now(),
    updatedPathCount: Object.keys(updates).length,
  };

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }

  return { updated: Object.keys(updates).length, stats };
}
