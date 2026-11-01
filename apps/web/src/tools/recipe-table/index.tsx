import {
  buildRecipeTable,
  type RecipeRow,
  toCsv,
  toPlainText,
  type UnitSystem,
} from '@omnitool/tool-core';
import { useState } from 'react';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { copyText, downloadText } from '@/lib/download';
import { requireTool } from '@/lib/tool';

const EXAMPLE = [
  '2 cups flour',
  '1 1/2 tsp salt',
  '1/2 cup butter',
  '3 eggs',
  '1 cup milk',
  '1 tbsp olive oil',
  'Salt to taste',
].join('\n');

function Cell({ row }: { readonly row: RecipeRow }) {
  if (row.quantity === null) {
    return (
      <td className="px-3 py-2 align-top">
        <span className="text-muted-foreground">—</span>
      </td>
    );
  }
  return (
    <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-sm tabular-nums">
      {row.quantity}
      {row.unit ? <span className="text-muted-foreground"> {row.unit}</span> : null}
    </td>
  );
}

export default function RecipeTableTool() {
  const tool = requireTool('recipe-table');
  const [input, setInput] = useState('');
  const [baseServings, setBaseServings] = useState('4');
  const [servings, setServings] = useState('4');
  const [system, setSystem] = useState<UnitSystem>('metric');
  const [status, setStatus] = useState<{ kind: 'idle' | 'copied' | 'failed'; text: string }>({
    kind: 'idle',
    text: '',
  });

  const table = buildRecipeTable(input, {
    baseServings: Number(baseServings),
    servings: Number(servings),
    system,
  });

  const rows = table.ok ? table.rows : [];
  const csv = toCsv(rows);
  const text = toPlainText(rows, { servings: Number(servings), system });

  async function copy() {
    try {
      await copyText(text);
      setStatus({ kind: 'copied', text: 'Table copied' });
    } catch {
      setStatus({ kind: 'failed', text: 'Could not copy the table' });
    }
  }

  function reset() {
    setInput('');
    setBaseServings('4');
    setServings('4');
    setSystem('metric');
    setStatus({ kind: 'idle', text: '' });
  }

  return (
    <ToolFrame tool={tool} onReset={reset}>
      <ToolStage
        title="Ingredients"
        actions={
          <Button type="button" variant="outline" className="h-9" onClick={() => setInput(EXAMPLE)}>
            Load an example
          </Button>
        }
      >
        <Label htmlFor="recipe-input">Ingredients, one per line</Label>
        <TextArea
          id="recipe-input"
          className="mt-2"
          rows={10}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={'2 cups flour\n1 1/2 tsp salt\n3 eggs'}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="recipe-base-servings">Makes (servings)</Label>
            <Input
              id="recipe-base-servings"
              className="mt-2 h-11 font-mono"
              type="number"
              min="1"
              step="1"
              value={baseServings}
              onChange={(event) => setBaseServings(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="recipe-servings">Scale to (servings)</Label>
            <Input
              id="recipe-servings"
              className="mt-2 h-11 font-mono"
              type="number"
              min="0"
              step="1"
              value={servings}
              onChange={(event) => setServings(event.target.value)}
            />
          </div>
          <div>
            <span className="text-sm font-medium">Units</span>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant={system === 'metric' ? 'default' : 'outline'}
                aria-pressed={system === 'metric'}
                className="h-11 flex-1"
                onClick={() => setSystem('metric')}
              >
                Metric
              </Button>
              <Button
                type="button"
                variant={system === 'us' ? 'default' : 'outline'}
                aria-pressed={system === 'us'}
                className="h-11 flex-1"
                onClick={() => setSystem('us')}
              >
                US
              </Button>
            </div>
          </div>
        </div>

        <ToolHint>
          Amounts can be whole numbers, decimals, fractions (1/2), mixed numbers (1 1/2), vulgar
          fractions (½) or ranges (2–3). Units are tsp, tbsp, cup, fl oz, ml, l, pinch, oz, lb, g
          and kg; a number without a unit is treated as a count. Lines without an amount are left as
          written and flagged. Volume is converted to weight only for the ingredients in the USDA
          table, and those weights are approximate because a cup of flour depends on how it is
          scooped. Volumes round to the nearest eighth; weights round to a gram.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Table">
        {!table.ok ? (
          <p role="alert" className="text-sm text-destructive">
            {table.error}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Paste an ingredient list to see the scaled table.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Serves {servings === '' ? '0' : servings} ·{' '}
                {system === 'metric' ? 'metric' : 'US customary'}
              </p>
              {table.flagged > 0 ? (
                <p role="alert" className="text-sm text-destructive">
                  {table.flagged === 1
                    ? '1 line was not scaled and is shown as written.'
                    : `${table.flagged} lines were not scaled and are shown as written.`}
                </p>
              ) : null}
            </div>

            <div className="mt-3 overflow-x-auto rounded-panel border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Scaled ingredients</caption>
                <thead className="bg-surface-inset">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Ingredient
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Quantity
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={`${row.raw}-${row.quantity ?? 'raw'}`}>
                      <td className="px-3 py-2 align-top">{row.name}</td>
                      <Cell row={row} />
                      <td className="px-3 py-2 align-top text-sm text-muted-foreground">
                        {row.flagged ?? row.note ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="button" onClick={copy}>
                Copy table
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadText(csv, 'recipe.csv', 'text/csv')}
              >
                Download CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadText(text, 'recipe.txt')}
              >
                Download text
              </Button>
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {status.kind === 'failed' ? (
                  <span className="text-destructive">{status.text}</span>
                ) : (
                  status.text
                )}
              </p>
            </div>
          </>
        )}
      </ToolStage>
    </ToolFrame>
  );
}
