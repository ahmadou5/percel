export function cleanText(value: string | undefined | null) {
  if (value == null) return null;
  return value.trim().replace(/[<>]/g, '');
}

export function cleanTextValue(value: string | undefined | null, fallback = '') {
  const cleaned = cleanText(value);
  return cleaned ?? fallback;
}
