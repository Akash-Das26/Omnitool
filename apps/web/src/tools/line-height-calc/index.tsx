import {
  baselineTable,
  DEFAULT_ROOT_FONT_SIZE,
  fromBaseline,
  fromRatio,
  LineHeightError,
  type LineHeightResult,
  WCAG_MIN_LINE_HEIGHT,
} from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
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

const TABLE_FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

type Mode = 'ratio' | 'baseline';

type Attempt =
  | { readonly result: LineHeightResult; readonly error: null }
  | { readonly result: null; readonly error: string };

function attempt(run: () => LineHeightResult): Attempt {
  try {
    return { result: run(), error: null };
  } catch (cause) {
    return {
      result: null,
      error:
        cause instanceof LineHeightError ? cause.message : 'That value could not be calculated',
    };
  }
}

export default function LineHeightCalcTool() {
  const tool = requireTool('line-height-calc');
  const [mode, setMode] = useState<Mode>('ratio');
  const [fontSize, setFontSize] = useState('16');
  const [ratio, setRatio] = useState('1.5');
  const [baseline, setBaseline] = useState('8');
  const [root, setRoot] = useState(String(DEFAULT_ROOT_FONT_SIZE));

  const rootSize = Number(root);

  const conversion = useMemo(
    () =>
      attempt(() =>
        mode === 'ratio'
          ? fromRatio(Number(fontSize), Number(ratio), rootSize)
          : fromBaseline(Number(fontSize), Number(baseline), rootSize),
      ),
    [mode, fontSize, ratio, baseline, rootSize],
  );

  const rows = useMemo(() => {
    try {
      return baselineTable(TABLE_FONT_SIZES, Number(baseline), rootSize);
    } catch {
      return [];
    }
  }, [baseline, rootSize]);

  const result = conversion.result;
  const css = result
    ? `font-size: ${Number(fontSize)}px;\nline-height: ${result.unitless};\n/* ${result.px}px = ${result.rem}rem */`
    : '';

  function reset() {
    setMode('ratio');
    setFontSize('16');
    setRatio('1.5');
    setBaseline('8');
    setRoot(String(DEFAULT_ROOT_FONT_SIZE));
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions text={css} filename="line-height.css" mime="text/css" disabled={!result} />
      }
    >
      <ToolStage title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="line-height-mode">Method</Label>
            <Select value={mode} onValueChange={(next) => setMode(next as Mode)}>
              <SelectTrigger id="line-height-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ratio">Ratio</SelectItem>
                <SelectItem value="baseline">Baseline grid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="line-height-font-size">Font size in pixels</Label>
            <Input
              id="line-height-font-size"
              type="number"
              min={1}
              step="0.5"
              value={fontSize}
              onChange={(event) => setFontSize(event.target.value)}
            />
          </div>

          {mode === 'ratio' ? (
            <div className="space-y-2">
              <Label htmlFor="line-height-ratio">Line-height ratio</Label>
              <Input
                id="line-height-ratio"
                type="number"
                min={0.5}
                step="0.05"
                value={ratio}
                onChange={(event) => setRatio(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                1.5 is the usual comfortable minimum; headings often sit between 1.1 and 1.3.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="line-height-baseline">Baseline in pixels</Label>
              <Input
                id="line-height-baseline"
                type="number"
                min={1}
                step="1"
                value={baseline}
                onChange={(event) => setBaseline(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                The line height snaps up to a whole number of these rows, at least{' '}
                {WCAG_MIN_LINE_HEIGHT}× the font size.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="line-height-root">Root font size in pixels</Label>
            <Input
              id="line-height-root"
              type="number"
              min={1}
              step="0.5"
              value={root}
              onChange={(event) => setRoot(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Used for the rem value; browsers default to 16 px.
            </p>
          </div>
        </div>

        {conversion.error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {conversion.error}
          </p>
        ) : null}
      </ToolStage>

      <ToolStage title="Result">
        {result ? (
          <>
            <dl className="grid max-w-lg grid-cols-3 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Unitless</dt>
                <dd className="font-mono text-lg" aria-live="polite">
                  {result.unitless}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Pixels</dt>
                <dd className="font-mono text-lg">{result.px}px</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Rem</dt>
                <dd className="font-mono text-lg">{result.rem}rem</dd>
              </div>
            </dl>

            <pre className="mt-4 overflow-x-auto rounded-panel border border-border bg-surface-inset p-3 font-mono text-sm">
              <code>{css}</code>
            </pre>

            {result.wcagNote ? (
              <p className="mt-4 border-l-2 border-border-strong pl-3 text-sm">{result.wcagNote}</p>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                At or above the {WCAG_MIN_LINE_HEIGHT}× minimum for WCAG 1.4.12 text spacing.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Enter a font size to see the result.</p>
        )}
      </ToolStage>

      <ToolStage title={`Baseline table (${baseline || '?'}px rows)`}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Enter a baseline to see the table.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full max-w-xl border-collapse text-sm">
              <caption className="sr-only">
                Line heights on a {baseline} pixel baseline grid
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-6 font-medium">
                    Font size
                  </th>
                  <th scope="col" className="py-2 pr-6 font-medium">
                    Rows
                  </th>
                  <th scope="col" className="py-2 pr-6 font-medium">
                    Line height
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Unitless
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.fontSizePx} className="border-b border-border/60">
                    <td className="py-1.5 pr-6 font-mono">{row.fontSizePx}px</td>
                    <td className="py-1.5 pr-6">{row.multiples}</td>
                    <td className="py-1.5 pr-6 font-mono">
                      {row.px}px / {row.rem}rem
                    </td>
                    <td className="py-1.5 font-mono">{row.unitless}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          A whole number of baseline rows keeps text aligned across columns. The unitless value
          inherits the font size, so it survives a change of root size better than a pixel value.
        </p>
      </ToolStage>
    </ToolFrame>
  );
}
