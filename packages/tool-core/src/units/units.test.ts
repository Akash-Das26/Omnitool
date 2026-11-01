import { describe, expect, it } from 'vitest';
import {
  convert,
  convertAll,
  getCategory,
  getUnit,
  UNIT_CATEGORIES,
  UnitConversionError,
} from './index';

describe('UNIT_CATEGORIES', () => {
  it('offers eleven categories with unique ids and units', () => {
    expect(UNIT_CATEGORIES).toHaveLength(11);
    const categoryIds = UNIT_CATEGORIES.map((category) => category.id);
    expect(new Set(categoryIds).size).toBe(categoryIds.length);

    for (const category of UNIT_CATEGORIES) {
      const unitIds = category.units.map((unit) => unit.id);
      expect(new Set(unitIds).size, category.id).toBe(unitIds.length);
      expect(unitIds, category.id).toContain(category.defaultFrom);
      expect(unitIds, category.id).toContain(category.defaultTo);
      for (const unit of category.units) {
        expect(unit.factor, `${category.id}/${unit.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('convert', () => {
  it('converts length with exact factors', () => {
    expect(convert(1, 'length', 'km', 'm')).toBe(1000);
    expect(convert(1, 'length', 'in', 'mm')).toBe(25.4);
    expect(convert(1, 'length', 'mi', 'm')).toBe(1609.344);
    expect(convert(100, 'length', 'cm', 'm')).toBe(1);
  });

  it('converts mass', () => {
    expect(convert(1, 'mass', 'lb', 'kg', 8)).toBe(0.45359237);
    expect(convert(1, 'mass', 'lb', 'kg')).toBe(0.453592);
    expect(convert(16, 'mass', 'oz', 'lb')).toBe(1);
    expect(convert(1, 'mass', 't', 'kg')).toBe(1000);
  });

  it('handles temperature offsets in both directions', () => {
    expect(convert(0, 'temperature', 'c', 'f')).toBe(32);
    expect(convert(100, 'temperature', 'c', 'f')).toBe(212);
    expect(convert(32, 'temperature', 'f', 'c')).toBe(0);
    expect(convert(0, 'temperature', 'k', 'c')).toBe(-273.15);
    expect(convert(-40, 'temperature', 'c', 'f')).toBe(-40);
    expect(convert(491.67, 'temperature', 'r', 'f')).toBe(32);
  });

  it('round-trips every temperature pair', () => {
    for (const from of ['c', 'f', 'k', 'r']) {
      for (const to of ['c', 'f', 'k', 'r']) {
        const there = convert(37, 'temperature', from, to, 10);
        expect(convert(there, 'temperature', to, from, 10)).toBeCloseTo(37, 8);
      }
    }
  });

  it('converts data with decimal and binary prefixes', () => {
    expect(convert(1, 'data', 'gb', 'mb')).toBe(1000);
    expect(convert(1, 'data', 'gib', 'mib')).toBe(1024);
    expect(convert(8, 'data', 'bit', 'b')).toBe(1);
  });

  it('converts across the other categories', () => {
    expect(convert(1, 'area', 'ha', 'm2')).toBe(10000);
    expect(convert(1, 'area', 'acre', 'm2')).toBeCloseTo(4046.8564224, 6);
    expect(convert(1, 'volume', 'gal', 'l', 9)).toBeCloseTo(3.785411784, 9);
    expect(convert(100, 'speed', 'kmh', 'mph')).toBeCloseTo(62.1371, 3);
    expect(convert(1, 'speed', 'kn', 'kmh')).toBeCloseTo(1.852, 6);
    expect(convert(1, 'time', 'd', 's')).toBe(86400);
    expect(convert(1, 'angle', 'turn', 'deg')).toBe(360);
    expect(convert(180, 'angle', 'deg', 'rad')).toBeCloseTo(Math.PI, 6);
    expect(convert(1, 'pressure', 'atm', 'pa')).toBe(101325);
    expect(convert(1, 'pressure', 'psi', 'pa')).toBeCloseTo(6894.757293168, 6);
    expect(convert(1, 'energy', 'kwh', 'j')).toBe(3600000);
    expect(convert(1, 'energy', 'kcal', 'j')).toBe(4184);
  });

  it('rounds to the requested precision', () => {
    expect(convert(1, 'length', 'm', 'ft', 3)).toBe(3.281);
    expect(convert(1, 'length', 'm', 'ft', 0)).toBe(3);
    expect(convert(1, 'length', 'm', 'ft')).toBe(3.28084);
  });

  it('rejects unknown categories and units', () => {
    expect(() => convert(1, 'nope', 'm', 'ft')).toThrow(UnitConversionError);
    expect(() => convert(1, 'length', 'nope', 'ft')).toThrow('Unknown unit');
    expect(() => convert(1, 'length', 'm', 'nope')).toThrow('Unknown unit');
  });

  it('rejects values that are not finite numbers', () => {
    expect(() => convert(Number.NaN, 'length', 'm', 'ft')).toThrow('Enter a number');
    expect(() => convert(Number.POSITIVE_INFINITY, 'length', 'm', 'ft')).toThrow('Enter a number');
  });
});

describe('getCategory and getUnit', () => {
  it('finds a category and its units', () => {
    expect(getCategory('length').name).toBe('Length');
    expect(getUnit('length', 'm').symbol).toBe('m');
    expect(() => getCategory('length').units.find(() => false)).not.toThrow();
  });

  it('reports the category and unit in error messages', () => {
    expect(() => getCategory('volume')).not.toThrow();
    expect(() => getCategory('weight')).toThrow('Unknown category: weight');
  });
});

describe('convertAll', () => {
  it('returns one row per unit in the category', () => {
    const rows = convertAll(1, 'length', 'm');
    expect(rows).toHaveLength(getCategory('length').units.length);
    expect(rows.find((row) => row.unit.id === 'km')?.value).toBe(0.001);
    expect(rows.find((row) => row.unit.id === 'cm')?.value).toBe(100);
  });

  it('honours the precision', () => {
    const rows = convertAll(1, 'length', 'm', 2);
    expect(rows.find((row) => row.unit.id === 'ft')?.value).toBe(3.28);
  });
});
