const PATH_LABELS: Record<string, string> = {
  cocroach: 'тараканы',
  cockroach: 'тараканы',
  tarakan: 'тараканы',
  tarakany: 'тараканы',
  gryzun: 'грызуны',
  gryzuny: 'грызуны',
  rodents: 'грызуны',
  mice: 'мыши',
  rats: 'крысы',
  klopy: 'клопы',
  bedbug: 'клопы',
  ants: 'муравьи',
  muravi: 'муравьи',
  main: '',
  index: '',
};

const looksLikeUrl = (value: string): boolean =>
  /^https?:\/\//i.test(value)
  || value.includes('?utm_')
  || value.includes('&utm_')
  || /^[^\/\s]+\.[^\/\s]+/.test(value);

const pathLabel = (segment: string): string => {
  if (!segment) return '';
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // keep raw
  }
  const key = decoded.toLowerCase();
  if (key in PATH_LABELS) return PATH_LABELS[key];
  if (key.length > 40 || key.includes('utm') || key.includes('%')) return '';
  return decoded;
};

/** Хост и первый сегмент path — только из исходной строки, как написано */
const parseRawUrlParts = (full: string): { host: string; pathSeg: string } | null => {
  const href = full.trim();
  const m = href.match(/^(?:https?:\/\/)?([^\/\?#]+)(?:\/([^\/\?#]*))?/i);
  if (!m) return null;
  const host = (m[1] || '').replace(/^www\./i, '');
  if (!host) return null;
  return { host, pathSeg: m[2] || '' };
};

export type SourceLabelInfo = {
  short: string;
  full: string;
  isLong: boolean;
};

export function getSourceLabelInfo(source: string | null | undefined): SourceLabelInfo {
  const full = String(source || '').trim();
  if (!full) return { short: '—', full: '—', isLong: false };

  if (!looksLikeUrl(full)) {
    return { short: full, full, isLong: full.length > 48 };
  }

  const parts = parseRawUrlParts(full);
  if (!parts) {
    return { short: full, full, isLong: full.length > 48 };
  }

  const type = pathLabel(parts.pathSeg);
  const short = type ? `${parts.host} · ${type}` : parts.host;
  return { short, full, isLong: full.length > short.length + 8 };
}

export function formatSourceShort(source: string | null | undefined): string {
  return getSourceLabelInfo(source).short;
}
