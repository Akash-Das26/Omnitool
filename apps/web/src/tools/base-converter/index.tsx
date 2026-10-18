import { BaseConversionError, convertBase } from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireTool } from '@/lib/tool';

function parseBase(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export default function BaseConverterTool() {
  const tool = requireTool('base-converter');
  const [value, setValue] = useState('255');
  const [fromBase, setFromBase] = useState('10');
  const [toBase, setToBase] = useState('16');

  const result = useMemo(() => {
    try {
      return {
        value: convertBase(value, parseBase(fromBase), parseBase(toBase)),
        error: null,
      };
    } catch (cause) {
      return {
        value: '',
        error:
          cause instanceof BaseConversionError
            ? cause.message
            : 'That value could not be converted',
      };
    }
  }, [value, fromBase, toBase]);

  return (
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
        <ToolStage title="Number">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="base-value">Value</Label>
              <Input
                id="base-value"
                value={value}
                spellCheck={false}
                autoComplete="off"
                inputMode="text"
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base-from">From base</Label>
              <Input
                id="base-from"
                type="number"
                min={2}
                max={36}
                value={fromBase}
                onChange={(event) => setFromBase(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base-to">To base</Label>
              <Input
                id="base-to"
                type="number"
                min={2}
                max={36}
                value={toBase}
                onChange={(event) => setToBase(event.target.value)}
              />
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Bases run from 2 to 36. Digits above 9 use A to Z, in either case. Whole numbers are
            converted exactly, however large.
          </p>
        </ToolStage>

        <ToolStage title="Result">
          {result.error ? (
            <p role="alert" className="text-sm text-destructive">
              {result.error}
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <Label htmlFor="base-output">Result in base {toBase}</Label>
                <Input
                  id="base-output"
                  className="mt-2 font-mono text-base"
                  readOnly
                  value={result.value}
                />
              </div>
              <OutputActions
                text={result.value}
                filename={`base-${toBase}.txt`}
                disabled={result.value === ''}
              />
            </div>
          )}
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
