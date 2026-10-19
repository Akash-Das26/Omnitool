import { describe, expect, it } from 'vitest';
import {
  difference,
  formatClock,
  formatDuration,
  formatOffset,
  formatZonedDateTime,
  parseDuration,
  parseZonedDateTime,
  splitDuration,
  TimeCalculationError,
} from './index';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('parseDuration', () => {
  it('reads unit tokens with or without spaces', () => {
    expect(parseDuration('1h 30m')).toBe(90 * MINUTE);
    expect(parseDuration('1h30m')).toBe(90 * MINUTE);
    expect(parseDuration('2d 4h 3m 12s')).toBe(2 * DAY + 4 * HOUR + 3 * MINUTE + 12 * SECOND);
    expect(parseDuration('500ms')).toBe(500);
    expect(parseDuration('1.5h')).toBe(90 * MINUTE);
    expect(parseDuration('1 week')).toBe(7 * DAY);
  });

  it('reads clock notation', () => {
    expect(parseDuration('1:30')).toBe(90 * MINUTE);
    expect(parseDuration('01:30:00')).toBe(90 * MINUTE);
    expect(parseDuration('90:00')).toBe(90 * HOUR);
  });

  it('ignores surrounding spaces and commas', () => {
    expect(parseDuration(' 1 h, 30 m ')).toBe(90 * MINUTE);
  });

  it('rejects empty, unknown and trailing input', () => {
    expect(() => parseDuration('')).toThrow(TimeCalculationError);
    expect(() => parseDuration('later')).toThrow('Could not read');
    expect(() => parseDuration('1h 30')).toThrow('Could not read');
    expect(() => parseDuration('1x')).toThrow('Could not read');
    expect(() => parseDuration('-1h')).toThrow('Could not read');
  });
});

describe('splitDuration and formatDuration', () => {
  it('breaks a duration into whole units', () => {
    expect(splitDuration(DAY + HOUR + MINUTE + SECOND + 250)).toEqual({
      negative: false,
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 1,
      milliseconds: 250,
    });
  });

  it('marks negative durations but keeps the parts positive', () => {
    const parts = splitDuration(-(2 * HOUR + 30 * MINUTE));
    expect(parts.negative).toBe(true);
    expect(parts.hours).toBe(2);
    expect(parts.minutes).toBe(30);
  });

  it('formats a duration in words', () => {
    expect(formatDuration(90 * MINUTE)).toBe('1 h 30 min');
    expect(formatDuration(2 * DAY + 3 * HOUR + 4 * MINUTE + 5 * SECOND)).toBe('2 d 3 h 4 min 5 s');
    expect(formatDuration(0)).toBe('0 s');
    expect(formatDuration(-90 * MINUTE)).toBe('-1 h 30 min');
    expect(formatDuration(250)).toBe('250 ms');
  });

  it('formats a clock value', () => {
    expect(formatClock(90 * MINUTE)).toBe('01:30:00');
    expect(formatClock(26 * HOUR + 3 * MINUTE + 4 * SECOND)).toBe('26:03:04');
    expect(formatClock(-MINUTE)).toBe('-00:01:00');
  });

  it('rejects values that are not finite', () => {
    expect(() => formatDuration(Number.NaN)).toThrow(TimeCalculationError);
  });
});

describe('difference', () => {
  it('reports the elapsed time and its parts', () => {
    const start = Date.UTC(2026, 0, 1, 9, 0, 0);
    const end = Date.UTC(2026, 0, 2, 10, 30, 0);
    const result = difference(start, end);

    expect(result.totalMs).toBe(DAY + 90 * MINUTE);
    expect(result.parts.days).toBe(1);
    expect(result.parts.hours).toBe(1);
    expect(result.parts.minutes).toBe(30);
    expect(result.parts.negative).toBe(false);
  });

  it('is negative when the end is before the start', () => {
    const result = difference(2 * HOUR, 0);
    expect(result.totalMs).toBe(-2 * HOUR);
    expect(result.parts.negative).toBe(true);
  });
});

describe('zoned date and time', () => {
  it('reads a wall-clock time in the given zone', () => {
    // London is GMT in January and BST in July.
    expect(parseZonedDateTime('2026-01-15T12:00', 'Europe/London')).toBe(
      Date.UTC(2026, 0, 15, 12, 0),
    );
    expect(parseZonedDateTime('2026-07-15T12:00', 'Europe/London')).toBe(
      Date.UTC(2026, 6, 15, 11, 0),
    );
  });

  it('knows that a day is 23 hours long when the clocks go forward', () => {
    // DST begins in London on 29 March 2026.
    const start = parseZonedDateTime('2026-03-29T00:00', 'Europe/London');
    const end = parseZonedDateTime('2026-03-30T00:00', 'Europe/London');
    expect(difference(start, end).totalMs).toBe(23 * HOUR);
  });

  it('knows that a day is 25 hours long when the clocks go back', () => {
    // DST ends in London on 25 October 2026.
    const start = parseZonedDateTime('2026-10-25T00:00', 'Europe/London');
    const end = parseZonedDateTime('2026-10-26T00:00', 'Europe/London');
    expect(difference(start, end).totalMs).toBe(25 * HOUR);
  });

  it('resolves an ambiguous wall-clock time to the earlier instant', () => {
    // 01:30 happens twice in London on 25 October 2026.
    expect(parseZonedDateTime('2026-10-25T01:30', 'Europe/London')).toBe(
      Date.UTC(2026, 9, 25, 0, 30),
    );
  });

  it('moves a time inside the spring-forward gap forward by the change', () => {
    // 01:30 does not exist on 29 March 2026; it lands at 02:30 BST.
    expect(parseZonedDateTime('2026-03-29T01:30', 'Europe/London')).toBe(
      Date.UTC(2026, 2, 29, 1, 30),
    );
  });

  it('formats an instant in a zone and reports its offset', () => {
    expect(formatZonedDateTime(Date.UTC(2026, 6, 15, 11, 0), 'Europe/London')).toBe(
      '2026-07-15 12:00',
    );
    expect(formatOffset(Date.UTC(2026, 6, 15, 11, 0), 'Europe/London')).toBe('+01:00');
    expect(formatOffset(Date.UTC(2026, 0, 15, 12, 0), 'Europe/London')).toBe('+00:00');
    expect(formatOffset(Date.UTC(2026, 0, 15, 12, 0), 'America/New_York')).toBe('-05:00');
  });

  it('rejects malformed dates, impossible dates and unknown zones', () => {
    expect(() => parseZonedDateTime('15/01/2026 12:00', 'UTC')).toThrow('YYYY-MM-DD');
    expect(() => parseZonedDateTime('2026-02-30T10:00', 'UTC')).toThrow('does not exist');
    expect(() => parseZonedDateTime('2026-01-15T24:00', 'UTC')).toThrow('does not exist');
    expect(() => parseZonedDateTime('2026-01-15T12:00', 'Mars/Olympus')).toThrow(
      TimeCalculationError,
    );
  });
});
