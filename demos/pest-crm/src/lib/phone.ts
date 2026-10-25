/** Единый формат: хранение 8XXXXXXXXXX, отображение +7 (XXX) XXX-XX-XX */

export const normalizePhone = (phone: string): string => {
  let n = String(phone || '').replace(/\D/g, '');
  if (!n) return '';

  if (n.length === 11 && (n.startsWith('7') || n.startsWith('8'))) {
    return `8${n.slice(1)}`;
  }
  if (n.length === 10) {
    return `8${n}`;
  }
  if (n.length > 11) {
    return `8${n.slice(-10)}`;
  }
  return '';
};

export const formatPhoneRu = (phone: string): string => {
  const n = normalizePhone(phone);
  if (n.length !== 11) {
    return String(phone || '').trim();
  }
  const d = n.slice(1);
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
};

export const normalizePhoneList = (phones: unknown): string[] => {
  if (!Array.isArray(phones)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of phones) {
    const n = normalizePhone(String(item ?? ''));
    if (!n || seen.has(n)) continue;
    seen.add(n);
    result.push(n);
  }
  return result;
};

export const splitPhones = (raw: string): string[] =>
  String(raw || '')
    .split(/[,;\n|/]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(normalizePhone)
    .filter(Boolean);
