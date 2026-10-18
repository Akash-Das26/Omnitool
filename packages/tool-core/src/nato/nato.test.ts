import { describe, expect, it } from 'vitest';
import { ICAO_ALPHABET, ICAO_DIGITS, spellOut } from './index';

describe('ICAO tables', () => {
  it('has 26 letters spelled with the ICAO words', () => {
    expect(Object.keys(ICAO_ALPHABET)).toHaveLength(26);
    expect(ICAO_ALPHABET.A).toBe('Alfa');
    expect(ICAO_ALPHABET.J).toBe('Juliett');
    expect(ICAO_ALPHABET.W).toBe('Whiskey');
    expect(ICAO_ALPHABET.X).toBe('X-ray');
    expect(ICAO_ALPHABET.Z).toBe('Zulu');
  });

  it('has the ten ICAO digit pronunciations', () => {
    expect(Object.keys(ICAO_DIGITS)).toHaveLength(10);
    expect(ICAO_DIGITS['0']).toBe('Zero');
    expect(ICAO_DIGITS['3']).toBe('Tree');
    expect(ICAO_DIGITS['5']).toBe('Fife');
    expect(ICAO_DIGITS['9']).toBe('Niner');
  });
});

describe('spellOut', () => {
  it('spells letters case-insensitively, separated by spaces', () => {
    expect(spellOut('SOS').text).toBe('Sierra Oscar Sierra');
    expect(spellOut('sos').text).toBe('Sierra Oscar Sierra');
  });

  it('separates words with a slash', () => {
    expect(spellOut('HELLO WORLD').text).toBe(
      'Hotel Echo Lima Lima Oscar / Whiskey Oscar Romeo Lima Delta',
    );
  });

  it('uses the ICAO radiotelephony digit pronunciations', () => {
    expect(spellOut('1895').text).toBe('Wun Ait Niner Fife');
    expect(spellOut('0').text).toBe('Zero');
    expect(spellOut('3').text).toBe('Tree');
    expect(spellOut('4').text).toBe('Fower');
    expect(spellOut('5').text).toBe('Fife');
    expect(spellOut('9').text).toBe('Niner');
  });

  it('passes unknown characters through and flags them', () => {
    const result = spellOut('A-B!');
    expect(result.text).toBe('Alfa - Bravo !');
    expect(result.flagged).toEqual(['-', '!']);
  });

  it('collapses repeated whitespace and trims', () => {
    expect(spellOut('  A   B  ').text).toBe('Alfa / Bravo');
  });

  it('returns an empty string for empty input', () => {
    expect(spellOut('').text).toBe('');
    expect(spellOut('   ').text).toBe('');
  });

  it('does not flag a character twice', () => {
    expect(spellOut('!!').flagged).toEqual(['!']);
  });
});
