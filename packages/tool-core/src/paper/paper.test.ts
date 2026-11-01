import { describe, expect, it } from 'vitest';
import {
  dimensions,
  getPaperSize,
  PAPER_SERIES,
  PAPER_SIZES,
  PaperSizeError,
  paperSizeTable,
} from './index';

describe('PAPER_SIZES', () => {
  it('lists the ISO A, B and C series and the common US sizes', () => {
    expect(PAPER_SERIES.map((series) => series.id)).toEqual(['A', 'B', 'C', 'US']);

    for (const series of PAPER_SERIES) {
      expect(paperSizeTable(series.id).length).toBeGreaterThanOrEqual(6);
    }

    expect(paperSizeTable('A')).toHaveLength(11);
    expect(paperSizeTable('B')).toHaveLength(11);
    expect(paperSizeTable('C')).toHaveLength(11);
    expect(paperSizeTable('US')).toHaveLength(6);
  });

  it('gives every size a unique id and a portrait orientation', () => {
    const ids = PAPER_SIZES.map((size) => size.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const size of PAPER_SIZES) {
      expect(size.heightMm, size.id).toBeGreaterThanOrEqual(size.widthMm);
    }
  });

  it('matches the ISO definitions', () => {
    expect(getPaperSize('a4')).toMatchObject({ widthMm: 210, heightMm: 297 });
    expect(getPaperSize('a0')).toMatchObject({ widthMm: 841, heightMm: 1189 });
    expect(getPaperSize('b0')).toMatchObject({ widthMm: 1000, heightMm: 1414 });
    expect(getPaperSize('c4')).toMatchObject({ widthMm: 229, heightMm: 324 });
    expect(getPaperSize('letter')).toMatchObject({ widthMm: 215.9, heightMm: 279.4 });
    expect(getPaperSize('legal')).toMatchObject({ widthMm: 215.9, heightMm: 355.6 });
  });

  it('reports an unknown size', () => {
    expect(() => getPaperSize('a99')).toThrow(PaperSizeError);
    expect(() => paperSizeTable('D')).toThrow(PaperSizeError);
  });
});

describe('dimensions', () => {
  it('converts millimetres to inches, points and pixels', () => {
    const a4 = dimensions('a4');
    expect(a4.mm).toEqual({ width: 210, height: 297 });
    expect(a4.inches).toEqual({ width: 8.268, height: 11.693 });
    expect(a4.points).toEqual({ width: 595.276, height: 841.89 });
    expect(a4.px72).toEqual({ width: 595.276, height: 841.89 });
    expect(a4.px96).toEqual({ width: 793.701, height: 1122.52 });
    expect(a4.px300).toEqual({ width: 2480.315, height: 3507.874 });
  });

  it('gives exact whole values for US Letter', () => {
    const letter = dimensions('letter');
    expect(letter.points).toEqual({ width: 612, height: 792 });
    expect(letter.px72).toEqual({ width: 612, height: 792 });
    expect(letter.px96).toEqual({ width: 816, height: 1056 });
  });

  it('rejects an unknown size', () => {
    expect(() => dimensions('tabloid')).not.toThrow();
    expect(() => dimensions('nope')).toThrow(PaperSizeError);
  });
});
