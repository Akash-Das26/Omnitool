import { roundTo } from '../number/index';
import { DEFAULT_ROOT_FONT_SIZE } from '../px/index';

export const MAX_STEPS = 16;

export class TypeScaleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TypeScaleError';
  }
}

export interface TypeScalePreset {
  readonly id: string;
  readonly name: string;
  readonly ratio: number;
}

// √2, which is the augmented fourth; rounded so the ratio reads cleanly in CSS.
const AUGMENTED_FOURTH = Number(Math.SQRT2.toFixed(3));

export const TYPE_SCALE_PRESETS: readonly TypeScalePreset[] = [
  { id: 'minor-second', name: 'Minor second', ratio: 1.067 },
  { id: 'major-second', name: 'Major second', ratio: 1.125 },
  { id: 'minor-third', name: 'Minor third', ratio: 1.2 },
  { id: 'major-third', name: 'Major third', ratio: 1.25 },
  { id: 'perfect-fourth', name: 'Perfect fourth', ratio: 1.333 },
  { id: 'augmented-fourth', name: 'Augmented fourth', ratio: AUGMENTED_FOURTH },
  { id: 'perfect-fifth', name: 'Perfect fifth', ratio: 1.5 },
  { id: 'golden-ratio', name: 'Golden ratio', ratio: 1.618 },
];

export interface TypeScaleInput {
  readonly basePx: number;
  readonly ratio: number;
  readonly stepsDown?: number;
  readonly stepsUp?: number;
  readonly root?: number;
}

export interface TypeScaleStep {
  /** Position relative to the base size: -2, -1, 0, 1 and so on. */
  readonly step: number;
  readonly px: number;
  readonly rem: number;
  readonly customProperty: string;
}

function assertSteps(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeScaleError(`${label} must be a whole number of steps`);
  }
}

export function typeScale({
  basePx,
  ratio,
  stepsDown = 2,
  stepsUp = 6,
  root = DEFAULT_ROOT_FONT_SIZE,
}: TypeScaleInput): TypeScaleStep[] {
  if (!Number.isFinite(basePx) || basePx <= 0) {
    throw new TypeScaleError('Base size must be a number greater than zero');
  }
  if (!Number.isFinite(ratio) || ratio <= 1) {
    throw new TypeScaleError('The scale ratio must be greater than one');
  }
  if (!Number.isFinite(root) || root <= 0) {
    throw new TypeScaleError('Root font size must be a number greater than zero');
  }
  assertSteps(stepsDown, 'Steps below the base');
  assertSteps(stepsUp, 'Steps above the base');
  if (stepsDown + stepsUp + 1 > MAX_STEPS) {
    throw new TypeScaleError(`That is too many steps; keep the scale to ${MAX_STEPS} sizes`);
  }

  const steps: TypeScaleStep[] = [];
  const firstStep = stepsDown === 0 ? 0 : -stepsDown;
  for (let step = firstStep; step <= stepsUp; step += 1) {
    const rawPx = basePx * ratio ** step;
    steps.push({
      step,
      px: roundTo(rawPx, 3),
      rem: roundTo(rawPx / root, 4),
      customProperty:
        step < 0 ? `--text-minus-${-step}` : step === 0 ? '--text-0' : `--text-${step}`,
    });
  }
  return steps;
}

/** A `:root` block of custom properties, with the pixel value in a comment. */
export function typeScaleCss(steps: readonly TypeScaleStep[]): string {
  if (steps.length === 0) throw new TypeScaleError('There are no steps to write');

  const lines = steps.map((step) => `  ${step.customProperty}: ${step.rem}rem; /* ${step.px}px */`);
  return `:root {\n${lines.join('\n')}\n}\n`;
}
