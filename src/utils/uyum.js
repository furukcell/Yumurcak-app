export const UYUM_GUN = 30;

export function bugunKey(date = new Date()) {
  const pad = (v) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function tarihTr(value) {
  if (!value) return '-';
  const parts = String(value).split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return String(value);
}

export function uyumGunNo(baslangic, tarih = bugunKey()) {
  if (!baslangic) return 1;
  const start = new Date(`${baslangic}T00:00:00`);
  const current = new Date(`${tarih}T00:00:00`);
  const diff = Math.floor((current - start) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, Math.min(UYUM_GUN, diff));
}

export function uyumKalanGun(baslangic, tarih = bugunKey()) {
  return Math.max(0, UYUM_GUN - uyumGunNo(baslangic, tarih));
}

export function uyumAktifMi(cocuk) {
  return cocuk?.uyumTakibiAktif === true && String(cocuk?.uyumDurumu || 'aktif') === 'aktif';
}

export function uyumGorunurMu(cocuk) {
  const durum = String(cocuk?.uyumDurumu || '');
  return cocuk?.uyumTakibiAktif === true || cocuk?.yeniBaslayan === true || durum === 'aktif' || durum === 'tamamlandi';
}

export function uyumEmoji(skor) {
  const value = Number(skor || 0);
  if (value >= 82) return '😄';
  if (value >= 60) return '🙂';
  if (value >= 40) return '😐';
  return '😢';
}

export function uyumYazi(skor) {
  const value = Number(skor || 0);
  if (value >= 82) return 'Çok iyi gidiyor';
  if (value >= 60) return 'İyi gidiyor';
  if (value >= 40) return 'Destekle ilerliyor';
  return 'Yakın takip gerekiyor';
}

export function uyumSkoru(kayit = {}) {
  let skor = 0;
  if (kayit.sabahDurumu === 'iyi') skor += 20;
  else if (kayit.sabahDurumu === 'orta') skor += 12;
  else skor += 5;

  const aglama = Number(kayit.aglamaDakika || 0);
  if (aglama <= 5) skor += 20;
  else if (aglama <= 20) skor += 14;
  else if (aglama <= 45) skor += 8;
  else skor += 2;

  if (kayit.yemekDurumu === 'hepsi') skor += 15;
  else if (kayit.yemekDurumu === 'yarisi') skor += 10;
  else if (kayit.yemekDurumu === 'az') skor += 5;

  const uyku = Number(kayit.uykuDakika || 0);
  if (uyku >= 60) skor += 15;
  else if (uyku >= 25) skor += 9;
  else if (uyku > 0) skor += 5;

  if (kayit.oyunDurumu === 'aktif') skor += 15;
  else if (kayit.oyunDurumu === 'kismen') skor += 9;
  else skor += 3;

  if (kayit.cikisDurumu === 'gulerek') skor += 15;
  else if (kayit.cikisDurumu === 'huzunlu') skor += 8;
  else skor += 3;

  return Math.max(0, Math.min(100, Math.round(skor)));
}

export function uyumOzet(kayitlar = []) {
  const list = [...kayitlar].sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));
  if (list.length === 0) return { skor: 0, ortalama: 0, son: null, tamamlanan: 0, aglamaAzalma: 0 };
  const son = list[list.length - 1];
  const ortalama = Math.round(list.reduce((sum, item) => sum + Number(item.skor || 0), 0) / list.length);
  const ilkAglama = Number(list[0]?.aglamaDakika || 0);
  const sonAglama = Number(son?.aglamaDakika || 0);
  const aglamaAzalma = ilkAglama > 0 ? Math.max(0, Math.round(((ilkAglama - sonAglama) / ilkAglama) * 100)) : 0;
  return { skor: Number(son?.skor || ortalama), ortalama, son, tamamlanan: list.length, aglamaAzalma };
}
