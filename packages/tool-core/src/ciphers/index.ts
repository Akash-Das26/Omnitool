/**
 * Classical ciphers.
 *
 * All of these act on the Latin alphabet and leave everything else — digits,
 * punctuation, spaces, accents — exactly as it was. That means a decoded text
 * keeps its shape and only the letters change.
 */

export class CipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CipherError';
  }
}

const A = 65;
const a = 97;

function rotate(letter: string, shift: number): string {
  const code = letter.charCodeAt(0);
  const base = code >= A && code <= A + 25 ? A : a;
  return String.fromCharCode(((code - base + (shift % 26) + 26) % 26) + base);
}

function isLetter(letter: string): boolean {
  return /^[A-Za-z]$/.test(letter);
}

/** Shifts letters by `shift` places; negative shifts decode. */
export function caesar(text: string, shift: number): string {
  if (!Number.isInteger(shift)) throw new CipherError('The shift must be a whole number');
  return [...text].map((letter) => (isLetter(letter) ? rotate(letter, shift) : letter)).join('');
}

export function rot13(text: string): string {
  return caesar(text, 13);
}

/** A becomes Z, B becomes Y; its own inverse. */
export function atbash(text: string): string {
  return [...text]
    .map((letter) => {
      if (!isLetter(letter)) return letter;
      const code = letter.charCodeAt(0);
      const base = code >= A && code <= A + 25 ? A : a;
      return String.fromCharCode(base + (25 - (code - base)));
    })
    .join('');
}

function keyShifts(key: string): number[] {
  const letters = [...key].filter(isLetter).map((letter) => letter.toUpperCase().charCodeAt(0) - A);
  if (letters.length === 0) {
    throw new CipherError('The key needs at least one letter');
  }
  return letters;
}

/**
 * Vigenère. Letters in the text advance the key; anything else passes through
 * without consuming a key letter, which is the usual convention.
 */
export function vigenere(
  text: string,
  key: string,
  direction: 'encode' | 'decode' = 'encode',
): string {
  const shifts = keyShifts(key);
  const sign = direction === 'encode' ? 1 : -1;
  let keyIndex = 0;
  return [...text]
    .map((letter) => {
      if (!isLetter(letter)) return letter;
      const shift = (shifts[keyIndex % shifts.length] ?? 0) * sign;
      keyIndex += 1;
      return rotate(letter, shift);
    })
    .join('');
}

const MAX_RAILS = 12;

/** Zig-zag rail fence. `rails` must be 2 or more and at most 12. */
export function railFence(
  text: string,
  rails: number,
  direction: 'encode' | 'decode' = 'encode',
): string {
  if (!Number.isInteger(rails) || rails < 2 || rails > MAX_RAILS) {
    throw new CipherError(`Choose between 2 and ${MAX_RAILS} rails`);
  }
  const chars = [...text];
  if (chars.length === 0) return '';

  const pattern: number[] = [];
  let rail = 0;
  let step = 1;
  for (let index = 0; index < chars.length; index += 1) {
    pattern.push(rail);
    if (rail === 0) step = 1;
    else if (rail === rails - 1) step = -1;
    rail += step;
  }

  if (direction === 'encode') {
    const rows: string[][] = Array.from({ length: rails }, () => []);
    chars.forEach((char, index) => {
      rows[pattern[index] ?? 0]?.push(char);
    });
    return rows.flat().join('');
  }

  const counts = new Array<number>(rails).fill(0);
  for (const row of pattern) counts[row] = (counts[row] ?? 0) + 1;
  const rows: string[][] = [];
  let cursor = 0;
  for (let row = 0; row < rails; row += 1) {
    rows.push(chars.slice(cursor, cursor + (counts[row] ?? 0)));
    cursor += counts[row] ?? 0;
  }
  const taken = new Array<number>(rails).fill(0);
  return pattern
    .map((row) => {
      const index = taken[row] ?? 0;
      taken[row] = index + 1;
      return rows[row]?.[index] ?? '';
    })
    .join('');
}

/**
 * A log-probability score for how much a piece of text looks like English.
 * Higher (closer to zero) is more English. It uses letter frequencies plus the
 * space, so a shifted text scores worse than the plaintext it came from.
 */
const FREQUENCIES: Readonly<Record<string, number>> = {
  ' ': 0.18,
  e: 0.1026,
  t: 0.0751,
  a: 0.0653,
  o: 0.0617,
  i: 0.0571,
  n: 0.0571,
  s: 0.0534,
  r: 0.0499,
  h: 0.0476,
  l: 0.0331,
  d: 0.0328,
  u: 0.0228,
  c: 0.0223,
  m: 0.0203,
  f: 0.0182,
  w: 0.017,
  g: 0.0161,
  p: 0.015,
  y: 0.0142,
  b: 0.0126,
  v: 0.008,
  k: 0.006,
  j: 0.001,
  x: 0.0015,
  q: 0.001,
  z: 0.0007,
};

const RARE_LETTER_PENALTY = Math.log(0.0001);

export function englishScore(text: string): number {
  const lower = text.toLowerCase();
  if (!/[a-z]/.test(lower)) return -Infinity;
  const letters = [...lower].filter((char) => FREQUENCIES[char] !== undefined);
  if (letters.length === 0) return -Infinity;
  const total = letters.reduce((sum, char) => sum + Math.log(FREQUENCIES[char] ?? 0.0001), 0);
  // Letters outside the table (accents, other scripts) are ignored rather than
  // penalised, so they cannot dominate a short sample.
  return total / letters.length + (letters.length < 8 ? RARE_LETTER_PENALTY : 0);
}

export interface CaesarCandidate {
  readonly shift: number;
  readonly text: string;
  readonly score: number;
}

/** All 25 non-zero shifts, decoded with each, best English first. */
export function rankCaesar(text: string): readonly CaesarCandidate[] {
  return Array.from({ length: 25 }, (_, index) => {
    const shift = index + 1;
    const decoded = caesar(text, -shift);
    return { shift, text: decoded, score: englishScore(decoded) };
  }).sort((left, right) => right.score - left.score);
}
