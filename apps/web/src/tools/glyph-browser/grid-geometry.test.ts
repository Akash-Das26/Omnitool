import { describe, expect, it } from 'vitest';
import {
  BUFFER_ROWS,
  CELL,
  cellPosition,
  columnsFor,
  GAP,
  moveActive,
  ROW,
  VIEWPORT,
  windowFor,
} from './grid-geometry';

describe('columnsFor', () => {
  it('fits whole cells and gaps into the width', () => {
    // 12 cells: 12 * 40 + 11 * 4 = 524. A 13th needs one more gap plus a cell (568).
    expect(columnsFor(524)).toBe(12);
    expect(columnsFor(567)).toBe(12);
    expect(columnsFor(568)).toBe(13);
    expect(columnsFor(44)).toBe(1);
  });

  it('never returns zero columns for a collapsed or unknown width', () => {
    expect(columnsFor(0)).toBe(1);
    expect(columnsFor(-20)).toBe(1);
    expect(columnsFor(Number.NaN)).toBe(1);
  });
});

describe('windowFor', () => {
  it('renders the visible rows plus the buffer, and nothing at the start rows', () => {
    const window = windowFor(20_993, 12, 0);
    expect(window.rows).toBe(Math.ceil(20_993 / 12));
    expect(window.first).toBe(0);
    // 320 px of port is 8 rows (7 whole rows plus part of the eighth), plus 2 buffer rows.
    expect(window.last).toBe((Math.floor(VIEWPORT / ROW) + BUFFER_ROWS + 1) * 12 - 1);
    expect(window.last).toBeLessThan(20_993);
  });

  it('follows the scroll position', () => {
    const window = windowFor(1_000, 10, ROW * 50);
    expect(window.first).toBe((50 - BUFFER_ROWS) * 10);
    expect(window.last).toBeGreaterThan(window.first);
  });

  it('clamps at the end and never runs past the last entry', () => {
    const window = windowFor(100, 10, 10_000);
    expect(window.rows).toBe(10);
    expect(window.first).toBeLessThan(100);
    expect(window.last).toBe(99);
  });

  it('reports nothing to render for an empty list', () => {
    expect(windowFor(0, 12, 0)).toEqual({ rows: 0, first: 0, last: -1 });
  });

  it('survives a zero column count', () => {
    const window = windowFor(10, 0, 0);
    expect(window.rows).toBe(10);
    expect(window.last).toBeGreaterThanOrEqual(0);
  });
});

describe('cellPosition', () => {
  it('lays entries out in rows of the given width', () => {
    expect(cellPosition(0, 12)).toEqual({ top: 0, left: 0 });
    expect(cellPosition(11, 12)).toEqual({ top: 0, left: 11 * ROW });
    expect(cellPosition(12, 12)).toEqual({ top: ROW, left: 0 });
    expect(cellPosition(25, 12)).toEqual({ top: 2 * ROW, left: ROW });
  });

  it('keeps the cell square and the pitch consistent', () => {
    expect(ROW).toBe(CELL + GAP);
  });

  it('does not divide by zero', () => {
    expect(cellPosition(3, 0)).toEqual({ top: 3 * ROW, left: 0 });
  });
});

describe('moveActive', () => {
  const COUNT = 100;
  const COLUMNS = 10;

  it('moves one cell left and right', () => {
    expect(moveActive(0, 'ArrowRight', COUNT, COLUMNS)).toBe(1);
    expect(moveActive(5, 'ArrowLeft', COUNT, COLUMNS)).toBe(4);
  });

  it('moves one row up and down', () => {
    expect(moveActive(25, 'ArrowDown', COUNT, COLUMNS)).toBe(35);
    expect(moveActive(25, 'ArrowUp', COUNT, COLUMNS)).toBe(15);
  });

  it('jumps to the first and last entry', () => {
    expect(moveActive(42, 'Home', COUNT, COLUMNS)).toBe(0);
    expect(moveActive(42, 'End', COUNT, COLUMNS)).toBe(99);
  });

  it('pages by the number of visible rows', () => {
    expect(moveActive(10, 'PageDown', COUNT, COLUMNS, 8)).toBe(90);
    expect(moveActive(95, 'PageUp', COUNT, COLUMNS, 8)).toBe(15);
  });

  it('clamps at both ends instead of wrapping', () => {
    expect(moveActive(0, 'ArrowLeft', COUNT, COLUMNS)).toBe(0);
    expect(moveActive(0, 'ArrowUp', COUNT, COLUMNS)).toBe(0);
    expect(moveActive(99, 'ArrowRight', COUNT, COLUMNS)).toBe(99);
    expect(moveActive(99, 'ArrowDown', COUNT, COLUMNS)).toBe(99);
    expect(moveActive(0, 'PageUp', COUNT, COLUMNS, 8)).toBe(0);
  });

  it('ignores keys it does not own, and an empty list', () => {
    expect(moveActive(3, 'a', COUNT, COLUMNS)).toBeNull();
    expect(moveActive(3, 'Tab', COUNT, COLUMNS)).toBeNull();
    expect(moveActive(0, 'ArrowRight', 0, COLUMNS)).toBeNull();
  });
});
