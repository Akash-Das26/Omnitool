export type DiffMode = 'line' | 'word' | 'character';
export type DiffType = 'equal' | 'insert' | 'delete';

export interface DiffStep {
  readonly type: DiffType;
  readonly token: string;
}

export interface DiffPart {
  readonly type: DiffType;
  readonly value: string;
}

export interface DiffRow {
  readonly left: string | null;
  readonly right: string | null;
  readonly kind: 'equal' | 'change' | 'insert' | 'delete';
}

export interface DiffResult {
  readonly parts: readonly DiffPart[];
  readonly additions: number;
  readonly deletions: number;
  readonly unchanged: number;
}

export class DiffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiffError';
  }
}

export const MAX_DIFF_TOKENS = 20_000;
export const MAX_DIFF_EDITS = 2_000;

export function tokenize(text: string, mode: DiffMode): string[] {
  if (text === '') return [];
  if (mode === 'line') return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  if (mode === 'character') return Array.from(text);
  return text.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu) ?? [];
}

/**
 * Myers shortest-edit-script. The trace costs memory proportional to the edit
 * distance squared, so unlikely comparisons stop with a clear message rather
 * than exhausting the tab.
 */
export function diffTokens(
  before: readonly string[],
  after: readonly string[],
  maxEdits: number = MAX_DIFF_EDITS,
): DiffStep[] {
  const n = before.length;
  const m = after.length;
  if (n === 0) return after.map((token) => ({ type: 'insert' as const, token }));
  if (m === 0) return before.map((token) => ({ type: 'delete' as const, token }));

  const limit = Math.min(n + m, maxEdits);
  const offset = limit + 1;
  const differences = new Int32Array(2 * limit + 3).fill(-1);
  differences[offset + 1] = 0;

  const trace: Int32Array[] = [];
  let found = -1;

  for (let distance = 0; distance <= limit; distance += 1) {
    trace.push(differences.slice());
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const down = differences[offset + diagonal - 1] ?? -1;
      const right = differences[offset + diagonal + 1] ?? -1;
      let x: number;
      if (diagonal === -distance || (diagonal !== distance && down < right)) {
        x = right;
      } else {
        x = down + 1;
      }
      let y = x - diagonal;

      while (x < n && y < m && before[x] === after[y]) {
        x += 1;
        y += 1;
      }
      differences[offset + diagonal] = x;

      if (x >= n && y >= m) {
        found = distance;
        break;
      }
    }
    if (found >= 0) break;
  }

  if (found < 0) {
    throw new DiffError(
      'These texts differ too much for this level of detail. Try a coarser mode or shorter text.',
    );
  }

  let x = n;
  let y = m;
  const reversed: DiffStep[] = [];

  for (let distance = found; distance >= 0; distance -= 1) {
    const snapshot = trace[distance];
    if (!snapshot) break;
    const diagonal = x - y;
    const down = snapshot[offset + diagonal - 1] ?? -1;
    const right = snapshot[offset + diagonal + 1] ?? -1;
    const previousDiagonal =
      diagonal === -distance || (diagonal !== distance && down < right)
        ? diagonal + 1
        : diagonal - 1;
    const previousX = snapshot[offset + previousDiagonal] ?? 0;
    const previousY = previousX - previousDiagonal;

    while (x > previousX && y > previousY) {
      x -= 1;
      y -= 1;
      reversed.push({ type: 'equal', token: before[x] ?? '' });
    }
    if (distance > 0) {
      if (x === previousX) {
        y -= 1;
        reversed.push({ type: 'insert', token: after[y] ?? '' });
      } else {
        x -= 1;
        reversed.push({ type: 'delete', token: before[x] ?? '' });
      }
    }
  }

  return reversed.reverse();
}

export function mergeSteps(steps: readonly DiffStep[]): DiffPart[] {
  const parts: DiffPart[] = [];
  for (const step of steps) {
    const last = parts.at(-1);
    if (last && last.type === step.type) {
      parts[parts.length - 1] = { type: last.type, value: last.value + step.token };
    } else {
      parts.push({ type: step.type, value: step.token });
    }
  }
  return parts;
}

export function diffText(before: string, after: string, mode: DiffMode = 'line'): DiffResult {
  const beforeTokens = tokenize(before, mode);
  const afterTokens = tokenize(after, mode);
  if (beforeTokens.length > MAX_DIFF_TOKENS || afterTokens.length > MAX_DIFF_TOKENS) {
    throw new DiffError(
      `This comparison is limited to ${MAX_DIFF_TOKENS.toLocaleString('en-GB')} units per side. Try a coarser mode.`,
    );
  }

  const steps = diffTokens(beforeTokens, afterTokens);
  const additions = steps.filter((step) => step.type === 'insert').length;
  const deletions = steps.filter((step) => step.type === 'delete').length;
  return {
    parts: mergeSteps(steps),
    additions,
    deletions,
    unchanged: steps.length - additions - deletions,
  };
}

/** Pair changed chunks into two columns, keeping unchanged text on both sides. */
export function toRows(parts: readonly DiffPart[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let index = 0;

  while (index < parts.length) {
    const part = parts[index];
    if (!part) break;

    if (part.type === 'equal') {
      rows.push({ left: part.value, right: part.value, kind: 'equal' });
      index += 1;
      continue;
    }

    const left: string[] = [];
    const right: string[] = [];
    while (index < parts.length) {
      const changed = parts[index];
      if (!changed || changed.type === 'equal') break;
      if (changed.type === 'delete') left.push(changed.value);
      else right.push(changed.value);
      index += 1;
    }

    const length = Math.max(left.length, right.length);
    for (let row = 0; row < length; row += 1) {
      const leftValue = left[row] ?? null;
      const rightValue = right[row] ?? null;
      rows.push({
        left: leftValue,
        right: rightValue,
        kind:
          leftValue !== null && rightValue !== null
            ? 'change'
            : leftValue !== null
              ? 'delete'
              : 'insert',
      });
    }
  }

  return rows;
}
