/** Punycode hostname → кириллица (`город-без-вредителей.рф`). */
const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;

const adapt = (delta: number, numPoints: number, firstTime: boolean) => {
  let next = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  next += Math.floor(next / numPoints);
  let k = 0;
  while (next > ((BASE - TMIN) * TMAX) >> 1) {
    next = Math.floor(next / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * next) / (next + SKEW));
};

const digitValue = (code: number) => {
  if (code - 48 < 10) return code - 22;
  if (code - 65 < 26) return code - 65;
  if (code - 97 < 26) return code - 97;
  return BASE;
};

const decodeLabel = (label: string): string => {
  if (!label.toLowerCase().startsWith('xn--')) return label;
  const input = label.slice(4);
  const output: number[] = [];
  let n = INITIAL_N;
  let bias = INITIAL_BIAS;
  let i = 0;
  const delim = input.lastIndexOf('-');
  let encoded = input;
  if (delim >= 0) {
    for (let j = 0; j < delim; j++) output.push(input.charCodeAt(j));
    encoded = input.slice(delim + 1);
  }
  let index = 0;
  while (index < encoded.length) {
    const oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (index >= encoded.length) return label;
      const digit = digitValue(encoded.charCodeAt(index++));
      i += digit * w;
      const t = k <= bias ? TMIN : (k >= bias + TMAX ? TMAX : k - bias);
      if (digit < t) break;
      w *= BASE - t;
    }
    const out = output.length + 1;
    bias = adapt(i - oldi, out, oldi === 0);
    n += Math.floor(i / out);
    i %= out;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
};

export const hostToUnicode = (host: string): string =>
  host.split('.').map(decodeLabel).join('.');
