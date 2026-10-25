import {
  type AlgebraOperation,
  type AlgebraResult,
  MAX_INPUT_LENGTH,
  SUPPORTED,
} from '@omnitool/tool-core/algebra';
import * as Comlink from 'comlink';
import { CalculatorIcon } from 'lucide-react';
import { useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
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
import type { AlgebraWorker } from './worker';

const DEADLINE_MS = 5000;

interface Operation {
  readonly id: AlgebraOperation;
  readonly label: string;
  readonly example: string;
  readonly hint: string;
}

const OPERATIONS: readonly Operation[] = [
  {
    id: 'simplify',
    label: 'Simplify',
    example: '(x+1)^3',
    hint: 'Multiply out and collect like terms.',
  },
  {
    id: 'expand',
    label: 'Expand',
    example: '(x+2)*(x-3)',
    hint: 'Remove the brackets.',
  },
  {
    id: 'factor',
    label: 'Factor',
    example: 'x^2-5*x+6',
    hint: 'Take out every rational root as a bracket.',
  },
  {
    id: 'solve',
    label: 'Solve an equation',
    example: '2*x+3=11',
    hint: 'Linear and quadratic exactly; higher degrees by rational roots.',
  },
  {
    id: 'differentiate',
    label: 'Differentiate',
    example: 'x^3+2*x',
    hint: 'd/dx, term by term.',
  },
  {
    id: 'evaluate',
    label: 'Evaluate',
    example: 'x^2+2*x+1',
    hint: 'Substitute a value for x and give the exact result.',
  },
  {
    id: 'system',
    label: 'Solve a system',
    example: 'x+y=5\nx-y=1',
    hint: 'Two or three linear equations, one per line, in x, y and z.',
  },
];

export default function AlgebraCalcTool() {
  const tool = requireTool('algebra-calc');
  const [operation, setOperation] = useState<AlgebraOperation>('factor');
  const [expression, setExpression] = useState('x^2-5*x+6');
  const [value, setValue] = useState('2');
  const [result, setResult] = useState<AlgebraResult | null>(null);
  const [stopped, setStopped] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const active =
    OPERATIONS.find((entry) => entry.id === operation) ??
    ({ id: 'simplify', label: 'Simplify', example: '', hint: '' } satisfies Operation);

  function reset() {
    setOperation('factor');
    setExpression('x^2-5*x+6');
    setValue('2');
    setResult(null);
    setStopped(null);
    setRunning(false);
  }

  async function work() {
    setRunning(true);
    setStopped(null);
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const remote = Comlink.wrap<AlgebraWorker>(worker);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      worker.terminate();
      setResult(null);
      setStopped(
        `That took longer than ${DEADLINE_MS / 1000} s and was stopped. Try a shorter expression.`,
      );
      setRunning(false);
    }, DEADLINE_MS);

    try {
      const next = await remote.run({ operation, expression, value });
      if (!timedOut) setResult(next);
    } catch (cause) {
      if (!timedOut) {
        setResult({
          ok: false,
          error: cause instanceof Error ? cause.message : 'That could not be worked out.',
          headline: '',
          steps: [],
          notes: [],
        });
      }
    } finally {
      clearTimeout(timer);
      worker.terminate();
      if (!timedOut) setRunning(false);
    }
  }

  const summary = result?.ok
    ? [result.headline, ...result.steps.map((step) => `- ${step}`)].join('\n')
    : '';

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions
          text={summary}
          filename={`algebra-${operation}.txt`}
          disabled={summary === ''}
        />
      }
    >
      <ToolStage title="Input">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="algebra-operation">Operation</Label>
            <Select
              value={operation}
              onValueChange={(next) => {
                const chosen = OPERATIONS.find((entry) => entry.id === next);
                setOperation(next as AlgebraOperation);
                setExpression(chosen?.example ?? '');
                setResult(null);
              }}
            >
              <SelectTrigger id="algebra-operation" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATIONS.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{active.hint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="algebra-expression">
              {operation === 'system' ? 'Equations, one per line' : 'Expression'}
            </Label>
            {operation === 'system' ? (
              <textarea
                id="algebra-expression"
                className="min-h-24 w-full rounded-control border border-border-strong bg-surface p-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                value={expression}
                maxLength={MAX_INPUT_LENGTH}
                spellCheck={false}
                onChange={(event) => setExpression(event.target.value)}
              />
            ) : (
              <Input
                id="algebra-expression"
                className="font-mono"
                value={expression}
                maxLength={MAX_INPUT_LENGTH}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setExpression(event.target.value)}
                placeholder={active.example}
              />
            )}
          </div>
          {operation === 'evaluate' ? (
            <div className="space-y-2">
              <Label htmlFor="algebra-value">Value of x</Label>
              <Input
                id="algebra-value"
                value={value}
                autoComplete="off"
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
          ) : null}
          <Button type="button" onClick={() => void work()} disabled={running}>
            <CalculatorIcon aria-hidden="true" className="size-4" />
            {running ? 'Working it out…' : 'Work it out'}
          </Button>
        </div>
      </ToolStage>

      <ToolStage title="Result">
        <div aria-live="polite" role="status">
          {stopped ? (
            <p className="text-sm text-destructive">{stopped}</p>
          ) : result === null ? (
            <p className="text-sm text-muted-foreground">
              {operation === 'system'
                ? 'Write two or three equations, one per line, then press Work it out.'
                : 'Choose an operation, write an expression, then press Work it out.'}
            </p>
          ) : !result.ok ? (
            <p role="alert" className="text-sm text-destructive">
              {result.error}
            </p>
          ) : (
            <div className="space-y-4">
              <p className="break-words font-mono text-lg">{result.headline}</p>
              {result.steps.length > 0 ? (
                <ol className="space-y-1 text-sm text-muted-foreground">
                  {result.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
              {result.notes.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      </ToolStage>

      <ToolStage title="What this covers">
        {/* The supported-set sentence used to be a visible paragraph and became
            the page's LCP element, painted after hydration at 2,568 ms. It lives
            in the disclosure now, so the prerendered description is the largest
            element again (the sci-calc precedent). */}
        <ToolHint>
          {SUPPORTED} Write multiplication with an asterisk: 2*x, not 2x, exactly as the scientific
          calculator requires. Every step is exact rational arithmetic, so a third of a root stays a
          third.
        </ToolHint>
      </ToolStage>
    </ToolFrame>
  );
}
