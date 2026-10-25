import { describe, expect, it } from 'vitest';
import { type AlgebraOperation, fraction, MAX_INPUT_LENGTH, runAlgebra } from './index';

function answer(operation: AlgebraOperation, expression: string, value?: string) {
  const result = runAlgebra({ operation, expression, value });
  expect(result.error, `${operation} ${expression}`).toBeNull();
  return result;
}

function refusal(operation: AlgebraOperation, expression: string, value?: string) {
  const result = runAlgebra({ operation, expression, value });
  expect(result.ok).toBe(false);
  return result.error;
}

/**
 * Behaviour at the edges: what the parser refuses and why, how the three
 * degrees of a solve are told apart, and the shape of the numbers it prints.
 * Every expectation is a sentence a person would see.
 */
describe('parser refusals', () => {
  it('names the character it does not understand', () => {
    expect(refusal('simplify', 'x @ 1')).toBe('“@” is not something this tool understands.');
  });

  it('refuses a number with two decimal points', () => {
    expect(refusal('simplify', '1..2*x')).toBe('“1..2” is not a number.');
  });

  it('refuses a lone decimal point', () => {
    expect(refusal('simplify', 'x+.')).toBe('“.” is not a number.');
  });

  it('says when the expression stops early', () => {
    expect(refusal('simplify', 'x+')).toBe('The expression is incomplete.');
  });

  it('says when a bracket is never closed', () => {
    expect(refusal('simplify', '(x+1')).toBe('A bracket is not closed.');
  });

  it('refuses two equals signs in one equation', () => {
    expect(refusal('solve', 'x=y=2')).toBe('An equation has one “=” sign.');
  });

  it('accepts a number that starts with a decimal point', () => {
    expect(answer('solve', '.5*x=1').headline).toBe('x = 2');
  });

  it('refuses a power above the stated limit', () => {
    expect(refusal('simplify', 'x^65')).toBe('Powers above 64 are out of scope.');
  });

  it('refuses an exponent that is an expression', () => {
    expect(refusal('simplify', 'x^(1+1)')).toBe(
      'A power must be a whole number of 0 or more here.',
    );
  });

  it('refuses a letter that is not the variable', () => {
    expect(refusal('simplify', 'y+1')).toBe('Only x is a variable here, not y.');
  });

  it('refuses a value that is not a number', () => {
    expect(refusal('evaluate', 'x^2', 'x')).toBe('The value must be a number.');
  });

  it('refuses an input one character over the limit', () => {
    expect(refusal('simplify', '1+'.repeat(MAX_INPUT_LENGTH))).toBe(
      `The input is longer than ${MAX_INPUT_LENGTH} characters.`,
    );
  });
});

describe('solve, degree by degree', () => {
  it('says every value works when both sides are the same', () => {
    const result = answer('solve', 'x+1=x+1');
    expect(result.headline).toBe('Every value of x');
    expect(result.notes.join(' ')).toMatch(/true for every x/);
  });

  it('says there is no solution when the x terms cancel', () => {
    const result = answer('solve', 'x=x+1');
    expect(result.headline).toBe('No solution');
  });

  it('keeps a fractional root exact', () => {
    expect(answer('solve', '3*x=1').headline).toBe('x = 1/3');
  });

  it('reports a repeated root once', () => {
    expect(answer('solve', 'x^2-2*x+1=0').headline).toBe('x = 1');
  });

  it('writes a surd root with a non-zero b term', () => {
    const result = answer('solve', 'x^2-2*x-1=0');
    expect(result.headline).toBe('x = (2 - √8) / 2 or x = (2 + √8) / 2');
    expect(result.notes.join(' ')).toMatch(/cannot be written as exact fractions/);
  });

  it('lists every rational root of a cubic', () => {
    const result = answer('solve', 'x^3-x=0');
    expect(result.headline).toBe('x = 0 or x = 1 or x = -1');
  });

  it('says when a higher degree has no rational roots left', () => {
    const result = answer('solve', 'x^4+1=0');
    expect(result.headline).toBe('No rational roots');
  });

  it('warns about the factor it could not solve', () => {
    const result = answer('solve', 'x^4-1=0');
    expect(result.headline).toContain('x =');
    expect(result.notes.join(' ')).toMatch(/left over|irrational or complex/);
  });
});

describe('factor and differentiate', () => {
  it('repeats a repeated factor', () => {
    expect(answer('factor', 'x^2-2*x+1').headline).toBe('(x - 1)(x - 1)');
  });

  it('leaves a quadratic with no rational roots as it was', () => {
    const result = answer('factor', 'x^2+1');
    expect(result.headline).toBe('x^2 + 1');
    expect(result.notes.join(' ')).toMatch(/No rational roots/);
  });

  it('takes out a constant common factor', () => {
    expect(answer('factor', '6*x+9').headline).toBe('3(2x + 3)');
  });

  it('factors a constant expression to itself', () => {
    expect(answer('factor', '5').headline).toBe('5');
  });

  it('differentiates a constant to zero', () => {
    expect(answer('differentiate', '7').headline).toBe('0');
  });

  it('differentiates x to one', () => {
    expect(answer('differentiate', 'x').headline).toBe('1');
  });
});

describe('evaluate prints exact values', () => {
  it('substitutes a negative decimal exactly', () => {
    expect(answer('evaluate', 'x', '-2.5').headline).toBe('-5/2');
  });

  it('offers the decimal next to a fraction it cannot write as one', () => {
    const result = answer('evaluate', 'x/3', '1');
    expect(result.headline).toBe('1/3');
    expect(result.steps.join(' ')).toMatch(/0\.333333333/);
  });

  it('evaluates zero terms to zero', () => {
    expect(answer('evaluate', '0*x+0', '4').headline).toBe('0');
  });
});

describe('exact fractions take plain numbers too', () => {
  it('reduces a number pair and keeps the sign on the numerator', () => {
    expect(fraction(4, -2)).toEqual({ n: -2n, d: 1n });
    expect(fraction(2.9)).toEqual({ n: 2n, d: 1n });
    expect(fraction(-6, -4)).toEqual({ n: 3n, d: 2n });
  });

  it('reduces zero to 0/1', () => {
    expect(fraction(0n, 5n)).toEqual({ n: 0n, d: 1n });
  });

  it('refuses a zero denominator with a sentence', () => {
    expect(() => fraction(1, 0)).toThrow('Cannot divide by zero.');
  });

  it('refuses an operation the engine does not have', () => {
    const result = runAlgebra({ operation: 'integrate' as AlgebraOperation, expression: 'x' });
    expect(result).toEqual({
      ok: false,
      error: 'Unknown operation.',
      headline: '',
      steps: [],
      notes: [],
    });
  });
});

describe('systems, input shape and refusals', () => {
  it('accepts a semicolon as the line break', () => {
    expect(answer('system', 'x+y=5; x-y=1').headline).toBe('x = 3, y = 2');
  });

  it('ignores blank lines between equations', () => {
    expect(answer('system', 'x+y=5\n\nx-y=1').headline).toBe('x = 3, y = 2');
  });

  it('refuses a single equation', () => {
    expect(refusal('system', 'x+y=1')).toBe('A system takes two or three equations, one per line.');
  });

  it('refuses four equations', () => {
    expect(refusal('system', 'x=1\ny=1\nx+y=2\nx-y=0')).toBe(
      'A system takes two or three equations, one per line.',
    );
  });

  it('names the line that has no equals sign', () => {
    expect(refusal('system', 'x+y\nx-y=1')).toBe('“x+y” has no “=” sign.');
  });

  it('refuses a system with no unknowns at all', () => {
    expect(refusal('system', '1=1\n2=2')).toBe('None of the equations has an unknown.');
  });

  it('divides through by a constant on the right', () => {
    expect(answer('system', 'x/2+y=1\nx-y=0').headline).toBe('x = 2/3, y = 2/3');
  });

  it('multiplies a whole equation by a constant on the right', () => {
    expect(answer('system', '2*(x+y)=4\nx-y=0').headline).toBe('x = 1, y = 1');
  });

  it('handles a negated term', () => {
    expect(answer('system', '-x+y=0\nx+y=2').headline).toBe('x = 1, y = 1');
  });

  it('refuses an unknown squared', () => {
    expect(refusal('system', 'x^2+y=1\nx-y=0')).toBe(
      'A system takes linear equations: an unknown squared is not linear.',
    );
  });

  it('refuses dividing by an unknown', () => {
    expect(refusal('system', 'x/y=1\nx-y=0')).toBe('Dividing by an unknown is not supported.');
  });

  it('refuses a variable used as a value', () => {
    expect(refusal('evaluate', 'x', 'x+1')).toBe('The value must be a number.');
  });
});
