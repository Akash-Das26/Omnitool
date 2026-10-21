/**
 * Humorous reference units, each with a documented source and an SI value.
 *
 * Every size below was checked against the standard or publication named in its
 * `source` field (Session 019). Values that depend on a measurement rather than a
 * definition are marked `exact: false` and shown with a "roughly" label, because
 * a real object varies. Units whose value could not be confirmed were left out:
 * no Vatican City, no banana, no double-decker bus.
 *
 * SI basis: metres, square metres, cubic metres, kilograms and seconds.
 */

export type FunnyUnitCategory = 'length' | 'area' | 'volume' | 'mass' | 'time';

export const FUNNY_UNIT_CATEGORIES: readonly FunnyUnitCategory[] = [
  'length',
  'area',
  'volume',
  'mass',
  'time',
];

export const FUNNY_UNIT_CATEGORY_LABELS: Readonly<Record<FunnyUnitCategory, string>> = {
  length: 'Length',
  area: 'Area',
  volume: 'Volume',
  mass: 'Mass',
  time: 'Time',
};

export interface FunnyUnit {
  readonly id: string;
  /** Singular label, used when the amount is exactly one. */
  readonly name: string;
  /** Plural label, used for every other amount. */
  readonly plural: string;
  readonly category: FunnyUnitCategory;
  /** Size in SI base units for the category. */
  readonly si: number;
  readonly definition: string;
  /** Standard or publication the size comes from. */
  readonly source: string;
  /** False when the size is a measurement that varies. */
  readonly exact: boolean;
}

export const FUNNY_UNITS: readonly FunnyUnit[] = [
  {
    id: 'a4-sheet',
    name: 'A4 sheet',
    plural: 'A4 sheets',
    category: 'length',
    si: 0.297,
    definition: 'The long edge of an A4 sheet of paper.',
    source: 'ISO 216:2007, A4 trimmed size 210 mm × 297 mm',
    exact: true,
  },
  {
    id: 'nfl-field',
    name: 'American football field',
    plural: 'American football fields',
    category: 'length',
    si: 91.44,
    definition: 'Goal line to goal line, 100 yards, without the end zones.',
    source: 'NFL Rulebook, field dimensions (100 yd between goal lines)',
    exact: true,
  },
  {
    id: 'cricket-pitch',
    name: 'cricket pitch',
    plural: 'cricket pitches',
    category: 'length',
    si: 20.12,
    definition: 'Wicket to wicket, the 22-yard strip in the middle.',
    source: 'MCC Laws of Cricket, Law 6 (22 yards / 20.12 m)',
    exact: true,
  },
  {
    id: 'tennis-court',
    name: 'tennis court',
    plural: 'tennis courts',
    category: 'length',
    si: 23.77,
    definition: 'Baseline to baseline on a regulation court.',
    source: 'ITF Rules of Tennis (78 ft / 23.77 m)',
    exact: true,
  },
  {
    id: 'olympic-pool',
    name: 'Olympic pool',
    plural: 'Olympic pools',
    category: 'length',
    si: 50,
    definition: 'One length of a 50 m competition pool.',
    source: 'World Aquatics Facilities Rules, 50 m competition pool',
    exact: true,
  },
  {
    id: 'shipping-container',
    name: 'shipping container',
    plural: 'shipping containers',
    category: 'length',
    si: 6.058,
    definition: 'The outside length of a standard 20-foot container.',
    source: 'ISO 668, series 1 freight container, 20 ft (6 058 mm)',
    exact: true,
  },
  {
    id: 'eiffel-tower',
    name: 'Eiffel Tower',
    plural: 'Eiffel Towers',
    category: 'length',
    si: 330,
    definition: 'Ground to the tip of the antenna.',
    source: 'toureiffel.paris, key figures (330 m)',
    exact: false,
  },
  {
    id: 'marathon',
    name: 'marathon',
    plural: 'marathons',
    category: 'length',
    si: 42_195,
    definition: 'The road-racing distance, 26 miles 385 yards.',
    source: 'World Athletics, marathon (42.195 km)',
    exact: true,
  },
  {
    id: 'moon-distance',
    name: 'Moon distance',
    plural: 'Moon distances',
    category: 'length',
    si: 384_400_000,
    definition: 'The average distance from the Earth to the Moon.',
    source: 'NASA Science, Moon facts (384,400 km average)',
    exact: false,
  },

  {
    id: 'football-pitch',
    name: 'football pitch',
    plural: 'football pitches',
    category: 'area',
    si: 7140,
    definition: 'A pitch at the size FIFA recommends, 105 m by 68 m.',
    source: 'FIFA Stadium Guidelines, pitch dimensions (105 m × 68 m)',
    exact: true,
  },
  {
    id: 'tennis-court-area',
    name: 'doubles tennis court',
    plural: 'doubles tennis courts',
    category: 'area',
    si: 260.76,
    definition: 'The playing area of a doubles court.',
    source: 'ITF Rules of Tennis dimensions (23.77 m × 10.97 m), area rounded',
    exact: false,
  },
  {
    id: 'a4-area',
    name: 'A4 sheet',
    plural: 'A4 sheets',
    category: 'area',
    si: 0.06237,
    definition: 'The area of one sheet of A4 paper.',
    source: 'ISO 216:2007, A4 trimmed size 210 mm × 297 mm',
    exact: true,
  },
  {
    id: 'acre',
    name: 'acre',
    plural: 'acres',
    category: 'area',
    si: 4046.8564224,
    definition: 'The international acre, 4,840 square yards.',
    source: 'NIST Handbook 44, Appendix C (43,560 ft²; international foot)',
    exact: true,
  },
  {
    id: 'wales',
    name: 'Wales',
    plural: 'Waleses',
    category: 'area',
    si: 20_779_000_000,
    definition: 'The whole country, as a unit of area.',
    source: 'ONS Standard Area Measurements, total extent of the realm (20,779 km²)',
    exact: false,
  },
  {
    id: 'belgium',
    name: 'Belgium',
    plural: 'Belgiums',
    category: 'area',
    si: 30_689_000_000,
    definition: 'The whole country, for when a Wales is not enough.',
    source: 'Statbel, total surface area (30,689 km², 2023)',
    exact: false,
  },

  {
    id: 'olympic-pool-volume',
    name: 'Olympic pool',
    plural: 'Olympic pools',
    category: 'volume',
    si: 2500,
    definition: 'A 50 m by 25 m pool filled to the 2 m minimum depth.',
    source: 'World Aquatics Facilities Rules (50 m × 25 m, 2 m minimum depth)',
    exact: true,
  },
  {
    id: 'us-cup',
    name: 'US cup',
    plural: 'US cups',
    category: 'volume',
    si: 0.0002365882365,
    definition: 'The US customary cup used in recipes, 8 US fluid ounces.',
    source: 'NIST Handbook 44, Appendix C (US gallon = 231 in³; cup = 1/16 gallon)',
    exact: true,
  },
  {
    id: 'metric-teaspoon',
    name: 'metric teaspoon',
    plural: 'metric teaspoons',
    category: 'volume',
    si: 0.000005,
    definition: 'The 5 mL spoon on a metric measuring set.',
    source: 'NIST Metric Kitchen cooking equivalencies (5 mL per teaspoon)',
    exact: true,
  },

  {
    id: 'stone',
    name: 'stone',
    plural: 'stones',
    category: 'mass',
    si: 6.35029318,
    definition: 'Fourteen pounds, the unit British scales still offer.',
    source: 'Weights and Measures Act 1985 (stone = 14 lb)',
    exact: true,
  },
  {
    id: 'tonne',
    name: 'tonne',
    plural: 'tonnes',
    category: 'mass',
    si: 1000,
    definition: 'A metric tonne, 1,000 kilograms.',
    source: 'BIPM SI Brochure (tonne = 10³ kg)',
    exact: true,
  },
  {
    id: 'eiffel-tower-mass',
    name: 'Eiffel Tower',
    plural: 'Eiffel Towers',
    category: 'mass',
    si: 10_100_000,
    definition: 'The whole tower, metal, floors and fittings included.',
    source: 'toureiffel.paris, key figures (10,100 tonnes total)',
    exact: false,
  },

  {
    id: 'warhol',
    name: 'Warhol',
    plural: 'Warhols',
    category: 'time',
    si: 900,
    definition: 'Fifteen minutes of fame, as promised in 1968.',
    source: 'Andy Warhol, 1968 Stockholm exhibition catalogue (attributed)',
    exact: true,
  },
  {
    id: 'day',
    name: 'day',
    plural: 'days',
    category: 'time',
    si: 86_400,
    definition: 'One ordinary day of 24 hours.',
    source: 'BIPM, the day is 86 400 s',
    exact: true,
  },
  {
    id: 'fortnight',
    name: 'fortnight',
    plural: 'fortnights',
    category: 'time',
    si: 1_209_600,
    definition: 'Fourteen days, the traditional British wait.',
    source: 'Definition: fourteen days of 24 hours',
    exact: true,
  },
  {
    id: 'julian-year',
    name: 'Julian year',
    plural: 'Julian years',
    category: 'time',
    si: 31_557_600,
    definition: '365.25 days, the year astronomers use for epoch maths.',
    source: 'IAU Julian year (365.25 days of 86 400 s)',
    exact: true,
  },
];

export interface StupidInputUnit {
  readonly id: string;
  readonly name: string;
  readonly category: FunnyUnitCategory;
  /** Size of one input unit in SI base units. */
  readonly si: number;
}

/** Everyday units you can type an amount in. */
export const STUPID_INPUT_UNITS: readonly StupidInputUnit[] = [
  { id: 'metre', name: 'Metres', category: 'length', si: 1 },
  { id: 'centimetre', name: 'Centimetres', category: 'length', si: 0.01 },
  { id: 'kilometre', name: 'Kilometres', category: 'length', si: 1000 },
  { id: 'inch', name: 'Inches', category: 'length', si: 0.0254 },
  { id: 'foot', name: 'Feet', category: 'length', si: 0.3048 },
  { id: 'mile', name: 'Miles', category: 'length', si: 1609.344 },
  { id: 'square-metre', name: 'Square metres', category: 'area', si: 1 },
  { id: 'square-foot', name: 'Square feet', category: 'area', si: 0.09290304 },
  { id: 'hectare', name: 'Hectares', category: 'area', si: 10_000 },
  { id: 'acre-input', name: 'Acres', category: 'area', si: 4046.8564224 },
  { id: 'litre', name: 'Litres', category: 'volume', si: 0.001 },
  { id: 'millilitre', name: 'Millilitres', category: 'volume', si: 0.000001 },
  { id: 'cubic-metre', name: 'Cubic metres', category: 'volume', si: 1 },
  { id: 'kilogram', name: 'Kilograms', category: 'mass', si: 1 },
  { id: 'gram', name: 'Grams', category: 'mass', si: 0.001 },
  { id: 'pound', name: 'Pounds', category: 'mass', si: 0.45359237 },
  { id: 'tonne-input', name: 'Tonnes', category: 'mass', si: 1000 },
  { id: 'second', name: 'Seconds', category: 'time', si: 1 },
  { id: 'minute', name: 'Minutes', category: 'time', si: 60 },
  { id: 'hour', name: 'Hours', category: 'time', si: 3600 },
  { id: 'day-input', name: 'Days', category: 'time', si: 86_400 },
];

export interface FunnyConversion {
  readonly unit: FunnyUnit;
  readonly amount: number;
  readonly display: string;
}

export type FunnyConvertResult =
  | { readonly ok: true; readonly conversions: readonly FunnyConversion[] }
  | { readonly ok: false; readonly error: string };

/** Three significant digits, grouped, with no trailing zeros. */
export function formatFunnyAmount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '';
  if (value === 0) return '0';
  if (value < 0.001) return value.toExponential(2).replace('e', ' × 10^');
  return new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 3 }).format(value);
}

export function stupidInputUnitsFor(category: FunnyUnitCategory): readonly StupidInputUnit[] {
  return STUPID_INPUT_UNITS.filter((unit) => unit.category === category);
}

export function funnyUnitsFor(category: FunnyUnitCategory): readonly FunnyUnit[] {
  return FUNNY_UNITS.filter((unit) => unit.category === category);
}

export function convertToFunnyUnits(amount: number, inputUnitId: string): FunnyConvertResult {
  const unit = STUPID_INPUT_UNITS.find((candidate) => candidate.id === inputUnitId);
  if (!unit) return { ok: false, error: 'Choose a unit to convert from.' };
  if (!Number.isFinite(amount)) return { ok: false, error: 'Enter a number.' };
  if (amount < 0) return { ok: false, error: 'Enter a number of zero or more.' };

  const siAmount = amount * unit.si;
  const conversions = funnyUnitsFor(unit.category)
    .map((funny) => {
      const value = siAmount / funny.si;
      return { unit: funny, amount: value, display: formatFunnyAmount(value) };
    })
    .sort((left, right) => left.amount - right.amount);

  return { ok: true, conversions };
}
