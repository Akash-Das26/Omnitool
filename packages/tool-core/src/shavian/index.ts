/**
 * Latin text to the Shavian alphabet (U+10450–U+1047F), from the phonemes of
 * the CMU Pronouncing Dictionary (DEC-62).
 *
 * Shavian is phonemic: one letter per phoneme, so the conversion is a table
 * lookup rather than a spelling rule. The letter names and code points below
 * come from the Unicode Character Database, Unicode 16.0, block "Shavian"
 * (U+10450 SHAVIAN LETTER PEEP … U+1047F SHAVIAN LETTER YEW), as published in
 * the Unicode code charts; `shavian.test.ts` checks every one of the 48 against
 * the chart's name for that code point.
 *
 * Stress is not written in Shavian running text, so the stress digits of the
 * dictionary are dropped — except where they change the vowel itself: AH0 is
 * the schwa (ADO) and unstressed ER is ARRAY, while stressed AH is UP and
 * stressed ER is ERR. Seven letters need a phoneme that General American does
 * not have separately (ON, ARE, OR, AIR, EAR, IAN, YEW); they are listed for
 * completeness and are never produced.
 *
 * Spelling conventions for Shavian vary between writers. This output is a
 * phonemic transcription in General American, not a standard orthography, and
 * it is one-way: several letters can only be written as one, and nothing here
 * attempts to recover the English spelling from the phonemes.
 */

import { type PronunciationLookup, pronunciations, type TokenKind, tokenise } from '../ipa/index';

/** The namer dot, written before a name to show that it is one. */
export const NAMER_DOT = '\u00B7';

export interface ShavianLetter {
  readonly letter: string;
  readonly codePoint: number;
  /** The Unicode character name, from the Shavian block of the UCD. */
  readonly name: string;
  /** The General American phoneme the letter stands for. */
  readonly phoneme: string;
  /** The ARPAbet symbol that produces this letter, when one does. */
  readonly arpabet?: string;
}

/**
 * All 48 letters of the block, in code point order. `arpabet` is absent for the
 * seven letters whose phonemes General American merges or spells as a sequence.
 */
const LETTER_TABLE: readonly Omit<ShavianLetter, 'letter'>[] = Object.freeze(
  [
    { codePoint: 0x10450, name: 'SHAVIAN LETTER PEEP', phoneme: 'p', arpabet: 'P' },
    { codePoint: 0x10451, name: 'SHAVIAN LETTER TOT', phoneme: 't', arpabet: 'T' },
    { codePoint: 0x10452, name: 'SHAVIAN LETTER KICK', phoneme: 'k', arpabet: 'K' },
    { codePoint: 0x10453, name: 'SHAVIAN LETTER FEE', phoneme: 'f', arpabet: 'F' },
    {
      codePoint: 0x10454,
      name: 'SHAVIAN LETTER THIGH',
      phoneme: 'θ',
      arpabet: 'TH',
    },
    { codePoint: 0x10455, name: 'SHAVIAN LETTER SO', phoneme: 's', arpabet: 'S' },
    {
      codePoint: 0x10456,
      name: 'SHAVIAN LETTER SURE',
      phoneme: 'ʃ',
      arpabet: 'SH',
    },
    {
      codePoint: 0x10457,
      name: 'SHAVIAN LETTER CHURCH',
      phoneme: 'tʃ',
      arpabet: 'CH',
    },
    { codePoint: 0x10458, name: 'SHAVIAN LETTER YEA', phoneme: 'j', arpabet: 'Y' },
    {
      codePoint: 0x10459,
      name: 'SHAVIAN LETTER HUNG',
      phoneme: 'ŋ',
      arpabet: 'NG',
    },
    { codePoint: 0x1045a, name: 'SHAVIAN LETTER BIB', phoneme: 'b', arpabet: 'B' },
    { codePoint: 0x1045b, name: 'SHAVIAN LETTER DEAD', phoneme: 'd', arpabet: 'D' },
    { codePoint: 0x1045c, name: 'SHAVIAN LETTER GAG', phoneme: 'ɡ', arpabet: 'G' },
    { codePoint: 0x1045d, name: 'SHAVIAN LETTER VOW', phoneme: 'v', arpabet: 'V' },
    {
      codePoint: 0x1045e,
      name: 'SHAVIAN LETTER THEY',
      phoneme: 'ð',
      arpabet: 'DH',
    },
    { codePoint: 0x1045f, name: 'SHAVIAN LETTER ZOO', phoneme: 'z', arpabet: 'Z' },
    {
      codePoint: 0x10460,
      name: 'SHAVIAN LETTER MEASURE',
      phoneme: 'ʒ',
      arpabet: 'ZH',
    },
    {
      codePoint: 0x10461,
      name: 'SHAVIAN LETTER JUDGE',
      phoneme: 'dʒ',
      arpabet: 'JH',
    },
    { codePoint: 0x10462, name: 'SHAVIAN LETTER WOE', phoneme: 'w', arpabet: 'W' },
    {
      codePoint: 0x10463,
      name: 'SHAVIAN LETTER HA-HA',
      phoneme: 'h',
      arpabet: 'HH',
    },
    { codePoint: 0x10464, name: 'SHAVIAN LETTER LOLL', phoneme: 'l', arpabet: 'L' },
    { codePoint: 0x10465, name: 'SHAVIAN LETTER MIME', phoneme: 'm', arpabet: 'M' },
    { codePoint: 0x10466, name: 'SHAVIAN LETTER IF', phoneme: 'ɪ', arpabet: 'IH' },
    { codePoint: 0x10467, name: 'SHAVIAN LETTER EGG', phoneme: 'ɛ', arpabet: 'EH' },
    { codePoint: 0x10468, name: 'SHAVIAN LETTER ASH', phoneme: 'æ', arpabet: 'AE' },
    {
      codePoint: 0x10469,
      name: 'SHAVIAN LETTER ADO',
      phoneme: 'ə',
      arpabet: 'AH0',
    },
    {
      codePoint: 0x1046a,
      name: 'SHAVIAN LETTER ON',
      phoneme: 'ɒ',
    },
    {
      codePoint: 0x1046b,
      name: 'SHAVIAN LETTER WOOL',
      phoneme: 'ʊ',
      arpabet: 'UH',
    },
    { codePoint: 0x1046c, name: 'SHAVIAN LETTER OUT', phoneme: 'aʊ', arpabet: 'AW' },
    { codePoint: 0x1046d, name: 'SHAVIAN LETTER AH', phoneme: 'ɑː', arpabet: 'AA' },
    { codePoint: 0x1046e, name: 'SHAVIAN LETTER ROAR', phoneme: 'r', arpabet: 'R' },
    { codePoint: 0x1046f, name: 'SHAVIAN LETTER NUN', phoneme: 'n', arpabet: 'N' },
    { codePoint: 0x10470, name: 'SHAVIAN LETTER EAT', phoneme: 'iː', arpabet: 'IY' },
    { codePoint: 0x10471, name: 'SHAVIAN LETTER AGE', phoneme: 'eɪ', arpabet: 'EY' },
    { codePoint: 0x10472, name: 'SHAVIAN LETTER ICE', phoneme: 'aɪ', arpabet: 'AY' },
    { codePoint: 0x10473, name: 'SHAVIAN LETTER UP', phoneme: 'ʌ', arpabet: 'AH' },
    { codePoint: 0x10474, name: 'SHAVIAN LETTER OAK', phoneme: 'oʊ', arpabet: 'OW' },
    { codePoint: 0x10475, name: 'SHAVIAN LETTER OOZE', phoneme: 'uː', arpabet: 'UW' },
    { codePoint: 0x10476, name: 'SHAVIAN LETTER OIL', phoneme: 'ɔɪ', arpabet: 'OY' },
    { codePoint: 0x10477, name: 'SHAVIAN LETTER AWE', phoneme: 'ɔː', arpabet: 'AO' },
    { codePoint: 0x10478, name: 'SHAVIAN LETTER ARE', phoneme: 'ɑːr' },
    { codePoint: 0x10479, name: 'SHAVIAN LETTER OR', phoneme: 'ɔːr' },
    { codePoint: 0x1047a, name: 'SHAVIAN LETTER AIR', phoneme: 'ɛər' },
    { codePoint: 0x1047b, name: 'SHAVIAN LETTER ERR', phoneme: 'ɜːr', arpabet: 'ER' },
    {
      codePoint: 0x1047c,
      name: 'SHAVIAN LETTER ARRAY',
      phoneme: 'ər',
      arpabet: 'ER0',
    },
    { codePoint: 0x1047d, name: 'SHAVIAN LETTER EAR', phoneme: 'ɪər' },
    { codePoint: 0x1047e, name: 'SHAVIAN LETTER YEW', phoneme: 'juː' },
    { codePoint: 0x1047f, name: 'SHAVIAN LETTER IAN', phoneme: 'iən' },
  ].map((entry) => ({ ...entry, letter: String.fromCodePoint(entry.codePoint) })),
);

/** The block in code point order, each entry with its glyph filled in. */
export const SHAVIAN_LETTERS: readonly ShavianLetter[] = Object.freeze(
  LETTER_TABLE.map((entry) => ({ ...entry, letter: String.fromCodePoint(entry.codePoint) })),
);

const BY_ARPABET = new Map<string, string>();
for (const entry of SHAVIAN_LETTERS) {
  if (entry.arpabet) BY_ARPABET.set(entry.arpabet, entry.letter);
}

/** ARPAbet symbol (with `AH0` and `ER0` as their own keys) to Shavian letter. */
export const ARPABET_TO_SHAVIAN: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(BY_ARPABET),
);

export class ShavianError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShavianError';
  }
}

/**
 * One dictionary pronunciation (`HH AH0 L OW1`) as Shavian (`𐑣𐑩𐑤𐑴`).
 * A symbol with no letter throws rather than vanishing, so a gap in the table
 * cannot pass silently.
 */
export function arpabetToShavian(pronunciation: string): string {
  const phones = pronunciation
    .trim()
    .split(/\s+/)
    .filter((phone) => phone !== '');
  let out = '';
  for (const phone of phones) {
    // A compound's parts are joined by a hyphen; it passes straight through.
    if (phone === '-') {
      out += '-';
      continue;
    }
    const match = /^([A-Z]+)([012])?$/.exec(phone);
    if (!match) throw new ShavianError(`“${phone}” is not an ARPAbet phoneme.`);
    const symbol = match[1] as string;
    const stress = match[2];
    // Unstressed AH and ER have their own letters; every other vowel is one
    // letter whether it carries stress or not, because Shavian does not write
    // stress in running text.
    const key = stress === '0' && (symbol === 'AH' || symbol === 'ER') ? `${symbol}0` : symbol;
    const letter = BY_ARPABET.get(key);
    if (letter === undefined) throw new ShavianError(`“${symbol}” has no Shavian letter.`);
    out += letter;
  }
  return out;
}

export interface ShavianSegment {
  readonly kind: TokenKind;
  readonly text: string;
  /** Every pronunciation the dictionary has, in Shavian. Empty when unknown. */
  readonly variants: readonly string[];
  /** A capitalised word that does not start a sentence takes the namer dot. */
  readonly properNoun: boolean;
}

export interface ShavianText {
  readonly segments: readonly ShavianSegment[];
  /** Words with no entry, in the order they appear, without duplicates. */
  readonly unknown: readonly string[];
  readonly words: number;
  readonly transliterated: number;
  readonly properNouns: readonly string[];
}

const SENTENCE_END = /[.!?…]/;

/** A word that begins with a capital and is not written in capitals throughout. */
function isName(text: string): boolean {
  const first = text.slice(0, 1);
  const rest = text.slice(1);
  return first !== first.toLowerCase() && rest === rest.toLowerCase();
}

/**
 * Rewrites every word in the dictionary as Shavian, keeps punctuation and
 * spacing as they were, marks names with the namer dot, and reports each word
 * it could not find instead of guessing at it. Numbers are left alone: the
 * dictionary has no entries for digits.
 */
export function transliterate(text: string, lookup: PronunciationLookup): ShavianText {
  const segments: ShavianSegment[] = [];
  const unknown: string[] = [];
  const properNouns: string[] = [];
  let words = 0;
  let transliterated = 0;
  let sentenceStart = true;
  for (const token of tokenise(text)) {
    if (token.kind !== 'word') {
      segments.push({ kind: token.kind, text: token.text, variants: [], properNoun: false });
      if (SENTENCE_END.test(token.text)) sentenceStart = true;
      continue;
    }
    words += 1;
    const properNoun = !sentenceStart && isName(token.text);
    sentenceStart = false;
    const found = pronunciations(token.text, lookup);
    if (found === undefined) {
      unknown.push(token.text);
      segments.push({ kind: 'word', text: token.text, variants: [], properNoun });
      continue;
    }
    transliterated += 1;
    if (properNoun) properNouns.push(token.text);
    segments.push({
      kind: 'word',
      text: token.text,
      variants: found.map((pronunciation) => arpabetToShavian(pronunciation)),
      properNoun,
    });
  }
  return { segments, unknown, words, transliterated, properNouns };
}

/**
 * The whole text as one line: words become Shavian, a name keeps its namer dot,
 * and an unknown word is left exactly as written so nothing is invented. It is
 * listed separately by the caller.
 */
export function joinShavian(text: ShavianText): string {
  return text.segments
    .map((segment) => {
      if (segment.kind !== 'word') return segment.text;
      const shavian = segment.variants[0];
      if (shavian === undefined) return segment.text;
      return segment.properNoun ? `${NAMER_DOT}${shavian}` : shavian;
    })
    .join('');
}
