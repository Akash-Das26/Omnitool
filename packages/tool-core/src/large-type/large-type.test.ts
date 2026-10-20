import { describe, expect, it } from 'vitest';
import { fitFontSize, MAX_FONT_SIZE, MIN_FONT_SIZE, prepareDisplay } from './index';

describe('prepareDisplay', () => {
  it('splits lines, collapses inner spacing and trims each line', () => {
    const plan = prepareDisplay('  Hello   there  \n\nSecond\tline\n');
    expect(plan.lines).toEqual(['Hello there', '', 'Second line']);
    expect(plan.characters).toBe(22);
    expect(plan.longestLine).toBe(11);
  });

  it('normalises Windows line endings', () => {
    expect(prepareDisplay('a\r\nb').lines).toEqual(['a', 'b']);
  });

  it('drops leading and trailing blank lines but keeps blank lines inside', () => {
    expect(prepareDisplay('\n\nfirst\n\nsecond\n\n').lines).toEqual(['first', '', 'second']);
  });

  it('returns an empty plan for empty or whitespace-only input', () => {
    expect(prepareDisplay('')).toEqual({ lines: [], characters: 0, longestLine: 0 });
    expect(prepareDisplay('   \n \n').lines).toEqual([]);
  });
});

describe('fitFontSize', () => {
  const viewport = { width: 1280, height: 720 };

  it('gives an empty plan the maximum size', () => {
    expect(fitFontSize(prepareDisplay(''), viewport)).toBe(MAX_FONT_SIZE);
  });

  it('shrinks as the line gets longer and as lines are added', () => {
    const short = fitFontSize(prepareDisplay('Hi'), viewport);
    const long = fitFontSize(prepareDisplay('H'.repeat(40)), viewport);
    const many = fitFontSize(
      prepareDisplay(Array.from({ length: 6 }, () => 'Hi').join('\n')),
      viewport,
    );
    expect(long).toBeLessThan(short);
    expect(many).toBeLessThan(short);
  });

  it('never goes below the floor or above the ceiling', () => {
    const tiny = fitFontSize(prepareDisplay('x'.repeat(500)), { width: 320, height: 480 });
    expect(tiny).toBe(MIN_FONT_SIZE);
    const huge = fitFontSize(prepareDisplay('x'), { width: 4000, height: 4000 });
    expect(huge).toBe(MAX_FONT_SIZE);
  });

  it('stays inside the viewport it was given', () => {
    const plan = prepareDisplay('Large type\nis readable from across a room');
    const size = fitFontSize(plan, { width: 390, height: 844 });
    expect(size * 0.62 * plan.longestLine).toBeLessThanOrEqual(390 + 1);
    expect(size * 1.15 * plan.lines.length).toBeLessThanOrEqual(844 + 1);
  });
});
