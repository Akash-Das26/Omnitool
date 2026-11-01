import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARPABET_TO_SHAVIAN,
  arpabetToShavian,
  joinShavian,
  NAMER_DOT,
  SHAVIAN_LETTERS,
  transliterate,
} from './index';

/** A tiny dictionary, so the tests do not depend on the committed data. */
const DICTIONARY: Record<string, string[]> = {
  hello: ['HH AH0 L OW1'],
  world: ['W ER1 L D'],
  read: ['R IY1 D', 'R EH1 D'],
  room: ['R UW1 M'],
  i: ['AY1'],
  met: ['M EH1 T'],
  london: ['L AH1 N D AH0 N'],
  she: ['SH IY1'],
  left: ['L EH1 F T'],
  he: ['HH IY1'],
  said: ['S EH1 D'],
  paris: ['P AE1 R IH0 S'],
  ask: ['AE1 S K'],
  stop: ['S T AA1 P'],
  'ice-cream': ['AY1 S K R IY2 M'],
  "don't": ['D OW1 N T'],
  up: ['AH1 P'],
};

const lookup = (word: string) => DICTIONARY[word];

const ICE = '\u{10472}';
const MIME = '\u{10465}';
const EGG = '\u{10467}';
const TOT = '\u{10451}';
const LOLL = '\u{10464}';
const UP = '\u{10473}';
const NUN = '\u{1046f}';
const DEAD = '\u{1045b}';
const ADO = '\u{10469}';
const EAT = '\u{10470}';
const HH = '\u{10463}';
const SO = '\u{10455}';
const KICK = '\u{10452}';
const ROAR = '\u{1046e}';
const PEEP = '\u{10450}';
const ASH = '\u{10468}';
const OAK = '\u{10474}';
const OOZE = '\u{10475}';
const AH = '\u{1046d}';
const ERR = '\u{1047b}';
const ARRAY = '\u{1047c}';
const W = '\u{10462}';

describe('SHAVIAN_LETTERS', () => {
  /**
   * The 48 names of the Shavian block, U+10450–U+1047F, transcribed from the
   * Unicode 16.0 code chart ("Shavian", U+10450 … U+1047F). The table in
   * `index.ts` is checked against this list rather than the other way round,
   * so a transcription slip in the source cannot hide itself.
   */
  const NAMES = [
    'PEEP',
    'TOT',
    'KICK',
    'FEE',
    'THIGH',
    'SO',
    'SURE',
    'CHURCH',
    'YEA',
    'HUNG',
    'BIB',
    'DEAD',
    'GAG',
    'VOW',
    'THEY',
    'ZOO',
    'MEASURE',
    'JUDGE',
    'WOE',
    'HA-HA',
    'LOLL',
    'MIME',
    'IF',
    'EGG',
    'ASH',
    'ADO',
    'ON',
    'WOOL',
    'OUT',
    'AH',
    'ROAR',
    'NUN',
    'EAT',
    'AGE',
    'ICE',
    'UP',
    'OAK',
    'OOZE',
    'OIL',
    'AWE',
    'ARE',
    'OR',
    'AIR',
    'ERR',
    'ARRAY',
    'EAR',
    'YEW',
    'IAN',
  ];

  it('covers the whole block in code point order, with the Unicode name of each letter', () => {
    expect(SHAVIAN_LETTERS).toHaveLength(48);
    SHAVIAN_LETTERS.forEach((entry, index) => {
      expect(entry.codePoint).toBe(0x10450 + index);
      expect(entry.letter).toBe(String.fromCodePoint(0x10450 + index));
      expect(entry.name).toBe(`SHAVIAN LETTER ${NAMES[index]}`);
    });
  });

  it('gives every letter a phoneme and no two letters the same glyph', () => {
    expect(new Set(SHAVIAN_LETTERS.map((entry) => entry.letter)).size).toBe(48);
    expect(new Set(SHAVIAN_LETTERS.map((entry) => entry.name)).size).toBe(48);
    for (const entry of SHAVIAN_LETTERS) expect(entry.phoneme.length).toBeGreaterThan(0);
  });

  it('leaves exactly the seven merged letters unproduced', () => {
    const withoutArpabet = SHAVIAN_LETTERS.filter((entry) => entry.arpabet === undefined).map(
      (entry) => entry.name.replace('SHAVIAN LETTER ', ''),
    );
    expect(withoutArpabet).toEqual(['ON', 'ARE', 'OR', 'AIR', 'EAR', 'YEW', 'IAN']);
  });
});

describe('ARPABET_TO_SHAVIAN', () => {
  it('covers every ARPAbet symbol that appears in the committed dictionary', () => {
    const source = new URL('../../../../data/pronunciation/cmudict.dict', import.meta.url);
    const text = readFileSync(source, 'utf8');
    const symbols = new Set<string>();
    for (const [phone] of text.matchAll(/[A-Z][A-Z0-9]*/g)) {
      const match = /^([A-Z]+)([012])?$/.exec(phone);
      if (match) symbols.add(match[1] as string);
    }
    expect(symbols.size).toBeGreaterThan(30);
    for (const symbol of symbols) {
      // Every symbol the data uses reaches a letter, directly or through the
      // unstressed form of AH and ER.
      const reachable =
        ARPABET_TO_SHAVIAN[symbol] !== undefined ||
        (symbol === 'AH' && ARPABET_TO_SHAVIAN.AH0 !== undefined) ||
        (symbol === 'ER' && ARPABET_TO_SHAVIAN.ER0 !== undefined);
      expect(reachable, symbol).toBe(true);
    }
  }, 20_000);

  it('adds only the two unstressed forms beyond the dictionary symbols', () => {
    expect(Object.keys(ARPABET_TO_SHAVIAN).sort()).toEqual([
      'AA',
      'AE',
      'AH',
      'AH0',
      'AO',
      'AW',
      'AY',
      'B',
      'CH',
      'D',
      'DH',
      'EH',
      'ER',
      'ER0',
      'EY',
      'F',
      'G',
      'HH',
      'IH',
      'IY',
      'JH',
      'K',
      'L',
      'M',
      'N',
      'NG',
      'OW',
      'OY',
      'P',
      'R',
      'S',
      'SH',
      'T',
      'TH',
      'UH',
      'UW',
      'V',
      'W',
      'Y',
      'Z',
      'ZH',
    ]);
  });
});

describe('arpabetToShavian', () => {
  it('writes a word one letter per phoneme', () => {
    expect(arpabetToShavian('HH AH0 L OW1')).toBe(`${HH}${ADO}${LOLL}${OAK}`);
    expect(arpabetToShavian('W ER1 L D')).toBe(`${W}${ERR}${LOLL}${DEAD}`);
  });

  it('uses the schwa letter for unstressed AH and the array letter for unstressed ER', () => {
    expect(arpabetToShavian('AH1')).toBe(UP);
    expect(arpabetToShavian('AH0')).toBe(ADO);
    expect(arpabetToShavian('ER1')).toBe(ERR);
    expect(arpabetToShavian('ER0')).toBe(ARRAY);
  });

  it('does not write stress, because Shavian running text does not', () => {
    expect(arpabetToShavian('AH1')).toBe(arpabetToShavian('AH2'));
    expect(arpabetToShavian('IY1')).toBe(arpabetToShavian('IY0'));
  });

  it('keeps the hyphen between the parts of a compound', () => {
    expect(arpabetToShavian('AY1 S - K R IY2 M')).toBe(`${ICE}${SO}-${KICK}${ROAR}${EAT}${MIME}`);
  });

  it('refuses a symbol it cannot map', () => {
    expect(() => arpabetToShavian('XX1')).toThrow(/no Shavian letter/);
    expect(() => arpabetToShavian('HH AA3')).toThrow(/not an ARPAbet phoneme/);
  });
});

describe('transliterate', () => {
  it('rewrites known words and keeps the punctuation', () => {
    const result = transliterate('Hello, world!', lookup);
    expect(result.words).toBe(2);
    expect(result.transliterated).toBe(2);
    expect(result.unknown).toEqual([]);
    expect(joinShavian(result)).toBe(`${HH}${ADO}${LOLL}${OAK}, ${W}${ERR}${LOLL}${DEAD}!`);
  });

  it('shows every variant the dictionary has, in order', () => {
    expect(transliterate('read', lookup).segments[0]?.variants).toEqual([
      `${ROAR}${EAT}${DEAD}`,
      `${ROAR}${EGG}${DEAD}`,
    ]);
  });

  it('passes an unknown word through unchanged and flags it', () => {
    const result = transliterate('hello zzzz', lookup);
    expect(result.unknown).toEqual(['zzzz']);
    expect(joinShavian(result)).toBe(`${HH}${ADO}${LOLL}${OAK} zzzz`);
  });

  it('is case-insensitive', () => {
    expect(joinShavian(transliterate('HELLO', lookup))).toBe(`${HH}${ADO}${LOLL}${OAK}`);
  });

  it('marks a name that does not start a sentence with the namer dot', () => {
    const result = transliterate('I met London.', lookup);
    expect(result.properNouns).toEqual(['London']);
    expect(result.segments.find((segment) => segment.text === 'London')?.properNoun).toBe(true);
    expect(joinShavian(result)).toBe(
      `${ICE} ${MIME}${EGG}${TOT} ${NAMER_DOT}${LOLL}${UP}${NUN}${DEAD}${ADO}${NUN}.`,
    );
  });

  it('does not mark a sentence-initial capital', () => {
    const result = transliterate('London is a city.', lookup);
    expect(result.segments[0]?.properNoun).toBe(false);
    expect(result.properNouns).toEqual([]);
  });

  it('does not mark a word written in capitals throughout', () => {
    const result = transliterate('Ask SHAR.', lookup);
    expect(result.segments.find((segment) => segment.text === 'SHAR')?.properNoun).toBe(false);
    expect(joinShavian(result)).toBe(`${ASH}${SO}${KICK} SHAR.`);
  });

  it('marks names later in a sentence, including after a quoted full stop', () => {
    const result = transliterate('He said: "London." Then Paris.', lookup);
    expect(result.segments.filter((segment) => segment.properNoun).map((s) => s.text)).toEqual([
      'London',
      'Paris',
    ]);
    expect(result.segments.at(-2)?.properNoun).toBe(true);
  });

  it('leaves numbers alone', () => {
    const result = transliterate('room 101', lookup);
    expect(result.words).toBe(1);
    expect(result.segments.at(-1)).toEqual({
      kind: 'number',
      text: '101',
      variants: [],
      properNoun: false,
    });
    expect(joinShavian(result)).toBe(`${ROAR}${OOZE}${MIME} 101`);
  });

  it('handles an apostrophe', () => {
    const result = transliterate("don't stop", lookup);
    expect(result.unknown).toEqual([]);
    expect(joinShavian(result)).toBe(`${DEAD}${OAK}${NUN}${TOT} ${SO}${TOT}${AH}${PEEP}`);
  });

  it('transliterates a listed hyphenated word as one entry', () => {
    expect(joinShavian(transliterate('ice-cream', lookup))).toBe(
      `${ICE}${SO}${KICK}${ROAR}${EAT}${MIME}`,
    );
  });

  it('never silently drops a word: every word token is converted or reported', () => {
    const text = "One, two; three's 4 and five-six!";
    const result = transliterate(text, lookup);
    expect(result.words).toBe(5);
    expect(result.transliterated + result.unknown.length).toBe(result.words);
    expect(result.unknown).toEqual(['One', 'two', "three's", 'and', 'five-six']);
  });
});

describe('output', () => {
  it('contains only Shavian letters, the namer dot and the text it was given', () => {
    const output = joinShavian(transliterate('"Hello, world!" She said. London 42', lookup));
    for (const character of output) {
      if (/[\x20-\x7E]/.test(character)) continue;
      expect(
        /[\u{10450}-\u{1047F}\u00B7]/u.test(character),
        `unexpected U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
      ).toBe(true);
    }
    expect(joinShavian(transliterate('Hello, London!', lookup))).toContain(NAMER_DOT);
  });

  it('is stable under Unicode normalisation', () => {
    const output = joinShavian(transliterate('Hello, London!', lookup));
    expect(output.normalize('NFC')).toBe(output);
    expect(output.normalize('NFD')).toBe(output);
  });
});
