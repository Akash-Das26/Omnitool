export const DEFAULT_ROOT_FONT_SIZE = 16;

export const COMMON_PX_VALUES: readonly number[] = [
  1, 2, 4, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96,
];

export class LengthConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LengthConversionError';
  }
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new LengthConversionError(`${label} must be a number greater than zero`);
  }
}

export function roundTo(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function pxToRem(px: number, root: number = DEFAULT_ROOT_FONT_SIZE): number {
  if (!Number.isFinite(px)) throw new LengthConversionError('Enter a number of pixels');
  assertPositive(root, 'Root font size');
  return roundTo(px / root);
}

export function remToPx(rem: number, root: number = DEFAULT_ROOT_FONT_SIZE): number {
  if (!Number.isFinite(rem)) throw new LengthConversionError('Enter a number of rem units');
  assertPositive(root, 'Root font size');
  return roundTo(rem * root);
}

export interface ConversionRow {
  readonly px: number;
  readonly rem: number;
}

export function conversionTable(
  root: number = DEFAULT_ROOT_FONT_SIZE,
  values: readonly number[] = COMMON_PX_VALUES,
): ConversionRow[] {
  assertPositive(root, 'Root font size');
  return values.map((px) => ({ px, rem: pxToRem(px, root) }));
}
