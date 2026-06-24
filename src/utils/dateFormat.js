export const formatDisplayDate = (value) => {
  if (!value) return '-';

  const text = String(value).trim();

  // 2026-07-24 veya 2026.07.24 -> 24.07.2026
  const match = text.match(/^(\d{4})[-.](\d{2})[-.](\d{2})/);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  return text;
};

export const formatDisplayMonth = (value) => {
  if (!value) return '-';

  const text = String(value).trim();

  // 2026-07 veya 2026.07 -> 07.2026
  const match = text.match(/^(\d{4})[-.](\d{2})/);
  if (match) {
    return `${match[2]}.${match[1]}`;
  }

  return text;
};
