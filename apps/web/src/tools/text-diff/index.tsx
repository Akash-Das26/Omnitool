import {
  DiffError,
  type DiffMode,
  type DiffPart,
  type DiffResult,
  diffText,
  toRows,
} from '@omnitool/tool-core';
import { useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requireTool } from '@/lib/tool';

type View = 'inline' | 'side-by-side';

function unified(parts: readonly DiffPart[]): string {
  return parts
    .flatMap((part) => {
      const prefix = part.type === 'equal' ? ' ' : part.type === 'insert' ? '+' : '-';
      const lines = part.value.split('\n');
      return lines.map((line, index) =>
        index === lines.length - 1 && line === '' ? null : `${prefix} ${line}`,
      );
    })
    .filter((line): line is string => line !== null)
    .join('\n');
}

export default function TextDiffTool() {
  const tool = requireTool('text-diff');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [mode, setMode] = useState<DiffMode>('line');
  const [view, setView] = useState<View>('inline');
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function compare() {
    try {
      setResult(diffText(before, after, mode));
      setError(null);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof DiffError ? cause.message : 'The texts could not be compared');
    }
  }

  let rowOffset = 0;
  const keyedRows = (result ? toRows(result.parts) : []).map((row) => {
    const key = `row-${rowOffset}`;
    rowOffset += (row.left?.length ?? 0) + (row.right?.length ?? 0) + 1;
    return { row, key };
  });

  let partOffset = 0;
  const keyedParts = (result?.parts ?? []).map((part) => {
    const key = `part-${partOffset}`;
    partOffset += part.value.length + 1;
    return { part, key };
  });

  return (
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
        <ToolStage title="Texts">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="diff-before">Before</Label>
              <TextArea
                id="diff-before"
                rows={8}
                value={before}
                spellCheck={false}
                onChange={(event) => setBefore(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diff-after">After</Label>
              <TextArea
                id="diff-after"
                rows={8}
                value={after}
                spellCheck={false}
                onChange={(event) => setAfter(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="diff-mode">Compare by</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as DiffMode)}>
                <SelectTrigger id="diff-mode" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="word">Word</SelectItem>
                  <SelectItem value="character">Character</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diff-view">View</Label>
              <Select value={view} onValueChange={(value) => setView(value as View)}>
                <SelectTrigger id="diff-view" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline</SelectItem>
                  <SelectItem value="side-by-side">Side by side</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={compare} disabled={before === '' && after === ''}>
              Compare
            </Button>
          </div>
        </ToolStage>

        <ToolStage title="Difference">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="space-y-4">
              <p role="status" className="text-sm text-muted-foreground">
                {result.additions} added, {result.deletions} removed, {result.unchanged} unchanged.
                Removed text is struck through; added text is underlined.
              </p>

              {view === 'inline' ? (
                <pre className="max-h-96 overflow-auto rounded-control border border-border bg-background p-3 font-mono text-sm whitespace-pre-wrap break-words">
                  {keyedParts.map(({ part, key }) =>
                    part.type === 'equal' ? (
                      <span key={key}>{part.value}</span>
                    ) : part.type === 'delete' ? (
                      <del key={key} className="bg-destructive/15 text-destructive">
                        {part.value}
                      </del>
                    ) : (
                      <ins key={key} className="bg-primary/15 text-primary">
                        {part.value}
                      </ins>
                    ),
                  )}
                </pre>
              ) : (
                <div className="max-h-96 overflow-auto rounded-control border border-border">
                  <table className="w-full table-fixed border-collapse font-mono text-sm">
                    <caption className="sr-only">Side-by-side differences</caption>
                    <thead>
                      <tr className="border-b border-border bg-surface text-left">
                        <th scope="col" className="w-1/2 p-2 font-medium">
                          Before
                        </th>
                        <th scope="col" className="w-1/2 p-2 font-medium">
                          After
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {keyedRows.map(({ row, key }) => (
                        <tr key={key} className="border-b border-border/60 align-top">
                          <td className="p-2 whitespace-pre-wrap break-words">
                            {row.left === null ? null : (
                              <>
                                <span aria-hidden="true" className="mr-2 text-muted-foreground">
                                  {row.kind === 'change' || row.kind === 'delete' ? '−' : ''}
                                </span>
                                <span className="sr-only">
                                  {row.kind === 'change' || row.kind === 'delete'
                                    ? 'Removed: '
                                    : ''}
                                </span>
                                <span
                                  className={
                                    row.kind === 'change' || row.kind === 'delete'
                                      ? 'bg-destructive/15 text-destructive'
                                      : undefined
                                  }
                                >
                                  {row.left}
                                </span>
                              </>
                            )}
                          </td>
                          <td className="p-2 whitespace-pre-wrap break-words">
                            {row.right === null ? null : (
                              <>
                                <span aria-hidden="true" className="mr-2 text-muted-foreground">
                                  {row.kind === 'change' || row.kind === 'insert' ? '+' : ''}
                                </span>
                                <span className="sr-only">
                                  {row.kind === 'change' || row.kind === 'insert' ? 'Added: ' : ''}
                                </span>
                                <span
                                  className={
                                    row.kind === 'change' || row.kind === 'insert'
                                      ? 'bg-primary/15 text-primary'
                                      : undefined
                                  }
                                >
                                  {row.right}
                                </span>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <OutputActions text={unified(result.parts)} filename="diff.txt" />
            </div>
          ) : null}

          {!result && !error ? (
            <p className="text-sm text-muted-foreground">
              Paste two versions and choose Compare to see what changed.
            </p>
          ) : null}
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
