export const CITY_CODES = ['МСК', 'СПБ', 'СОЧ', 'КРД', 'ИМП'] as const;
export type CityCode = (typeof CITY_CODES)[number];

export const CITY_NAMES: Record<CityCode, string> = {
  МСК: 'Москва',
  СПБ: 'Санкт-Петербург',
  СОЧ: 'Сочи',
  КРД: 'Краснодар',
  ИМП: 'Импостер',
};

export const cityOptionLabel = (code: string): string => {
  const name = CITY_NAMES[code as CityCode] || CITY_NAMES.ИМП;
  return `${name} (${code || 'ИМП'})`;
};

const LEGACY_CITY: Record<string, CityCode> = {
  msk: 'МСК',
  spb: 'СПБ',
  sochi: 'СОЧ',
  krd: 'КРД',
};

export const normalizeCityCode = (raw: string | null | undefined): CityCode | string => {
  const code = String(raw || '').trim();
  if (!code) return '';
  const legacy = LEGACY_CITY[code.toLowerCase()];
  if (legacy) return legacy;
  if (CITY_CODES.includes(code as CityCode)) return code as CityCode;
  return code;
};

export const cityCodeOf = (order: { cityCode?: string | null; address?: string }): string => {
  const raw = String(order.cityCode || '').trim();
  if (raw) return String(normalizeCityCode(raw));
  return cityAbbrFromAddress(order.address || '');
};

const B = '(?<![А-Яа-яЁёA-Za-z0-9])';
const E = '(?![А-Яа-яЁёA-Za-z0-9])';
const w = (inner: string) => `${B}(?:${inner})${E}`;

const RULES: Array<{ match: RegExp; code: string }> = [
  {
    match: /сочи|адлер|лазаревск|хост|красн[А-Яа-яЁё]*\s*поляна/i,
    code: 'СОЧ',
  },
  {
    match: new RegExp(
      [
        w('спб|сбп|ло'),
        'санкт[-\\s]?петербург',
        'лен(?:инградск|[.\\s]*об)',
        'ломоносовск',
        'пулково',
        'гатчина',
        'кудрово',
        'волхов',
        'сертолово',
        'всевол',
        'приозерск',
        'кириш',
        'сосновый\\s*бор',
        w('бугры'),
        'янино',
        w('мга'),
        'саперн',
        'коммунар',
        'гостилицы',
        'тосн',
        'точнинск',
      ].join('|'),
      'i',
    ),
    code: 'СПБ',
  },
  {
    match: /краснодар|коаснодар|тихорецк/i,
    code: 'КРД',
  },
  {
    match: new RegExp(
      [
        w('мск[а,]?|мо'),
        'москва',
        'московск',
        'подольск',
        'химки',
        'чехов',
        'электросталь',
        'троицк',
        'одинцов',
        'ногинск',
        'люберц',
        'лыткарино',
        'зеленоград',
        'жуковск',
        'домодедов',
        'балаших',
        'королев',
        'королёв',
        'красногорск',
        'красногроск',
        'коломен',
        'коломна',
        'серпухов',
        'орехово',
        'дубна',
        'мытищ',
        'солнечногорск',
        'сколково',
        'томили',
        'голицын',
        'егорьевск',
        'наро[-\\s]?фоминск',
        'котельник',
        'истринск',
        w('истра'),
        'дмитров',
        'раменск',
        'воскресенск',
        'можайск',
      ].join('|'),
      'i',
    ),
    code: 'МСК',
  },
];

export const cityAbbrFromAddress = (address: string): string => {
  const raw = String(address || '').trim();
  if (!raw) return 'ИМП';
  for (const item of RULES) {
    if (item.match.test(raw)) return item.code;
  }
  return 'ИМП';
};
