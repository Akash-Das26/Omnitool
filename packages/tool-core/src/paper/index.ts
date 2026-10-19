import { roundTo } from '../number/index';

export const MM_PER_INCH = 25.4;

export class PaperSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaperSizeError';
  }
}

export interface PaperSize {
  readonly id: string;
  readonly name: string;
  readonly series: string;
  readonly widthMm: number;
  readonly heightMm: number;
}

export interface PaperSeries {
  readonly id: string;
  readonly name: string;
}

export const PAPER_SERIES: readonly PaperSeries[] = [
  { id: 'A', name: 'ISO A' },
  { id: 'B', name: 'ISO B' },
  { id: 'C', name: 'ISO C' },
  { id: 'US', name: 'US' },
];

function iso(series: string, size: string, widthMm: number, heightMm: number): PaperSize {
  return {
    id: `${series.toLowerCase()}${size}`,
    name: `${series}${size}`,
    series,
    widthMm,
    heightMm,
  };
}

function us(id: string, name: string, widthIn: number, heightIn: number): PaperSize {
  return {
    id,
    name,
    series: 'US',
    widthMm: roundTo(widthIn * MM_PER_INCH, 2),
    heightMm: roundTo(heightIn * MM_PER_INCH, 2),
  };
}

export const PAPER_SIZES: readonly PaperSize[] = [
  iso('A', '0', 841, 1189),
  iso('A', '1', 594, 841),
  iso('A', '2', 420, 594),
  iso('A', '3', 297, 420),
  iso('A', '4', 210, 297),
  iso('A', '5', 148, 210),
  iso('A', '6', 105, 148),
  iso('A', '7', 74, 105),
  iso('A', '8', 52, 74),
  iso('A', '9', 37, 52),
  iso('A', '10', 26, 37),

  iso('B', '0', 1000, 1414),
  iso('B', '1', 707, 1000),
  iso('B', '2', 500, 707),
  iso('B', '3', 353, 500),
  iso('B', '4', 250, 353),
  iso('B', '5', 176, 250),
  iso('B', '6', 125, 176),
  iso('B', '7', 88, 125),
  iso('B', '8', 62, 88),
  iso('B', '9', 44, 62),
  iso('B', '10', 31, 44),

  iso('C', '0', 917, 1297),
  iso('C', '1', 648, 917),
  iso('C', '2', 458, 648),
  iso('C', '3', 324, 458),
  iso('C', '4', 229, 324),
  iso('C', '5', 162, 229),
  iso('C', '6', 114, 162),
  iso('C', '7', 81, 114),
  iso('C', '8', 57, 81),
  iso('C', '9', 40, 57),
  iso('C', '10', 28, 40),

  us('letter', 'Letter', 8.5, 11),
  us('legal', 'Legal', 8.5, 14),
  us('tabloid', 'Tabloid', 11, 17),
  us('executive', 'Executive', 7.25, 10.5),
  us('half-letter', 'Half Letter', 5.5, 8.5),
  us('junior-legal', 'Junior Legal', 5, 8),
];

export function getPaperSize(id: string): PaperSize {
  const size = PAPER_SIZES.find((entry) => entry.id === id);
  if (!size) throw new PaperSizeError(`Unknown paper size: ${id}`);
  return size;
}

export function paperSizeTable(seriesId: string): PaperSize[] {
  if (!PAPER_SERIES.some((series) => series.id === seriesId)) {
    throw new PaperSizeError(`Unknown paper series: ${seriesId}`);
  }
  return PAPER_SIZES.filter((size) => size.series === seriesId);
}

export interface Pair {
  readonly width: number;
  readonly height: number;
}

export interface PaperDimensions {
  readonly mm: Pair;
  readonly inches: Pair;
  readonly points: Pair;
  readonly px72: Pair;
  readonly px96: Pair;
  readonly px300: Pair;
}

function pair(widthMm: number, heightMm: number, perInch: number): Pair {
  const factor = perInch / MM_PER_INCH;
  return {
    width: roundTo(widthMm * factor, 3),
    height: roundTo(heightMm * factor, 3),
  };
}

/** One size in millimetres, inches, PostScript points and pixels at 72, 96 and 300 dpi. */
export function dimensions(id: string): PaperDimensions {
  const size = getPaperSize(id);
  return {
    mm: { width: size.widthMm, height: size.heightMm },
    inches: pair(size.widthMm, size.heightMm, 1),
    points: pair(size.widthMm, size.heightMm, 72),
    px72: pair(size.widthMm, size.heightMm, 72),
    px96: pair(size.widthMm, size.heightMm, 96),
    px300: pair(size.widthMm, size.heightMm, 300),
  };
}
