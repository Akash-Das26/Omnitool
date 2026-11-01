import { describe, expect, it } from 'vitest';
import {
  axisTicks,
  MAX_FUNCTIONS,
  SERIES_STYLES,
  sampleGraph,
  summariseFunction,
  type Viewport,
  valueTable,
} from './index';

const VIEW: Viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

function allPoints(segments: readonly { points: readonly { x: number; y: number }[] }[]) {
  return segments.flatMap((segment) => segment.points);
}

describe('sampleGraph', () => {
  it('plots known values of a polynomial', () => {
    const graph = sampleGraph('x^2', { xMin: -2, xMax: 2, yMin: -1, yMax: 5 }, { width: 40 });
    expect(graph.error).toBeUndefined();
    expect(graph.segments).toHaveLength(1);

    const near = (x: number) =>
      allPoints(graph.segments).reduce((best, point) =>
        Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best,
      );
    expect(near(0).y).toBeCloseTo(0, 6);
    expect(near(2).y).toBeCloseTo(4, 6);
    expect(near(-1.5).y).toBeCloseTo(2.25, 3);
  });

  it('breaks 1/x at the singularity instead of drawing through it', () => {
    const graph = sampleGraph('1/x', { xMin: -2, xMax: 2, yMin: -4, yMax: 4 }, { width: 80 });
    expect(graph.segments.length).toBeGreaterThanOrEqual(2);
    for (const segment of graph.segments) {
      for (const point of segment.points) {
        expect(point.x).not.toBe(0);
        expect(point.y).not.toBe(0);
      }
    }
    // No segment may join a point left of zero to a point right of zero.
    for (const segment of graph.segments) {
      const xs = segment.points.map((point) => point.x);
      expect(Math.min(...xs) > 0 || Math.max(...xs) < 0).toBe(true);
    }
  });

  it('breaks tan x at each asymptote within the view', () => {
    const graph = sampleGraph('tan(x)', { xMin: -7, xMax: 7, yMin: -4, yMax: 4 }, { width: 200 });
    // Four asymptotes between -2π and 2π: -3π/2, -π/2, π/2, 3π/2.
    expect(graph.segments.length).toBeGreaterThanOrEqual(5);
    for (const segment of graph.segments) {
      for (const point of segment.points) {
        // Never within a sample step of an asymptote, and never a value so
        // large that it would break the canvas transform.
        const phase = (point.x + Math.PI / 2) / Math.PI;
        expect(Math.abs(phase - Math.round(phase))).toBeGreaterThan(1e-3);
        expect(Math.abs(point.y)).toBeLessThan(4 * 1e6);
      }
      const xs = segment.points.map((point) => point.x);
      for (const asymptote of [(-3 * Math.PI) / 2, -Math.PI / 2, Math.PI / 2, (3 * Math.PI) / 2]) {
        expect(Math.min(...xs) > asymptote || Math.max(...xs) < asymptote).toBe(true);
      }
    }
  });

  it('stops at the evaluation cap and says so', () => {
    const graph = sampleGraph('sin(x)', VIEW, { width: 5000, maxEvaluations: 500 });
    expect(graph.evaluations).toBeLessThanOrEqual(500);
    expect(graph.complete).toBe(false);
  });

  it('reports a compile error and plots nothing', () => {
    const graph = sampleGraph('y = 2x', VIEW);
    expect(graph.error).toBeTruthy();
    expect(graph.segments).toEqual([]);
  });

  it('keeps a steep continuous curve connected', () => {
    const graph = sampleGraph('x', { xMin: -1, xMax: 1, yMin: -100, yMax: 100 }, { width: 20 });
    expect(graph.segments).toHaveLength(1);
    expect(graph.gaps).toBe(0);
  });

  it('is identical for the same input and width', () => {
    const first = sampleGraph('sin(x)*x', VIEW, { width: 120 });
    const second = sampleGraph('sin(x)*x', VIEW, { width: 120 });
    expect(second.segments).toEqual(first.segments);
    expect(second.evaluations).toEqual(first.evaluations);
  });
});

describe('sampleGraph fuzz', () => {
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

  it('never throws and always respects the budget on 2,000 random expressions', () => {
    const random = mulberry32(20261023);
    for (let run = 0; run < 2000; run += 1) {
      const length = 1 + Math.floor(random() * 24);
      let source = '';
      for (let position = 0; position < length; position += 1) {
        source += ALPHABET[Math.floor(random() * ALPHABET.length)];
      }
      const graph = sampleGraph(source, VIEW, { width: 64, maxEvaluations: 200 });
      expect(graph.evaluations).toBeLessThanOrEqual(200);
      expect(graph.segments.every((segment) => segment.points.length >= 2)).toBe(true);
      if (graph.error !== undefined) expect(typeof graph.error).toBe('string');
    }
  });
});

describe('axisTicks', () => {
  it('uses steps of 1, 2 or 5 times a power of ten', () => {
    for (const [min, max] of [
      [-5, 5],
      [-1, 1],
      [0, 0.37],
      [-1234, 4321],
      [1e-5, 3e-5],
    ] as const) {
      const ticks = axisTicks(min, max, 8);
      const mantissa = ticks.step / 10 ** Math.floor(Math.log10(ticks.step));
      expect([1, 2, 5, 10]).toContain(Number(mantissa.toFixed(6)));
      expect(ticks.values.length).toBeGreaterThan(1);
      for (const value of ticks.values) {
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('includes zero in a view that spans it, as a plain 0', () => {
    const ticks = axisTicks(-5, 5, 8);
    expect(ticks.values).toContain(0);
    expect(Object.is(ticks.values[ticks.values.indexOf(0)], -0)).toBe(false);
  });

  it('returns nothing for a degenerate range', () => {
    expect(axisTicks(2, 2).values).toEqual([]);
    expect(axisTicks(Number.NaN, 1).values).toEqual([]);
  });
});

describe('valueTable', () => {
  it('lists the value at each x and null where it is undefined', () => {
    const table = valueTable('sqrt(x)', [-1, 0, 4]);
    expect(table.error).toBeUndefined();
    expect(table.rows).toEqual([
      { x: -1, y: null },
      { x: 0, y: 0 },
      { x: 4, y: 2 },
    ]);
  });

  it('reports a compile error', () => {
    expect(valueTable('x +', [0]).error).toContain('incomplete');
  });
});

describe('summariseFunction', () => {
  it('describes an even function from its samples', () => {
    const summary = summariseFunction('x^2');
    expect(summary.symmetry).toBe('even');
    expect(summary.keyPoints.find((row) => row.x === 2)?.y).toBe(4);
    expect(summary.note).toContain('even');
  });

  it('describes an odd function from its samples', () => {
    expect(summariseFunction('x^3').symmetry).toBe('odd');
  });

  it('says so when a function is not defined at zero', () => {
    expect(summariseFunction('1/x', 1).note).toContain('not defined at x = 0');
  });

  it('passes the compile error through', () => {
    const summary = summariseFunction('(');
    expect(summary.error).toBeTruthy();
    expect(summary.note).toBe(summary.error);
  });
});

describe('series styles', () => {
  it('gives every slot a distinct dash pattern and a token colour', () => {
    expect(MAX_FUNCTIONS).toBe(6);
    const dashes = SERIES_STYLES.map((style) => JSON.stringify(style.dash));
    expect(new Set(dashes).size).toBe(SERIES_STYLES.length);
    expect(new Set(SERIES_STYLES.map((style) => style.token)).size).toBe(SERIES_STYLES.length);
  });
});
