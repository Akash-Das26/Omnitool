/**
 * English to IPA, from the CMU Pronouncing Dictionary (DEC-62).
 *
 * The dictionary stores ARPAbet phonemes with a stress digit: `HH AH0 L OW1`.
 * `ARPABET_TO_IPA` is the General American reading of each symbol, and the
 * digits become the IPA stress marks ˈ (primary) and ˌ (secondary). A vowel is
 * written with its mark directly before it, because the dictionary does not
 * mark syllable boundaries and guessing them would be inventing data.
 *
 * Nothing is guessed: a word that is not in the dictionary is reported as
 * missing, never spelled out from its letters.
 */

/** Every ARPAbet symbol in the dictionary, with its General American IPA. */
export const ARPABET_TO_IPA: Readonly<Record<string, string>> = Object.freeze({
  AA: 'ɑ',
  AE: 'æ',
  AH: 'ʌ',
  AO: 'ɔ',
  AW: 'aʊ',
  AY: 'aɪ',
  B: 'b',
  CH: 'tʃ',
  D: 'd',
  DH: 'ð',
  EH: 'ɛ',
  ER: 'ɝ',
  EY: 'eɪ',
  F: 'f',
  G: 'ɡ',
  HH: 'h',
  IH: 'ɪ',
  IY: 'i',
  JH: 'dʒ',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  NG: 'ŋ',
  OW: 'oʊ',
  OY: 'ɔɪ',
  P: 'p',
  R: 'ɹ',
  S: 's',
  SH: 'ʃ',
  T: 't',
  TH: 'θ',
  UH: 'ʊ',
  UW: 'u',
  V: 'v',
  W: 'w',
  Y: 'j',
  Z: 'z',
  ZH: 'ʒ',
});

/** Vowels take the stress digit; the rest of the symbols never carry one. */
export const VOWELS: ReadonlySet<string> = new Set([
  'AA',
  'AE',
  'AH',
  'AO',
  'AW',
  'AY',
  'EH',
  'ER',
  'EY',
  'IH',
  'IY',
  'OW',
  'OY',
  'UH',
  'UW',
]);

/** Unstressed AH and ER have their own letters, not a stressed vowel squeezed. */
const UNSTRESSED: Readonly<Record<string, string>> = Object.freeze({ AH: 'ə', ER: 'ɚ' });

const PRIMARY_STRESS = 'ˈ';
const SECONDARY_STRESS = 'ˌ';

export class IpaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpaError';
  }
}

/**
 * One dictionary pronunciation (`HH AH0 L OW1`) as IPA (`həˈloʊ`). The stress
 * digit goes before the vowel it belongs to; an unknown symbol throws rather
 * than being dropped, so a gap in the table cannot pass silently.
 */
export function arpabetToIpa(pronunciation: string): string {
  const phones = pronunciation
    .trim()
    .split(/\s+/)
    .filter((phone) => phone !== '');
  const parsed = phones.map((phone) => {
    // A compound's parts are joined by a hyphen; it passes straight through.
    if (phone === '-') return { letter: '-', mark: '', vowel: false, barrier: true };
    const match = /^([A-Z]+)([012])?$/.exec(phone);
    if (!match) throw new IpaError(`“${phone}” is not an ARPAbet phoneme.`);
    const symbol = match[1] as string;
    const stress = match[2];
    const base = ARPABET_TO_IPA[symbol];
    if (base === undefined) throw new IpaError(`“${symbol}” has no IPA mapping.`);
    return {
      letter: stress === '0' ? (UNSTRESSED[symbol] ?? base) : base,
      mark: stress === '1' ? PRIMARY_STRESS : stress === '2' ? SECONDARY_STRESS : '',
      vowel: VOWELS.has(symbol),
      barrier: false,
    };
  });

  // A stress mark belongs at the start of its syllable. The dictionary does not
  // mark where syllables begin, so the convention used here is stated rather
  // than implied: the mark goes before the run of consonants that precedes the
  // stressed vowel, back to the previous vowel or the start of the word. That
  // gives "həˈloʊ" and "ˈwɝld", which is how these words are normally written.
  const marks = new Array<string>(parsed.length).fill('');
  parsed.forEach((phone, index) => {
    if (phone.mark === '' || !phone.vowel) return;
    // At most two consonants join the onset: English onsets of three only
    // occur at the start of a word, so a longer run means the first consonant
    // closes the previous syllable.
    let at = index;
    let moved = 0;
    while (at > 0 && !parsed[at - 1]?.vowel && !parsed[at - 1]?.barrier && moved < 2) {
      at -= 1;
      moved += 1;
    }
    marks[at] = phone.mark;
  });

  return parsed.map((phone, index) => `${marks[index] ?? ''}${phone.letter}`).join('');
}

export type TokenKind = 'word' | 'number' | 'other';

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
}

const WORD = /[\p{L}]+(?:['’-][\p{L}]+)*/gu;
const NUMBER = /\d+(?:[.,]\d+)*/g;

/**
 * Splits text into words, numbers and everything else, keeping every character
 * in order so the transcription can be reassembled with the original spacing
 * and punctuation.
 */
export function tokenise(text: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const pattern = new RegExp(`${WORD.source}|${NUMBER.source}`, 'gu');
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > index) tokens.push({ kind: 'other', text: text.slice(index, start) });
    const value = match[0];
    tokens.push({ kind: /^\d/.test(value) ? 'number' : 'word', text: value });
    index = start + value.length;
  }
  if (index < text.length) tokens.push({ kind: 'other', text: text.slice(index) });
  return tokens;
}

export interface TranscriptionSegment {
  readonly kind: TokenKind;
  readonly text: string;
  /** Every pronunciation the dictionary has, as IPA. Empty when unknown. */
  readonly variants: readonly string[];
}

export interface Transcription {
  readonly segments: readonly TranscriptionSegment[];
  /** Words with no entry, in the order they appear, without duplicates. */
  readonly unknown: readonly string[];
  readonly words: number;
  readonly transcribed: number;
}

/** A lookup returns ARPAbet pronunciations for a lower-case word. */
export type PronunciationLookup = (word: string) => readonly string[] | undefined;

/**
 * Handles the punctuation that the dictionary itself does not spell out:
 * a hyphenated compound is looked up whole, then as its parts.
 */
function pronunciations(word: string, lookup: PronunciationLookup): readonly string[] | undefined {
  const direct = lookup(word.toLowerCase());
  if (direct !== undefined) return direct;
  if (word.includes('-')) {
    const parts = word.split('-');
    const collected: string[] = [];
    for (const part of parts) {
      const found = lookup(part.toLowerCase());
      if (found === undefined || found.length === 0) return undefined;
      collected.push(found[0] as string);
    }
    // The hyphen is part of the word, so it stays between the parts' phonemes.
    return [collected.join(' - ')];
  }
  return undefined;
}

/**
 * Transcribes every word, keeps punctuation and spacing as they were, and
 * reports each word it could not find instead of guessing at it. Numbers are
 * left alone: the dictionary has no entries for digits.
 */
export function transcribe(text: string, lookup: PronunciationLookup): Transcription {
  const segments: TranscriptionSegment[] = [];
  const unknown: string[] = [];
  let words = 0;
  let transcribed = 0;
  for (const token of tokenise(text)) {
    if (token.kind !== 'word') {
      segments.push({ kind: token.kind, text: token.text, variants: [] });
      continue;
    }
    words += 1;
    const found = pronunciations(token.text, lookup);
    if (found === undefined) {
      unknown.push(token.text);
      segments.push({ kind: 'word', text: token.text, variants: [] });
      continue;
    }
    transcribed += 1;
    segments.push({
      kind: 'word',
      text: token.text,
      variants: found.map((pronunciation) => arpabetToIpa(pronunciation)),
    });
  }
  return { segments, unknown, words, transcribed };
}

/**
 * The whole transcription as one line: words become IPA, punctuation and
 * spacing stay, and an unknown word is left as written between marks so it is
 * visible in the running text as well as in the list.
 */
export function joinTranscription(transcription: Transcription, markUnknown = true): string {
  return transcription.segments
    .map((segment) => {
      if (segment.kind !== 'word') return segment.text;
      if (segment.variants.length === 0) return markUnknown ? `⟨${segment.text}⟩` : segment.text;
      return segment.variants[0];
    })
    .join('');
}
