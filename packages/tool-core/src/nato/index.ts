/**
 * The ICAO (NATO) spelling alphabet as used for radiotelephony: 26 letter
 * words and the ten digit pronunciations from ICAO Annex 10 Volume II,
 * Chapter 8.2. Letters are matched case-insensitively. Characters with no
 * entry (punctuation, symbols) are passed through unchanged and flagged so the
 * caller can point them out.
 */

export const ICAO_ALPHABET: Readonly<Record<string, string>> = {
  A: 'Alfa',
  B: 'Bravo',
  C: 'Charlie',
  D: 'Delta',
  E: 'Echo',
  F: 'Foxtrot',
  G: 'Golf',
  H: 'Hotel',
  I: 'India',
  J: 'Juliett',
  K: 'Kilo',
  L: 'Lima',
  M: 'Mike',
  N: 'November',
  O: 'Oscar',
  P: 'Papa',
  Q: 'Quebec',
  R: 'Romeo',
  S: 'Sierra',
  T: 'Tango',
  U: 'Uniform',
  V: 'Victor',
  W: 'Whiskey',
  X: 'X-ray',
  Y: 'Yankee',
  Z: 'Zulu',
};

export const ICAO_DIGITS: Readonly<Record<string, string>> = {
  '0': 'Zero',
  '1': 'Wun',
  '2': 'Too',
  '3': 'Tree',
  '4': 'Fower',
  '5': 'Fife',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Ait',
  '9': 'Niner',
};

export interface SpellOutResult {
  /** The spelled-out text; words separated by a slash. */
  readonly text: string;
  /** Characters passed through unchanged, in order of first appearance. */
  readonly flagged: readonly string[];
}

/** Word separator in the spelled-out output. */
export const SPELL_WORD_SEPARATOR = '/';

export function spellOut(text: string): SpellOutResult {
  const flagged: string[] = [];
  const words = text.trim().split(/\s+/).filter(Boolean);
  const spelledWords = words.map((word) => {
    const parts: string[] = [];
    for (const character of word) {
      const upper = character.toUpperCase();
      const spoken = ICAO_ALPHABET[upper] ?? ICAO_DIGITS[upper];
      if (spoken === undefined) {
        if (!flagged.includes(character)) flagged.push(character);
        parts.push(character);
        continue;
      }
      parts.push(spoken);
    }
    return parts.join(' ');
  });
  return {
    text: spelledWords.join(` ${SPELL_WORD_SEPARATOR} `),
    flagged,
  };
}
