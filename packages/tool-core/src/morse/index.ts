/**
 * International Morse code as defined by ITU-R M.1677-1: the letters A–Z, the
 * digits 0–9 and the punctuation set out below. Letters and digits are the ITU
 * standard; punctuation follows the common international conventions.
 *
 * Encoding: letters within a word are separated by one space, words by
 * `WORD_SEPARATOR` (a slash). Decoding accepts a slash or a run of three or
 * more spaces between words.
 */

export const WORD_SEPARATOR = '/';

export class MorseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MorseError';
  }
}

/** ITU letters and digits. */
const LETTERS_AND_DIGITS: Readonly<Record<string, string>> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
};

/** Common international punctuation conventions. */
const PUNCTUATION: Readonly<Record<string, string>> = {
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  "'": '.----.',
  '!': '-.-.--',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  ':': '---...',
  ';': '-.-.-.',
  '=': '-...-',
  '+': '.-.-.',
  '-': '-....-',
  _: '..--.-',
  '"': '.-..-.',
  $: '...-..-',
  '@': '.--.-.',
};

export const MORSE_TABLE: Readonly<Record<string, string>> = {
  ...LETTERS_AND_DIGITS,
  ...PUNCTUATION,
};

const SIGN_TO_CHARACTER: ReadonlyMap<string, string> = new Map(
  Object.entries(MORSE_TABLE).map(([character, sign]) => [sign, character] as const),
);

export interface MorseTextResult {
  /** The converted text. */
  readonly text: string;
  /** Characters (or Morse signs) that have no equivalent, in order of appearance. */
  readonly unknown: readonly string[];
}

export interface EncodeOptions {
  /** Throw a MorseError on the first character that has no Morse sign. */
  readonly strict?: boolean;
}

export function encodeMorse(text: string, options: EncodeOptions = {}): MorseTextResult {
  const unknown: string[] = [];
  const words = text.toUpperCase().trim().split(/\s+/).filter(Boolean);
  const encodedWords = words.map((word) => {
    const signs: string[] = [];
    for (const character of word) {
      const sign = MORSE_TABLE[character];
      if (sign === undefined) {
        if (options.strict) {
          throw new MorseError(`“${character}” has no Morse sign`);
        }
        if (!unknown.includes(character)) unknown.push(character);
        continue;
      }
      signs.push(sign);
    }
    return signs.join(' ');
  });
  return { text: encodedWords.filter(Boolean).join(` ${WORD_SEPARATOR} `), unknown };
}

/** Words may be separated by the slash or by three or more spaces. */
const WORD_SPLIT = /\s*\/\s*|\s{3,}/;

export function decodeMorse(morse: string): MorseTextResult {
  const unknown: string[] = [];
  const words = morse.trim().split(WORD_SPLIT).filter(Boolean);
  const decodedWords = words.map((word) => {
    const characters = word
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((sign) => {
        const character = SIGN_TO_CHARACTER.get(sign);
        if (character === undefined) {
          if (!unknown.includes(sign)) unknown.push(sign);
          return '?';
        }
        return character;
      });
    return characters.join('');
  });
  return { text: decodedWords.join(' '), unknown };
}

export interface MorseTiming {
  /** Length of this segment in milliseconds. */
  readonly durationMs: number;
  /** True for a tone (dit/dah), false for silence (gap). */
  readonly tone: boolean;
}

/** One timing unit in milliseconds for a given speed, per PARIS at 50 units. */
const UNIT_MS = (wordsPerMinute: number): number => 1200 / wordsPerMinute;

const MIN_WPM = 1;
const MAX_WPM = 60;

/**
 * Turn a Morse string into tone/gap timings for playback. Uses the standard
 * proportions: dit 1 unit, dah 3 units, intra-character gap 1 unit,
 * inter-character gap 3 units, word gap 7 units. No trailing gap.
 */
export function morseToTimings(morse: string, wordsPerMinute: number): MorseTiming[] {
  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute < MIN_WPM || wordsPerMinute > MAX_WPM) {
    throw new MorseError(`Words per minute must be between ${MIN_WPM} and ${MAX_WPM}`);
  }
  const unit = UNIT_MS(wordsPerMinute);
  const timings: MorseTiming[] = [];

  const words = morse.trim().split(WORD_SPLIT).filter(Boolean);
  words.forEach((word, wordIndex) => {
    if (wordIndex > 0) timings.push({ durationMs: unit * 7, tone: false });
    const signs = word.trim().split(/\s+/).filter(Boolean);
    signs.forEach((sign, signIndex) => {
      if (signIndex > 0) timings.push({ durationMs: unit * 3, tone: false });
      let symbolIndex = 0;
      for (const symbol of sign) {
        if (symbol !== '.' && symbol !== '-') continue;
        if (symbolIndex > 0) timings.push({ durationMs: unit * 1, tone: false });
        timings.push({ durationMs: unit * (symbol === '.' ? 1 : 3), tone: true });
        symbolIndex += 1;
      }
    });
  });
  return timings;
}
