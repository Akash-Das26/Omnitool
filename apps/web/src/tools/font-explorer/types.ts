export interface FontAxis {
  readonly tag: string;
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly default: number;
}

export interface ScriptCoverage {
  readonly name: string;
  /** How many of the script's sample characters the font has a glyph for. */
  readonly covered: number;
  readonly sampled: number;
}

export interface FontReport {
  readonly family: string;
  readonly subfamily: string;
  readonly fullName: string;
  readonly postscriptName: string;
  readonly version: string;
  readonly copyright: string;
  readonly designer: string;
  readonly licence: string;
  readonly glyphs: number;
  readonly codePoints: number;
  readonly unitsPerEm: number;
  readonly ascent: number;
  readonly descent: number;
  readonly axes: readonly FontAxis[];
  readonly scripts: readonly ScriptCoverage[];
}

export interface FontInspectInput {
  readonly buffer: ArrayBuffer;
  readonly filename: string;
}

/** 50 MB: a font larger than this is not a font anyone needs to preview. */
export const MAX_FONT_BYTES = 50 * 1024 * 1024;

export const FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'] as const;
