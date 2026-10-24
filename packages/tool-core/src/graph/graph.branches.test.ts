import { describe, expect, it } from 'vitest';
import { axisTicks, sampleGraph, summariseFunction, type Viewport, valueTable } from './index';

const VIEW: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

describe('sampleGraph', () => {
  it('reports a parse error instead of drawing', () => {
    const graph = sampleGraph('sin(', VIEW);
    expect(graph.segments).toEqual([]);
    expect(graph.evaluations).toBe(0);
    expect(graph.error).toBeTruthy();
  });

  it('refuses a viewport with no area', () => {
    expect(sampleGraph('x', { ...VIEW, xMin: 10, xMax: 10 }).segments).toEqual([]);
    expect(sampleGraph('x', { ...VIEW, yMin: 10, yMax: -10 }).segments).toEqual([]);
  });

  it('breaks a curve at a discontinuity instead of drawing across it', () => {
    const graph = sampleGraph('1/x', VIEW);
    expect(graph.gaps).toBeGreaterThan(0);
    expect(graph.segments.length).toBeGreaterThan(1);
    expect(graph.segments.every((segment) => segment.points.length >= 2)).toBe(true);
  });

  it('never evaluates more times than the budget allows', () => {
    const graph = sampleGraph('tan(x)', VIEW, { maxEvaluations: 50, width: 100 });
    expect(graph.evaluations).toBeLessThanOrEqual(50);
    expect(graph.complete).toBe(false);
  });

  it('keeps every segment inside the view it was given', () => {
    const graph = sampleGraph('x^2', VIEW);
    for (const segment of graph.segments) {
      for (const point of segment.points) {
        expect(point.x).toBeGreaterThanOrEqual(VIEW.xMin);
        expect(point.x).toBeLessThanOrEqual(VIEW.xMax);
        expect(Math.abs(point.y)).toBeLessThanOrEqual((VIEW.yMax - VIEW.yMin) * 1e6);
      }
    }
  });
});

describe('axisTicks', () => {
  it('gives a round step and the values that fall on it', () => {
    expect(axisTicks(-10, 10, 4)).toEqual({
      step: 5,
      values: [-10, -5, 0, 5, 10],
    });
  });

  it('returns no ticks for a range that is not a range', () => {
    expect(axisTicks(5, 5)).toEqual({ step: 1, values: [] });
    expect(axisTicks(5, -5)).toEqual({ step: 1, values: [] });
    expect(axisTicks(Number.NaN, 1)).toEqual({ step: 1, values: [] });
    expect(axisTicks(0, Number.POSITIVE_INFINITY)).toEqual({ step: 1, values: [] });
  });

  it('never reports negative zero', () => {
    const ticks = axisTicks(-1, 1, 2);
    expect(ticks.values).toContain(0);
    expect(ticks.values.some((value) => Object.is(value, -0))).toBe(false);
  });

  it('stops at 200 ticks however many would fit', () => {
    const ticks = axisTicks(0, 1e9, 100_000);
    expect(ticks.values.length).toBeLessThanOrEqual(201);
  });
});

describe('valueTable', () => {
  it('reports a parse error and no rows', () => {
    const table = valueTable('1 +', [0, 1]);
    expect(table.rows).toEqual([]);
    expect(table.error).toBeTruthy();
  });

  it('gives null where the function has no real value', () => {
    expect(valueTable('1/x', [-1, 0, 1]).rows).toEqual([
      { x: -1, y: -1 },
      { x: 0, y: null },
      { x: 1, y: 1 },
    ]);
    expect(valueTable('sqrt(x)', [-4, 4]).rows).toEqual([
      { x: -4, y: null },
      { x: 4, y: 2 },
    ]);
  });
});

describe('summariseFunction', () => {
  it('reports a parse error as the note', () => {
    const summary = summariseFunction('sin(');
    expect(summary.error).toBeTruthy();
    expect(summary.note).toBe(summary.error);
    expect(summary.symmetry).toBe('unknown');
    expect(summary.keyPoints).toEqual([]);
  });

  it('measures key points at -2 to 2', () => {
    expect(summariseFunction('x^2').keyPoints).toEqual([
      { x: -2, y: 4 },
      { x: -1, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ]);
  });

  it('calls an even function even and an odd one odd', () => {
    expect(summariseFunction('x^2').symmetry).toBe('even');
    expect(summariseFunction('x^2').note).toContain('the same for x and −x (even)');
    expect(summariseFunction('x^3').symmetry).toBe('odd');
    expect(summariseFunction('x^3').note).toContain('with the sign flipped (odd)');
    expect(summariseFunction('x^2 + x').symmetry).toBe('neither');
  });

  it('says unknown when it could not compare any pair', () => {
    expect(summariseFunction('sqrt(-1 - x^2)').symmetry).toBe('unknown');
  });

  it('names a break at zero and counts the others', () => {
    const one = summariseFunction('1/x', 1);
    expect(one.note).toContain('not defined at x = 0');
    expect(one.note).toContain('one break');

    const many = summariseFunction('tan(x)', 3);
    expect(many.note).toContain('3 breaks');

    const smooth = summariseFunction('x^2');
    expect(smooth.note).toBe('the same for x and −x (even)');
  });
});
