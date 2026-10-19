import { describe, expect, it } from 'vitest';
import { TYPE_SCALE_PRESETS, TypeScaleError, typeScale, typeScaleCss } from './index';

describe('TYPE_SCALE_PRESETS', () => {
  it('lists named ratios above 1 with unique ids', () => {
    expect(TYPE_SCALE_PRESETS.length).toBeGreaterThanOrEqual(6);
    for (const preset of TYPE_SCALE_PRESETS) {
      expect(preset.ratio).toBeGreaterThan(1);
      expect(preset.id).toMatch(/^[a-z-]+$/);
    }
    const ids = TYPE_SCALE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TYPE_SCALE_PRESETS.map((preset) => preset.id)).toContain('major-third');
  });
});

describe('typeScale', () => {
  it('builds steps up and down from the base size', () => {
    const steps = typeScale({ basePx: 16, ratio: 1.25, stepsDown: 1, stepsUp: 2 });
    expect(steps.map((step) => step.step)).toEqual([-1, 0, 1, 2]);
    expect(steps.map((step) => step.px)).toEqual([12.8, 16, 20, 25]);
    expect(steps.map((step) => step.rem)).toEqual([0.8, 1, 1.25, 1.5625]);
  });

  it('names each step for CSS', () => {
    const steps = typeScale({ basePx: 16, ratio: 1.5, stepsDown: 2, stepsUp: 1 });
    expect(steps.map((step) => step.customProperty)).toEqual([
      '--text-minus-2',
      '--text-minus-1',
      '--text-0',
      '--text-1',
    ]);
  });

  it('follows a custom root size for rem values', () => {
    const [base] = typeScale({ basePx: 16, ratio: 1.5, stepsDown: 0, stepsUp: 0, root: 10 });
    expect(base?.px).toBe(16);
    expect(base?.rem).toBe(1.6);
  });

  it('rounds pixels and rem to three and four places', () => {
    const steps = typeScale({ basePx: 16, ratio: 1.333, stepsDown: 0, stepsUp: 2 });
    expect(steps[1]?.px).toBe(21.328);
    expect(steps[2]?.px).toBe(28.43);
    expect(steps[2]?.rem).toBe(1.7769);
  });

  it('supports a scale with no steps below the base', () => {
    const steps = typeScale({ basePx: 16, ratio: 1.2, stepsDown: 0, stepsUp: 1 });
    expect(steps).toHaveLength(2);
    expect(steps[0]?.step).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => typeScale({ basePx: 0, ratio: 1.25 })).toThrow(TypeScaleError);
    expect(() => typeScale({ basePx: 16, ratio: 1 })).toThrow('greater than one');
    expect(() => typeScale({ basePx: 16, ratio: 1.25, stepsUp: -1 })).toThrow(TypeScaleError);
    expect(() => typeScale({ basePx: 16, ratio: 1.25, stepsUp: 1.5 })).toThrow(TypeScaleError);
    expect(() => typeScale({ basePx: 16, ratio: 1.25, stepsUp: 25 })).toThrow('too many steps');
    expect(() => typeScale({ basePx: 16, ratio: 1.25, root: 0 })).toThrow(TypeScaleError);
  });
});

describe('typeScaleCss', () => {
  it('writes custom properties inside a root block', () => {
    const css = typeScaleCss(typeScale({ basePx: 16, ratio: 1.5, stepsDown: 1, stepsUp: 1 }));
    expect(css).toContain(':root {');
    expect(css).toContain('--text-minus-1: 0.6667rem; /* 10.667px */');
    expect(css).toContain('--text-0: 1rem; /* 16px */');
    expect(css).toContain('--text-1: 1.5rem; /* 24px */');
    expect(css.trimEnd().endsWith('}')).toBe(true);
  });

  it('rejects an empty scale', () => {
    expect(() => typeScaleCss([])).toThrow(TypeScaleError);
  });
});
