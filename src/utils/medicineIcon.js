// ============================================================
// YUMURCAK — medicineIcon.js
// İlaç metnine bakıp türüne uygun ikon döndürür (şurup, tablet, damla,
// krem, iğne, sprey...). Öğretmen ve veli ekranlarında ortak kullanılır.
// ============================================================
const RULES = [
  { keywords: ['şurup', 'surup'], icon: '🥄' },
  { keywords: ['damla'], icon: '💧' },
  { keywords: ['krem', 'merhem', 'losyon', 'jel'], icon: '🧴' },
  { keywords: ['iğne', 'igne', 'enjeksiyon', 'aşı', 'asi'], icon: '💉' },
  { keywords: ['sprey', 'nazal', 'inhaler', 'inhaler'], icon: '🌬️' },
  { keywords: ['tablet', 'hap', 'kapsül', 'kapsul'], icon: '💊' },
  { keywords: ['vitamin'], icon: '🍊' },
];

export function getMedicineIcon(text) {
  const normalized = String(text || '').toLocaleLowerCase('tr-TR');
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.icon;
    }
  }
  return '💊';
}
