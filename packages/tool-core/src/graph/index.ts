/**
 * Graph Calculator: turning a typed expression into polylines.
 *
 * The parser is the calculator's (`../calc`), compiled once per function with
 * `x` as a variable. Everything here is pure: the view transform, the sampling,
 * the ticks and the text summary, so the canvas component stays thin and the
 * behaviour is testable without a DOM.
 */
import { compileExpression } from '../calc/index';

export interface Viewport {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

export interface PlotPoint {
  readonly x: number;
  readonly y: number;
}

export interface PlotSegment {
  readonly points: readonly PlotPoint[];
}

export interface SampleOptions {
  /** Columns across the viewport; one sample per device pixel column. */
  readonly width?: number;
  /** Hard cap on evaluations, so one frame cannot hang the page. */
  readonly maxEvaluations?: number;
  /** How many midpoint refinements a steep pair may receive. */
  readonly maxDepth?: number;
}

export interface SampledGraph {
  readonly source: string;
  readonly segments: readonly PlotSegment[];
  readonly gaps: number;
  readonly evaluations: number;
  readonly complete: boolean;
  readonly error?: string;
}

export const SAMPLE_DEFAULTS = Object.freeze({
  width: 720,
  maxEvaluations: 6000,
  maxDepth: 3,
});

/** A jump larger than this share of the visible height is treated as a break. */
const ASYMPTOTE_JUMP = 8;
/** A pair steeper than this share of the height gets midpoint samples. */
const REFINE_SLOPE = 0.25;

function isUsable(value: number): boolean {
  return Number.isFinite(value);
}

/**
 * Samples one function across a viewport.
 *
 * Gaps are deliberate: a point that is not a finite real number, or a jump that
 * crosses the whole view, ends the current segment, so `1/x` and `tan x` show
 * two branches instead of a vertical line joining infinity to minus infinity.
 * Steep but continuous pairs are refined with midpoints, never above the
 * evaluation budget.
 */
export function sampleGraph(
  source: string,
  viewport: Viewport,
  options: SampleOptions = {},
): SampledGraph {
  const width = Math.max(2, Math.trunc(options.width ?? SAMPLE_DEFAULTS.width));
  const maxEvaluations = Math.max(
    4,
    Math.trunc(options.maxEvaluations ?? SAMPLE_DEFAULTS.maxEvaluations),
  );
  const maxDepth = Math.max(0, Math.trunc(options.maxDepth ?? SAMPLE_DEFAULTS.maxDepth));

  const compiled = compileExpression(source, { variables: ['x'], angleMode: 'rad' });
  if (!compiled.ok) {
    return { source, segments: [], gaps: 0, evaluations: 0, complete: true, error: compiled.error };
  }

  const span = viewport.xMax - viewport.xMin;
  if (!(span > 0) || !(viewport.yMax > viewport.yMin)) {
    return { source, segments: [], gaps: 0, evaluations: 0, complete: true };
  }

  const height = viewport.yMax - viewport.yMin;
  // A value this far outside the view is not worth drawing and would break the
  // canvas transform, so it counts as a gap like an undefined value.
  const limit = height * 1e6;
  const evaluate = (x: number): number | null => {
    try {
      const value = compiled.compiled.evaluate({ x });
      return isUsable(value) && Math.abs(value) <= limit ? value : null;
    } catch {
      return null;
    }
  };
  let evaluations = 0;
  const budgetLeft = () => evaluations < maxEvaluations;

  const sample = (x: number): number | null => {
    if (!budgetLeft()) return null;
    evaluations += 1;
    return evaluate(x);
  };

  const segments: PlotSegment[] = [];
  let current: PlotPoint[] = [];
  let gaps = 0;
  let complete = true;

  const flush = () => {
    if (current.length >= 2) segments.push({ points: current });
    current = [];
  };

  /** Adds midpoints while a pair is steep, up to `maxDepth` and the budget. */
  const refine = (left: PlotPoint, right: PlotPoint, depth: number) => {
    if (depth >= maxDepth || !budgetLeft()) return;
    if (Math.abs(right.y - left.y) < height * REFINE_SLOPE) return;
    const x = (left.x + right.x) / 2;
    const y = sample(x);
    if (y === null) {
      // A break inside a steep pair: end the segment before it. The caller then
      // opens a new segment with `right`, so the line never passes through the
      // undefined point.
      gaps += 1;
      flush();
      return;
    }
    const middle = { x, y };
    refine(left, middle, depth + 1);
    current.push(middle);
    refine(middle, right, depth + 1);
  };

  for (let column = 0; column <= width; column += 1) {
    const x = viewport.xMin + (span * column) / width;
    const y = sample(x);

    if (!budgetLeft() && column < width) {
      complete = false;
    }

    if (y === null) {
      if (current.length > 0) gaps += 1;
      flush();
      continue;
    }

    const point = { x, y };
    const previous = current.at(-1);
    const crossesWholeView =
      previous !== undefined &&
      ((previous.y > viewport.yMax && y < viewport.yMin) ||
        (previous.y < viewport.yMin && y > viewport.yMax));
    if (previous && (crossesWholeView || Math.abs(y - previous.y) > height * ASYMPTOTE_JUMP)) {
      // Two neighbouring samples on opposite sides of the whole viewport cannot
      // be joined: that is an asymptote, not a line to draw.
      gaps += 1;
      flush();
    } else if (previous) {
      refine(previous, point, 0);
    }
    current.push(point);
  }
  flush();

  return { source, segments, gaps, evaluations, complete: complete && budgetLeft() };
}

export interface AxisTicks {
  readonly step: number;
  readonly values: readonly number[];
}

/**
 * Ticks at 1, 2 or 5 times a power of ten, about `target` of them, always on
 * round numbers at the current zoom. Floating point noise is trimmed so labels
 * read 0.3 rather than 0.30000000000000004.
 */
export function axisTicks(min: number, max: number, target = 8): AxisTicks {
  if (!(max > min) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return { step: 1, values: [] };
  }

  const rawStep = (max - min) / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalised = rawStep / magnitude;
  const factor = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  const step = factor * magnitude;

  const start = Math.ceil(min / step) * step;
  const values: number[] = [];
  for (let value = start; value <= max + step * 1e-9; value += step) {
    const rounded = Number(value.toFixed(10));
    values.push(Object.is(rounded, -0) ? 0 : rounded);
    if (values.length > 200) break;
  }
  return { step, values };
}

export interface ValueRow {
  readonly x: number;
  readonly y: number | null;
}

export interface ValueTable {
  readonly rows: readonly ValueRow[];
  readonly error?: string;
}

/** Evaluates a function at the x values in the table, with null where it is undefined. */
export function valueTable(source: string, xs: readonly number[]): ValueTable {
  const compiled = compileExpression(source, { variables: ['x'], angleMode: 'rad' });
  if (!compiled.ok) return { rows: [], error: compiled.error };

  const rows = xs.map((x) => {
    try {
      const value = compiled.compiled.evaluate({ x });
      return { x, y: isUsable(value) ? value : null };
    } catch {
      return { x, y: null };
    }
  });
  return { rows };
}

export interface FunctionSummary {
  readonly source: string;
  readonly error?: string;
  readonly symmetry: 'even' | 'odd' | 'neither' | 'unknown';
  readonly keyPoints: readonly ValueRow[];
  /** A sentence for the accessible list; built from what was measured. */
  readonly note: string;
}

const SYMMETRY_POINTS = [0.7, 1.3, 2.1];

/**
 * A text description of a plotted function: sampled key points, whether the
 * curve is even or odd from the samples, and how it behaves in the view. Every
 * sentence is derived from a measurement, so the alternative to the picture
 * cannot claim more than the sampling found.
 */
export function summariseFunction(source: string, gaps = 0): FunctionSummary {
  const compiled = compileExpression(source, { variables: ['x'], angleMode: 'rad' });
  if (!compiled.ok) {
    return {
      source,
      error: compiled.error,
      symmetry: 'unknown',
      keyPoints: [],
      note: compiled.error,
    };
  }

  const at = (x: number): number | null => {
    try {
      const value = compiled.compiled.evaluate({ x });
      return isUsable(value) ? value : null;
    } catch {
      return null;
    }
  };

  const keyPoints = { rows: [-2, -1, 0, 1, 2].map((x) => ({ x, y: at(x) })) };

  let even = 0;
  let odd = 0;
  let compared = 0;
  for (const x of SYMMETRY_POINTS) {
    const left = at(-x);
    const right = at(x);
    if (left === null || right === null) continue;
    compared += 1;
    const scale = Math.max(1, Math.abs(right));
    if (Math.abs(left - right) <= scale * 1e-9) even += 1;
    if (Math.abs(left + right) <= scale * 1e-9) odd += 1;
  }

  const symmetry =
    compared === 0 ? 'unknown' : even === compared ? 'even' : odd === compared ? 'odd' : 'neither';

  const notes: string[] = [];
  if (at(0) === null) notes.push('not defined at x = 0');
  if (gaps > 0) {
    notes.push(
      gaps === 1
        ? 'one break where the value is not a real number or leaves the view'
        : `${gaps} breaks where the value is not a real number or leaves the view`,
    );
  }
  if (symmetry === 'even') notes.push('the same for x and −x (even)');
  if (symmetry === 'odd') notes.push('the same for x and −x with the sign flipped (odd)');

  return {
    source,
    symmetry,
    keyPoints: keyPoints.rows,
    note: notes.length === 0 ? 'no breaks in the visible range' : notes.join('; '),
  };
}

/** Dashes, labels and token names, one per function slot, used by the canvas. */
export const SERIES_STYLES = Object.freeze([
  { label: 'f1', token: '--primary', dash: [] },
  { label: 'f2', token: '--destructive', dash: [8, 4] },
  { label: 'f3', token: '--success', dash: [2, 3] },
  { label: 'f4', token: '--warning', dash: [10, 3, 2, 3] },
  { label: 'f5', token: '--foreground', dash: [4, 4] },
  { label: 'f6', token: '--muted-foreground', dash: [12, 4] },
] as const);

export const MAX_FUNCTIONS = SERIES_STYLES.length;
