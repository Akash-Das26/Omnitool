import { describe, expect, it } from 'vitest';
import {
  buildRecipeTable,
  convertMeasure,
  findDensity,
  formatFraction,
  parseIngredientLine,
  type RecipeOptions,
  type RecipeRow,
  toCsv,
  toPlainText,
} from './index';

const BASE: RecipeOptions = { servings: 4, baseServings: 4, system: 'metric' };

function row(input: string, options: Partial<RecipeOptions> = {}): RecipeRow {
  const table = buildRecipeTable(input, { ...BASE, ...options });
  if (!table.ok) throw new Error(table.error);
  const first = table.rows[0];
  if (!first) throw new Error('the table has no rows');
  return first;
}

describe('parsing ingredient lines', () => {
  it('reads integers, decimals and vulgar fractions', () => {
    expect(parseIngredientLine('2 eggs')).toMatchObject({
      min: 2,
      max: 2,
      name: 'eggs',
      unit: 'count',
    });
    expect(parseIngredientLine('1.5 kg potatoes')).toMatchObject({
      min: 1.5,
      unit: 'kg',
      name: 'potatoes',
    });
    expect(parseIngredientLine('1/2 cup butter')).toMatchObject({
      min: 0.5,
      unit: 'cup',
      name: 'butter',
    });
    expect(parseIngredientLine('3/4 tsp salt')).toMatchObject({ min: 0.75, unit: 'tsp' });
    expect(parseIngredientLine('1 1/2 cups milk')).toMatchObject({
      min: 1.5,
      max: 1.5,
      unit: 'cup',
    });
    expect(parseIngredientLine('½ cup sugar')).toMatchObject({ min: 0.5, unit: 'cup' });
    expect(parseIngredientLine('1½ cups sugar')).toMatchObject({ min: 1.5, unit: 'cup' });
    expect(parseIngredientLine('⅓ cup cocoa')).toMatchObject({ min: 1 / 3, unit: 'cup' });
  });

  it('reads ranges and keeps both ends', () => {
    expect(parseIngredientLine('2-3 tbsp oil')).toMatchObject({ min: 2, max: 3, unit: 'tbsp' });
    expect(parseIngredientLine('2 to 3 tbsp oil')).toMatchObject({ min: 2, max: 3, unit: 'tbsp' });
    expect(parseIngredientLine('3–4 g salt')).toMatchObject({ min: 3, max: 4, unit: 'g' });
  });

  it('recognises every documented unit', () => {
    const cases: [string, string][] = [
      ['1 tsp salt', 'tsp'],
      ['1 tbsp oil', 'tbsp'],
      ['1 cup milk', 'cup'],
      ['1 fl oz vanilla', 'floz'],
      ['1 fl. oz. vanilla', 'floz'],
      ['250 ml water', 'ml'],
      ['1 l stock', 'l'],
      ['2 oz cheese', 'oz'],
      ['1 lb mince', 'lb'],
      ['100 g butter', 'g'],
      ['1 kg flour', 'kg'],
      ['1 pinch salt', 'pinch'],
      ['2 eggs', 'count'],
      ['3 cloves garlic', 'count'],
    ];
    for (const [line, unit] of cases) {
      expect(parseIngredientLine(line).unit, line).toBe(unit);
    }
  });

  it('reads an article as one and strips the word of', () => {
    expect(parseIngredientLine('a pinch of salt')).toMatchObject({
      recognised: true,
      min: 1,
      unit: 'pinch',
      name: 'salt',
    });
  });

  it('flags lines it cannot read instead of guessing', () => {
    expect(parseIngredientLine('Salt to taste').recognised).toBe(false);
    expect(parseIngredientLine('one cup flour').recognised).toBe(false);
    expect(parseIngredientLine('1/0 cup flour').recognised).toBe(false);
    expect(parseIngredientLine('').recognised).toBe(false);
    expect(parseIngredientLine('2 cup').reason).toBe('No ingredient name after the amount.');
  });

  it('passes flagged lines through unchanged', () => {
    const result = row('Salt to taste');
    expect(result.quantity).toBeNull();
    expect(result.name).toBe('Salt to taste');
    expect(result.flagged).toContain('No amount at the start');
  });
});

describe('scaling and converting', () => {
  it('scales by the servings ratio', () => {
    expect(row('2 cups flour', { servings: 8 }).quantity).toBe('roughly 500');
    expect(row('1 tsp vanilla', { servings: 8, system: 'us' }).quantity).toBe('2');
    expect(row('2 eggs', { servings: 2 }).quantity).toBe('1');
    expect(row('3 eggs', { servings: 2 }).quantity).toBe('1 1/2');
    expect(row('2-3 tbsp water', { system: 'us' }).quantity).toBe('2–3');
    expect(row('1-2 cups water', { servings: 8, system: 'us' }).quantity).toBe('2–4');
    // Salt has a USDA cup weight, so it comes out in grams rather than teaspoons.
    expect(row('1 tsp salt', { servings: 8, system: 'us' })).toMatchObject({
      quantity: 'roughly 12',
      unit: 'g',
    });
  });

  it('converts volumes and weights to the chosen system', () => {
    expect(row('1 cup milk', { system: 'metric' }).quantity).toBe('roughly 244');
    expect(row('1 cup milk', { system: 'us' }).quantity).toBe('roughly 8 5/8');
    expect(row('250 ml water', { system: 'us' }).quantity).toBe('1');
    expect(row('500 g potatoes', { system: 'metric' }).quantity).toBe('500');
    expect(row('1 lb butter', { system: 'metric' }).quantity).toBe('454');
    expect(row('2 l stock', { system: 'metric' }).quantity).toBe('2');
  });

  it('uses the USDA cup weight for known ingredients, and only those', () => {
    const flour = row('1 cup flour');
    expect(flour.quantity).toBe('roughly 125');
    expect(flour.unit).toBe('g');
    expect(flour.note).toContain('USDA FoodData Central 168894');
    expect(flour.note).toContain('was 1 cup');

    const unlisted = row('1 cup brown sugar');
    expect(unlisted.quantity).toBe('237');
    expect(unlisted.unit).toBe('ml');
    expect(unlisted.note).toBeNull();

    expect(findDensity('plain flour')?.fdcId).toBe(168894);
    expect(findDensity('almond flour')).toBeUndefined();
    expect(findDensity('whole milk')?.gramsPerCup).toBe(244);
    expect(findDensity('yoghurt')?.gramsPerCup).toBe(245);
    expect(findDensity('olive oil')).toBeUndefined();
  });

  it('keeps volume when the ingredient has no density and no match exists', () => {
    expect(row('2 cups stock').unit).toBe('ml');
  });

  it('rejects impossible serving counts', () => {
    expect(buildRecipeTable('1 cup flour', { ...BASE, baseServings: 0 })).toEqual({
      ok: false,
      error: 'Base servings must be more than zero.',
    });
    expect(buildRecipeTable('1 cup flour', { ...BASE, servings: -1 })).toEqual({
      ok: false,
      error: 'Servings must be zero or more.',
    });
  });

  it('rejects servings that are not finite numbers', () => {
    expect(buildRecipeTable('1 cup flour', { ...BASE, servings: Number.NaN })).toEqual({
      ok: false,
      error: 'Enter servings as numbers.',
    });
    expect(
      buildRecipeTable('1 cup flour', { ...BASE, baseServings: Number.POSITIVE_INFINITY }),
    ).toEqual({
      ok: false,
      error: 'Enter servings as numbers.',
    });
  });

  it('names the original unit in the note for weight and volume inputs', () => {
    expect(row('2 fl oz syrup', { system: 'metric' }).note).toContain('was 2 fl oz');
    expect(row('1 l stock', { system: 'metric' }).note).toContain('was 1 l');
    expect(row('250 ml water', { system: 'metric' }).note).toContain('was 250 ml');
    expect(row('1 kg sugar', { system: 'us' }).note).toContain('was 1 kg');
    expect(row('500 g potatoes', { system: 'us' }).note).toContain('was 500 g');
    expect(row('2 eggs', { system: 'metric' }).note).toContain('was 2');
    expect(row('3 pinches salt', { system: 'metric' }).note).toContain('was 3 pinch');
  });

  it('reads a heavy weight in pounds rather than ounces', () => {
    // At one pound the ounce ceiling gives way, so 1 lb stays 1 lb, not 16 oz.
    expect(row('1 lb flour', { system: 'us' }).quantity).toBe('1');
    expect(row('2 lb flour', { servings: 8, system: 'us' }).quantity).toBe('4');
    expect(row('4 lb flour', { servings: 2, system: 'us' }).quantity).toBe('2');
  });

  it('counts the flagged lines', () => {
    const table = buildRecipeTable('2 eggs\nSalt to taste\npepper', BASE);
    if (!table.ok) throw new Error(table.error);
    expect(table.rows).toHaveLength(3);
    expect(table.flagged).toBe(2);
  });
});

describe('kitchen rounding', () => {
  it('formats to the nearest eighth', () => {
    expect(formatFraction(0.125)).toBe('1/8');
    expect(formatFraction(0.5)).toBe('1/2');
    expect(formatFraction(1.25)).toBe('1 1/4');
    expect(formatFraction(2)).toBe('2');
    expect(formatFraction(0)).toBe('0');
    expect(formatFraction(2.4)).toBe('2 3/8');
  });
});

describe('round trips', () => {
  it('converts between units of the same kind without drifting', () => {
    const ml = convertMeasure(1, 'cup', 'ml');
    expect(ml).toBeCloseTo(236.5882365, 8);
    expect(convertMeasure(ml as number, 'ml', 'cup')).toBeCloseTo(1, 10);

    expect(convertMeasure(1, 'tbsp', 'tsp')).toBeCloseTo(3, 10);
    expect(convertMeasure(1, 'lb', 'oz')).toBeCloseTo(16, 10);
    expect(convertMeasure(1, 'kg', 'g')).toBeCloseTo(1000, 10);

    const there = convertMeasure(7.5, 'oz', 'g') as number;
    expect(convertMeasure(there, 'g', 'oz')).toBeCloseTo(7.5, 10);
  });

  it('refuses to convert across kinds', () => {
    expect(convertMeasure(1, 'cup', 'g')).toBeNull();
    expect(convertMeasure(1, 'lb', 'ml')).toBeNull();
  });
});

describe('exports', () => {
  const table = buildRecipeTable('2 cups flour\n1 tsp salt, fine\nSalt to taste', BASE);
  if (!table.ok) throw new Error(table.error);

  it('writes CSV with escaped cells and a header', () => {
    const csv = toCsv(table.rows);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Ingredient,Quantity,Unit,Note');
    expect(csv).toContain('"salt, fine"');
    expect(csv).toContain('Salt to taste');
    expect(csv).toContain('168894');
    expect(lines).toHaveLength(4);
  });

  it('writes a plain-text table that names the servings and system', () => {
    const text = toPlainText(table.rows, { servings: 4, system: 'metric' });
    expect(text.split('\n')[0]).toBe('Recipe for 4 servings (metric)');
    expect(text).toContain('roughly 250 g flour');
    expect(text).toContain('not scaled');
  });
});
