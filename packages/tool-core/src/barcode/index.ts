/**
 * One-dimensional barcodes: Code 128, EAN-13, UPC-A, Code 39 and ITF.
 *
 * No encoder library is used (DEC-60). The pattern tables below are the
 * published reference data, not invented:
 *
 * - Code 128: ISO/IEC 15417. The 107 six-element width patterns and the
 *   modulo-103 check symbol. `CODE128_PATTERNS` is checked against the
 *   published bit patterns in the tests: expanding each width pattern must
 *   reproduce the standard's module string exactly.
 * - EAN-13 and UPC-A: ISO/IEC 15420. The L, G and R element sets and the
 *   six-digit first-digit parity table.
 * - Code 39: ISO/IEC 16388. Nine elements per character, three of them wide.
 * - ITF (Interleaved 2 of 5): ISO/IEC 16390. Two of five elements wide, with
 *   the weights 1, 2, 4, 7 and a parity element worth 0.
 *
 * The module strings use `1` for a bar and `0` for a space. Quiet zones are
 * reported separately so the renderer can scale them with the bars.
 */

export type BarcodeSymbology = 'code128' | 'ean13' | 'upca' | 'code39' | 'itf';

export interface BarcodeRequest {
  readonly symbology: BarcodeSymbology;
  readonly value: string;
  /** Code 39 and ITF only: the wide element in modules. Defaults to 3. */
  readonly wideRatio?: number;
}

export interface BarcodeCheckDigit {
  readonly digit: string;
  /** True when this encoder added the digit; false when the input carried it. */
  readonly computed: boolean;
  /** How the digit was obtained, in one sentence. */
  readonly explanation: string;
}

export type BarcodeResult =
  | { readonly ok: false; readonly error: string }
  | {
      readonly ok: true;
      readonly symbology: BarcodeSymbology;
      /** Bars and spaces without the quiet zone. */
      readonly modules: string;
      /** `modules` with the quiet zone at both ends, which is what is drawn. */
      readonly symbol: string;
      /** Quiet zone in modules, at both ends. */
      readonly quietZone: number;
      /** What a person reads under the bars. */
      readonly text: string;
      readonly checkDigit: BarcodeCheckDigit | null;
      readonly notes: readonly string[];
    };

/** Quiet zones from the standards: 10 modules either side for all five here. */
const QUIET_ZONE = 10;

/** Code 128 width patterns, values 0 to 106 (ISO/IEC 15417). */
const CODE128_PATTERNS: readonly string[] = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
] as const;

const CODE128_START_B = 104;
const CODE128_START_C = 105;
const CODE128_STOP = 106;

function expandWidths(patterns: string, startWithBar = true): string {
  let modules = '';
  for (let index = 0; index < patterns.length; index += 1) {
    const bar = startWithBar ? index % 2 === 0 : index % 2 === 1;
    modules += (bar ? '1' : '0').repeat(Number(patterns[index]));
  }
  return modules;
}

/**
 * The Code 128 check symbol (ISO/IEC 15417): the start value plus each data
 * value times its position, modulo 103. Position 1 is the first data symbol;
 * the start symbol is counted once, unweighted.
 */
export function code128Checksum(start: number, values: readonly number[]): number {
  let sum = start;
  values.forEach((value, index) => {
    sum += value * (index + 1);
  });
  return sum % 103;
}

/** EAN/UPC module strings start with a space; the guard before them is bars. */
const EAN_L: readonly string[] = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
/** G is L read backwards. */
const EAN_G: readonly string[] = EAN_L.map((pattern) => [...pattern].reverse().join(''));
/** R is the complement of L. */
const EAN_R: readonly string[] = EAN_L.map((pattern) =>
  [...pattern].map((module) => (module === '1' ? '0' : '1')).join(''),
);

/** First digit to the six left-hand parities it dictates (ISO/IEC 15420). */
const EAN_PARITY: readonly string[] = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

function eanCheckDigit(digits: string): number {
  let sum = 0;
  // Rightmost digit of the payload is 3, then alternate: 1, 3, 1, ...
  for (let index = digits.length - 1, weight = 3; index >= 0; index -= 1, weight = 4 - weight) {
    sum += Number(digits[index]) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

function isDigits(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * EAN-13 and UPC-A share the guard structure; UPC-A is an EAN-13 whose first
 * digit is 0, so both are built here and only the digit counts differ.
 */
function encodeEan(raw: string, symbology: 'ean13' | 'upca', payloadLength: number): BarcodeResult {
  const value = raw.replace(/[\s-]/g, '');
  const name = symbology === 'ean13' ? 'EAN-13' : 'UPC-A';
  if (!isDigits(value)) {
    return { ok: false, error: `${name} takes digits only.` };
  }
  if (value.length !== payloadLength && value.length !== payloadLength + 1) {
    return {
      ok: false,
      error:
        symbology === 'ean13'
          ? 'EAN-13 needs 12 digits, or 13 with the check digit at the end.'
          : 'UPC-A needs 11 digits, or 12 with the check digit at the end.',
    };
  }

  let digits = value;
  let checkDigit: BarcodeCheckDigit;
  if (value.length === payloadLength) {
    const check = eanCheckDigit(value);
    digits = `${value}${check}`;
    checkDigit = {
      digit: String(check),
      computed: true,
      explanation: `Weights alternate 1 and 3 from the left, so the sum is ${weightedSum(value)}; the check digit is 10 minus the remainder.`,
    };
  } else {
    const expected = eanCheckDigit(value.slice(0, payloadLength));
    if (Number(value[payloadLength]) !== expected) {
      return {
        ok: false,
        error: `${name} check digit is ${expected}, not ${value[payloadLength]}. The weighted sum gives ${weightedSum(value.slice(0, payloadLength))}.`,
      };
    }
    checkDigit = {
      digit: String(expected),
      computed: false,
      explanation: `The check digit in the input is correct: weighted sum ${weightedSum(value.slice(0, payloadLength))}, remainder ${weightedSum(value.slice(0, payloadLength)) % 10}.`,
    };
  }

  const leftDigits = symbology === 'ean13' ? digits.slice(1, 7) : digits.slice(0, 6);
  const rightDigits = digits.slice(-6);
  const parity = symbology === 'ean13' ? (EAN_PARITY[Number(digits[0])] ?? 'LLLLLL') : 'LLLLLL';
  let modules = '101';
  for (let index = 0; index < 6; index += 1) {
    const digit = Number(leftDigits[index]);
    const set = parity[index] === 'G' ? EAN_G : EAN_L;
    modules += set[digit];
  }
  modules += '01010';
  for (const character of rightDigits) {
    modules += EAN_R[Number(character)];
  }
  modules += '101';

  return {
    ok: true,
    symbology,
    modules,
    symbol: `${'0'.repeat(QUIET_ZONE)}${modules}${'0'.repeat(QUIET_ZONE)}`,
    quietZone: QUIET_ZONE,
    text: digits,
    checkDigit,
    notes: checkDigit.computed
      ? ['The check digit was added and is shown in the text under the bars.']
      : [],
  };
}

function weightedSum(digits: string): number {
  let sum = 0;
  for (let index = digits.length - 1, weight = 3; index >= 0; index -= 1, weight = 4 - weight) {
    sum += Number(digits[index]) * weight;
  }
  return sum;
}

/** Code 39: nine elements per character, wide elements are value bits. */
const CODE39_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const CODE39_WIDE: readonly number[] = [
  0x034, 0x121, 0x061, 0x160, 0x031, 0x130, 0x070, 0x025, 0x124, 0x064, 0x109, 0x049, 0x148, 0x019,
  0x118, 0x058, 0x00d, 0x10c, 0x04c, 0x01c, 0x103, 0x043, 0x142, 0x013, 0x112, 0x052, 0x007, 0x106,
  0x046, 0x016, 0x181, 0x0c1, 0x1c0, 0x091, 0x190, 0x0d0, 0x085, 0x184, 0x0c4, 0x0a8, 0x0a2, 0x08a,
  0x02a,
];
const CODE39_START_STOP = 0x094;

function code39Pattern(bits: number, wide: number): string {
  let modules = '';
  // Element 1 is a bar, so odd positions are bars and even positions spaces.
  for (let element = 0; element < 9; element += 1) {
    const isWide = (bits & (1 << (8 - element))) !== 0;
    const bar = element % 2 === 0;
    modules += (bar ? '1' : '0').repeat(isWide ? wide : 1);
  }
  return modules;
}

function encodeCode39(raw: string, wideRatio: number): BarcodeResult {
  const value = raw.toUpperCase().replace(/\s+/g, ' ');
  if (value === '') return { ok: false, error: 'Enter the text to encode.' };
  const unsupported = [...value].filter((character) => !CODE39_ALPHABET.includes(character));
  if (unsupported.length > 0) {
    return {
      ok: false,
      error: `Code 39 cannot encode ${[...new Set(unsupported)].map((character) => `“${character}”`).join(', ')}. It takes A–Z, 0–9, space and - . $ / + %.`,
    };
  }
  const parts: string[] = [code39Pattern(CODE39_START_STOP, wideRatio)];
  for (const character of value) {
    parts.push(code39Pattern(CODE39_WIDE[CODE39_ALPHABET.indexOf(character)] as number, wideRatio));
  }
  parts.push(code39Pattern(CODE39_START_STOP, wideRatio));
  const modules = parts.join('0');
  const notes: string[] = [
    'Every character is wrapped by the start and stop character (*), which is not shown in the text.',
  ];
  if (raw !== value)
    notes.push('The text was changed to upper case, which is all Code 39 can encode.');
  return {
    ok: true,
    symbology: 'code39',
    modules,
    symbol: `${'0'.repeat(QUIET_ZONE)}${modules}${'0'.repeat(QUIET_ZONE)}`,
    quietZone: QUIET_ZONE,
    text: value,
    checkDigit: null,
    notes,
  };
}

/** ITF digits: two of five elements wide, weights 1, 2, 4, 7 and parity. */
const ITF_WIDE: readonly string[] = [
  '00110',
  '10001',
  '01001',
  '11000',
  '00101',
  '10100',
  '01100',
  '00011',
  '10010',
  '01010',
];

function encodeItf(raw: string, wideRatio: number): BarcodeResult {
  const value = raw.replace(/[\s-]/g, '');
  if (!isDigits(value)) return { ok: false, error: 'ITF takes digits only.' };
  if (value === '') return { ok: false, error: 'Enter the digits to encode.' };
  const notes: string[] = [];
  const digits = value.length % 2 === 0 ? value : `0${value}`;
  if (digits !== value) {
    notes.push('A leading zero was added: ITF encodes digits in pairs, so the count must be even.');
  }
  let modules = '1010';
  for (let index = 0; index < digits.length; index += 2) {
    const bars = ITF_WIDE[Number(digits[index])] as string;
    const spaces = ITF_WIDE[Number(digits[index + 1])] as string;
    for (let element = 0; element < 5; element += 1) {
      modules += '1'.repeat(bars[element] === '1' ? wideRatio : 1);
      modules += '0'.repeat(spaces[element] === '1' ? wideRatio : 1);
    }
  }
  modules += `${'1'.repeat(wideRatio)}01`;
  return {
    ok: true,
    symbology: 'itf',
    modules,
    symbol: `${'0'.repeat(QUIET_ZONE)}${modules}${'0'.repeat(QUIET_ZONE)}`,
    quietZone: QUIET_ZONE,
    text: digits,
    checkDigit: null,
    notes,
  };
}

function encodeCode128(value: string): BarcodeResult {
  if (value === '') return { ok: false, error: 'Enter the text to encode.' };
  const unsupported = [...value].filter((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code > 126;
  });
  if (unsupported.length > 0) {
    return {
      ok: false,
      error: `Code 128 here encodes printable ASCII only; ${[...new Set(unsupported)].map((character) => `“${character}”`).join(', ')} cannot be encoded.`,
    };
  }

  const values: number[] = [];
  const numeric = isDigits(value) && value.length % 2 === 0;
  let start = CODE128_START_B;
  if (numeric) {
    start = CODE128_START_C;
    for (let index = 0; index < value.length; index += 2) {
      values.push(Number(value.slice(index, index + 2)));
    }
  } else {
    for (const character of value) values.push((character.codePointAt(0) ?? 0) - 32);
  }

  const checksum = code128Checksum(start, values);
  const sequence = [start, ...values, checksum, CODE128_STOP];
  const modules = sequence.map((value) => expandWidths(CODE128_PATTERNS[value] as string)).join('');
  const notes = numeric
    ? ['All digits and an even count, so code set C was used: two digits per symbol.']
    : ['Code set B was used. Digits-only input with an even count would be shorter.'];
  return {
    ok: true,
    symbology: 'code128',
    modules,
    symbol: `${'0'.repeat(QUIET_ZONE)}${modules}${'0'.repeat(QUIET_ZONE)}`,
    quietZone: QUIET_ZONE,
    text: value,
    checkDigit: {
      digit: String(checksum),
      computed: true,
      explanation: `Start value ${start} plus each symbol value times its position, modulo 103.`,
    },
    notes,
  };
}

export function encodeBarcode(request: BarcodeRequest): BarcodeResult {
  const wideRatio = request.wideRatio === 2 ? 2 : 3;
  switch (request.symbology) {
    case 'ean13':
      return encodeEan(request.value, 'ean13', 12);
    case 'upca':
      return encodeEan(request.value, 'upca', 11);
    case 'code39':
      return encodeCode39(request.value, wideRatio);
    case 'itf':
      return encodeItf(request.value, wideRatio);
    case 'code128':
      return encodeCode128(request.value);
    default:
      return { ok: false, error: 'Unknown barcode type.' };
  }
}

export interface BarRect {
  readonly x: number;
  readonly width: number;
}

/** Bar rectangles in modules, so a renderer only has to scale them. */
export function barRects(symbol: string): BarRect[] {
  const rects: BarRect[] = [];
  let index = 0;
  while (index < symbol.length) {
    if (symbol[index] === '1') {
      let run = 1;
      while (symbol[index + run] === '1') run += 1;
      rects.push({ x: index, width: run });
      index += run;
    } else {
      index += 1;
    }
  }
  return rects;
}

/** WCAG 2.2 contrast ratio between two `#rrggbb` colours. */
export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const value = hex.replace('#', '');
    const channels = [0, 2, 4].map((offset) => {
      const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return (
      0.2126 * (channels[0] as number) +
      0.7152 * (channels[1] as number) +
      0.0722 * (channels[2] as number)
    );
  };
  const first = luminance(foreground);
  const second = luminance(background);
  const [light, dark] = first >= second ? [first, second] : [second, first];
  return (light + 0.05) / (dark + 0.05);
}
