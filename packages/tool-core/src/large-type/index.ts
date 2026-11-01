/**
 * Large Type: the text preparation and the size estimate behind the full-screen
 * view. Kept in tool-core so the sizing can be tested without a DOM.
 */

export interface DisplayPlan {
  readonly lines: readonly string[];
  readonly characters: number;
  readonly longestLine: number;
}

/**
 * Splits on real line breaks, collapses runs of whitespace inside a line, and
 * drops leading and trailing blank lines so a pasted block fills the screen
 * evenly. Empty input gives an empty plan rather than a line of nothing.
 */
export function prepareDisplay(text: string): DisplayPlan {
  const lines = text
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim());

  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines.at(-1) === '') lines.pop();

  const characters = lines.reduce((total, line) => total + line.length, 0);
  const longestLine = lines.reduce((longest, line) => Math.max(longest, line.length), 0);
  return { lines, characters, longestLine };
}

export const MIN_FONT_SIZE = 16;
export const MAX_FONT_SIZE = 420;

/**
 * A first guess at the biggest size that fits, assuming an average glyph is
 * 0.62 em wide and a line is 1.15 em tall. The view then clamps it with the real
 * measurements, so this only has to be close enough to avoid a visible jump.
 */
export function fitFontSize(
  plan: DisplayPlan,
  viewport: { readonly width: number; readonly height: number },
): number {
  if (plan.lines.length === 0) return MAX_FONT_SIZE;
  const byWidth = viewport.width / Math.max(1, plan.longestLine * 0.62);
  const byHeight = viewport.height / Math.max(1, plan.lines.length * 1.15);
  const fitted = Math.floor(Math.min(byWidth, byHeight));
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fitted));
}
