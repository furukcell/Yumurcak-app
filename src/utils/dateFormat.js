export function formatDisplayDate(value) {
  if (!value) return '-';

  if (typeof value === 'string') {
    const trimmed = value.trim();

    const dashedMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dashedMatch) {
      return `${dashedMatch[3]}.${dashedMatch[2]}.${dashedMatch[1]}`;
    }

    const dottedMatch = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
    if (dottedMatch) {
      return `${dottedMatch[3]}.${dottedMatch[2]}.${dottedMatch[1]}`;
    }

    return trimmed;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString('tr-TR');
  }

  if (typeof value?.toDate === 'function') {
    return formatDisplayDate(value.toDate());
  }

  return String(value);
}

export function formatDisplayMonth(value) {
  if (!value) return '-';

  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return `${match[2]}.${match[1]}`;
  }

  return trimmed;
}
