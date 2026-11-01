import { describeCron, formatCron, nextRuns, parseCron } from '@omnitool/tool-core';
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

const PRESETS = [
  { id: 'every-5', label: 'Every 5 minutes', fields: ['*/5', '*', '*', '*', '*'] },
  { id: 'every-15', label: 'Every 15 minutes', fields: ['*/15', '*', '*', '*', '*'] },
  { id: 'hourly', label: 'Every hour', fields: ['0', '*', '*', '*', '*'] },
  { id: 'daily-9', label: 'Every day at 09:00', fields: ['0', '9', '*', '*', '*'] },
  { id: 'weekdays-9', label: 'Weekdays at 09:00', fields: ['0', '9', '*', '*', 'mon-fri'] },
  { id: 'weekly', label: 'Mondays at 09:00', fields: ['0', '9', '*', '*', 'mon'] },
  { id: 'monthly', label: 'First of the month at 00:00', fields: ['0', '0', '1', '*', '*'] },
  { id: 'yearly', label: 'Once a year', fields: ['0', '0', '1', '1', '*'] },
] as const;

const ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Warsaw',
  'Europe/Athens',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Perth',
  'Australia/Brisbane',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const FIELD_LABELS = ['Minute', 'Hour', 'Day of month', 'Month', 'Day of week'] as const;
const FIELD_PLACEHOLDERS = ['0', '9', '*', '*', 'mon-fri'] as const;

function hostZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function CronBuilderTool() {
  const tool = requireTool('cron-builder');
  const [fields, setFields] = useState<[string, string, string, string, string]>([
    '*/15',
    '*',
    '*',
    '*',
    '*',
  ]);
  const [preset, setPreset] = useState<string>('every-15');
  const [zone, setZone] = useState(hostZone);
  const [from, setFrom] = useState('');

  const expression = formatCron(fields);
  const parsed = useMemo(() => parseCron(expression), [expression]);
  const zoneValid = useMemo(() => {
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  }, [zone]);

  const runs = useMemo(() => {
    if (!parsed.ok || !zoneValid) return [];
    const start = from === '' ? new Date() : new Date(from);
    if (Number.isNaN(start.getTime())) return [];
    return nextRuns(parsed.cron, { from: start, count: 10, timeZone: zone });
  }, [parsed, zoneValid, from, zone]);

  const summary = parsed.ok
    ? [
        expression,
        describeCron(parsed.cron),
        '',
        ...runs.map((run) => `${run.local} ${zone}  |  ${run.utc} UTC`),
      ].join('\n')
    : '';

  function reset() {
    setFields(['*/15', '*', '*', '*', '*']);
    setPreset('every-15');
    setZone(hostZone());
    setFrom('');
  }

  const errorIndex = parsed.ok ? null : parsed.error.index;

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={<OutputActions text={summary} filename="cron-schedule.txt" disabled={!parsed.ok} />}
    >
      <ToolStage title="Schedule">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cron-preset">Common schedule</Label>
            <Select
              value={preset}
              onValueChange={(next) => {
                setPreset(next);
                const found = PRESETS.find((entry) => entry.id === next);
                if (found) setFields([...found.fields] as [string, string, string, string, string]);
              }}
            >
              <SelectTrigger id="cron-preset" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cron-expression">Expression</Label>
            <Input
              id="cron-expression"
              className="font-mono"
              value={expression}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!parsed.ok}
              onChange={(event) => {
                setPreset('custom');
                const parts = event.target.value.trim().split(/\s+/);
                setFields([
                  parts[0] ?? '',
                  parts[1] ?? '',
                  parts[2] ?? '',
                  parts[3] ?? '',
                  parts[4] ?? '',
                ]);
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {FIELD_LABELS.map((label, index) => (
            <div key={label} className="space-y-2">
              <Label htmlFor={`cron-field-${index}`} className="text-xs">
                {label}
              </Label>
              <Input
                id={`cron-field-${index}`}
                className="font-mono"
                value={fields[index]}
                placeholder={FIELD_PLACEHOLDERS[index]}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={errorIndex === index}
                aria-describedby={errorIndex === index ? 'cron-error' : undefined}
                onChange={(event) => {
                  setPreset('custom');
                  const next = [...fields] as [string, string, string, string, string];
                  next[index] = event.target.value;
                  setFields(next);
                }}
              />
            </div>
          ))}
        </div>

        {parsed.ok ? (
          <p className="mt-4 text-sm">{describeCron(parsed.cron)}</p>
        ) : (
          <p id="cron-error" role="alert" className="mt-4 text-sm text-destructive">
            {FIELD_LABELS[parsed.error.index] ?? 'Field'} (field {parsed.error.index + 1} of 5):{' '}
            {parsed.error.message}
          </p>
        )}

        <ToolHint>
          Five fields: minute, hour, day of month, month and day of week. Values, ranges, lists and
          steps are supported, as are month and weekday names and the @daily-style aliases. When
          both day fields are restricted, a day matches if either one does.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Next 10 runs">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cron-zone">Time zone</Label>
            <Input
              id="cron-zone"
              list="cron-zones"
              value={zone}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!zoneValid}
              onChange={(event) => setZone(event.target.value)}
            />
            <datalist id="cron-zones">
              {ZONES.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cron-from">Start after (optional, ISO date and time)</Label>
            <Input
              id="cron-from"
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
        </div>

        {!zoneValid ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {zone} is not an IANA time zone this browser knows.
          </p>
        ) : runs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No run falls in the next four years for this schedule.
          </p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">
              Next {runs.length} runs in {zone} and in UTC
            </caption>
            <thead>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="pb-2 font-medium">
                  {zone}
                </th>
                <th scope="col" className="pb-2 font-medium">
                  UTC
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.utc} className="border-t border-border">
                  <td className="py-2 font-mono">{run.local}</td>
                  <td className="py-2 font-mono text-muted-foreground">{run.utc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <ToolHint className="mt-4">
          Times are wall-clock readings in the chosen zone. A time that does not exist when the
          clocks go forward never runs, and a time that happens twice when they go back runs once,
          at its first occurrence.
        </ToolHint>
      </ToolStage>
    </ToolFrame>
  );
}
