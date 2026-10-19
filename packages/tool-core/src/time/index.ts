export class TimeCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeCalculationError';
  }
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const WEEK = 7 * DAY;

const DURATION_FACTORS: Readonly<Record<string, number>> = {
  ms: 1,
  millisecond: 1,
  milliseconds: 1,
  s: SECOND,
  sec: SECOND,
  secs: SECOND,
  second: SECOND,
  seconds: SECOND,
  m: MINUTE,
  min: MINUTE,
  mins: MINUTE,
  minute: MINUTE,
  minutes: MINUTE,
  h: HOUR,
  hr: HOUR,
  hrs: HOUR,
  hour: HOUR,
  hours: HOUR,
  d: DAY,
  day: DAY,
  days: DAY,
  w: WEEK,
  wk: WEEK,
  wks: WEEK,
  week: WEEK,
  weeks: WEEK,
};

const CLOCK_PATTERN = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/;
const TOKEN_PATTERN =
  /(\d+(?:\.\d+)?)\s*(milliseconds?|ms|seconds?|secs?|s|minutes?|mins?|min|m|hours?|hrs?|h|days?|d|weeks?|wks?|w)(?![a-zA-Z])/g;

/**
 * Read a duration such as `1h 30m`, `1:30` or `90s` into milliseconds.
 * Durations are non-negative; subtraction is handled by the caller.
 */
export function parseDuration(input: string): number {
  const text = input.trim();
  if (text === '') throw new TimeCalculationError('Enter a duration');

  const clock = CLOCK_PATTERN.exec(text);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    const seconds = clock[3] === undefined ? 0 : Number(clock[3]);
    if (minutes > 59 || seconds > 59) {
      throw new TimeCalculationError('Minutes and seconds in a clock value must be under 60');
    }
    return hours * HOUR + minutes * MINUTE + seconds * SECOND;
  }

  let total = 0;
  let consumed = 0;
  let matched = false;

  TOKEN_PATTERN.lastIndex = 0;
  for (let match = TOKEN_PATTERN.exec(text); match !== null; match = TOKEN_PATTERN.exec(text)) {
    const gap = text.slice(consumed, match.index);
    if (gap.trim() !== '' && !/^[\s,]*$/.test(gap)) {
      throw new TimeCalculationError(`Could not read a duration from "${input}"`);
    }
    const amount = Number(match[1]);
    const factor = DURATION_FACTORS[match[2] ?? ''];
    if (!Number.isFinite(amount) || factor === undefined) {
      throw new TimeCalculationError(`Could not read a duration from "${input}"`);
    }
    total += amount * factor;
    consumed = TOKEN_PATTERN.lastIndex;
    matched = true;
  }

  if (!matched || text.slice(consumed).trim() !== '') {
    throw new TimeCalculationError(`Could not read a duration from "${input}"`);
  }

  return total;
}

export interface DurationParts {
  readonly negative: boolean;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly milliseconds: number;
}

export function splitDuration(totalMs: number): DurationParts {
  if (!Number.isFinite(totalMs)) throw new TimeCalculationError('Enter a duration');
  const remaining = Math.round(Math.abs(totalMs));

  const days = Math.floor(remaining / DAY);
  const hours = Math.floor((remaining % DAY) / HOUR);
  const minutes = Math.floor((remaining % HOUR) / MINUTE);
  const seconds = Math.floor((remaining % MINUTE) / SECOND);
  const milliseconds = remaining % SECOND;

  return { negative: totalMs < 0, days, hours, minutes, seconds, milliseconds };
}

export function formatDuration(totalMs: number): string {
  const parts = splitDuration(totalMs);
  const chunks: string[] = [];
  if (parts.days > 0) chunks.push(`${parts.days} d`);
  if (parts.hours > 0) chunks.push(`${parts.hours} h`);
  if (parts.minutes > 0) chunks.push(`${parts.minutes} min`);
  if (parts.seconds > 0) chunks.push(`${parts.seconds} s`);
  if (parts.milliseconds > 0) chunks.push(`${parts.milliseconds} ms`);
  if (chunks.length === 0) return '0 s';
  return `${parts.negative ? '-' : ''}${chunks.join(' ')}`;
}

/** Hours, minutes and seconds with no day carry, so 26 hours reads as 26:00:00. */
export function formatClock(totalMs: number): string {
  if (!Number.isFinite(totalMs)) throw new TimeCalculationError('Enter a duration');
  const totalSeconds = Math.floor(Math.abs(totalMs) / SECOND);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${totalMs < 0 ? '-' : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export interface DurationDifference {
  readonly totalMs: number;
  readonly parts: DurationParts;
}

/** Elapsed absolute time between two instants; a DST change makes a civil day 23 or 25 hours. */
export function difference(startMs: number, endMs: number): DurationDifference {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new TimeCalculationError('Enter two dates and times');
  }
  const totalMs = endMs - startMs;
  return { totalMs, parts: splitDuration(totalMs) };
}

const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = FORMATTERS.get(timeZone);
  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    throw new TimeCalculationError(`Unknown time zone: ${timeZone}`);
  }

  FORMATTERS.set(timeZone, formatter);
  return formatter;
}

export interface ZonedParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

function partsAt(instantMs: number, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(instantMs));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? Number.NaN);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  };
}

function offsetAt(instantMs: number, timeZone: string): number {
  const parts = partsAt(instantMs, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(instantMs / SECOND) * SECOND;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Read a wall-clock date and time in a named zone. An ambiguous time (the hour
 * that repeats when the clocks go back) resolves to the earlier instant; a time
 * inside the spring-forward gap moves forward by the change, as browsers do.
 */
export function parseZonedDateTime(input: string, timeZone: string): number {
  const match = DATE_PATTERN.exec(input.trim());
  if (!match) {
    throw new TimeCalculationError('Enter a date and time as YYYY-MM-DD HH:MM');
  }

  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map((value) => Number(value ?? 0)) as [number, number, number, number, number, number];

  const validRanges =
    year >= 1000 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59;

  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(guess);
  const sameCalendarDate =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;

  if (!validRanges || !sameCalendarDate) {
    throw new TimeCalculationError('That date and time does not exist');
  }

  const wanted = { year, month, day, hour, minute, second };
  const offsets = new Set([
    offsetAt(guess - 12 * HOUR, timeZone),
    offsetAt(guess, timeZone),
    offsetAt(guess + 12 * HOUR, timeZone),
  ]);

  const candidates = [...offsets]
    .map((offset) => guess - offset)
    .filter((instant) => {
      const parts = partsAt(instant, timeZone);
      return (
        parts.year === wanted.year &&
        parts.month === wanted.month &&
        parts.day === wanted.day &&
        parts.hour === wanted.hour &&
        parts.minute === wanted.minute &&
        parts.second === wanted.second
      );
    });

  if (candidates.length > 0) return Math.min(...candidates);

  // The wall-clock time was skipped by a forward change: keep the offset from
  // before the change, which lands just after it.
  return guess - offsetAt(guess - 12 * HOUR, timeZone);
}

export function formatZonedDateTime(instantMs: number, timeZone: string): string {
  const parts = partsAt(instantMs, timeZone);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** The zone's offset at an instant, written as +01:00 or -05:00. */
export function formatOffset(instantMs: number, timeZone: string): string {
  const offset = offsetAt(instantMs, timeZone);
  const totalMinutes = Math.round(Math.abs(offset) / MINUTE);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${offset < 0 ? '-' : '+'}${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}
