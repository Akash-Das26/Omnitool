import { roundTo } from '../number/index';

export class UnitConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitConversionError';
  }
}

/**
 * A unit converts to its category's base unit as `(value - offset) * factor`.
 * Only temperatures have an offset, because their zero points differ.
 */
export interface Unit {
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly factor: number;
  readonly offset?: number;
}

export interface UnitCategory {
  readonly id: string;
  readonly name: string;
  readonly units: readonly Unit[];
  readonly defaultFrom: string;
  readonly defaultTo: string;
}

export const DEFAULT_PRECISION = 6;

function unit(id: string, name: string, symbol: string, factor: number, offset?: number): Unit {
  return offset === undefined ? { id, name, symbol, factor } : { id, name, symbol, factor, offset };
}

const LENGTH: readonly Unit[] = [
  unit('mm', 'Millimetre', 'mm', 0.001),
  unit('cm', 'Centimetre', 'cm', 0.01),
  unit('m', 'Metre', 'm', 1),
  unit('km', 'Kilometre', 'km', 1000),
  unit('in', 'Inch', 'in', 0.0254),
  unit('ft', 'Foot', 'ft', 0.3048),
  unit('yd', 'Yard', 'yd', 0.9144),
  unit('mi', 'Mile', 'mi', 1609.344),
  unit('nmi', 'Nautical mile', 'nmi', 1852),
];

const MASS: readonly Unit[] = [
  unit('mg', 'Milligram', 'mg', 1e-6),
  unit('g', 'Gram', 'g', 0.001),
  unit('kg', 'Kilogram', 'kg', 1),
  unit('t', 'Tonne', 't', 1000),
  unit('oz', 'Ounce', 'oz', 0.028349523125),
  unit('lb', 'Pound', 'lb', 0.45359237),
  unit('st', 'Stone', 'st', 6.35029318),
  unit('ton', 'US ton', 'ton', 907.18474),
];

const TEMPERATURE: readonly Unit[] = [
  unit('c', 'Celsius', '°C', 1),
  unit('f', 'Fahrenheit', '°F', 5 / 9, 32),
  unit('k', 'Kelvin', 'K', 1, 273.15),
  unit('r', 'Rankine', '°R', 5 / 9, 491.67),
];

const AREA: readonly Unit[] = [
  unit('mm2', 'Square millimetre', 'mm²', 1e-6),
  unit('cm2', 'Square centimetre', 'cm²', 1e-4),
  unit('m2', 'Square metre', 'm²', 1),
  unit('ha', 'Hectare', 'ha', 10_000),
  unit('km2', 'Square kilometre', 'km²', 1e6),
  unit('in2', 'Square inch', 'in²', 0.00064516),
  unit('ft2', 'Square foot', 'ft²', 0.09290304),
  unit('yd2', 'Square yard', 'yd²', 0.83612736),
  unit('acre', 'Acre', 'ac', 4046.8564224),
];

const VOLUME: readonly Unit[] = [
  unit('ml', 'Millilitre', 'ml', 0.001),
  unit('l', 'Litre', 'l', 1),
  unit('m3', 'Cubic metre', 'm³', 1000),
  unit('tsp', 'Teaspoon (US)', 'tsp', 0.00492892159375),
  unit('tbsp', 'Tablespoon (US)', 'tbsp', 0.01478676478125),
  unit('floz', 'Fluid ounce (US)', 'fl oz', 0.0295735295625),
  unit('cup', 'Cup (US)', 'cup', 0.2365882365),
  unit('pt', 'Pint (US)', 'pt', 0.473176473),
  unit('qt', 'Quart (US)', 'qt', 0.946352946),
  unit('gal', 'Gallon (US)', 'gal', 3.785411784),
  unit('impgal', 'Gallon (imperial)', 'imp gal', 4.54609),
];

const SPEED: readonly Unit[] = [
  unit('ms', 'Metres per second', 'm/s', 1),
  unit('kmh', 'Kilometres per hour', 'km/h', 1 / 3.6),
  unit('mph', 'Miles per hour', 'mph', 0.44704),
  unit('kn', 'Knot', 'kn', 1852 / 3600),
];

const TIME: readonly Unit[] = [
  unit('ms', 'Millisecond', 'ms', 0.001),
  unit('s', 'Second', 's', 1),
  unit('min', 'Minute', 'min', 60),
  unit('h', 'Hour', 'h', 3600),
  unit('d', 'Day', 'd', 86_400),
  unit('wk', 'Week', 'wk', 604_800),
];

const DATA: readonly Unit[] = [
  unit('bit', 'Bit', 'bit', 0.125),
  unit('b', 'Byte', 'B', 1),
  unit('kb', 'Kilobyte', 'kB', 1000),
  unit('mb', 'Megabyte', 'MB', 1e6),
  unit('gb', 'Gigabyte', 'GB', 1e9),
  unit('tb', 'Terabyte', 'TB', 1e12),
  unit('kib', 'Kibibyte', 'KiB', 1024),
  unit('mib', 'Mebibyte', 'MiB', 1024 ** 2),
  unit('gib', 'Gibibyte', 'GiB', 1024 ** 3),
  unit('tib', 'Tebibyte', 'TiB', 1024 ** 4),
];

const ANGLE: readonly Unit[] = [
  unit('deg', 'Degree', '°', 1),
  unit('rad', 'Radian', 'rad', 180 / Math.PI),
  unit('grad', 'Gradian', 'grad', 0.9),
  unit('turn', 'Turn', 'turn', 360),
];

const PRESSURE: readonly Unit[] = [
  unit('pa', 'Pascal', 'Pa', 1),
  unit('kpa', 'Kilopascal', 'kPa', 1000),
  unit('bar', 'Bar', 'bar', 100_000),
  unit('psi', 'Pounds per square inch', 'psi', 6894.757293168),
  unit('atm', 'Atmosphere', 'atm', 101_325),
  unit('mmhg', 'Millimetre of mercury', 'mmHg', 133.322387415),
];

const ENERGY: readonly Unit[] = [
  unit('j', 'Joule', 'J', 1),
  unit('kj', 'Kilojoule', 'kJ', 1000),
  unit('cal', 'Calorie', 'cal', 4.184),
  unit('kcal', 'Kilocalorie', 'kcal', 4184),
  unit('wh', 'Watt-hour', 'Wh', 3600),
  unit('kwh', 'Kilowatt-hour', 'kWh', 3_600_000),
  unit('btu', 'British thermal unit', 'BTU', 1055.05585262),
];

export const UNIT_CATEGORIES: readonly UnitCategory[] = [
  { id: 'length', name: 'Length', units: LENGTH, defaultFrom: 'm', defaultTo: 'ft' },
  { id: 'mass', name: 'Mass', units: MASS, defaultFrom: 'kg', defaultTo: 'lb' },
  { id: 'temperature', name: 'Temperature', units: TEMPERATURE, defaultFrom: 'c', defaultTo: 'f' },
  { id: 'area', name: 'Area', units: AREA, defaultFrom: 'm2', defaultTo: 'ft2' },
  { id: 'volume', name: 'Volume', units: VOLUME, defaultFrom: 'l', defaultTo: 'gal' },
  { id: 'speed', name: 'Speed', units: SPEED, defaultFrom: 'kmh', defaultTo: 'mph' },
  { id: 'time', name: 'Time', units: TIME, defaultFrom: 'h', defaultTo: 'min' },
  { id: 'data', name: 'Data', units: DATA, defaultFrom: 'mb', defaultTo: 'mib' },
  { id: 'angle', name: 'Angle', units: ANGLE, defaultFrom: 'deg', defaultTo: 'rad' },
  { id: 'pressure', name: 'Pressure', units: PRESSURE, defaultFrom: 'bar', defaultTo: 'psi' },
  { id: 'energy', name: 'Energy', units: ENERGY, defaultFrom: 'kcal', defaultTo: 'kj' },
];

export function getCategory(categoryId: string): UnitCategory {
  const category = UNIT_CATEGORIES.find((entry) => entry.id === categoryId);
  if (!category) throw new UnitConversionError(`Unknown category: ${categoryId}`);
  return category;
}

export function getUnit(categoryId: string, unitId: string): Unit {
  const category = getCategory(categoryId);
  const found = category.units.find((entry) => entry.id === unitId);
  if (!found) throw new UnitConversionError(`Unknown unit: ${unitId}`);
  return found;
}

function toBase(value: number, from: Unit): number {
  return (value - (from.offset ?? 0)) * from.factor;
}

function fromBase(base: number, to: Unit): number {
  return base / to.factor + (to.offset ?? 0);
}

export function convert(
  value: number,
  categoryId: string,
  fromId: string,
  toId: string,
  precision: number = DEFAULT_PRECISION,
): number {
  if (!Number.isFinite(value)) throw new UnitConversionError('Enter a number to convert');
  const from = getUnit(categoryId, fromId);
  const to = getUnit(categoryId, toId);
  const result = fromBase(toBase(value, from), to);
  if (!Number.isFinite(result)) throw new UnitConversionError('That conversion is out of range');
  return roundTo(result, precision);
}

export interface UnitConversionRow {
  readonly unit: Unit;
  readonly value: number;
}

/** The same value in every unit of its category, for a reference table. */
export function convertAll(
  value: number,
  categoryId: string,
  fromId: string,
  precision: number = DEFAULT_PRECISION,
): UnitConversionRow[] {
  const category = getCategory(categoryId);
  const from = getUnit(categoryId, fromId);
  if (!Number.isFinite(value)) throw new UnitConversionError('Enter a number to convert');

  const base = toBase(value, from);
  return category.units.map((to) => ({ unit: to, value: roundTo(fromBase(base, to), precision) }));
}
