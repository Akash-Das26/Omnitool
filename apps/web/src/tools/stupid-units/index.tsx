import {
  convertToFunnyUnits,
  FUNNY_UNIT_CATEGORIES,
  FUNNY_UNIT_CATEGORY_LABELS,
  type FunnyUnitCategory,
  stupidInputUnitsFor,
} from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function StupidUnitsTool() {
  const tool = requireTool('stupid-units');
  const [category, setCategory] = useState<FunnyUnitCategory>('length');
  const [amountText, setAmountText] = useState('1');
  const [unitId, setUnitId] = useState('metre');

  const inputUnits = stupidInputUnitsFor(category);
  const result = useMemo(
    () => convertToFunnyUnits(Number(amountText), unitId),
    [amountText, unitId],
  );

  const summary =
    result.ok && result.conversions.length > 0
      ? result.conversions
          .map(
            (conversion) =>
              `${conversion.display}${conversion.unit.exact ? '' : ' (roughly)'} ${conversion.unit.plural}`,
          )
          .join('\n')
      : '';

  function chooseCategory(next: FunnyUnitCategory) {
    setCategory(next);
    setUnitId(stupidInputUnitsFor(next)[0]?.id ?? 'metre');
  }

  function reset() {
    setCategory('length');
    setUnitId('metre');
    setAmountText('1');
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions text={summary} filename="stupid-units.txt" disabled={summary === ''} />
      }
    >
      <ToolStage title="Amount">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Experiment</Badge>
          <p className="text-sm text-muted-foreground">
            Every size has a named source. Entries marked roughly are measurements of real things,
            which vary.
          </p>
        </div>

        <fieldset className="mt-4 border-0 p-0">
          <legend className="text-sm font-medium">Category</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {FUNNY_UNIT_CATEGORIES.map((entry) => (
              <Button
                key={entry}
                type="button"
                variant={category === entry ? 'default' : 'outline'}
                aria-pressed={category === entry}
                onClick={() => chooseCategory(entry)}
                className="h-9"
              >
                {FUNNY_UNIT_CATEGORY_LABELS[entry]}
              </Button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="stupid-units-amount">Amount</Label>
            <Input
              id="stupid-units-amount"
              className="mt-2 h-11 font-mono"
              type="number"
              min="0"
              step="any"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="stupid-units-unit">Unit</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger id="stupid-units-unit" className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {inputUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ToolHint>
          SI values are metres, square metres, cubic metres, kilograms and seconds. Sources are
          named next to each result: rulebooks and standards for exact sizes, published figures for
          the measured ones. This is an experiment, so the list is short and deliberate.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Equivalents">
        {result.ok ? (
          <ul className="divide-y divide-border rounded-panel border border-border">
            {result.conversions.map(({ unit, display }) => (
              <li key={unit.id} className="px-3 py-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-lg tabular-nums">
                    {unit.exact ? display : `roughly ${display}`}
                  </span>
                  <span className="text-sm">{display === '1' ? unit.name : unit.plural}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{unit.definition}</p>
                <p className="mt-1 text-xs text-muted-foreground">Source: {unit.source}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        )}
      </ToolStage>
    </ToolFrame>
  );
}
