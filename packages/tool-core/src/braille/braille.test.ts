import { describe, expect, it } from 'vitest';
import { BRAILLE_DIGIT_INDICATOR, brailleToText, CAPITAL_INDICATOR, textToBraille } from './index';

describe('textToBraille', () => {
  it('encodes lowercase letters as their braille cells', () => {
    expect(textToBraille('hello').text).toBe('⠓⠑⠇⠇⠕');
  });

  it('prefixes capitals with the capital sign', () => {
    expect(textToBraille('Hello').text).toBe(`${CAPITAL_INDICATOR}⠓⠑⠇⠇⠕`);
    expect(textToBraille('A').text).toBe(`${CAPITAL_INDICATOR}⠁`);
  });

  it('writes the number sign once per digit run', () => {
    // Digits 1-9,0 reuse the a-j cells: 9 is the i cell, 0 the j cell.
    expect(textToBraille('1895').text).toBe(`${BRAILLE_DIGIT_INDICATOR}⠁⠓⠊⠑`);
    expect(textToBraille('1 2').text).toBe(
      `${BRAILLE_DIGIT_INDICATOR}⠁ ${BRAILLE_DIGIT_INDICATOR}⠃`,
    );
  });

  it('starts a new digit run after a letter', () => {
    // The number indicator returns after the letter ends the first run.
    expect(textToBraille('a1').text).toBe(`⠁${BRAILLE_DIGIT_INDICATOR}⠁`);
  });

  it('encodes basic one-cell punctuation', () => {
    expect(textToBraille(".,?!;:'-").text).toBe('⠲⠂⠦⠖⠆⠒⠄⠤');
  });

  it('encodes the two-cell punctuation: quotes, brackets and slash', () => {
    expect(textToBraille('“x”').text).toBe('⠦⠭⠴');
    expect(textToBraille('(a)').text).toBe('⠐⠣⠁⠐⠜');
    expect(textToBraille('a/b').text).toBe('⠁⠸⠌⠃');
  });

  it('keeps spaces between words', () => {
    expect(textToBraille('hi yo').text).toBe('⠓⠊ ⠽⠕');
  });

  it('reports unknown characters and skips them', () => {
    const result = textToBraille('a~b');
    expect(result.text).toBe('⠁⠃');
    expect(result.unknown).toEqual(['~']);
  });

  it('returns an empty string for empty input', () => {
    expect(textToBraille('').text).toBe('');
    expect(textToBraille('   ').text).toBe('');
  });
});

describe('brailleToText', () => {
  it('decodes letters and honours the capital sign', () => {
    expect(brailleToText('⠓⠑⠇⠇⠕').text).toBe('hello');
    expect(brailleToText(`${CAPITAL_INDICATOR}⠓⠑⠇⠇⠕`).text).toBe('Hello');
  });

  it('decodes digit runs after the number sign', () => {
    expect(brailleToText(`${BRAILLE_DIGIT_INDICATOR}⠁⠓⠊⠑`).text).toBe('1895');
  });

  it('decodes basic punctuation', () => {
    expect(brailleToText('⠲⠂⠦⠖⠆⠒⠄⠤').text).toBe(".,?!;:'-");
  });

  it('round-trips a representative line', () => {
    const line = 'Hello, World! 1895 (test) yes/no';
    expect(brailleToText(textToBraille(line).text).text).toBe(line);
  });

  it('marks an unknown cell with a question mark and reports it', () => {
    // Dot 1-6 is the French è cell: valid Unicode braille, not English grade 1.
    const result = brailleToText('⠁⠡⠃');
    expect(result.text).toBe('a?b');
    expect(result.unknown).toEqual(['⠡']);
  });

  it('returns an empty string for empty input', () => {
    expect(brailleToText('').text).toBe('');
    expect(brailleToText('  ').text).toBe('');
  });
});
