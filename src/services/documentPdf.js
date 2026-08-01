// ============================================================
// YUMURCAK — documentPdf.js
// Faz 3: Yapılandırılmış aylık veriden (yemek listesi / ders programı)
// A4 HTML şablonu üretir ve bunu Yazdır / Paylaş / İndir olarak sunar.
//
// ÖNEMLİ: statik bir dosya YOKTUR — HTML her seferinde o anki
// yayınlanmış (aktif) kayıtlardan render edilir. Hem admin/öğretmen
// (kendi belgesini görmek için) hem veli (yayınlanan belgeyi görmek
// için) AYNI renderer'ı (buildMonthlyDocumentHtml) çağırmalı; iki
// farklı PDF üretim kodu OLMAMALI.
// ============================================================
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';
import { getMealText } from '../components/MealTodayCard';

const WEEKDAY_LABELS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Kurum bilgilerini (ad, adres, telefon, yönetici) AdminInstitutionSettingsScreen'in
// yazdığı node'dan çeker — PDF'de bu bilgiler tekrar elle girilmez.
export async function fetchInstitutionInfo(kresId) {
  if (!kresId) return null;
  try {
    const snap = await get(ref(database, `kresler/${kresId}`));
    return snap.val() || null;
  } catch (error) {
    console.warn('Kurum bilgileri okunamadı:', error?.code || error?.message || error);
    return null;
  }
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDateTr(dateKey) {
  const parts = String(dateKey || '').split('-');
  if (parts.length !== 3) return dateKey || '';
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function weekdayLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return WEEKDAY_LABELS_TR[date.getDay()] || '';
}

// records: 'yemekListeleri' ya da 'dersProgramlari'ndan gelen, o ay + sınıf
// için zaten AKTİF (yayınlanmış) kayıtların düz listesi. Filtreleme
// (kresId/ayKey/kaynak/sinifId) çağıran ekranın sorumluluğunda —
// bu fonksiyon sadece elindeki kayıtları render eder.
export function buildMonthlyDocumentHtml({ docType, kres, monthLabel, sinifAd, records }) {
  const kurumAd = escapeHtml(kres?.ad || 'Kreş');
  const adres = escapeHtml(kres?.adres || '');
  const telefon = escapeHtml(kres?.telefon || '');
  const yonetici = escapeHtml(kres?.yoneticiAd || '');
  const logoUrl = kres?.logoUrl || '';

  const isMeal = docType === 'yemek';
  const title = isMeal ? 'Aylık Yemek Listesi' : 'Aylık Ders Programı';

  const sorted = [...(records || [])].sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')));

  const rows = sorted.map((item) => {
    const dateLabel = formatDateTr(item.tarih);
    const day = weekdayLabel(item.tarih);

    if (isMeal) {
      const ogunler = item.ogunler || {};
      return `
        <tr>
          <td>${escapeHtml(dateLabel)}<br/><span class="weekday">${escapeHtml(day)}</span></td>
          <td>${escapeHtml(getMealText(ogunler.kahvalti))}</td>
          <td>${escapeHtml(getMealText(ogunler.ogle))}</td>
          <td>${escapeHtml(getMealText(ogunler.araOgun))}</td>
        </tr>`;
    }

    return `
      <tr>
        <td>${escapeHtml(dateLabel)}<br/><span class="weekday">${escapeHtml(day)}</span></td>
        <td>${escapeHtml(item.etkinlik || '')}</td>
        <td>${escapeHtml(item.aciklama || '')}</td>
      </tr>`;
  }).join('');

  const headerCols = isMeal
    ? '<th>Tarih</th><th>Kahvaltı</th><th>Öğle Yemeği</th><th>Ara Öğün</th>'
    : '<th>Tarih</th><th>Etkinlik</th><th>Açıklama</th>';

  const colSpan = isMeal ? 4 : 3;

  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #191A23; padding: 24px; }
      .header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #6C3DEB; padding-bottom: 14px; margin-bottom: 18px; }
      .header img { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; }
      .kurum-ad { font-size: 20px; font-weight: 900; color: #6C3DEB; margin: 0; }
      .kurum-meta { font-size: 11px; color: #707386; margin: 2px 0 0; }
      h1 { font-size: 16px; margin: 0 0 4px; }
      .subtitle { font-size: 12px; color: #707386; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #EFE8FF; color: #4B22B8; text-align: left; padding: 8px; border: 1px solid #EEEAF8; }
      td { padding: 8px; border: 1px solid #EEEAF8; vertical-align: top; }
      .weekday { font-size: 9px; color: #707386; }
      .footer { margin-top: 24px; font-size: 10px; color: #707386; display: flex; justify-content: space-between; }
      .signature { margin-top: 40px; font-size: 11px; text-align: right; }
      .empty { text-align: center; color: #707386; padding: 18px; }
    </style>
  </head>
  <body>
    <div class="header">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" />` : ''}
      <div>
        <p class="kurum-ad">${kurumAd}</p>
        <p class="kurum-meta">${[adres, telefon].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
    <h1>${title}${sinifAd ? ` — ${escapeHtml(sinifAd)}` : ''}</h1>
    <p class="subtitle">${escapeHtml(monthLabel)}</p>
    <table>
      <thead><tr>${headerCols}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${colSpan}" class="empty">Bu ay için yayınlanmış kayıt yok.</td></tr>`}</tbody>
    </table>
    ${yonetici ? `<div class="signature">Onaylayan: ${yonetici}</div>` : ''}
    <div class="footer">
      <span>Yumurcak</span>
      <span>${escapeHtml(new Date().toLocaleDateString('tr-TR'))} tarihinde oluşturuldu</span>
    </div>
  </body>
  </html>`;
}

// Native yazdırma diyaloğunu açar — iOS/Android'de bu diyalog zaten
// bir önizleme + "PDF olarak kaydet" seçeneği içerir.
export async function printMonthlyDocument(html) {
  await Print.printAsync({ html });
}

// PDF dosyası üretip cihazın paylaşım sayfasını açar (WhatsApp, Drive,
// Dosyalar/İndirilenler'e kaydetme dahil — "İndir" ihtiyacı da buradan karşılanır).
export async function shareMonthlyDocumentPdf(html, fileName) {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error('Bu cihazda paylaşım desteklenmiyor.');
  }

  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileName || 'Belge', UTI: 'com.adobe.pdf' });
  return uri;
}
