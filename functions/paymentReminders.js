'use strict';

// ============================================================
// Veli ödeme hatırlatmaları (günlük çalışır — bkz. index.js
// checkParentPaymentsDaily).
//
// Her gün 09:00 (Europe/Istanbul) ödenmemiş `odemeler` kayıtlarına bakar:
//  - Son ödemeye 3 gün kala        -> veliye "yaklaşıyor" bildirimi
//  - Son ödeme günü                -> veliye "bugün son gün" bildirimi
//  - Gecikmenin 1., 7. ve 14. günü -> veliye "geciken ödeme" bildirimi
//  - Son ödeme günü geçmiş ve durumu hâlâ "bekliyor" olanları "gecikti" yapar
//
// Aynı bildirim bir kayda iki kez gitmesin diye kayda
// `hatirlatmalar/{pre3|due0|late1|late7|late14}` zaman damgası yazılır.
// Bağımlılıklar dışarıdan verilir (test edilebilsin diye).
// ============================================================

const PRE_DAYS = 3;
const OVERDUE_MILESTONES = [1, 7, 14];
const BATCH_SIZE = 20;

function arr(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'object') return Object.keys(value).filter((key) => value[key]).map(String);
  return [String(value)];
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean).map(String)));
}

function chunk(items = [], size = BATCH_SIZE) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// 'YYYY-MM-DD' -> UTC gece yarısı (saat dilimi kaymasını önlemek için)
function parseIsoDay(value) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(value || '').trim());
  if (!m) return null;
  const time = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(time) ? null : time;
}

// Bugünden son ödeme gününe kalan gün (geçmişse negatif); tarih yoksa null
function daysLeft(dueIso, todayIso) {
  const due = parseIsoDay(dueIso);
  const today = parseIsoDay(todayIso);
  if (due === null || today === null) return null;
  return Math.round((due - today) / 86400000);
}

function pickMilestone(left) {
  if (left === PRE_DAYS) return { key: 'pre3', kind: 'soon' };
  if (left === 0) return { key: 'due0', kind: 'today' };
  if (left < 0 && OVERDUE_MILESTONES.includes(-left)) return { key: `late${-left}`, kind: 'overdue' };
  return null;
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  const clean = String(value || '0').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `${toNumber(value).toLocaleString('tr-TR')} ₺`;
}

function formatDateTr(iso) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(iso || '').trim());
  return m ? `${m[3].padStart(2, '0')}.${m[2].padStart(2, '0')}.${m[1]}` : String(iso || '');
}

function buildNotification(kind, { childName, amountText, dateText, days }) {
  if (kind === 'soon') {
    return {
      baslik: '💳 Ödeme Hatırlatma',
      mesaj: `${childName} için ${amountText} tutarındaki ödemenin son günü ${dateText} (${days} gün kaldı).`,
      i18nKey: 'notification.payment.reminder.soon',
    };
  }
  if (kind === 'today') {
    return {
      baslik: '💳 Ödemenin Son Günü Bugün',
      mesaj: `${childName} için ${amountText} tutarındaki ödemenin son günü bugün.`,
      i18nKey: 'notification.payment.reminder.today',
    };
  }
  return {
    baslik: '⚠️ Geciken Ödeme',
    mesaj: `${childName} için ${amountText} tutarındaki ödemenin son günü ${dateText} idi (${days} gün gecikti). Lütfen kreş yönetimiyle iletişime geçin.`,
    i18nKey: 'notification.payment.reminder.overdue',
  };
}

async function runPaymentReminders({
  database,
  createNotification,
  getChildName,
  getParentIdsFromChild,
  todayIso,
  now = () => Date.now(),
}) {
  const [bekliyorSnap, gecikmisSnap] = await Promise.all([
    database.ref('odemeler').orderByChild('durum').equalTo('bekliyor').once('value'),
    database.ref('odemeler').orderByChild('durum').equalTo('gecikti').once('value'),
  ]);

  const items = [];
  [bekliyorSnap, gecikmisSnap].forEach((snap) => {
    Object.entries(snap.val() || {}).forEach(([id, rec]) => items.push({ id, rec: rec || {} }));
  });

  const stats = { checked: items.length, reminded: 0, markedOverdue: 0, noParent: 0, errors: 0 };
  const childCache = new Map();

  async function loadChild(childId) {
    if (!childId) return {};
    if (!childCache.has(childId)) {
      childCache.set(childId, database.ref(`cocuklar/${childId}`).once('value').then((s) => s.val() || {}));
    }
    return childCache.get(childId);
  }

  for (const batch of chunk(items)) {
    await Promise.all(batch.map(async ({ id, rec }) => {
      try {
        const amount = toNumber(rec.tutar ?? rec.amount);
        if (!(amount > 0)) return;

        const dueIso = rec.sonOdemeTarihi || rec.dueDate;
        const left = daysLeft(dueIso, todayIso);
        if (left === null) return;

        const updates = {};
        if (left < 0 && rec.durum === 'bekliyor') {
          updates.durum = 'gecikti';
          updates.status = 'gecikti';
        }

        const milestone = pickMilestone(left);
        if (milestone && !(rec.hatirlatmalar && rec.hatirlatmalar[milestone.key])) {
          const childId = rec.cocukId || rec.childId || '';
          const child = await loadChild(childId);
          let parentIds = unique([...arr(rec.veliIds), ...arr(rec.parentIds), rec.veliId, rec.parentId]);
          if (!parentIds.length) parentIds = getParentIdsFromChild(child);

          if (!parentIds.length) {
            stats.noParent += 1;
          } else {
            const childName = getChildName(child) || rec.cocukAd || 'Çocuk';
            const amountText = formatMoney(amount);
            const dateText = formatDateTr(dueIso);
            const days = Math.abs(left);
            const text = buildNotification(milestone.kind, { childName, amountText, dateText, days });

            await createNotification({
              kresId: rec.kresId || child.kresId || '',
              hedefUserIds: parentIds,
              baslik: text.baslik,
              mesaj: text.mesaj,
              i18nKey: text.i18nKey,
              i18nParams: { childName, amount: amountText, date: dateText, days },
              tip: 'odeme',
              routeName: 'ParentPayments',
              source: 'odeme-hatirlatma',
              sourceId: id,
              createdBy: 'cloud-function',
            });
            // Bildirim başarıyla yazıldıktan sonra işaretle (hata olursa ertesi gün tekrar denenir)
            updates[`hatirlatmalar/${milestone.key}`] = now();
            stats.reminded += 1;
          }
        }

        if (Object.keys(updates).length) {
          if (updates.durum === 'gecikti') stats.markedOverdue += 1;
          await database.ref(`odemeler/${id}`).update(updates);
        }
      } catch (error) {
        stats.errors += 1;
        console.error('Ödeme hatırlatma hatası:', id, error);
      }
    }));
  }

  return stats;
}

module.exports = { runPaymentReminders, daysLeft, pickMilestone, parseIsoDay, formatMoney, formatDateTr, PRE_DAYS, OVERDUE_MILESTONES };
