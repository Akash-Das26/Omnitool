import { describe, expect, it } from 'vitest';
import { describeCron, formatCron, nextRuns, parseCron } from './index';

function parse(expression: string) {
  const result = parseCron(expression);
  if (!result.ok) throw new Error(`expected "${expression}" to parse: ${result.error.message}`);
  return result.cron;
}

describe('parseCron', () => {
  it('expands a star into the full range and marks it unrestricted', () => {
    const cron = parse('* * * * *');
    expect(cron.minute).toHaveLength(60);
    expect(cron.hour).toHaveLength(24);
    expect(cron.dayOfMonth).toHaveLength(31);
    expect(cron.month).toHaveLength(12);
    expect(cron.dayOfWeek).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(cron.dayOfMonthRestricted).toBe(false);
    expect(cron.dayOfWeekRestricted).toBe(false);
  });

  it('handles steps, ranges, lists and single values', () => {
    expect(parse('*/15 * * * *').minute).toEqual([0, 15, 30, 45]);
    expect(parse('10-20/2 * * * *').minute).toEqual([10, 12, 14, 16, 18, 20]);
    expect(parse('1,15,30 * * * *').minute).toEqual([1, 15, 30]);
    expect(parse('5/10 * * * *').minute).toEqual([5, 15, 25, 35, 45, 55]);
    expect(parse('0 9-17 * * *').hour).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it('accepts month and weekday names in any case', () => {
    const cron = parse('0 9 * JAN-mar mOn-Fri');
    expect(cron.month).toEqual([1, 2, 3]);
    expect(cron.dayOfWeek).toEqual([1, 2, 3, 4, 5]);
    expect(cron.dayOfMonthRestricted).toBe(false);
    expect(cron.dayOfWeekRestricted).toBe(true);
  });

  it('treats 7 as Sunday', () => {
    expect(parse('0 0 * * 7').dayOfWeek).toEqual([0]);
    expect(parse('0 0 * * 0,7').dayOfWeek).toEqual([0]);
  });

  it('expands the aliases', () => {
    expect(parse('@daily').expression).toBe('0 0 * * *');
    expect(parse('@hourly').expression).toBe('0 * * * *');
    expect(parse('@WEEKLY').expression).toBe('0 0 * * 0');
    expect(parse('@monthly').expression).toBe('0 0 1 * *');
    expect(parse('@annually').expression).toBe('0 0 1 1 *');
  });

  it('normalises spacing', () => {
    expect(parse('  0   9  *  *  mon  ').expression).toBe('0 9 * * mon');
  });

  it('names the field and its position when a value is invalid', () => {
    const cases: [string, string, number][] = [
      ['61 * * * *', 'minute', 0],
      ['* 24 * * *', 'hour', 1],
      ['* * 0 * *', 'day-of-month', 2],
      ['* * * 13 *', 'month', 3],
      ['* * * * 8', 'day-of-week', 4],
      ['* * * * nope', 'day-of-week', 4],
    ];
    for (const [expression, field, index] of cases) {
      const result = parseCron(expression);
      expect(result.ok, expression).toBe(false);
      if (result.ok) continue;
      expect(result.error.field, expression).toBe(field);
      expect(result.error.index, expression).toBe(index);
      expect(result.error.message.length, expression).toBeGreaterThan(5);
    }
  });

  it('rejects malformed structure with a readable message', () => {
    const four = parseCron('* * * *');
    expect(four.ok).toBe(false);
    if (!four.ok) expect(four.error.message).toContain('five fields');

    const reversed = parseCron('10-5 * * * *');
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.error.message).toContain('starts after it ends');

    const zeroStep = parseCron('*/0 * * * *');
    expect(zeroStep.ok).toBe(false);
    if (!zeroStep.ok) expect(zeroStep.error.message).toContain('Step');

    const empty = parseCron('1,,2 * * * *');
    expect(empty.ok).toBe(false);
  });
});

describe('describeCron', () => {
  it('reads common schedules in plain English', () => {
    expect(describeCron(parse('* * * * *'))).toBe('Every minute of every hour.');
    expect(describeCron(parse('*/5 * * * *'))).toBe('Every 5 minutes.');
    expect(describeCron(parse('0 9 * * *'))).toBe('At 09:00.');
    expect(describeCron(parse('0 9 * * mon-fri'))).toBe(
      'At 09:00, on Monday, Tuesday, Wednesday, Thursday and Friday.',
    );
    expect(describeCron(parse('0 0 1 * *'))).toBe('At 00:00, on day 1 of the month.');
  });

  it('spells out the day-of-month OR day-of-week rule', () => {
    expect(describeCron(parse('0 0 1 * mon'))).toContain('on day 1 of the month or on Monday');
  });

  it('mentions restricted months', () => {
    expect(describeCron(parse('0 12 * jan,dec *'))).toContain('in January and December');
  });

  it('lists several times when there is no shorter phrasing', () => {
    expect(describeCron(parse('0 9,17 * * *'))).toContain('09:00');
    expect(describeCron(parse('0 9,17 * * *'))).toContain('17:00');
  });
});

describe('formatCron', () => {
  it('joins the five fields and fills blanks with a star', () => {
    expect(formatCron(['0', '9', '', '', 'mon'])).toBe('0 9 * * mon');
    expect(parseCron(formatCron(['*/15', '*', '*', '*', '*'])).ok).toBe(true);
  });
});

describe('nextRuns', () => {
  it('walks forward from the given instant, exclusive', () => {
    const cron = parse('*/15 * * * *');
    const runs = nextRuns(cron, {
      from: new Date('2026-01-01T00:00:00Z'),
      count: 3,
      timeZone: 'UTC',
    });
    expect(runs.map((run) => run.utc)).toEqual([
      '2026-01-01 00:15',
      '2026-01-01 00:30',
      '2026-01-01 00:45',
    ]);
    expect(runs[0]?.local).toBe('2026-01-01 00:15');
  });

  it('runs once per matching day and stops at the count', () => {
    const runs = nextRuns(parse('0 9 * * *'), {
      from: new Date('2026-06-01T10:00:00Z'),
      count: 2,
      timeZone: 'UTC',
    });
    expect(runs.map((run) => run.utc)).toEqual(['2026-06-02 09:00', '2026-06-03 09:00']);
  });

  it('ORs a restricted day-of-month with a restricted day-of-week', () => {
    // 1 January 2026 is a Thursday, so the first Monday is the 5th and the next
    // first-of-month is 1 February.
    const runs = nextRuns(parse('0 0 1 * mon'), {
      from: new Date('2026-01-01T00:00:00Z'),
      count: 6,
      timeZone: 'UTC',
    });
    expect(runs.map((run) => run.utc)).toEqual([
      '2026-01-05 00:00',
      '2026-01-12 00:00',
      '2026-01-19 00:00',
      '2026-01-26 00:00',
      '2026-02-01 00:00',
      '2026-02-02 00:00',
    ]);
  });

  it('skips a wall-clock time that the clocks moved past (Europe/London)', () => {
    // 29 March 2026: 01:00 GMT becomes 02:00 BST, so 01:30 does not exist.
    const runs = nextRuns(parse('30 1 * * *'), {
      from: new Date('2026-03-28T00:30:00Z'),
      count: 2,
      timeZone: 'Europe/London',
    });
    expect(runs.map((run) => run.local)).toEqual(['2026-03-28 01:30', '2026-03-30 01:30']);
    // 01:30 BST is 00:30 UTC.
    expect(runs[1]?.utc).toBe('2026-03-30 00:30');
  });

  it('runs a repeated wall-clock time once, at its first occurrence (Europe/London)', () => {
    // 25 October 2026: 02:00 BST becomes 01:00 GMT, so 01:30 happens twice.
    const runs = nextRuns(parse('30 1 * * *'), {
      from: new Date('2026-10-24T12:00:00Z'),
      count: 2,
      timeZone: 'Europe/London',
    });
    expect(runs.map((run) => run.local)).toEqual(['2026-10-25 01:30', '2026-10-26 01:30']);
    expect(runs[0]?.utc).toBe('2026-10-25 00:30'); // BST, the first one
    expect(runs[1]?.utc).toBe('2026-10-26 01:30'); // GMT
  });

  it('applies the same rules in America/New_York', () => {
    // 8 March 2026: 02:00 EST becomes 03:00 EDT, so 02:30 does not exist.
    const spring = nextRuns(parse('30 2 * * *'), {
      from: new Date('2026-03-07T04:00:00Z'),
      count: 2,
      timeZone: 'America/New_York',
    });
    expect(spring.map((run) => run.local)).toEqual(['2026-03-07 02:30', '2026-03-09 02:30']);
    expect(spring[1]?.utc).toBe('2026-03-09 06:30');

    // 1 November 2026: 02:00 EDT becomes 01:00 EST, so 01:30 happens twice.
    const autumn = nextRuns(parse('30 1 * * *'), {
      from: new Date('2026-10-31T12:00:00Z'),
      count: 2,
      timeZone: 'America/New_York',
    });
    expect(autumn.map((run) => run.local)).toEqual(['2026-11-01 01:30', '2026-11-02 01:30']);
    expect(autumn[0]?.utc).toBe('2026-11-01 05:30'); // EDT, the first one
    expect(autumn[1]?.utc).toBe('2026-11-02 06:30'); // EST
  });

  it('handles the last day of February and leap years', () => {
    const runs = nextRuns(parse('0 0 29 2 *'), {
      from: new Date('2026-01-01T00:00:00Z'),
      count: 1,
      timeZone: 'UTC',
    });
    expect(runs[0]?.utc).toBe('2028-02-29 00:00');
  });

  it('returns nothing rather than looping when no day can ever match', () => {
    const runs = nextRuns(parse('0 0 30 2 *'), {
      from: new Date('2026-01-01T00:00:00Z'),
      count: 1,
      timeZone: 'UTC',
    });
    expect(runs).toEqual([]);
  });
});
