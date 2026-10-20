/**
 * Five-field cron: minute, hour, day of month, month, day of week.
 *
 * Supported syntax: `*`, single values, `a-b` ranges, `/n` steps (`*&#47;5`,
 * `10-20/2`, `5/10`), comma lists, and three-letter month and weekday names.
 * The common aliases `@hourly`, `@daily`/`@midnight`, `@weekly`, `@monthly` and
 * `@yearly`/`@annually` are accepted as whole expressions.
 *
 * Rules this module implements and tests:
 *
 * - When **both** day-of-month and day-of-week are restricted, a day matches if
 *   either one matches (the standard Vixie cron behaviour). When only one is
 *   restricted, the other is ignored.
 * - Times are wall-clock readings in the chosen IANA zone. A wall-clock time
 *   that does not exist because the clocks moved forward never runs. A
 *   wall-clock time that occurs twice because the clocks moved back runs once,
 *   at its first occurrence. Both rules are tested against Europe/London and
 *   America/New_York.
 */

export type CronField = 'minute' | 'hour' | 'day-of-month' | 'month' | 'day-of-week';

export interface CronError {
  readonly field: CronField;
  /** Zero-based position of the field in the expression. */
  readonly index: number;
  readonly message: string;
}

export interface ParsedCron {
  readonly expression: string;
  readonly minute: readonly number[];
  readonly hour: readonly number[];
  readonly dayOfMonth: readonly number[];
  readonly month: readonly number[];
  readonly dayOfWeek: readonly number[];
  readonly dayOfMonthRestricted: boolean;
  readonly dayOfWeekRestricted: boolean;
}

export type ParseResult =
  | { readonly ok: true; readonly cron: ParsedCron }
  | { readonly ok: false; readonly error: CronError };

export const CRON_ALIASES: Readonly<Record<string, string>> = {
  '@hourly': '0 * * * *',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@weekly': '0 0 * * 0',
  '@monthly': '0 0 1 * *',
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
};

const FIELDS: readonly { field: CronField; min: number; max: number; names?: readonly string[] }[] =
  [
    { field: 'minute', min: 0, max: 59 },
    { field: 'hour', min: 0, max: 23 },
    { field: 'day-of-month', min: 1, max: 31 },
    {
      field: 'month',
      min: 1,
      max: 12,
      names: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
    },
    {
      field: 'day-of-week',
      min: 0,
      max: 7,
      names: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    },
  ];

const FIELD_LABELS: Readonly<Record<CronField, string>> = {
  minute: 'Minute',
  hour: 'Hour',
  'day-of-month': 'Day of month',
  month: 'Month',
  'day-of-week': 'Day of week',
};

function label(field: CronField): string {
  return FIELD_LABELS[field];
}

function fieldValue(token: string, spec: (typeof FIELDS)[number]): number | null {
  const lower = token.toLowerCase();
  if (spec.names) {
    const index = spec.names.indexOf(lower);
    if (index !== -1) return spec.field === 'month' ? index + 1 : index;
  }
  if (!/^\d{1,2}$/.test(lower)) return null;
  const value = Number(lower);
  if (value < spec.min || value > spec.max) return null;
  return value;
}

function parseField(
  raw: string,
  index: number,
): { ok: true; values: number[]; restricted: boolean } | { ok: false; error: CronError } {
  const spec = FIELDS[index];
  if (!spec) throw new Error(`No cron field at index ${index}`);
  const fail = (message: string): { ok: false; error: CronError } => ({
    ok: false,
    error: { field: spec.field, index, message },
  });

  if (raw === '') return fail(`${label(spec.field)} is empty`);
  if (raw === '*') {
    return { ok: true, values: valuesOf(spec, rangeValues(spec.min, spec.max)), restricted: false };
  }

  const values = new Set<number>();
  for (const part of raw.split(',')) {
    if (part === '') return fail(`Empty list item in ${label(spec.field).toLowerCase()}`);

    const [base, stepText, ...rest] = part.split('/');
    if (rest.length > 0 || base === undefined) {
      return fail(`"${part}" has more than one step in ${label(spec.field).toLowerCase()}`);
    }
    let step = 1;
    if (stepText !== undefined) {
      if (!/^\d{1,2}$/.test(stepText) || Number(stepText) === 0) {
        return fail(`Step "${stepText}" must be a whole number above 0`);
      }
      step = Number(stepText);
    }

    let start: number;
    let end: number;
    if (base === '*') {
      start = spec.min;
      end = spec.max;
    } else if (base.includes('-')) {
      const [from, to, ...extra] = base.split('-');
      if (extra.length > 0 || from === undefined || to === undefined) {
        return fail(`"${base}" is not a range`);
      }
      const startValue = fieldValue(from, spec);
      const endValue = fieldValue(to, spec);
      if (startValue === null)
        return fail(`"${from}" is not a valid ${label(spec.field).toLowerCase()}`);
      if (endValue === null)
        return fail(`"${to}" is not a valid ${label(spec.field).toLowerCase()}`);
      if (startValue > endValue) {
        return fail(`Range "${base}" starts after it ends`);
      }
      start = startValue;
      end = endValue;
    } else {
      const single = fieldValue(base, spec);
      if (single === null) {
        return fail(`"${base}" is not a valid ${label(spec.field).toLowerCase()}`);
      }
      start = single;
      // `5/10` means "from 5 to the end, every 10".
      end = stepText === undefined ? single : spec.max;
    }

    for (let value = start; value <= end; value += step) values.add(value);
  }

  if (values.size === 0) return fail(`No values in ${label(spec.field).toLowerCase()}`);
  return {
    ok: true,
    values: valuesOf(spec, [...values]),
    restricted: raw !== '*',
  };
}

/** Day of week accepts 7 as Sunday, so fold it into 0 and sort. */
function valuesOf(spec: (typeof FIELDS)[number], values: number[]): number[] {
  const folded =
    spec.field === 'day-of-week' ? values.map((value) => (value === 7 ? 0 : value)) : values;
  return [...new Set(folded)].sort((a, b) => a - b);
}

function rangeValues(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

export function parseCron(expression: string): ParseResult {
  const trimmed = expression.trim();
  const expanded = CRON_ALIASES[trimmed.toLowerCase()] ?? trimmed;
  const parts = expanded.split(/\s+/).filter(Boolean);
  if (parts.length !== 5) {
    return {
      ok: false,
      error: {
        field: 'minute',
        index: 0,
        message: `A cron expression has five fields; this one has ${parts.length}`,
      },
    };
  }

  const parsed: number[][] = [];
  const restricted: boolean[] = [];
  for (let index = 0; index < 5; index += 1) {
    const result = parseField(parts[index] ?? '', index);
    if (!result.ok) return result;
    parsed.push(result.values);
    restricted.push(result.restricted);
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parsed as [
    number[],
    number[],
    number[],
    number[],
    number[],
  ];

  return {
    ok: true,
    cron: {
      expression: parts.join(' '),
      minute,
      hour,
      dayOfMonth,
      month,
      dayOfWeek,
      dayOfMonthRestricted: restricted[2] ?? false,
      dayOfWeekRestricted: restricted[4] ?? false,
    },
  };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function joinList(items: readonly string[]): string {
  if (items.length === 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function listText(values: readonly number[], format: (value: number) => string): string {
  return joinList(values.map(format));
}

function stepDescriptor(
  values: readonly number[],
  min: number,
  max: number,
  unit: string,
): string | null {
  if (values.length < 2) return null;
  const step = (values[1] ?? 0) - (values[0] ?? 0);
  if (step < 1) return null;
  for (let index = 1; index < values.length; index += 1) {
    if ((values[index] ?? 0) - (values[index - 1] ?? 0) !== step) return null;
  }
  if ((values[0] ?? 0) !== min) return null;
  const coversEnd = (values.at(-1) ?? 0) + step > max;
  return coversEnd ? `every ${step} ${unit}s` : `every ${step} ${unit}s from ${values[0]}`;
}

/** Plain-English reading of the schedule, in our own wording. */
export function describeCron(cron: ParsedCron): string {
  const minuteEvery = stepDescriptor(cron.minute, 0, 59, 'minute');
  const hourEvery = stepDescriptor(cron.hour, 0, 23, 'hour');

  let time: string;
  if (cron.minute.length === 60 && cron.hour.length === 24) {
    time = 'Every minute of every hour';
  } else if (minuteEvery && cron.hour.length === 1) {
    time = `${capitalise(minuteEvery)} past hour ${String(cron.hour[0]).padStart(2, '0')}`;
  } else if (minuteEvery && cron.hour.length === 24) {
    time = capitalise(minuteEvery);
  } else if (cron.hour.length === 1 && cron.minute.length === 1) {
    time = `At ${String(cron.hour[0]).padStart(2, '0')}:${String(cron.minute[0]).padStart(2, '0')}`;
  } else if (hourEvery && cron.minute.length === 1) {
    time = `At minute ${cron.minute[0]} of ${hourEvery}`;
  } else {
    time = `At ${joinList(
      cron.hour.flatMap((hour) =>
        cron.minute.map(
          (minute) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        ),
      ),
    )}`;
  }

  const days: string[] = [];
  const dom = cron.dayOfMonthRestricted
    ? `day ${listText(cron.dayOfMonth, (value) => String(value))} of the month`
    : null;
  const dow = cron.dayOfWeekRestricted
    ? listText(cron.dayOfWeek, (value) => WEEKDAY_NAMES[value] ?? String(value))
    : null;

  if (dom && dow) days.push(`on ${dom} or on ${dow}`);
  else if (dom) days.push(`on ${dom}`);
  else if (dow) days.push(`on ${dow}`);

  const months =
    cron.month.length < 12
      ? `in ${listText(cron.month, (value) => MONTH_NAMES[value - 1] ?? String(value))}`
      : null;

  return `${[time, ...days, months].filter(Boolean).join(', ')}.`.replace(/\.,/, '.');
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface ZoneParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const existing = formatters.get(timeZone);
  if (existing) return existing;
  const created = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  formatters.set(timeZone, created);
  return created;
}

function zoneParts(instantMs: number, timeZone: string): ZoneParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(instantMs));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    // Some engines render midnight as 24 when hourCycle is ignored.
    hour: read('hour') % 24,
    minute: read('minute'),
  };
}

function offsetMinutes(instantMs: number, timeZone: string): number {
  const parts = zoneParts(instantMs, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const truncated = Math.floor(instantMs / 60_000) * 60_000;
  return Math.round((asUtc - truncated) / 60_000);
}

/**
 * Every instant whose wall-clock reading in `timeZone` is the given date and
 * time. Empty when the clocks skipped it, two entries when they repeated it.
 */
function instantsForWallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number[] {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offsets = new Set([
    offsetMinutes(guess - 12 * 3_600_000, timeZone),
    offsetMinutes(guess, timeZone),
    offsetMinutes(guess + 12 * 3_600_000, timeZone),
  ]);
  const found: number[] = [];
  for (const offset of offsets) {
    const candidate = guess - offset * 60_000;
    const parts = zoneParts(candidate, timeZone);
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute
    ) {
      found.push(candidate);
    }
  }
  return [...new Set(found)].sort((a, b) => a - b);
}

export interface RunTime {
  readonly instant: Date;
  /** Wall-clock reading in the chosen zone, `YYYY-MM-DD HH:mm`. */
  readonly local: string;
  /** The same instant in UTC, `YYYY-MM-DD HH:mm`. */
  readonly utc: string;
  readonly timeZone: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function civilDate(ms: number, timeZone: string): { year: number; month: number; day: number } {
  const parts = zoneParts(ms, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

/** Weekday of a civil date, 0 = Sunday, without touching the host time zone. */
function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function nextCivilDay(date: { year: number; month: number; day: number }): {
  year: number;
  month: number;
  day: number;
} {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

/**
 * The next `count` runs after `from`, expressed in `timeZone` and in UTC.
 * Days are walked as civil dates, so a 23- or 25-hour day cannot make the walk
 * skip or repeat a date.
 */
export function nextRuns(
  cron: ParsedCron,
  options: { readonly from: Date; readonly count: number; readonly timeZone: string },
): RunTime[] {
  const { from, count, timeZone } = options;
  const fromMs = from.getTime();
  const runs: RunTime[] = [];
  let date = civilDate(fromMs, timeZone);
  const horizonDays = 366 * 4;

  for (let dayIndex = 0; dayIndex < horizonDays && runs.length < count; dayIndex += 1) {
    const weekday = weekdayOf(date.year, date.month, date.day);
    const monthMatches = cron.month.includes(date.month);
    const domMatches = cron.dayOfMonth.includes(date.day);
    const dowMatches = cron.dayOfWeek.includes(weekday);
    const dayMatches =
      cron.dayOfMonthRestricted && cron.dayOfWeekRestricted
        ? domMatches || dowMatches
        : cron.dayOfMonthRestricted
          ? domMatches
          : cron.dayOfWeekRestricted
            ? dowMatches
            : true;

    if (monthMatches && dayMatches) {
      for (const hour of cron.hour) {
        for (const minute of cron.minute) {
          const instants = instantsForWallClock(
            date.year,
            date.month,
            date.day,
            hour,
            minute,
            timeZone,
          );
          // Repeated wall-clock time: run once, at the first occurrence.
          const instant = instants[0];
          if (instant !== undefined && instant > fromMs) {
            const utcParts = {
              year: new Date(instant).getUTCFullYear(),
              month: new Date(instant).getUTCMonth() + 1,
              day: new Date(instant).getUTCDate(),
              hour: new Date(instant).getUTCHours(),
              minute: new Date(instant).getUTCMinutes(),
            };
            runs.push({
              instant: new Date(instant),
              local: `${date.year}-${pad(date.month)}-${pad(date.day)} ${pad(hour)}:${pad(minute)}`,
              utc: `${utcParts.year}-${pad(utcParts.month)}-${pad(utcParts.day)} ${pad(utcParts.hour)}:${pad(utcParts.minute)}`,
              timeZone,
            });
            if (runs.length >= count) break;
          }
        }
        if (runs.length >= count) break;
      }
    }
    date = nextCivilDay(date);
  }

  return runs.sort((a, b) => a.instant.getTime() - b.instant.getTime()).slice(0, count);
}

/** Build an expression from five field strings, for the pickers. */
export function formatCron(fields: readonly [string, string, string, string, string]): string {
  return fields.map((field) => field.trim() || '*').join(' ');
}
