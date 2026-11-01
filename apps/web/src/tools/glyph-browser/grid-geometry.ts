/**
 * Geometry for the character grid. The grid is windowed, so the browser only
 * ever holds the rows it can see plus a small buffer: a block like CJK Unified
 * Ideographs has 20,993 characters, and rendering all of them spent a long
 * task on buttons nobody could see.
 *
 * Cells are a fixed 40 px square with a 4 px gap rather than `aspect-square`,
 * because a virtual list must know a row's height before the row exists.
 */

export const CELL = 40;
export const GAP = 4;
/** One row's pitch: the cell plus the gap under it. */
export const ROW = CELL + GAP;
/** The scroll port's height, matching the `h-80` container in the tool. */
export const VIEWPORT = 320;
/** Rows rendered above and below the visible ones, so fast scrolling is not blank. */
export const BUFFER_ROWS = 2;

/** How many fixed cells fit across a port of this width. */
export function columnsFor(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 1;
  return Math.max(1, Math.floor((width + GAP) / ROW));
}

export interface WindowRange {
  /** Total rows at this column count. */
  readonly rows: number;
  /** First rendered index, inclusive. */
  readonly first: number;
  /** Last rendered index, inclusive; -1 when there is nothing to render. */
  readonly last: number;
}

/** The slice of entries to render for a scroll position. */
export function windowFor(
  count: number,
  columns: number,
  scrollTop: number,
  height: number = VIEWPORT,
  buffer: number = BUFFER_ROWS,
): WindowRange {
  if (count <= 0) return { rows: 0, first: 0, last: -1 };
  const safeColumns = Math.max(1, columns);
  const rows = Math.ceil(count / safeColumns);
  const top = Math.max(0, Math.min(scrollTop, rows * ROW));
  const firstRow = Math.max(0, Math.floor(top / ROW) - buffer);
  const lastRow = Math.min(rows - 1, Math.floor((top + height) / ROW) + buffer);
  return {
    rows,
    first: firstRow * safeColumns,
    last: Math.min(count - 1, (lastRow + 1) * safeColumns - 1),
  };
}

export type GridKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown';

/** The index a key moves to, or null for a key the grid does not handle. */
export function moveActive(
  active: number,
  key: string,
  count: number,
  columns: number,
  pageRows: number = Math.max(1, Math.floor(VIEWPORT / ROW)),
): number | null {
  if (count <= 0) return null;
  const safeColumns = Math.max(1, columns);
  const last = count - 1;
  const clamp = (value: number) => Math.max(0, Math.min(last, value));
  const page = Math.max(1, pageRows) * safeColumns;
  switch (key) {
    case 'ArrowLeft':
      return clamp(active - 1);
    case 'ArrowRight':
      return clamp(active + 1);
    case 'ArrowUp':
      return clamp(active - safeColumns);
    case 'ArrowDown':
      return clamp(active + safeColumns);
    case 'Home':
      return 0;
    case 'End':
      return last;
    case 'PageUp':
      return clamp(active - page);
    case 'PageDown':
      return clamp(active + page);
    default:
      return null;
  }
}

/** Where an entry sits, for absolute positioning inside the scroll spacer. */
export function cellPosition(index: number, columns: number): { top: number; left: number } {
  const safeColumns = Math.max(1, columns);
  return {
    top: Math.floor(index / safeColumns) * ROW,
    left: (index % safeColumns) * ROW,
  };
}
