// ============================================================
// YUMURCAK — timeFormat.js
// İlaç takip formundaki "hatırlatma saati" gibi serbest metin saat
// girişlerini "HH:mm" formatına normalize eder. Kabul edilenler:
// "9:5", "09.05", "0905", "9:05" -> "09:05"
// ============================================================
export function normalizeTimeInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const cleaned = raw.replace(/[.\s]/g, ':');
  const match = cleaned.match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) return '';

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return '';
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
