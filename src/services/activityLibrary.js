// ============================================================
// YUMURCAK — activityLibrary.js
// FAZ 7: Etkinlik Kütüphanesi ve Etkinlik Öneri Sistemi
//
// Bu servis SADECE OKUMA yapar. `etkinlikHavuzu` node'una yazma işlemi
// tamamen Cloud Functions tarafında (bkz. functions/index.js —
// updateActivityPoolOnScheduleWrite) Admin SDK ile yapılıyor; client'lar
// bu node'a asla yazamıyor (database.rules.json'da ".write": false).
//
// Anonimlik notu: Havuzdaki kayıtlarda okul adı, öğretmen adı, çocuk veya
// sınıf bilgisi YOK — sadece etkinlik adı + yaş grubu + kategori + tema +
// anonim kullanım istatistikleri var. "Farklı kreş sayısı"nı hesaplamak
// için gereken kreşId listesi client'ın hiç okuyamadığı ayrı bir node'da
// (_etkinlikHavuzuMeta) tutuluyor.
// ============================================================
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';
import { database } from '../config/firebase';

const NODE_PATH = 'etkinlikHavuzu';

// Cloud Function'daki normalizeActivityName ile AYNI mantık olmalı —
// biri değişirse diğeri de güncellenmeli.
export function normalizeActivityName(name) {
  return String(name || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Firebase RTDB anahtarlarında kullanılamayan karakterleri (. # $ [ ] /)
// temizleyip boşlukları '-' yapar. Cloud Function'daki slugify ile AYNI.
export function slugifyActivityName(name) {
  const normalized = normalizeActivityName(name);
  if (!normalized) return '';
  return normalized.replace(/\s+/g, '-').slice(0, 120);
}

// Bir kategori için havuzdaki TÜM kayıtları çeker (kategori zorunlu index'li
// alan — havuz büyüdükçe her şeyi çekmek yerine bu şekilde sınırlıyoruz).
// yasGrubu ve tema'ya göre kesin filtre YAPMIYORUZ (kreşler arası "2-3 yaş" /
// "2-3 Yaş Grubu" gibi serbest metin tutarsızlığı olabiliyor) — bunun yerine
// eşleşenleri öne alıp, geri kalanını da gösteriyoruz (bkz. sortActivities).
export async function fetchActivitiesByCategory(kategori) {
  if (!kategori) return [];
  try {
    const q = query(ref(database, NODE_PATH), orderByChild('kategori'), equalTo(kategori));
    const snap = await get(q);
    const data = snap.val() || {};
    return Object.entries(data).map(([id, value]) => ({ id, ...value }));
  } catch (err) {
    console.error('fetchActivitiesByCategory error', err);
    return [];
  }
}

function sortActivities(list, { yasGrubu, tema, searchText } = {}) {
  const search = normalizeActivityName(searchText || '');

  return list
    .filter((item) => {
      if (!search) return true;
      return normalizeActivityName(item.ad).includes(search);
    })
    .map((item) => {
      const yasEslesme = yasGrubu && item.yasGrubu === yasGrubu ? 1 : 0;
      const temaEslesme = tema && item.tema === tema ? 1 : 0;
      return { ...item, _puan: yasEslesme * 2 + temaEslesme };
    })
    .sort((a, b) => {
      if (b._puan !== a._puan) return b._puan - a._puan;
      return (b.toplamKullanim || 0) - (a.toplamKullanim || 0);
    });
}

// Ana arama fonksiyonu — Etkinlik Öner ekranı/component'i bunu kullanır.
export async function searchActivityLibrary({ kategori, yasGrubu, tema, searchText, limit = 30 }) {
  const list = await fetchActivitiesByCategory(kategori);
  const sorted = sortActivities(list, { yasGrubu, tema, searchText });
  return sorted.slice(0, limit);
}
