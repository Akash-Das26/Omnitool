import { roundTo } from '../number/index';
import { DEFAULT_ROOT_FONT_SIZE } from '../px/index';

export const WCAG_MIN_LINE_HEIGHT = 1.5;

export class LineHeightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LineHeightError';
  }
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new LineHeightError(`${label} must be a number greater than zero`);
  }
}

export interface LineHeightResult {
  /** Line height divided by font size, the value CSS line-height takes without a unit. */
  readonly unitless: number;
  readonly px: number;
  readonly rem: number;
  /** Present when the unitless value falls below the WCAG text-spacing minimum. */
  readonly wcagNote: string | null;
}

export interface BaselineLineHeight extends LineHeightResult {
  /** How many baseline rows the line height spans. */
  readonly multiples: number;
}

function wcagNoteFor(unitless: number): string | null {
  if (unitless >= WCAG_MIN_LINE_HEIGHT) return null;
  return `Below ${WCAG_MIN_LINE_HEIGHT}× the font size, the minimum WCAG 1.4.12 text spacing expects. Consider at least ${WCAG_MIN_LINE_HEIGHT}.`;
}

function build(px: number, fontSizePx: number, root: number): LineHeightResult {
  return {
    unitless: roundTo(px / fontSizePx),
    px: roundTo(px),
    rem: roundTo(px / root),
    wcagNote: wcagNoteFor(px / fontSizePx),
  };
}

export function fromRatio(
  fontSizePx: number,
  ratio: number,
  root: number = DEFAULT_ROOT_FONT_SIZE,
): LineHeightResult {
  assertPositive(fontSizePx, 'Font size');
  assertPositive(ratio, 'Line-height ratio');
  assertPositive(root, 'Root font size');
  return build(fontSizePx * ratio, fontSizePx, root);
}

/**
 * Snap the line height up to a whole number of baseline rows, at least the
 * requested minimum multiple of the font size (1.5 by default, per WCAG).
 */
export function fromBaseline(
  fontSizePx: number,
  baselinePx: number,
  root: number = DEFAULT_ROOT_FONT_SIZE,
  minimum: number = WCAG_MIN_LINE_HEIGHT,
): BaselineLineHeight {
  assertPositive(fontSizePx, 'Font size');
  assertPositive(baselinePx, 'Baseline');
  assertPositive(root, 'Root font size');
  assertPositive(minimum, 'Minimum multiple');

  const multiples = Math.max(1, Math.ceil((fontSizePx * minimum) / baselinePx));
  const px = multiples * baselinePx;
  return { ...build(px, fontSizePx, root), multiples };
}

export interface BaselineRow extends BaselineLineHeight {
  readonly fontSizePx: number;
}

export function baselineTable(
  fontSizesPx: readonly number[],
  baselinePx: number,
  root: number = DEFAULT_ROOT_FONT_SIZE,
): BaselineRow[] {
  assertPositive(baselinePx, 'Baseline');
  return fontSizesPx.map((fontSizePx) => ({
    ...fromBaseline(fontSizePx, baselinePx, root),
    fontSizePx,
  }));
}
