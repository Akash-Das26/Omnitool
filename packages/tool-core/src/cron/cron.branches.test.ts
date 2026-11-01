import { describe, expect, it } from 'vitest';
import { CRON_ALIASES, describeCron, nextRuns, type ParsedCron, parseCron } from './index';

function parsed(expression: string): ParsedCron {
  const result = parseCron(expression);
  if (!result.ok) throw new Error(`expected ${expression} to parse: ${result.error.message}`);
  return result.cron;
}

function errorOf(expression: string): string {
  const result = parseCron(expression);
  if (result.ok) throw new Error(`expected ${expression} to be refused`);
  return result.error.message;
}

describe('parseCron errors', () => {
  it('counts the fields and says how many it found', () => {
    expect(errorOf('')).toBe('A cron expression has five fields; this one has 0');
    expect(errorOf('* * * *')).toBe('A cron expression has five fields; this one has 4');
    expect(errorOf('* * * * * *')).toBe('A cron expression has five fields; this one has 6');
  });

  it('names the field that is wrong', () => {
    expect(errorOf('1,,2 * * * *')).toBe('Empty list item in minute');
    expect(errorOf('*/5/2 * * * *')).toBe('"*/5/2" has more than one step in minute');
    expect(errorOf('*/0 * * * *')).toBe('Step "0" must be a whole number above 0');
    expect(errorOf('*/x * * * *')).toBe('Step "x" must be a whole number above 0');
    expect(errorOf('5-1 * * * *')).toBe('Range "5-1" starts after it ends');
    expect(errorOf('1-2-3 * * * *')).toBe('"1-2-3" is not a range');
    expect(errorOf('abc * * * *')).toBe('"abc" is not a valid minute');
    expect(errorOf('1-abc * * * *')).toBe('"abc" is not a valid minute');
    expect(errorOf('* 25 * * *')).toBe('"25" is not a valid hour');
  });

  it('accepts names and the seven-as-Sunday form', () => {
    expect(parsed('0 0 * JAN MON').month).toEqual([1]);
    expect(parsed('0 0 * * MON').dayOfWeek).toEqual([1]);
    expect(parsed('0 0 * * 7').dayOfWeek).toEqual([0]);
  });

  it('reads a step on its own as "from here to the end"', () => {
    expect(parsed('5/10 * * * *').minute).toEqual([5, 15, 25, 35, 45, 55]);
    expect(parsed('*/20 * * * *').minute).toEqual([0, 20, 40]);
  });

  it('expands the aliases', () => {
    expect(parsed('@daily').expression).toBe('0 0 * * *');
    expect(parsed('@weekly').dayOfWeek).toEqual([0]);
    for (const [alias, expression] of Object.entries(CRON_ALIASES)) {
      expect(parsed(alias).expression, alias).toBe(expression);
    }
  });
});

describe('describeCron', () => {
  it('describes a minute-by-minute schedule', () => {
    expect(describeCron(parsed('* * * * *'))).toBe('Every minute of every hour.');
  });

  it('describes a step past the hour', () => {
    expect(describeCron(parsed('*/10 3 * * *'))).toContain('past hour 03');
    expect(describeCron(parsed('*/15 * * * *'))).toBe('Every 15 minutes.');
  });

  it('lists the times when there is no pattern', () => {
    expect(describeCron(parsed('5,10 9 * * *'))).toBe('At 09:05 and 09:10.');
  });

  it('describes the day-of-month and day-of-week or rule', () => {
    expect(describeCron(parsed('0 0 1 * *'))).toContain('on day 1 of the month');
    expect(describeCron(parsed('0 0 * * 1'))).toContain('on Monday');
    expect(describeCron(parsed('0 0 1 * 1'))).toContain('on day 1 of the month or on Monday');
  });

  it('names the months when only some are chosen', () => {
    expect(describeCron(parsed('0 0 * 6 *'))).toContain('in June');
  });
});

describe('nextRuns', () => {
  const from = new Date('2027-03-01T00:00:00Z');

  it('returns the number of runs asked for', () => {
    expect(nextRuns(parsed('0 9 * * *'), { from, count: 3, timeZone: 'UTC' })).toHaveLength(3);
  });

  it('returns nothing for a schedule that never falls in the horizon', () => {
    // 29 February in a year that is not a leap year is far outside four years.
    const runs = nextRuns(parsed('0 0 30 2 *'), { from, count: 3, timeZone: 'UTC' });
    expect(runs).toEqual([]);
  });
});
