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

// records: 'yemekListeleri' / 'dersProgramlari' için o ay + sınıf için zaten
// AKTİF (yayınlanmış) kayıtların düz listesi (çoğul, gün-bazlı). 'gorev'
// (Personel Görev Listesi) için ise tek bir ay için TEK kayıt olur
// (`records` yine dizi olarak gelir, ama 0 ya da 1 elemanlı — çağıran
// ekranın filtrelemesi aynı kalsın diye).
// Filtreleme (kresId/ayKey/kaynak/sinifId) çağıran ekranın sorumluluğunda —
// bu fonksiyon sadece elindeki kayıtları render eder.
export function buildMonthlyDocumentHtml({ docType, kres, monthLabel, sinifAd, records }) {
  const kurumAd = escapeHtml(kres?.ad || 'Kreş');
  const adres = escapeHtml(kres?.adres || '');
  const telefon = escapeHtml(kres?.telefon || '');
  const yonetici = escapeHtml(kres?.yoneticiAd || '');
  const logoUrl = kres?.logoUrl || '';

  if (docType === 'gorev') {
    return buildBulletinHtml({ kurumAd, adres, telefon, yonetici, logoUrl, monthLabel, record: (records || [])[0] });
  }

  const TITLES = { yemek: 'Aylık Yemek Listesi', ders: 'Aylık Ders Programı', nobet: 'Aylık Nöbet Çizelgesi' };
  const isMeal = docType === 'yemek';
  const isDuty = docType === 'nobet';
  const title = TITLES[docType] || 'Aylık Belge';

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

    if (isDuty) {
      return `
        <tr>
          <td>${escapeHtml(dateLabel)}<br/><span class="weekday">${escapeHtml(day)}</span></td>
          <td>${escapeHtml(item.personel || '')}</td>
          <td>${escapeHtml(item.not || '')}</td>
        </tr>`;
    }

    // FAZ — Çoklu Etkinlik Girişi: gün artık `etkinlikler` dizisi tutuyor.
    const etkinlikler = Array.isArray(item.etkinlikler) ? item.etkinlikler : [];
    const etkinlikText = etkinlikler.map((it) => it?.etkinlik || '').filter(Boolean).join(', ');
    const aciklamaText = etkinlikler.map((it) => it?.aciklama || '').filter(Boolean).join(' · ');

    return `
      <tr>
        <td>${escapeHtml(dateLabel)}<br/><span class="weekday">${escapeHtml(day)}</span></td>
        <td>${escapeHtml(etkinlikText)}</td>
        <td>${escapeHtml(aciklamaText)}</td>
      </tr>`;
  }).join('');

  const headerCols = isMeal
    ? '<th>Tarih</th><th>Kahvaltı</th><th>Öğle Yemeği</th><th>Ara Öğün</th>'
    : isDuty
    ? '<th>Tarih</th><th>Nöbetçi Personel</th><th>Not</th>'
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

// Personel Görev Listesi: yemek/ders gibi gün-bazlı tablo değil, başlıklı
// bölümlerden (bkz. AdminMonthlyStaffTasksScreen.js) oluşan bir sayfa.
function buildBulletinHtml({ kurumAd, adres, telefon, yonetici, logoUrl, monthLabel, record }) {
  const baslik = escapeHtml(record?.baslik || 'Aylık Belge');
  const bolumler = Array.isArray(record?.bolumler) ? record.bolumler : [];

  const sectionsHtml = bolumler
    .filter((section) => String(section?.icerik || '').trim())
    .map((section) => `
      <div class="section">
        ${section?.baslik ? `<h2>${escapeHtml(section.baslik)}</h2>` : ''}
        <p>${escapeHtml(section.icerik).replace(/\n/g, '<br/>')}</p>
      </div>`)
    .join('');

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
      h1 { font-size: 18px; margin: 0 0 4px; }
      .subtitle { font-size: 12px; color: #707386; margin: 0 0 20px; }
      .section { margin-bottom: 18px; }
      h2 { font-size: 13px; color: #4B22B8; margin: 0 0 6px; }
      p { font-size: 12px; line-height: 1.6; margin: 0; }
      .empty { text-align: center; color: #707386; padding: 18px; }
      .signature { margin-top: 40px; font-size: 11px; text-align: right; }
      .footer { margin-top: 24px; font-size: 10px; color: #707386; display: flex; justify-content: space-between; }
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
    <h1>${baslik}</h1>
    <p class="subtitle">${escapeHtml(monthLabel)}</p>
    ${sectionsHtml || '<p class="empty">Bu ay için yayınlanmış içerik yok.</p>'}
    ${yonetici ? `<div class="signature">Onaylayan: ${yonetici}</div>` : ''}
    <div class="footer">
      <span>Yumurcak</span>
      <span>${escapeHtml(new Date().toLocaleDateString('tr-TR'))} tarihinde oluşturuldu</span>
    </div>
  </body>
  </html>`;
}

// ============================================================
// FAZ 8 — Ay/gün-bazlı OLMAYAN, tekil belgeler için ortak sayfa iskeleti
// (İlaç Takip Formu, Servis Listesi, Doğum Günü Takvimi).
// Yukarıdaki iki fonksiyon (aylık tablo + bülten) kendi HTML'ini kendi
// üretiyor durumda kalsın diye DOKUNULMADI (regresyon riski) — bu yeni
// belge türleri için ayrı, ortak bir sarmalayıcı kullanılıyor.
// ============================================================
function wrapDocumentPage({ kurumAd, adres, telefon, yonetici, logoUrl, title, subtitle, bodyHtml, extraStyles = '' }) {
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
      h1 { font-size: 18px; margin: 0 0 4px; }
      .subtitle { font-size: 12px; color: #707386; margin: 0 0 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
      th { background: #EFE8FF; color: #4B22B8; text-align: left; padding: 8px; border: 1px solid #EEEAF8; }
      td { padding: 8px; border: 1px solid #EEEAF8; vertical-align: top; }
      .info-table td:first-child { font-weight: 700; color: #4B22B8; width: 32%; background: #FAFAFF; }
      .empty { text-align: center; color: #707386; padding: 18px; }
      .signature-row { display: flex; justify-content: space-between; margin-top: 44px; }
      .signature-box { width: 45%; border-top: 1px solid #191A23; padding-top: 6px; font-size: 11px; text-align: center; }
      .footer { margin-top: 24px; font-size: 10px; color: #707386; display: flex; justify-content: space-between; }
      ${extraStyles}
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
    <h1>${title}</h1>
    ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
    ${bodyHtml}
    ${yonetici ? `<div class="signature-row"><div class="signature-box">Onaylayan: ${yonetici}</div><div class="signature-box">Veli İmza</div></div>` : ''}
    <div class="footer">
      <span>Yumurcak</span>
      <span>${escapeHtml(new Date().toLocaleDateString('tr-TR'))} tarihinde oluşturuldu</span>
    </div>
  </body>
  </html>`;
}

// İlaç Takip Formu: tek bir ilaç kürü kaydı + günlük uygulama log'u.
// DİKKAT: bu bir sağlık belgesidir — çıktısı fiziksel olarak veli onayı ve
// personel imzası için kullanılmak üzere tasarlandı; ekrandaki verinin
// eksiksiz/doğru girildiğinden emin olunmalı.
export function buildIlacTakipHtml({ kres, record }) {
  const kurumAd = escapeHtml(kres?.ad || 'Kreş');
  const adres = escapeHtml(kres?.adres || '');
  const telefon = escapeHtml(kres?.telefon || '');
  const yonetici = escapeHtml(kres?.yoneticiAd || '');
  const logoUrl = kres?.logoUrl || '';

  const infoRows = [
    ['Çocuk', record?.cocukAdi],
    ['İlaç Adı', record?.ilacAdi],
    ['Doz', record?.doz],
    ['Uygulama Şekli', record?.uygulamaSekli],
    ['Başlangıç Tarihi', formatDateTr(record?.baslangicTarihi)],
    ['Bitiş Tarihi', formatDateTr(record?.bitisTarihi)],
    ['Hatırlatma Saati', record?.hatirlaticiSaat],
    ['Veli Onayı', record?.veliOnayi ? 'Alındı' : 'Bekleniyor'],
  ]
    .filter(([, value]) => String(value || '').trim())
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join('');

  const kayitlar = Object.entries(record?.kayitlar || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tarih, kayit]) => `
      <tr>
        <td>${escapeHtml(formatDateTr(tarih))}</td>
        <td>${escapeHtml(kayit?.saat || '')}</td>
        <td>${kayit?.verildi ? '✅ Verildi' : '—'}</td>
        <td>${escapeHtml(kayit?.verenAdi || '')}</td>
        <td>${escapeHtml(kayit?.not || '')}</td>
      </tr>`)
    .join('');

  const bodyHtml = `
    <table class="info-table"><tbody>${infoRows}</tbody></table>
    <h2 style="font-size:13px;color:#4B22B8;margin:0 0 8px;">Günlük Uygulama Kaydı</h2>
    <table>
      <thead><tr><th>Tarih</th><th>Saat</th><th>Verildi mi</th><th>Veren</th><th>Not</th></tr></thead>
      <tbody>${kayitlar || '<tr><td colspan="5" class="empty">Henüz kayıt girilmedi.</td></tr>'}</tbody>
    </table>
    <p style="margin-top:18px;color:#707386;">Bu form, ilacın kuruma teslim edildiğini ve velinin uygulanmasına onay verdiğini gösterir.</p>
  `;

  return wrapDocumentPage({
    kurumAd, adres, telefon, yonetici, logoUrl,
    title: 'İlaç Takip Formu',
    subtitle: record?.cocukAdi ? `${record.cocukAdi} — ${record?.ilacAdi || ''}` : '',
    bodyHtml,
  });
}

// Servis Listesi: kresId'deki TÜM servis kullanan çocukların listesi
// (bkz. AdminServiceScreen.js) — sürücü/görevli için tek sayfalık çıktı.
export function buildServiceListHtml({ kres, records }) {
  const kurumAd = escapeHtml(kres?.ad || 'Kreş');
  const adres = escapeHtml(kres?.adres || '');
  const telefon = escapeHtml(kres?.telefon || '');
  const yonetici = escapeHtml(kres?.yoneticiAd || '');
  const logoUrl = kres?.logoUrl || '';

  const sorted = [...(records || [])].sort((a, b) => String(a.alisSaati || '').localeCompare(String(b.alisSaati || '')));

  const rows = sorted.map((item) => `
    <tr>
      <td>${escapeHtml(item.ad || '')}</td>
      <td>${escapeHtml(item.sinifAd || '')}</td>
      <td>${escapeHtml(item.alisSaati || '')}</td>
      <td>${escapeHtml(item.birakisSaati || '')}</td>
      <td>${escapeHtml(item.servisNotu || '')}</td>
    </tr>`).join('');

  const bodyHtml = `
    <table>
      <thead><tr><th>Çocuk</th><th>Sınıf</th><th>Alış Saati</th><th>Bırakış Saati</th><th>Not</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">Servis kullanan çocuk kaydı yok.</td></tr>'}</tbody>
    </table>
  `;

  return wrapDocumentPage({
    kurumAd, adres, telefon, yonetici, logoUrl,
    title: 'Servis Listesi',
    subtitle: `${(records || []).length} çocuk`,
    bodyHtml,
  });
}

// Doğum Günü Takvimi: bu ay doğum günü olan çocukların listesi — elle
// girilmiyor, `cocuklar.dogumTarihi`'nden hesaplanıyor (bkz.
// AdminBirthdayCalendarScreen.js).
export function buildBirthdayCalendarHtml({ kres, monthLabel, records }) {
  const kurumAd = escapeHtml(kres?.ad || 'Kreş');
  const adres = escapeHtml(kres?.adres || '');
  const telefon = escapeHtml(kres?.telefon || '');
  const yonetici = escapeHtml(kres?.yoneticiAd || '');
  const logoUrl = kres?.logoUrl || '';

  const sorted = [...(records || [])].sort((a, b) => (a.gun || 0) - (b.gun || 0));

  const rows = sorted.map((item) => `
    <tr>
      <td>${escapeHtml(item.gun)}</td>
      <td>${escapeHtml(item.ad || '')}</td>
      <td>${escapeHtml(item.sinifAd || '')}</td>
      <td>${item.yasOlacak != null ? `${escapeHtml(item.yasOlacak)} yaşında` : ''}</td>
    </tr>`).join('');

  const bodyHtml = `
    <table>
      <thead><tr><th>Gün</th><th>Çocuk</th><th>Sınıf</th><th>Kaç Yaşına Giriyor</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="empty">Bu ay doğum günü olan çocuk yok.</td></tr>'}</tbody>
    </table>
  `;

  return wrapDocumentPage({
    kurumAd, adres, telefon, yonetici, logoUrl,
    title: 'Doğum Günü Takvimi',
    subtitle: monthLabel,
    bodyHtml,
  });
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
