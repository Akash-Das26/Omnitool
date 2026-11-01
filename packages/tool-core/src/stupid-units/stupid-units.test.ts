import { describe, expect, it } from 'vitest';
import {
  convertToFunnyUnits,
  FUNNY_UNIT_CATEGORIES,
  FUNNY_UNITS,
  type FunnyConvertResult,
  formatFunnyAmount,
  funnyUnitsFor,
  STUPID_INPUT_UNITS,
  stupidInputUnitsFor,
} from './index';

function amount(result: FunnyConvertResult, id: string): number {
  if (!result.ok) throw new Error(result.error);
  const found = result.conversions.find((conversion) => conversion.unit.id === id);
  if (!found) throw new Error(`no conversion for ${id}`);
  return found.amount;
}

describe('the unit table', () => {
  it('has 20 to 30 units with a definition and a named source each', () => {
    expect(FUNNY_UNITS.length).toBeGreaterThanOrEqual(20);
    expect(FUNNY_UNITS.length).toBeLessThanOrEqual(30);
    for (const unit of FUNNY_UNITS) {
      expect(unit.name.length).toBeGreaterThan(2);
      expect(unit.plural.length, `${unit.id} has no plural`).toBeGreaterThan(2);
      expect(unit.plural).not.toBe(unit.name);
      expect(unit.definition.length, `${unit.id} has no definition`).toBeGreaterThan(10);
      expect(unit.source.length, `${unit.id} has no source`).toBeGreaterThan(10);
      expect(unit.si, `${unit.id} has no size`).toBeGreaterThan(0);
      expect(Number.isFinite(unit.si)).toBe(true);
    }
  });

  it('keeps ids unique and covers every category', () => {
    const ids = FUNNY_UNITS.map((unit) => unit.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const category of FUNNY_UNIT_CATEGORIES) {
      expect(funnyUnitsFor(category).length, `${category} is empty`).toBeGreaterThan(0);
      expect(stupidInputUnitsFor(category).length, `${category} has no input unit`).toBeGreaterThan(
        0,
      );
    }
  });

  it('marks measurements as approximate and definitions as exact', () => {
    const byId = new Map(FUNNY_UNITS.map((unit) => [unit.id, unit]));
    expect(byId.get('acre')?.exact).toBe(true);
    expect(byId.get('cricket-pitch')?.exact).toBe(true);
    expect(byId.get('eiffel-tower')?.exact).toBe(false);
    expect(byId.get('wales')?.exact).toBe(false);
    expect(byId.get('moon-distance')?.exact).toBe(false);
  });

  it('keeps every input unit inside its own category', () => {
    for (const unit of STUPID_INPUT_UNITS) {
      expect(FUNNY_UNIT_CATEGORIES).toContain(unit.category);
      expect(unit.si).toBeGreaterThan(0);
    }
  });
});

describe('conversions', () => {
  it('turns metres into football fields and cricket pitches', () => {
    const result = convertToFunnyUnits(100, 'metre');
    expect(amount(result, 'nfl-field')).toBeCloseTo(100 / 91.44, 10);
    expect(amount(result, 'cricket-pitch')).toBeCloseTo(100 / 20.12, 10);
    expect(amount(result, 'olympic-pool')).toBeCloseTo(2, 10);
  });

  it('converts areas and volumes', () => {
    expect(amount(convertToFunnyUnits(1, 'hectare'), 'football-pitch')).toBeCloseTo(
      10_000 / 7140,
      10,
    );
    expect(amount(convertToFunnyUnits(1, 'acre-input'), 'acre')).toBeCloseTo(1, 10);
    expect(amount(convertToFunnyUnits(1, 'litre'), 'us-cup')).toBeCloseTo(
      0.001 / 0.0002365882365,
      9,
    );
    expect(amount(convertToFunnyUnits(1, 'litre'), 'metric-teaspoon')).toBeCloseTo(200, 9);
  });

  it('converts masses and times', () => {
    expect(amount(convertToFunnyUnits(1, 'tonne-input'), 'stone')).toBeCloseTo(
      1000 / 6.35029318,
      8,
    );
    expect(amount(convertToFunnyUnits(1, 'hour'), 'warhol')).toBeCloseTo(4, 10);
    expect(amount(convertToFunnyUnits(1, 'day-input'), 'fortnight')).toBeCloseTo(1 / 14, 10);
    expect(amount(convertToFunnyUnits(1, 'day-input'), 'julian-year')).toBeCloseTo(
      86_400 / 31_557_600,
      10,
    );
  });

  it('sorts the list from smallest to largest amount', () => {
    const result = convertToFunnyUnits(1, 'metre');
    if (!result.ok) throw new Error(result.error);
    const amounts = result.conversions.map((conversion) => conversion.amount);
    expect([...amounts].sort((left, right) => left - right)).toEqual(amounts);
  });

  it('rejects unknown units and impossible amounts', () => {
    expect(convertToFunnyUnits(1, 'parsec')).toEqual({
      ok: false,
      error: 'Choose a unit to convert from.',
    });
    expect(convertToFunnyUnits(-1, 'metre')).toEqual({
      ok: false,
      error: 'Enter a number of zero or more.',
    });
    expect(convertToFunnyUnits(Number.NaN, 'metre')).toEqual({
      ok: false,
      error: 'Enter a number.',
    });
  });
});

describe('formatting', () => {
  it('uses three significant digits and groups thousands', () => {
    expect(formatFunnyAmount(0)).toBe('0');
    expect(formatFunnyAmount(1.2345)).toBe('1.23');
    expect(formatFunnyAmount(1234.5)).toBe('1,230');
    expect(formatFunnyAmount(384_400_000)).toBe('384,000,000');
    expect(formatFunnyAmount(0.001234)).toBe('0.00123');
    expect(formatFunnyAmount(0.0001234)).toBe('1.23 × 10^-4');
    expect(formatFunnyAmount(0.00001)).toBe('1.00 × 10^-5');
    expect(formatFunnyAmount(-1)).toBe('');
  });
});
