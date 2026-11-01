import type { RegexOutcome } from '@omnitool/tool-core';
import * as Comlink from 'comlink';
import { useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireTool } from '@/lib/tool';
import type { RegexInput, RegexWorker } from './worker';

const FLAGS = [
  { flag: 'i', label: 'Ignore case' },
  { flag: 'm', label: 'Multiline' },
  { flag: 's', label: 'Dot matches newlines' },
  { flag: 'u', label: 'Unicode' },
] as const;

/** A pattern that backtracks for ever is stopped here rather than in the worker. */
const DEADLINE_MS = 1500;

export default function RegexTesterTool() {
  const tool = requireTool('regex-tester');
  const [source, setSource] = useState('\\b\\w+@\\w+\\.\\w{2,}\\b');
  const [flags, setFlags] = useState('i');
  const [text, setText] = useState('Write to hello@example.com or support@example.org.');
  const [outcome, setOutcome] = useState<RegexOutcome | null>(null);
  const [stopped, setStopped] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  function reset() {
    setSource('');
    setFlags('');
    setText('');
    setOutcome(null);
    setStopped(null);
    setRunning(false);
  }

  async function test() {
    setRunning(true);
    setStopped(null);
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const remote = Comlink.wrap<RegexWorker>(worker);
    const input: RegexInput = { source, flags, text };
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      worker.terminate();
      setStopped(`The pattern did not finish within ${DEADLINE_MS / 1000} s and was stopped.`);
      setOutcome(null);
      setRunning(false);
    }, DEADLINE_MS);

    try {
      const result = await remote.run(input);
      if (!timedOut) setOutcome(result);
    } catch (cause) {
      if (!timedOut) {
        setOutcome({
          matches: [],
          truncated: false,
          error: cause instanceof Error ? cause.message : 'The pattern could not run',
        });
      }
    } finally {
      clearTimeout(timer);
      worker.terminate();
      if (!timedOut) setRunning(false);
    }
  }

  const summary = outcome
    ? outcome.matches
        .map(
          (match, index) =>
            `${index + 1}. "${match.value}" at ${match.index} (${match.length} characters)`,
        )
        .join('\n')
    : '';

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions text={summary} filename="regex-matches.txt" disabled={summary === ''} />
      }
    >
      <ToolStage title="Pattern">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="regex-source">Regular expression</Label>
            <Input
              id="regex-source"
              className="font-mono"
              value={source}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={outcome?.error !== undefined}
              onChange={(event) => {
                setSource(event.target.value);
                setOutcome(null);
              }}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={test} disabled={running}>
              {running ? 'Testing…' : 'Test'}
            </Button>
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Flags</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {FLAGS.map((entry) => {
              const active = flags.includes(entry.flag);
              return (
                <Button
                  key={entry.flag}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  aria-pressed={active}
                  onClick={() => {
                    setFlags(
                      active
                        ? [...flags].filter((item) => item !== entry.flag).join('')
                        : `${flags}${entry.flag}`,
                    );
                    setOutcome(null);
                  }}
                >
                  <span className="font-mono">{entry.flag}</span>
                  <span className="sr-only">{entry.label}</span>
                </Button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {FLAGS.filter((entry) => flags.includes(entry.flag))
              .map((entry) => entry.label)
              .join(', ') || 'No flags'}
          </p>
        </fieldset>

        <div className="mt-4">
          <Label htmlFor="regex-text">Sample text</Label>
          <TextArea
            id="regex-text"
            className="mt-2"
            rows={8}
            value={text}
            spellCheck={false}
            onChange={(event) => {
              setText(event.target.value);
              setOutcome(null);
            }}
          />
        </div>

        <ToolHint>
          Matching runs in a worker so a pattern that backtracks for ever cannot freeze the page: it
          is stopped after {DEADLINE_MS / 1000} s. This tab is the only place the pattern and the
          text exist; nothing is sent anywhere.
        </ToolHint>
      </ToolStage>

      <ToolStage
        title="Matches"
        actions={
          outcome && !stopped ? (
            <Badge variant="secondary">
              {outcome.matches.length}
              {outcome.truncated ? '+' : ''} found
            </Badge>
          ) : null
        }
      >
        {stopped ? (
          <p role="alert" className="text-sm text-destructive">
            {stopped}
          </p>
        ) : outcome?.error ? (
          <p role="alert" className="text-sm text-destructive">
            {outcome.error}
          </p>
        ) : outcome === null ? (
          <p className="text-sm text-muted-foreground">
            Choose a pattern and press Test. Matches appear here with their position.
          </p>
        ) : outcome.matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches.</p>
        ) : (
          <>
            {outcome.truncated ? (
              <p className="mb-3 text-sm text-muted-foreground">
                Showing the first {outcome.matches.length} matches; there are more.
              </p>
            ) : null}
            <ol className="space-y-2">
              {outcome.matches.map((match, index) => (
                <li
                  // A match is identified by where it starts; two matches can
                  // share an index only if both are empty, which the counter covers.
                  key={`${match.index}-${match.length}`}
                  className="rounded-control border border-border bg-surface-inset p-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span className="font-mono break-all">{match.value || '(empty match)'}</span>
                    <span className="text-xs text-muted-foreground">
                      at {match.index}, {match.length} characters
                    </span>
                  </div>
                  {match.groups.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm">
                      {match.groups.map((group, groupIndex) => (
                        <li key={`${group.name ?? groupIndex}`} className="flex gap-2">
                          <span className="text-muted-foreground">
                            {group.name ?? `Group ${groupIndex + 1}`}
                          </span>
                          <span className="font-mono break-all">
                            {group.value === undefined ? '—' : group.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          </>
        )}
      </ToolStage>
    </ToolFrame>
  );
}
