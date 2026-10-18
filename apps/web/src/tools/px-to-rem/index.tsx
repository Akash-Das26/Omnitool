import {
  conversionTable,
  DEFAULT_ROOT_FONT_SIZE,
  LengthConversionError,
  pxToRem,
  remToPx,
} from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireTool } from '@/lib/tool';

type Conversion = { readonly value: string; readonly error: string | null };

function attempt(convert: () => number): Conversion {
  try {
    return { value: String(convert()), error: null };
  } catch (cause) {
    return {
      value: '',
      error:
        cause instanceof LengthConversionError
          ? cause.message
          : 'That value could not be converted',
    };
  }
}

export default function PxToRemTool() {
  const tool = requireTool('px-to-rem');
  const [root, setRoot] = useState(String(DEFAULT_ROOT_FONT_SIZE));
  const [px, setPx] = useState('16');
  const [rem, setRem] = useState('1');

  const rootSize = Number(root);
  const pxConversion = useMemo(() => attempt(() => pxToRem(Number(px), rootSize)), [px, rootSize]);
  const remConversion = useMemo(
    () => attempt(() => remToPx(Number(rem), rootSize)),
    [rem, rootSize],
  );
  const rows = useMemo(() => {
    try {
      return conversionTable(rootSize);
    } catch {
      return [];
    }
  }, [rootSize]);

  const tableText = [
    `PX to REM (root ${root || '?'}px)`,
    ...rows.map((row) => `${row.px}px = ${row.rem}rem`),
  ].join('\n');

  const rootError = pxConversion.error?.includes('Root font size')
    ? pxConversion.error
    : remConversion.error;

  return (
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
        <ToolStage title="Root size">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="root-size">Root font size in pixels</Label>
            <Input
              id="root-size"
              type="number"
              min={1}
              step="0.5"
              value={root}
              onChange={(event) => setRoot(event.target.value)}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Browsers default to 16 px. If your CSS sets a different root size, enter it here so the
            conversions match.
          </p>
          {rootError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Root font size must be a number greater than zero.
            </p>
          ) : null}
        </ToolStage>

        <ToolStage title="Convert">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="px-input">Pixels</Label>
              <Input
                id="px-input"
                type="number"
                value={px}
                onChange={(event) => setPx(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">Equals</p>
              <Input
                aria-label="Pixels converted to rem"
                readOnly
                value={pxConversion.error ? '' : `${pxConversion.value}rem`}
                className="font-mono"
              />
              {pxConversion.error && !pxConversion.error.includes('Root font size') ? (
                <p role="alert" className="text-sm text-destructive">
                  {pxConversion.error}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rem-input">Rem</Label>
              <Input
                id="rem-input"
                type="number"
                step="0.0625"
                value={rem}
                onChange={(event) => setRem(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">Equals</p>
              <Input
                aria-label="Rem converted to pixels"
                readOnly
                value={remConversion.error ? '' : `${remConversion.value}px`}
                className="font-mono"
              />
              {remConversion.error && !remConversion.error.includes('Root font size') ? (
                <p role="alert" className="text-sm text-destructive">
                  {remConversion.error}
                </p>
              ) : null}
            </div>
          </div>
        </ToolStage>

        <ToolStage title="Common values">
          <div className="overflow-x-auto">
            <table className="w-full max-w-md border-collapse text-sm">
              <caption className="sr-only">Common pixel values in rem</caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-6 font-medium">
                    Pixels
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Rem
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.px} className="border-b border-border/60">
                    <td className="py-1.5 pr-6 font-mono">{row.px}px</td>
                    <td className="py-1.5 font-mono">{row.rem}rem</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <OutputActions text={tableText} filename="px-to-rem.txt" disabled={rows.length === 0} />
          </div>
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
