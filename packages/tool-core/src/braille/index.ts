/**
 * English grade 1 (uncontracted) braille in Unicode braille patterns,
 * following Unified English Braille: the 26 letters, the number sign, the
 * capital sign and the basic punctuation (the ten one-cell marks plus the
 * two-cell bracket, quote and slash signs).
 *
 * Contracted braille (grade 2) is deliberately out of scope: English grade 1
 * has no contractions, so every character maps to exactly one sign (or a
 * fixed sign pair) and back.
 */

export class BrailleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrailleError';
  }
}

const DOT_OFFSETS: Readonly<Record<string, number>> = {
  '1': 0x00,
  '2': 0x01,
  '3': 0x02,
  '4': 0x03,
  '5': 0x04,
  '6': 0x05,
};

/** Build the Unicode braille character for a list of raised dots. */
function cell(dots: string): string {
  let mask = 0;
  for (const dot of dots) {
    const offset = DOT_OFFSETS[dot];
    if (offset === undefined) throw new BrailleError(`Unknown braille dot “${dot}”`);
    mask |= 1 << offset;
  }
  return String.fromCodePoint(0x2800 + mask);
}

/** The 26 letters, by their dot patterns (UEB). */
const LETTER_DOTS: Readonly<Record<string, string>> = {
  a: '1',
  b: '12',
  c: '14',
  d: '145',
  e: '15',
  f: '124',
  g: '1245',
  h: '125',
  i: '24',
  j: '245',
  k: '13',
  l: '123',
  m: '134',
  n: '1345',
  o: '135',
  p: '1234',
  q: '12345',
  r: '1235',
  s: '234',
  t: '2345',
  u: '136',
  v: '1236',
  w: '2456',
  x: '1346',
  y: '13456',
  z: '1356',
};

export const CAPITAL_INDICATOR = cell('6');
export const BRAILLE_DIGIT_INDICATOR = cell('3456');

/** The ten one-cell punctuation marks (dots 2, 3, 5 and 6 only). */
const PUNCTUATION_DOTS: Readonly<Record<string, string>> = {
  '.': '256',
  ',': '2',
  '?': '236',
  '!': '235',
  ';': '23',
  ':': '25',
  "'": '3',
  '-': '36',
  '“': '236',
  '”': '356',
};

/** The two-cell signs: an opening or closing prefix plus a base cell. */
const TWO_CELL_SIGNS: Readonly<Record<string, readonly [string, string]>> = {
  '(': ['5', '126'],
  ')': ['5', '345'],
  '[': ['46', '126'],
  ']': ['46', '345'],
  '/': ['456', '34'],
};

const LETTER_CELLS: ReadonlyMap<string, string> = new Map(
  Object.entries(LETTER_DOTS).map(([letter, dots]) => [letter, cell(dots)]),
);

const PUNCTUATION_CELLS: ReadonlyMap<string, string> = new Map(
  Object.entries(PUNCTUATION_DOTS).map(([mark, dots]) => [mark, cell(dots)]),
);

const TWO_CELL_CELLS: ReadonlyMap<string, string> = new Map(
  Object.entries(TWO_CELL_SIGNS).map(([mark, [prefix, base]]) => [mark, cell(prefix) + cell(base)]),
);

/**
 * Braille cells for the digits 0–9, which reuse the a–j patterns: 1 is the a
 * cell through 9 the i cell, and 0 is the j cell.
 */
const DIGIT_CELLS: readonly string[] = [...'jabcdefghi'].map(
  (letter) => LETTER_CELLS.get(letter) ?? '',
);

const CELL_TO_DIGIT: ReadonlyMap<string, string> = new Map(
  DIGIT_CELLS.map((braille, index) => [braille, String(index)] as const),
);

const CELL_TO_LETTER: ReadonlyMap<string, string> = new Map(
  [...LETTER_CELLS].map(([letter, braille]) => [braille, letter] as const),
);

/**
 * Braille to punctuation. The opening double quote shares its cell (dots 2-3-6)
 * with the question mark; position tells them apart in real braille, so this
 * direction reads the cell as the question mark and the quote is encode-only.
 */
const CELL_TO_PUNCTUATION: ReadonlyMap<string, string> = new Map(
  [...PUNCTUATION_CELLS]
    .filter(([mark]) => mark !== '“')
    .map(([mark, braille]) => [braille, mark] as const),
);

/**
 * Sign pairs keyed by their prefix and base cells together: the round and
 * square brackets share base cells, so only the pair identifies the mark.
 */
const PAIR_TO_MARK: ReadonlyMap<string, string> = new Map(
  Object.entries(TWO_CELL_SIGNS).map(
    ([mark, [prefix, base]]) => [`${cell(prefix)}${cell(base)}`, mark] as const,
  ),
);

/**
 * Prefix cells of the two-cell signs, each with the set of base cells that may
 * follow it. Dot 5 opens round brackets, dots 4-6 square, dots 4-5-6 curly and
 * slash, and the same prefixes pair open with close.
 */
function buildPrefixes(): ReadonlyMap<string, ReadonlySet<string>> {
  const prefixes = new Map<string, Set<string>>();
  for (const [, [prefix, base]] of Object.entries(TWO_CELL_SIGNS)) {
    const set = prefixes.get(prefix) ?? new Set<string>();
    set.add(cell(base));
    prefixes.set(prefix, set);
  }
  return new Map([...prefixes].map(([key, set]) => [cell(key), set] as const));
}

const PREFIXES = buildPrefixes();

export interface BrailleResult {
  /** The converted text. */
  readonly text: string;
  /** Characters (or cells) with no equivalent, in order of first appearance. */
  readonly unknown: readonly string[];
}

export function textToBraille(text: string): BrailleResult {
  const unknown: string[] = [];
  let output = '';
  /** Whether the previous emitted cell was a digit run that a letter can end. */
  let inNumberRun = false;

  // Trim and collapse whitespace so runs of spaces become one word break.
  const normalised = text.trim().replace(/\s+/g, ' ');
  if (normalised === '') return { text: '', unknown };

  for (const character of normalised) {
    const lower = character.toLowerCase();

    if (character === ' ') {
      output += ' ';
      inNumberRun = false;
      continue;
    }

    const letterCell = LETTER_CELLS.get(lower);
    if (letterCell !== undefined) {
      if (character !== lower) output += CAPITAL_INDICATOR;
      output += letterCell;
      inNumberRun = false;
      continue;
    }

    const digitIndex = '0123456789'.indexOf(character);
    if (digitIndex !== -1) {
      if (!inNumberRun) output += BRAILLE_DIGIT_INDICATOR;
      output += DIGIT_CELLS[digitIndex];
      inNumberRun = true;
      continue;
    }

    const punctuationCell = PUNCTUATION_CELLS.get(character);
    if (punctuationCell !== undefined) {
      output += punctuationCell;
      inNumberRun = false;
      continue;
    }

    const twoCell = TWO_CELL_CELLS.get(character);
    if (twoCell !== undefined) {
      output += twoCell;
      inNumberRun = false;
      continue;
    }

    if (!unknown.includes(character)) unknown.push(character);
    inNumberRun = false;
  }

  return { text: output, unknown };
}

export function brailleToText(braille: string): BrailleResult {
  const unknown: string[] = [];
  const characters: string[] = [];

  const normalised = braille.trim().replace(/\s+/g, ' ');
  if (normalised === '') return { text: '', unknown };

  const cells = [...normalised];

  let inNumberRun = false;
  let capitalise = false;

  for (let index = 0; index < cells.length; index += 1) {
    const current = cells[index] as string;

    if (current === ' ') {
      characters.push(' ');
      inNumberRun = false;
      capitalise = false;
      continue;
    }

    if (current === CAPITAL_INDICATOR) {
      capitalise = true;
      continue;
    }

    if (current === BRAILLE_DIGIT_INDICATOR) {
      inNumberRun = true;
      capitalise = false;
      continue;
    }

    const prefix = PREFIXES.get(current);
    if (prefix !== undefined) {
      const next = cells[index + 1];
      if (next !== undefined && prefix.has(next)) {
        characters.push(PAIR_TO_MARK.get(`${current}${next}`) ?? '?');
        index += 1;
        capitalise = false;
        inNumberRun = false;
        continue;
      }
    }

    if (inNumberRun) {
      const digit = CELL_TO_DIGIT.get(current);
      if (digit !== undefined) {
        characters.push(digit);
        capitalise = false;
        continue;
      }
      // Any non-digit cell ends the number run and is read normally.
      inNumberRun = false;
    }

    const punctuation = CELL_TO_PUNCTUATION.get(current);
    if (punctuation !== undefined) {
      characters.push(punctuation);
      capitalise = false;
      continue;
    }

    const letter = CELL_TO_LETTER.get(current);
    if (letter !== undefined) {
      characters.push(capitalise ? letter.toUpperCase() : letter);
      capitalise = false;
      continue;
    }

    if (!unknown.includes(current)) unknown.push(current);
    characters.push('?');
    capitalise = false;
  }

  return { text: characters.join(''), unknown };
}
