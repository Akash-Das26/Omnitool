/**
 * Small facts about a Unicode character that the browser does not hand over:
 * the code point notation, the UTF-8 bytes and an HTML entity. The names and
 * blocks come from generated data (see `scripts/generate-unicode-index.mjs`).
 */

export const MAX_CODE_POINT = 0x10ffff;

export function isValidCodePoint(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_CODE_POINT;
}

/** `U+0041`, `U+1F600`: at least four hex digits, upper case, as Unicode writes it. */
export function formatCodePoint(codePoint: number): string {
  if (!isValidCodePoint(codePoint)) return 'not a code point';
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** The UTF-8 bytes of a code point, as a plain list of numbers. */
export function utf8Bytes(codePoint: number): readonly number[] {
  if (!isValidCodePoint(codePoint)) return [];
  const value = codePoint;
  if (value < 0x80) return [value];
  if (value < 0x800) return [0xc0 | (value >> 6), 0x80 | (value & 0x3f)];
  if (value < 0x10000) {
    return [0xe0 | (value >> 12), 0x80 | ((value >> 6) & 0x3f), 0x80 | (value & 0x3f)];
  }
  return [
    0xf0 | (value >> 18),
    0x80 | ((value >> 12) & 0x3f),
    0x80 | ((value >> 6) & 0x3f),
    0x80 | (value & 0x3f),
  ];
}

const NAMED_ENTITIES: ReadonlyMap<number, string> = new Map([
  [0x26, '&amp;'],
  [0x3c, '&lt;'],
  [0x3e, '&gt;'],
  [0x22, '&quot;'],
  [0x27, '&#39;'],
]);

/** A named entity where HTML has one, otherwise a hexadecimal reference. */
export function htmlEntity(codePoint: number): string {
  if (!isValidCodePoint(codePoint)) return '';
  return NAMED_ENTITIES.get(codePoint) ?? `&#x${codePoint.toString(16).toUpperCase()};`;
}

/**
 * Reads a code point from the search box: `U+1F600`, `0x1F600`, four or more
 * hex digits, or the character itself. Decimal input is deliberately not
 * guessed at, because "1234" is a valid code point and a valid hex value.
 */
export function parseCodePoint(input: string): number | null {
  const value = input.trim();
  if (value === '') return null;

  const prefixed = /^(?:u\+|0x)([0-9a-f]{1,6})$/i.exec(value);
  if (prefixed) {
    const codePoint = Number.parseInt(prefixed[1] as string, 16);
    return isValidCodePoint(codePoint) ? codePoint : null;
  }

  const characters = [...value];
  if (characters.length === 1) {
    const codePoint = (characters[0] as string).codePointAt(0);
    return codePoint === undefined ? null : codePoint;
  }

  const hex = /^[0-9a-f]{4,6}$/i.exec(value);
  if (hex) {
    const codePoint = Number.parseInt(value, 16);
    return isValidCodePoint(codePoint) ? codePoint : null;
  }
  return null;
}

/** The character itself, or an empty string for a surrogate or invalid value. */
export function characterOf(codePoint: number): string {
  if (!isValidCodePoint(codePoint)) return '';
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) return '';
  return String.fromCodePoint(codePoint);
}

/** The two-letter Unicode general category, named in words for the UI. */
export const GENERAL_CATEGORIES: Readonly<Record<string, string>> = Object.freeze({
  Lu: 'Uppercase letter',
  Ll: 'Lowercase letter',
  Lt: 'Titlecase letter',
  Lm: 'Modifier letter',
  Lo: 'Other letter',
  L: 'Letter',
  LC: 'Cased letter',
  Mn: 'Nonspacing mark',
  Mc: 'Spacing mark',
  Me: 'Enclosing mark',
  M: 'Mark',
  Nd: 'Decimal number',
  Nl: 'Letter number',
  No: 'Other number',
  N: 'Number',
  Pc: 'Connector punctuation',
  Pd: 'Dash punctuation',
  Ps: 'Open punctuation',
  Pe: 'Close punctuation',
  Pi: 'Initial punctuation',
  Pf: 'Final punctuation',
  Po: 'Other punctuation',
  P: 'Punctuation',
  Sm: 'Math symbol',
  Sc: 'Currency symbol',
  Sk: 'Modifier symbol',
  So: 'Other symbol',
  S: 'Symbol',
  Zs: 'Space separator',
  Zl: 'Line separator',
  Zp: 'Paragraph separator',
  Z: 'Separator',
  Cc: 'Control',
  Cf: 'Format',
  Cs: 'Surrogate',
  Co: 'Private use',
  Cn: 'Unassigned',
  C: 'Other',
});

export function categoryName(code: string): string {
  return GENERAL_CATEGORIES[code] ?? code;
}
