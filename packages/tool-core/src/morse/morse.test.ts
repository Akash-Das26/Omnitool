import { describe, expect, it } from 'vitest';
import { decodeMorse, encodeMorse, MorseError, morseToTimings, WORD_SEPARATOR } from './index';

describe('encodeMorse', () => {
  it('encodes letters case-insensitively with single-space letters and slash words', () => {
    expect(encodeMorse('SOS').text).toBe('... --- ...');
    expect(encodeMorse('sos').text).toBe('... --- ...');
    expect(encodeMorse('HELLO WORLD').text).toBe('.... . .-.. .-.. --- / .-- --- .-. .-.. -..');
  });

  it('encodes digits per ITU', () => {
    expect(encodeMorse('1895').text).toBe('.---- ---.. ----. .....');
  });

  it('encodes common punctuation', () => {
    expect(encodeMorse('STOP.').text).toBe('... - --- .--. .-.-.-');
    expect(encodeMorse('A+B=C').text).toBe('.- .-.-. -... -...- -.-.');
  });

  it('collapses repeated whitespace and treats runs of spaces as word breaks', () => {
    expect(encodeMorse('  A   B  ').text).toBe(`.- ${WORD_SEPARATOR} -...`);
  });

  it('returns an empty string for empty input', () => {
    expect(encodeMorse('').text).toBe('');
    expect(encodeMorse('   ').text).toBe('');
  });

  it('reports unknown characters and skips them by default', () => {
    const result = encodeMorse('A~C');
    expect(result.text).toBe('.- -.-.');
    expect(result.unknown).toEqual(['~']);
  });

  it('throws in strict mode when a character has no Morse sign', () => {
    expect(() => encodeMorse('A~C', { strict: true })).toThrow(MorseError);
    expect(() => encodeMorse('A~C', { strict: true })).toThrow(/no Morse/i);
  });
});

describe('decodeMorse', () => {
  it('decodes letters, digits and punctuation', () => {
    expect(decodeMorse('... --- ...').text).toBe('SOS');
    expect(decodeMorse('.---- ---.. ----. .....').text).toBe('1895');
    expect(decodeMorse('.-.-.-').text).toBe('.');
  });

  it('splits words on the slash separator and on runs of three spaces', () => {
    expect(decodeMorse(`.... . .-.. .-.. --- ${WORD_SEPARATOR} .-- --- .-. .-.. -..`).text).toBe(
      'HELLO WORLD',
    );
    expect(decodeMorse('.... . .-.. .-.. ---   .-- --- .-. .-.. -..').text).toBe('HELLO WORLD');
  });

  it('is the inverse of encodeMorse for a representative sentence', () => {
    const text = 'SOS 1895 STOP? YES/NO';
    expect(decodeMorse(encodeMorse(text).text).text).toBe(text);
  });

  it('flags an unknown sequence and marks it in the output', () => {
    const result = decodeMorse('... .- .-.-');
    expect(result.text).toBe('SA?');
    expect(result.unknown).toEqual(['.-.-']);
  });

  it('returns an empty string for empty input', () => {
    expect(decodeMorse('').text).toBe('');
    expect(decodeMorse('  ').text).toBe('');
  });
});

describe('morseToTimings', () => {
  it('uses the standard dot/dash/gap timing at 20 wpm', () => {
    const timings = morseToTimings('.-', 20);
    // 20 wpm: one unit = 1200/20 = 60 ms.
    expect(timings).toEqual([
      { durationMs: 60, tone: true },
      { durationMs: 60, tone: false },
      { durationMs: 180, tone: true },
    ]);
  });

  it('adds the letter gap of three units between letters only', () => {
    const timings = morseToTimings('.- -.', 20);
    expect(timings).toEqual([
      { durationMs: 60, tone: true },
      { durationMs: 60, tone: false },
      { durationMs: 180, tone: true },
      { durationMs: 180, tone: false },
      { durationMs: 180, tone: true },
      { durationMs: 60, tone: false },
      { durationMs: 60, tone: true },
    ]);
  });

  it('adds the word gap of seven units', () => {
    const timings = morseToTimings(`.- ${WORD_SEPARATOR} -.`, 20);
    const gaps = timings.filter((part) => !part.tone).map((part) => part.durationMs);
    expect(gaps).toEqual([60, 420, 60]);
  });

  it('scales with words per minute', () => {
    const fast = morseToTimings('.', 40);
    expect(fast).toEqual([{ durationMs: 30, tone: true }]);
  });

  it('rejects an invalid speed', () => {
    expect(() => morseToTimings('.', 0)).toThrow(MorseError);
    expect(() => morseToTimings('.', Number.NaN)).toThrow(MorseError);
    expect(() => morseToTimings('.', 1000)).toThrow(MorseError);
  });

  it('produces no timings for empty Morse', () => {
    expect(morseToTimings('', 20)).toEqual([]);
  });
});
