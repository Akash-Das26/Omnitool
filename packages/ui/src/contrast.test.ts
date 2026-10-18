import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * WCAG contrast for the design tokens themselves. The values are read from
 * `tokens.css` rather than copied here, so a token edit that breaks AA fails
 * this test instead of drifting silently out of the design system.
 */
const css = readFileSync(resolve(process.cwd(), 'packages/ui/src/tokens.css'), 'utf8');

function readTokenBlock(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`${selector} block is missing from tokens.css`);
  const end = css.indexOf('\n}', start);
  if (end === -1) throw new Error(`${selector} block is not closed`);

  const tokens: Record<string, string> = {};
  for (const match of css.slice(start, end).matchAll(/(--[a-z-]+):\s*(#[0-9a-f]{6});/g)) {
    const name = match[1];
    const value = match[2];
    if (name && value) tokens[name] = value;
  }
  return tokens;
}

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

function linear(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [red, green, blue] = channels(hex);
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((left, right) => right - left) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

const light = readTokenBlock(':root');
const dark = readTokenBlock('.dark');

const TEXT_MINIMUM = 4.5;
const CONTROL_MINIMUM = 3;

/** Surfaces that text and controls are placed on. */
const SURFACES = ['background', 'surface', 'surface-inset', 'surface-hover'] as const;

/** Text colours that must reach 4.5:1 on every surface (DESIGN.md). */
const TEXT_TOKENS = [
  'foreground',
  'muted-foreground',
  'primary',
  'destructive',
  'success',
  'warning',
] as const;

/**
 * Marker is a fill, so only its own foreground sits on it. `--foreground` is
 * light in dark mode and is never placed on Marker; selected rows always use
 * `--highlight-foreground`, which is ink in both themes.
 */
const FOREGROUND_PAIRS = [
  ['primary-foreground', 'primary'],
  ['highlight-foreground', 'highlight'],
] as const;

describe('design tokens', () => {
  it('defines the same colour tokens in light and dark', () => {
    const lightNames = Object.keys(light).sort();
    const darkNames = Object.keys(dark).sort();
    expect(darkNames).toEqual(lightNames);
  });

  it('ships the Phase 1 review tokens', () => {
    for (const name of [
      '--border-strong',
      '--success',
      '--warning',
      '--surface-inset',
      '--surface-hover',
    ]) {
      expect(light[name], `${name} light`).toMatch(/^#[0-9a-f]{6}$/);
      expect(dark[name], `${name} dark`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  for (const [theme, tokens] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    describe(theme, () => {
      for (const text of TEXT_TOKENS) {
        for (const surface of SURFACES) {
          it(`${text} on ${surface} meets 4.5:1`, () => {
            const ratio = contrast(tokens[`--${text}`] as string, tokens[`--${surface}`] as string);
            expect(ratio).toBeGreaterThanOrEqual(TEXT_MINIMUM);
          });
        }
      }

      for (const [foreground, background] of FOREGROUND_PAIRS) {
        it(`${foreground} on ${background} meets 4.5:1`, () => {
          const ratio = contrast(
            tokens[`--${foreground}`] as string,
            tokens[`--${background}`] as string,
          );
          expect(ratio).toBeGreaterThanOrEqual(TEXT_MINIMUM);
        });
      }

      for (const surface of SURFACES) {
        it(`border-strong on ${surface} meets 3:1`, () => {
          const ratio = contrast(
            tokens['--border-strong'] as string,
            tokens[`--${surface}`] as string,
          );
          expect(ratio).toBeGreaterThanOrEqual(CONTROL_MINIMUM);
        });
      }

      it('keeps the decorative hairline below the control threshold', () => {
        for (const surface of SURFACES) {
          const ratio = contrast(tokens['--border'] as string, tokens[`--${surface}`] as string);
          expect(ratio).toBeLessThan(CONTROL_MINIMUM);
        }
      });
    });
  }
});
