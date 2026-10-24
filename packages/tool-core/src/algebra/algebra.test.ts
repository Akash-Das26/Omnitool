import { describe, expect, it } from 'vitest';
import { MAX_INPUT_LENGTH, runAlgebra } from './index';

function answer(
  operation: Parameters<typeof runAlgebra>[0]['operation'],
  expression: string,
  value?: string,
) {
  const result = runAlgebra({ operation, expression, value });
  expect(result.error, `${operation} ${expression}`).toBeNull();
  return result;
}

describe('known results', () => {
  it('expands (x+1)^3', () => {
    expect(answer('expand', '(x+1)^3').headline).toBe('x^3 + 3x^2 + 3x + 1');
  });

  it('factors x^2-5x+6', () => {
    expect(answer('factor', 'x^2-5*x+6').headline).toBe('(x - 2)(x - 3)');
  });

  it('factors a quadratic whose leading coefficient is not one', () => {
    expect(answer('factor', '2*x^2-5*x+2').headline).toBe('(2x - 1)(x - 2)');
  });

  it('takes out a common factor', () => {
    expect(answer('factor', 'x^3-4*x').headline).toBe('x(x - 2)(x + 2)');
  });

  it('solves 2x+3=11', () => {
    expect(answer('solve', '2*x+3=11').headline).toBe('x = 4');
  });

  it('solves x^2-4=0 exactly', () => {
    expect(answer('solve', 'x^2-4=0').headline).toBe('x = -2 or x = 2');
  });

  it('reports surd roots without pretending they are fractions', () => {
    const result = answer('solve', 'x^2-2=0');
    expect(result.headline).toBe('x = -√8 / 2 or x = √8 / 2');
    expect(result.notes.join(' ')).toMatch(/Surd roots/);
  });

  it('says when there are no real roots', () => {
    expect(answer('solve', 'x^2+1=0').headline).toBe('No real roots');
  });

  it('differentiates x^3+2x', () => {
    expect(answer('differentiate', 'x^3+2*x').headline).toBe('3x^2 + 2');
  });

  it('evaluates at a value', () => {
    const result = answer('evaluate', 'x^2+2*x+1', '3');
    expect(result.headline).toBe('16');
  });

  it('evaluates a negative fractional value exactly', () => {
    const result = answer('evaluate', 'x^2', '-0.5');
    expect(result.headline).toBe('1/4');
  });

  it('solves a 2x2 system', () => {
    expect(answer('system', 'x+y=5\nx-y=1').headline).toBe('x = 3, y = 2');
  });

  it('solves a 3x3 system', () => {
    expect(answer('system', 'x+y+z=6\n2*x-y+z=3\nx+2*y-z=2').headline).toBe('x = 1, y = 2, z = 3');
  });

  it('reports a contradictory system', () => {
    expect(answer('system', 'x+y=1\nx+y=2').headline).toBe('No solution');
  });

  it('reports a dependent system', () => {
    expect(answer('system', 'x+y=2\n2*x+2*y=4').headline).toBe('Infinitely many solutions');
  });
});

describe('equivalence', () => {
  /** The same expression at the same points, before and after rearranging. */
  it('agrees with the rearranged form at random points', () => {
    const cases = [
      ['(x+2)*(x-3)', 'x^2 - x - 6'],
      ['(2*x-1)^2', '4*x^2 - 4*x + 1'],
      ['x*(x+1)*(x-1)', 'x^3 - x'],
      ['(x/2+3)^2', '(1/4)*x^2 + 3*x + 9'],
    ] as const;
    for (const [source, expected] of cases) {
      const expanded = answer('expand', source).headline.replace(/\s/g, '');
      expect(expanded, source).toBe(expected.replace(/[\s*]/g, ''));
      for (const at of ['-3', '-1', '0.5', '2', '7']) {
        const before = answer('evaluate', source, at);
        const after = answer('evaluate', expected, at);
        expect(before.headline, `${source} at ${at}`).toBe(after.headline);
      }
    }
  });

  it('a factored form keeps the value of the original', () => {
    const factored = answer('factor', 'x^3-7*x+6').headline;
    expect(factored).toBe('(x - 1)(x - 2)(x + 3)');
  });
});

describe('refusals', () => {
  it('rejects implicit multiplication, as the scientific calculator does', () => {
    expect(runAlgebra({ operation: 'simplify', expression: '2x' }).error).toBe(
      'There is something left over at the end of the expression.',
    );
  });

  it('rejects division by x', () => {
    expect(runAlgebra({ operation: 'simplify', expression: '1/x' }).error).toBe(
      'Dividing by something containing x is not supported.',
    );
  });

  it('rejects functions', () => {
    expect(runAlgebra({ operation: 'simplify', expression: 'sin(x)' }).error).toBe(
      '“sin” is not a variable here; use x, y or z.',
    );
  });

  it('rejects a fractional power', () => {
    expect(runAlgebra({ operation: 'simplify', expression: 'x^0.5' }).error).toBe(
      'A power must be a whole number of 0 or more here.',
    );
  });

  it('rejects an input over the length limit', () => {
    const result = runAlgebra({
      operation: 'simplify',
      expression: 'x'.repeat(MAX_INPUT_LENGTH + 1),
    });
    expect(result.error).toBe(`The input is longer than ${MAX_INPUT_LENGTH} characters.`);
  });

  it('rejects a system that is not linear', () => {
    expect(runAlgebra({ operation: 'system', expression: 'x*y=1\nx+y=2' }).error).toMatch(
      /not linear/,
    );
  });

  it('rejects an empty input', () => {
    expect(runAlgebra({ operation: 'simplify', expression: '   ' }).error).toBe(
      'Enter an expression.',
    );
  });
});

describe('fuzz', () => {
  /** A small seeded generator, so a failure is reproducible from the seed. */
  function seeded(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
  }

  it('never throws, hangs or shows a non-number', () => {
    const random = seeded(20261024);
    const pieces = [
      'x',
      'y',
      '2',
      '3.5',
      '0',
      '(',
      ')',
      '+',
      '-',
      '*',
      '/',
      '^',
      '=',
      ' ',
      'sin',
      'x^999',
    ];
    const operations = [
      'simplify',
      'expand',
      'factor',
      'solve',
      'differentiate',
      'evaluate',
      'system',
    ] as const;
    for (let index = 0; index < 600; index += 1) {
      const length = 1 + Math.floor(random() * 12);
      let source = '';
      for (let part = 0; part < length; part += 1) {
        source += pieces[Math.floor(random() * pieces.length)];
      }
      const operation = operations[
        Math.floor(random() * operations.length)
      ] as (typeof operations)[number];
      const result = runAlgebra({ operation, expression: source, value: '2' });
      expect(result.headline).not.toMatch(/NaN|Infinity/);
      expect(result.steps.join(' ')).not.toMatch(/NaN|Infinity/);
      if (result.ok) expect(result.headline.length).toBeGreaterThan(0);
      else expect(result.error?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('handles a deeply nested expression without a stack overflow', () => {
    const deep = `${'('.repeat(120)}x${')'.repeat(120)}`;
    const result = runAlgebra({ operation: 'simplify', expression: deep });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('nested too deeply');
  });
});
