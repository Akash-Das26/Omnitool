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
} from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requireTool } from '@/lib/tool';

const COMMON_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

type Attempt<T> =
  | { readonly value: T; readonly error: null }
  | { readonly value: null; readonly error: string };

function attempt<T>(run: () => T): Attempt<T> {
  try {
    return { value: run(), error: null };
  } catch (cause) {
    return {
      value: null,
      error:
        cause instanceof TimeCalculationError
          ? cause.message
          : 'That value could not be calculated',
    };
  }
}

function ErrorNote({ message }: { readonly message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-destructive">
      {message}
    </p>
  );
}

export default function TimeCalcTool() {
  const tool = requireTool('time-calc');

  const [first, setFirst] = useState('1h 30m');
  const [second, setSecond] = useState('45m');
  const [operator, setOperator] = useState<'add' | 'subtract'>('add');

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [timeZone, setTimeZone] = useState('Europe/London');

  const [seconds, setSeconds] = useState('90061');

  const arithmetic = useMemo(() => {
    const left = attempt(() => parseDuration(first));
    const right = attempt(() => parseDuration(second));
    if (left.value === null) return { totalMs: null, error: left.error };
    if (right.value === null) return { totalMs: null, error: right.error };
    const totalMs = operator === 'add' ? left.value + right.value : left.value - right.value;
    return { totalMs, error: null };
  }, [first, second, operator]);

  const span = useMemo(() => {
    if (start.trim() === '' || end.trim() === '') {
      return { result: null, error: null as string | null };
    }
    try {
      const startMs = parseZonedDateTime(start, timeZone);
      const endMs = parseZonedDateTime(end, timeZone);
      return { result: { startMs, endMs, ...difference(startMs, endMs) }, error: null };
    } catch (cause) {
      return {
        result: null,
        error:
          cause instanceof TimeCalculationError
            ? cause.message
            : 'Those times could not be compared',
      };
    }
  }, [start, end, timeZone]);

  const breakdown = useMemo(() => {
    if (seconds.trim() === '') return { totalMs: null, error: null as string | null };
    const value = Number(seconds);
    if (!Number.isFinite(value)) return { totalMs: null, error: 'Enter a number of seconds' };
    return { totalMs: value * 1000, error: null };
  }, [seconds]);

  const summaryLines: string[] = [];
  if (arithmetic.totalMs !== null) {
    summaryLines.push(`${formatDuration(arithmetic.totalMs)} (${formatClock(arithmetic.totalMs)})`);
  }
  if (span.result) {
    summaryLines.push(
      `${formatZonedDateTime(span.result.startMs, timeZone)} ${formatOffset(span.result.startMs, timeZone)} to ${formatZonedDateTime(span.result.endMs, timeZone)} ${formatOffset(span.result.endMs, timeZone)}: ${formatDuration(span.result.totalMs)}`,
    );
  }
  if (breakdown.totalMs !== null) {
    const parts = splitDuration(breakdown.totalMs);
    summaryLines.push(
      `${breakdown.totalMs / 1000} s = ${parts.negative ? '-' : ''}${parts.days} d ${parts.hours} h ${parts.minutes} min ${parts.seconds} s`,
    );
  }

  function reset() {
    setFirst('1h 30m');
    setSecond('45m');
    setOperator('add');
    setStart('');
    setEnd('');
    setTimeZone('Europe/London');
    setSeconds('90061');
  }

  const arithmeticParts = arithmetic.totalMs === null ? null : splitDuration(arithmetic.totalMs);
  const breakdownParts = breakdown.totalMs === null ? null : splitDuration(breakdown.totalMs);

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions
          text={summaryLines.join('\n')}
          filename="time-calculations.txt"
          disabled={summaryLines.length === 0}
        />
      }
    >
      <ToolStage title="Add or subtract durations">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-2">
            <Label htmlFor="time-first">First duration</Label>
            <Input
              id="time-first"
              value={first}
              spellCheck={false}
              placeholder="1h 30m"
              onChange={(event) => setFirst(event.target.value)}
            />
          </div>

          <div className="w-40 space-y-2">
            <Label htmlFor="time-operator">Operation</Label>
            <Select value={operator} onValueChange={(next) => setOperator(next as typeof operator)}>
              <SelectTrigger id="time-operator" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add</SelectItem>
                <SelectItem value="subtract">Subtract</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-second">Second duration</Label>
            <Input
              id="time-second"
              value={second}
              spellCheck={false}
              placeholder="45m"
              onChange={(event) => setSecond(event.target.value)}
            />
          </div>
        </div>

        <ErrorNote message={arithmetic.error} />

        {arithmetic.totalMs !== null && arithmeticParts ? (
          <div className="mt-4 space-y-1">
            <p className="text-sm text-muted-foreground">Result</p>
            <p className="font-mono text-lg" aria-live="polite">
              {formatDuration(arithmetic.totalMs)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatClock(arithmetic.totalMs)} in hours, minutes and seconds
              {arithmeticParts.days > 0
                ? `; ${arithmeticParts.days} ${arithmeticParts.days === 1 ? 'day' : 'days'}`
                : ''}
              .
            </p>
          </div>
        ) : null}

        <ToolHint className="mt-4">
          Write durations as <code>1h 30m</code>, <code>1:30</code>, <code>90s</code> or{' '}
          <code>2d 4h</code>. Units run from milliseconds to weeks, and a result can be negative.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Between two times">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="time-start">Start</Label>
            <Input
              id="time-start"
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-end">End</Label>
            <Input
              id="time-end"
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="time-zone">Time zone</Label>
            <Input
              id="time-zone"
              list="time-zone-list"
              value={timeZone}
              spellCheck={false}
              onChange={(event) => setTimeZone(event.target.value)}
            />
            <datalist id="time-zone-list">
              {COMMON_ZONES.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </div>
        </div>

        <ErrorNote message={span.error} />

        {span.result ? (
          <div className="mt-4 space-y-1">
            <p className="text-sm text-muted-foreground">Elapsed time</p>
            <p className="font-mono text-lg" aria-live="polite">
              {formatDuration(span.result.totalMs)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatClock(span.result.totalMs)}; {span.result.totalMs / 1000} seconds.
            </p>
            <p className="text-sm text-muted-foreground">
              Start {formatZonedDateTime(span.result.startMs, timeZone)} (
              {formatOffset(span.result.startMs, timeZone)}), end{' '}
              {formatZonedDateTime(span.result.endMs, timeZone)} (
              {formatOffset(span.result.endMs, timeZone)}).
            </p>
          </div>
        ) : null}

        <ToolHint className="mt-4">
          Times are wall-clock readings in the named IANA zone, such as <code>Europe/London</code>.
          The answer is the absolute time between the two instants, so when a zone changes its
          clocks a calendar day lasts 23 or 25 hours. An hour that repeats when the clocks go back
          is read as its first occurrence.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Seconds to days, hours, minutes">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="time-seconds">Seconds</Label>
          <Input
            id="time-seconds"
            type="number"
            inputMode="numeric"
            value={seconds}
            onChange={(event) => setSeconds(event.target.value)}
          />
        </div>

        <ErrorNote message={breakdown.error} />

        {breakdownParts ? (
          <dl className="mt-4 grid max-w-md grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            {(
              [
                ['Days', breakdownParts.days],
                ['Hours', breakdownParts.hours],
                ['Minutes', breakdownParts.minutes],
                ['Seconds', breakdownParts.seconds],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono text-base">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {breakdown.totalMs !== null ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Clock value: <span className="font-mono">{formatClock(breakdown.totalMs)}</span>
          </p>
        ) : null}
      </ToolStage>
    </ToolFrame>
  );
}
