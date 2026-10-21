import { describe, expect, it } from 'vitest';
import { CALCULATOR_LIMITS, evaluateExpression, formatNumber } from './index';

function display(input: string, options?: Parameters<typeof evaluateExpression>[1]): string {
  const result = evaluateExpression(input, options);
  if (!result.ok) throw new Error(`expected a value for “${input}”, got: ${result.error}`);
  return result.display;
}

function error(input: string, options?: Parameters<typeof evaluateExpression>[1]): string {
  const result = evaluateExpression(input, options);
  if (result.ok) throw new Error(`expected an error for “${input}”, got ${result.display}`);
  return result.error;
}

describe('known values', () => {
  it('handles the trigonometry examples from the spec', () => {
    expect(display('sin(30)')).toBe('0.5');
    expect(display('tan(45)')).toBe('1');
    expect(display('cos(60)')).toBe('0.5');
  });

  it('hides binary floating point noise at the default precision', () => {
    expect(display('0.1+0.2')).toBe('0.3');
    expect(display('0.1*3')).toBe('0.3');
    expect(display('1.1-1')).toBe('0.1');
    expect(display('sqrt(2)*sqrt(2)')).toBe('2');
  });

  it('evaluates arithmetic with the documented precedence', () => {
    expect(display('2+3*4')).toBe('14');
    expect(display('(2+3)*4')).toBe('20');
    expect(display('2^10')).toBe('1024');
    expect(display('2^3^2')).toBe('512');
    expect(display('-2^2')).toBe('-4');
    expect(display('(-2)^2')).toBe('4');
    expect(display('3*-2')).toBe('-6');
    expect(display('2^-3')).toBe('0.125');
    expect(display('10%4')).toBe('2');
    expect(display('7.5%2')).toBe('1.5');
    expect(display('--5')).toBe('5');
    expect(display('+5')).toBe('5');
  });

  it('computes factorials', () => {
    expect(display('5!')).toBe('120');
    expect(display('0!')).toBe('1');
    expect(display('3!!')).toBe('720');
    expect(display('2+3!')).toBe('8');
    expect(display('170!')).toBe('7.25741561531e+306');
  });

  it('supports the named functions and constants', () => {
    expect(display('sqrt(9)')).toBe('3');
    expect(display('cbrt(-8)')).toBe('-2');
    expect(display('ln(e)')).toBe('1');
    expect(display('log(1000)')).toBe('3');
    expect(display('log2(8)')).toBe('3');
    expect(display('abs(-3)')).toBe('3');
    expect(display('exp(0)')).toBe('1');
    expect(display('floor(2.9)')).toBe('2');
    expect(display('ceil(2.1)')).toBe('3');
    expect(display('round(2.5)')).toBe('3');
    expect(display('sinh(0)')).toBe('0');
    expect(display('cosh(0)')).toBe('1');
    expect(display('tanh(0)')).toBe('0');
    expect(display('pi')).toBe('3.14159265359');
    expect(display('e')).toBe('2.71828182846');
  });

  it('converts by angle mode', () => {
    expect(display('sin(pi/2)', { angleMode: 'rad' })).toBe('1');
    expect(display('acos(0)', { angleMode: 'rad' })).toBe('1.57079632679');
    expect(display('sin(100)', { angleMode: 'grad' })).toBe('1');
    expect(display('asin(1)', { angleMode: 'grad' })).toBe('100');
    expect(display('atan(1)')).toBe('45');
  });

  it('exposes the previous answer as ans', () => {
    expect(display('ans*2', { ans: 21 })).toBe('42');
    expect(display('ans', {})).toBe('0');
  });

  it('honours the chosen number of significant digits', () => {
    expect(display('1/3')).toBe('0.333333333333');
    expect(display('1/3', { significantDigits: 3 })).toBe('0.333');
    expect(display('2/3', { significantDigits: 6 })).toBe('0.666667');
    expect(display('123456', { significantDigits: 3 })).toBe('123000');
  });
});

describe('display formatting', () => {
  it('drops trailing zeros and uses scientific notation at the edges', () => {
    expect(formatNumber(1024)).toBe('1024');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(1e12)).toBe('1e+12');
    expect(formatNumber(1.5e12)).toBe('1.5e+12');
    expect(formatNumber(0.00009)).toBe('9e-5');
    expect(formatNumber(0.0001)).toBe('0.0001');
    expect(formatNumber(-2.5e-7)).toBe('-2.5e-7');
    expect(formatNumber(123456789012345)).toBe('1.23456789012e+14');
  });
});

describe('domain errors are plain messages, never NaN or Infinity', () => {
  it('refuses division and remainder by zero', () => {
    expect(error('1/0')).toBe('Division by zero has no value.');
    expect(error('1%0')).toBe('The remainder after dividing by zero has no value.');
    expect(error('5/(3-3)')).toBe('Division by zero has no value.');
  });

  it('refuses values outside a function domain', () => {
    expect(error('sqrt(-1)')).toBe('The square root of a negative number is not a real number.');
    expect(error('ln(0)')).toBe('The logarithm is only defined for numbers above zero.');
    expect(error('log(-5)')).toBe('The logarithm is only defined for numbers above zero.');
    expect(error('log2(0)')).toBe('The logarithm is only defined for numbers above zero.');
    expect(error('asin(2)')).toBe('The inverse sine is only defined between -1 and 1.');
    expect(error('acos(-1.1)')).toBe('The inverse cosine is only defined between -1 and 1.');
  });

  it('refuses factorials it cannot show', () => {
    expect(error('2.5!')).toBe('Factorial needs a whole number.');
    expect(error('(-1)!')).toBe('Factorial needs a whole number from 0 to 170.');
    expect(error('171!')).toBe('Factorial needs a whole number from 0 to 170.');
  });

  it('refuses results that overflow', () => {
    expect(error('9^999')).toBe('The result is too large to show.');
    expect(error('1e308*10')).toBe('The result is too large to show.');
  });
});

describe('syntax errors explain what to fix', () => {
  it('rejects empty and overlong input', () => {
    expect(error('')).toBe('Enter an expression.');
    expect(error('   ')).toBe('Enter an expression.');
    expect(error('1'.repeat(CALCULATOR_LIMITS.maxLength + 1))).toBe(
      'The expression is longer than 1,000 characters.',
    );
    const atLimit = `${'1+'.repeat(499)}1`;
    const padded = ` ${atLimit}`;
    expect(padded).toHaveLength(1000);
    expect(display(padded)).toBe('500');
  });

  it('rejects nesting beyond the depth limit', () => {
    const deep = `${'('.repeat(101)}1${')'.repeat(101)}`;
    expect(error(deep)).toBe('The expression is nested more than 100 levels deep.');
    const allowed = `${'('.repeat(100)}1${')'.repeat(100)}`;
    expect(display(allowed)).toBe('1');
  });

  it('rejects implicit multiplication, as documented', () => {
    expect(error('2(3+4)')).toBe('Use * before a bracket.');
    expect(error('2pi')).toBe('Use * between values.');
    expect(error('2 3')).toBe('Use * between values.');
    expect(error('(1+1)(2+2)')).toBe('Use * before a bracket.');
  });

  it('rejects unknown names and stray characters', () => {
    expect(error('foo')).toBe('Unknown name “foo”.');
    expect(error('sin')).toBe('“sin” needs a value in brackets.');
    expect(error('sinus(1)')).toBe('Unknown function “sinus”.');
    expect(error('1 & 2')).toBe('Unexpected character “&”.');
    expect(error('2 *')).toBe('The expression is incomplete.');
    expect(error('(1+2')).toBe('A bracket is not closed.');
    expect(error('1+2)')).toBe('There is a closing bracket without an opening one.');
    expect(error('()')).toBe('A value is missing before “)”.');
    expect(error('!5')).toBe('A value is missing before “!”.');
  });
});

/**
 * Seeded random input: a fixed sequence, so a failure is reproducible, and no
 * dependency. The parser must return a result for every string — never throw —
 * and must finish quickly, because a parser that backtracks or recurses without
 * a bound would hang the page instead of reporting an error.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABET = '0123456789.+-*/^%()! sincoaslqrtxpnegbdfhuwPIEA_?,;[]{}🙂';

describe('fuzz', () => {
  it('never throws, hangs or prints NaN or Infinity on 10,000 random strings', () => {
    const random = mulberry32(20261021);
    const started = performance.now();
    let values = 0;

    for (let run = 0; run < 10_000; run += 1) {
      const length = 1 + Math.floor(random() * 40);
      let input = '';
      for (let position = 0; position < length; position += 1) {
        input += ALPHABET[Math.floor(random() * ALPHABET.length)];
      }

      const result = evaluateExpression(input, { angleMode: 'deg', ans: run });
      expect(result.ok || typeof result.error === 'string').toBe(true);

      if (result.ok) {
        values += 1;
        expect(Number.isFinite(result.value)).toBe(true);
        expect(result.display).not.toMatch(/NaN|Infinity/);
        expect(result.display).not.toBe('');
      } else {
        expect(result.error.length).toBeGreaterThan(0);
        expect(result.error).not.toMatch(/NaN|Infinity/);
      }
    }

    // A hang detector, not a benchmark: 10,000 short strings take milliseconds.
    expect(performance.now() - started).toBeLessThan(15_000);
    expect(values).toBeGreaterThan(0);
  });

  it('handles a long expression of random operators without throwing', () => {
    const random = mulberry32(7);
    for (let run = 0; run < 200; run += 1) {
      const parts: string[] = [];
      for (let index = 0; index < 100; index += 1) {
        parts.push(String(Math.floor(random() * 100)));
        parts.push(['+', '-', '*', '/', '^', '%'][Math.floor(random() * 6)] as string);
      }
      parts.push('1');
      const result = evaluateExpression(parts.join(' '));
      expect(result.ok || typeof result.error === 'string').toBe(true);
    }
  });
});
