/**
 * Recipe table: parse an ingredient list, scale it by servings, and convert
 * between metric and US customary.
 *
 * Volume-to-weight uses a short density table taken from USDA FoodData Central
 * (public domain). Every row there is the USDA household measure of one US cup,
 * fetched from the FDC API for the food id in the comment, and treated as
 * approximate: a cup of flour depends on how it was scooped. Ingredients whose
 * cup weight could not be confirmed were left out, and those ingredients simply
 * stay in volume.
 */

export type UnitId =
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'floz'
  | 'ml'
  | 'l'
  | 'pinch'
  | 'oz'
  | 'lb'
  | 'g'
  | 'kg'
  | 'count';

export type UnitKind = 'volume' | 'mass' | 'count';
export type UnitSystem = 'metric' | 'us';

interface UnitDefinition {
  readonly id: UnitId;
  readonly label: string;
  readonly plural: string;
  readonly kind: UnitKind;
  /** Size in millilitres, grams or items. */
  readonly base: number;
  readonly aliases: readonly string[];
}

/** US customary definitions: 1 US gallon = 231 in³ = 3.785411784 L (NIST HB 44). */
const US_CUP_ML = 236.5882365;
const US_FL_OZ_ML = US_CUP_ML / 8;
const US_TBSP_ML = US_FL_OZ_ML / 2;
const US_TSP_ML = US_TBSP_ML / 3;

const UNITS: readonly UnitDefinition[] = [
  {
    id: 'tsp',
    label: 'tsp',
    plural: 'tsp',
    kind: 'volume',
    base: US_TSP_ML,
    aliases: ['teaspoons', 'teaspoon', 'tsps', 'tsp'],
  },
  {
    id: 'tbsp',
    label: 'tbsp',
    plural: 'tbsp',
    kind: 'volume',
    base: US_TBSP_ML,
    aliases: ['tablespoons', 'tablespoon', 'tbsps', 'tbsp', 'tbs'],
  },
  {
    id: 'cup',
    label: 'cup',
    plural: 'cups',
    kind: 'volume',
    base: US_CUP_ML,
    aliases: ['cups', 'cup'],
  },
  {
    id: 'floz',
    label: 'fl oz',
    plural: 'fl oz',
    kind: 'volume',
    base: US_FL_OZ_ML,
    aliases: ['fluid ounces', 'fluid ounce', 'fl. oz.', 'fl oz', 'floz'],
  },
  {
    id: 'ml',
    label: 'ml',
    plural: 'ml',
    kind: 'volume',
    base: 1,
    aliases: ['millilitres', 'millilitre', 'milliliters', 'milliliter', 'ml'],
  },
  {
    id: 'l',
    label: 'l',
    plural: 'l',
    kind: 'volume',
    base: 1000,
    aliases: ['litres', 'litre', 'liters', 'liter', 'l'],
  },
  {
    id: 'pinch',
    label: 'pinch',
    plural: 'pinches',
    kind: 'volume',
    // A conventional pinch is 1/16 teaspoon.
    base: US_TSP_ML / 16,
    aliases: ['pinches', 'pinch'],
  },
  {
    id: 'oz',
    label: 'oz',
    plural: 'oz',
    kind: 'mass',
    base: 28.349523125,
    aliases: ['ounces', 'ounce', 'oz'],
  },
  {
    id: 'lb',
    label: 'lb',
    plural: 'lb',
    kind: 'mass',
    base: 453.59237,
    aliases: ['pounds', 'pound', 'lbs', 'lb'],
  },
  {
    id: 'g',
    label: 'g',
    plural: 'g',
    kind: 'mass',
    base: 1,
    aliases: ['grams', 'gram', 'g'],
  },
  {
    id: 'kg',
    label: 'kg',
    plural: 'kg',
    kind: 'mass',
    base: 1000,
    aliases: ['kilograms', 'kilogram', 'kgs', 'kg'],
  },
  {
    id: 'count',
    label: '',
    plural: '',
    kind: 'count',
    base: 1,
    aliases: [],
  },
];

const UNITS_BY_ID = new Map(UNITS.map((unit) => [unit.id, unit]));

/** Longest alias first, so "fl oz" wins over "oz" and "tbsp" over "tbsp". */
const UNIT_ALIASES: readonly { alias: string; unit: UnitDefinition }[] = UNITS.flatMap((unit) =>
  unit.aliases.map((alias) => ({ alias, unit })),
).sort((left, right) => right.alias.length - left.alias.length);

const UNICODE_FRACTIONS: Readonly<Record<string, number>> = {
  '¼': 1 / 4,
  '½': 1 / 2,
  '¾': 3 / 4,
  '⅐': 1 / 7,
  '⅑': 1 / 9,
  '⅒': 1 / 10,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
};

export interface ParsedLine {
  readonly raw: string;
  readonly recognised: boolean;
  readonly reason: string | null;
  readonly name: string;
  readonly unit: UnitId | null;
  /** Scaled range bounds; equal when the line had a single amount. */
  readonly min: number | null;
  readonly max: number | null;
}

function parseQuantity(text: string): { min: number; max: number; rest: string } | null {
  const input = text.trimStart();

  const range = /^(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)(?=\s|$)/i.exec(input);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min: Math.min(min, max), max: Math.max(min, max), rest: input.slice(range[0].length) };
  }

  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)/.exec(input);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    const value = Number(mixed[1]) + Number(mixed[2]) / denominator;
    return { min: value, max: value, rest: input.slice(mixed[0].length) };
  }

  const fraction = /^(\d+)\s*\/\s*(\d+)/.exec(input);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    const value = Number(fraction[1]) / denominator;
    return { min: value, max: value, rest: input.slice(fraction[0].length) };
  }

  const decimal = /^\d+(?:\.\d+)?/.exec(input);
  if (decimal) {
    let value = Number(decimal[0]);
    let rest = input.slice(decimal[0].length);
    // 1½: a decimal followed directly by a vulgar fraction.
    const next = rest.trimStart().charAt(0);
    const fractionValue = UNICODE_FRACTIONS[next];
    if (fractionValue !== undefined) {
      value += fractionValue;
      rest = rest.trimStart().slice(1);
    }
    return { min: value, max: value, rest };
  }

  const unicode = input.charAt(0);
  const unicodeValue = UNICODE_FRACTIONS[unicode];
  if (unicodeValue !== undefined) {
    return { min: unicodeValue, max: unicodeValue, rest: input.slice(1) };
  }

  return null;
}

function matchUnit(text: string): { unit: UnitDefinition; rest: string } | null {
  const input = text.trimStart();
  const lower = input.toLowerCase();
  for (const { alias, unit } of UNIT_ALIASES) {
    if (!lower.startsWith(alias)) continue;
    const after = lower.slice(alias.length);
    // The alias must end at a word boundary and not run into another word.
    if (after !== '' && !/^[\s.,;)]/.test(after)) continue;
    return { unit, rest: input.slice(alias.length) };
  }
  return null;
}

export function parseIngredientLine(line: string): ParsedLine {
  const raw = line;
  const text = line.trim();
  const empty: ParsedLine = {
    raw,
    recognised: false,
    reason: 'Nothing on this line.',
    name: '',
    unit: null,
    min: null,
    max: null,
  };
  if (text === '') return empty;

  let body = text;
  let quantity = parseQuantity(body);

  // "a pinch of salt": the article stands in for one.
  if (!quantity) {
    const article = /^(?:a|an)\s+/i.exec(body);
    if (article) {
      const candidate = matchUnit(body.slice(article[0].length));
      if (candidate) {
        quantity = { min: 1, max: 1, rest: body.slice(article[0].length) };
        body = body.slice(article[0].length);
      }
    }
  }

  if (!quantity) {
    return {
      ...empty,
      reason: 'No amount at the start, so the line was left as written.',
    };
  }

  const unitMatch = matchUnit(quantity.rest);
  const unit = unitMatch?.unit ?? (UNITS_BY_ID.get('count') as UnitDefinition);
  let rest = unitMatch ? unitMatch.rest : quantity.rest;
  rest = rest.replace(/^\s*(?:of\s+)?/i, '').trim();

  if (rest === '') {
    return {
      ...empty,
      reason: 'No ingredient name after the amount.',
      unit: unit.id,
      min: quantity.min,
      max: quantity.max,
    };
  }

  return {
    raw,
    recognised: true,
    reason: null,
    name: rest,
    unit: unit.id,
    min: quantity.min,
    max: quantity.max,
  };
}

/**
 * USDA FoodData Central household measures: grams in one US cup, with the FDC
 * food id. All are approximate in a kitchen because packing changes the weight.
 */
export interface DensityEntry {
  readonly name: string;
  readonly gramsPerCup: number;
  readonly fdcId: number;
  readonly usdaDescription: string;
  /** Words that must not appear in the ingredient name for this match to apply. */
  readonly exclude: readonly string[];
}

export const DENSITIES: readonly DensityEntry[] = [
  {
    name: 'flour',
    gramsPerCup: 125,
    fdcId: 168894,
    usdaDescription: 'Wheat flour, white, all-purpose, enriched, bleached',
    exclude: ['almond', 'rice', 'coconut', 'corn', 'chickpea'],
  },
  {
    name: 'granulated sugar',
    gramsPerCup: 200,
    fdcId: 169655,
    usdaDescription: 'Sugars, granulated',
    exclude: ['brown', 'icing', 'powdered', 'confectioners', 'caster'],
  },
  {
    name: 'butter',
    gramsPerCup: 227,
    fdcId: 173410,
    usdaDescription: 'Butter, salted',
    exclude: ['peanut', 'almond', 'cocoa', 'buttermilk'],
  },
  {
    name: 'whole milk',
    gramsPerCup: 244,
    fdcId: 171265,
    usdaDescription: 'Milk, whole, 3.25% milkfat, with added vitamin D',
    exclude: ['coconut', 'almond', 'soy', 'oat', 'buttermilk', 'condensed', 'evaporated'],
  },
  {
    name: 'rice',
    gramsPerCup: 185,
    fdcId: 168877,
    usdaDescription: 'Rice, white, long-grain, regular, raw, enriched',
    exclude: ['cooked', 'brown', 'wild', 'flour', 'milk', 'vinegar'],
  },
  {
    name: 'cocoa powder',
    gramsPerCup: 86,
    fdcId: 169593,
    usdaDescription: 'Cocoa, dry powder, unsweetened',
    exclude: ['drink', 'mix', 'butter'],
  },
  {
    name: 'vegetable oil',
    gramsPerCup: 218,
    fdcId: 172370,
    usdaDescription: 'Oil, vegetable, soybean, refined',
    exclude: ['olive', 'coconut', 'sesame', 'peanut'],
  },
  {
    name: 'yogurt',
    gramsPerCup: 245,
    fdcId: 171284,
    usdaDescription: 'Yogurt, plain, whole milk',
    exclude: ['frozen', 'drink'],
  },
  {
    name: 'almonds',
    gramsPerCup: 143,
    fdcId: 170567,
    usdaDescription: 'Nuts, almonds',
    exclude: ['milk', 'flour', 'butter', 'paste'],
  },
  {
    name: 'breadcrumbs',
    gramsPerCup: 108,
    fdcId: 174928,
    usdaDescription: 'Bread, crumbs, dry, grated, plain',
    exclude: ['fresh', 'panko'],
  },
  {
    name: 'salt',
    gramsPerCup: 292,
    fdcId: 173468,
    usdaDescription: 'Salt, table',
    exclude: ['kosher', 'sea', 'flake', 'rock'],
  },
];

export function findDensity(ingredient: string): DensityEntry | undefined {
  const lower = ingredient.toLowerCase();
  const words = lower.replace(/[^a-z\s]/g, ' ').split(/\s+/);
  return DENSITIES.find((entry) => {
    if (entry.exclude.some((word) => words.includes(word))) return false;
    // "yoghurt" is the British spelling of the same food.
    if (entry.name === 'yogurt' && words.includes('yoghurt')) return true;
    const key = entry.name.split(' ')[0] as string;
    if (key === 'granulated') return words.includes('sugar');
    if (key === 'whole') return words.includes('milk');
    if (key === 'vegetable') return words.includes('oil');
    if (key === 'cocoa') return words.includes('cocoa');
    return words.includes(key);
  });
}

/** Round to the nearest eighth; kitchen measures are not more precise than that. */
export function roundToEighth(value: number): number {
  return Math.round(value * 8) / 8;
}

const EIGHTHS = ['', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'] as const;

export function formatFraction(value: number): string {
  const eighths = Math.round(value * 8);
  const whole = Math.floor(eighths / 8);
  const remainder = eighths % 8;
  const fraction = EIGHTHS[remainder];
  if (!fraction) return String(whole);
  return whole === 0 ? fraction : `${whole} ${fraction}`;
}

function formatDecimal(value: number, decimals: number): string {
  return value
    .toFixed(decimals)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

interface QuantityText {
  readonly amount: string;
  readonly unit: string;
  readonly roughly: boolean;
}

function formatVolume(ml: number, system: UnitSystem): QuantityText {
  if (system === 'metric') {
    if (ml >= 1000) return { amount: formatDecimal(ml / 1000, 2), unit: 'l', roughly: false };
    return { amount: formatDecimal(ml, 0), unit: 'ml', roughly: false };
  }
  if (ml < US_TBSP_ML)
    return { amount: formatFraction(ml / US_TSP_ML), unit: 'tsp', roughly: false };
  if (ml < US_CUP_ML / 4)
    return { amount: formatFraction(ml / US_TBSP_ML), unit: 'tbsp', roughly: false };
  return { amount: formatFraction(ml / US_CUP_ML), unit: 'cups', roughly: false };
}

function formatMass(grams: number, system: UnitSystem): QuantityText {
  if (system === 'metric') {
    if (grams >= 1000)
      return { amount: formatDecimal(grams / 1000, 2), unit: 'kg', roughly: false };
    return { amount: String(Math.round(grams)), unit: 'g', roughly: false };
  }
  // Under an ounce, grams read better than fractions of an ounce.
  if (grams < 28.349523125) return { amount: String(Math.round(grams)), unit: 'g', roughly: false };
  if (grams < 454)
    return { amount: formatFraction(grams / 28.349523125), unit: 'oz', roughly: false };
  return { amount: formatFraction(grams / 453.59237), unit: 'lb', roughly: false };
}

/** The amount as the recipe wrote it, in its own unit, for the note. */
function formatOriginal(value: number, unit: UnitDefinition): string {
  if (unit.id === 'count') return formatFraction(value);
  if (unit.id === 'cup') return `${formatFraction(value)} ${value > 1 ? 'cups' : 'cup'}`;
  if (unit.id === 'tsp' || unit.id === 'tbsp' || unit.id === 'pinch') {
    return `${formatFraction(value)} ${unit.label}`;
  }
  if (unit.id === 'floz') return `${formatFraction(value)} fl oz`;
  if (unit.id === 'l') return `${formatDecimal(value, 2)} l`;
  if (unit.id === 'ml') return `${formatDecimal(value, 0)} ml`;
  if (unit.id === 'kg') return `${formatDecimal(value, 2)} kg`;
  if (unit.id === 'g') return `${formatDecimal(value, 0)} g`;
  return `${formatFraction(value)} ${unit.label}`;
}

function formatQuantity(value: number, unitId: UnitId, system: UnitSystem): QuantityText {
  const unit = UNITS_BY_ID.get(unitId);
  if (!unit) return { amount: '', unit: '', roughly: false };

  if (unit.kind === 'count') {
    return { amount: formatFraction(value), unit: '', roughly: false };
  }
  if (unit.kind === 'mass') {
    return formatMass(value * unit.base, system);
  }
  return formatVolume(value * unit.base, system);
}

export interface RecipeRow {
  readonly raw: string;
  readonly name: string;
  /** Formatted amount, or null when the line could not be parsed. */
  readonly quantity: string | null;
  /** Unit word for the formatted amount. */
  readonly unit: string;
  /** Extra note, such as the original volume a weight came from. */
  readonly note: string | null;
  /** Reason the line was passed through unchanged. */
  readonly flagged: string | null;
}

export interface RecipeOptions {
  readonly servings: number;
  readonly baseServings: number;
  readonly system: UnitSystem;
}

export type RecipeTable =
  | { readonly ok: true; readonly rows: readonly RecipeRow[]; readonly flagged: number }
  | { readonly ok: false; readonly error: string };

function scaleRange(min: number, max: number, factor: number): { min: number; max: number } {
  return { min: min * factor, max: max * factor };
}

export function buildRecipeTable(input: string, options: RecipeOptions): RecipeTable {
  const { servings, baseServings, system } = options;
  if (!Number.isFinite(servings) || !Number.isFinite(baseServings)) {
    return { ok: false, error: 'Enter servings as numbers.' };
  }
  if (baseServings <= 0) return { ok: false, error: 'Base servings must be more than zero.' };
  if (servings < 0) return { ok: false, error: 'Servings must be zero or more.' };

  const factor = servings / baseServings;
  const rows: RecipeRow[] = [];

  for (const line of input.split('\n')) {
    if (line.trim() === '') continue;
    const parsed = parseIngredientLine(line);
    if (!parsed.recognised || parsed.min === null || parsed.max === null || !parsed.unit) {
      rows.push({
        raw: line,
        name: line.trim(),
        quantity: null,
        unit: '',
        note: null,
        flagged: parsed.reason ?? 'This line could not be read, so it was left as written.',
      });
      continue;
    }

    const scaled = scaleRange(parsed.min, parsed.max, factor);
    const density = findDensity(parsed.name);
    const originalUnit = UNITS_BY_ID.get(parsed.unit) as UnitDefinition;

    if (density && originalUnit.kind === 'volume') {
      const grams = (scaled.min * originalUnit.base * density.gramsPerCup) / US_CUP_ML;
      const gramsMax = (scaled.max * originalUnit.base * density.gramsPerCup) / US_CUP_ML;
      const displayed = formatMass(grams, system);
      const displayedMax = formatMass(gramsMax, system);
      const amount =
        Math.round(grams) === Math.round(gramsMax)
          ? displayed.amount
          : `${displayed.amount}–${displayedMax.amount}`;
      const unitWord = displayed.unit;
      const original =
        parsed.min === parsed.max
          ? formatOriginal(parsed.min, originalUnit)
          : `${formatOriginal(parsed.min, originalUnit)}–${formatOriginal(parsed.max, originalUnit)}`;
      rows.push({
        raw: line,
        name: parsed.name,
        quantity: `roughly ${amount}`,
        unit: unitWord,
        note: `about ${density.gramsPerCup} g per cup (USDA FoodData Central ${density.fdcId}); was ${original}`,
        flagged: null,
      });
      continue;
    }

    const from = formatQuantity(scaled.min, parsed.unit, system);
    const to = formatQuantity(scaled.max, parsed.unit, system);
    const amount = from.amount === to.amount ? from.amount : `${from.amount}–${to.amount}`;
    rows.push({
      raw: line,
      name: parsed.name,
      quantity: from.roughly ? `roughly ${amount}` : amount,
      unit: from.unit,
      note: null,
      flagged: null,
    });
  }

  return {
    ok: true,
    rows,
    flagged: rows.filter((row) => row.flagged !== null).length,
  };
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: readonly RecipeRow[]): string {
  const header = ['Ingredient', 'Quantity', 'Unit', 'Note'];
  const lines = rows.map((row) => [
    row.name,
    row.quantity ?? row.raw,
    row.quantity === null ? '' : row.unit,
    row.flagged ?? row.note ?? '',
  ]);
  return [header, ...lines].map((cells) => cells.map(csvCell).join(',')).join('\n');
}

export function toPlainText(
  rows: readonly RecipeRow[],
  options: { readonly servings: number; readonly system: UnitSystem },
): string {
  const heading = `Recipe for ${options.servings} ${options.servings === 1 ? 'serving' : 'servings'} (${options.system === 'metric' ? 'metric' : 'US customary'})`;
  const body = rows.map((row) =>
    row.quantity === null
      ? `${row.name} — not scaled: ${row.flagged ?? ''}`.trim()
      : `${row.quantity} ${row.unit} ${row.name}`.replace(/\s+/g, ' ').trim() +
        (row.note ? ` (${row.note})` : ''),
  );
  return [heading, '', ...body].join('\n');
}

/** Converts between two units of the same kind; null when the kinds differ. */
export function convertMeasure(value: number, from: UnitId, to: UnitId): number | null {
  const source = UNITS_BY_ID.get(from);
  const target = UNITS_BY_ID.get(to);
  if (!source || !target || source.kind !== target.kind) return null;
  return (value * source.base) / target.base;
}
