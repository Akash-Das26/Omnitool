import { type AngleMode, evaluateExpression, formatNumber } from '@omnitool/tool-core';
import { useRef, useState } from 'react';
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

const ANGLE_MODES: readonly { value: AngleMode; label: string }[] = [
  { value: 'deg', label: 'Degrees' },
  { value: 'rad', label: 'Radians' },
  { value: 'grad', label: 'Gradians' },
];

const DIGITS = ['6', '8', '10', '12', '15'] as const;

const NUMBER_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'ans'] as const;
const OPERATOR_KEYS = ['+', '-', '*', '/', '^', '%'] as const;
const OTHER_KEYS = ['(', ')', '!', 'pi', 'e'] as const;
const FUNCTION_KEYS = ['sin', 'cos', 'tan', 'ln', 'log', 'sqrt'] as const;

interface HistoryEntry {
  readonly id: number;
  readonly expression: string;
  readonly display: string;
}

export default function ScientificCalculatorTool() {
  const tool = requireTool('sci-calc');
  const [expression, setExpression] = useState('');
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');
  const [digits, setDigits] = useState('12');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const nextId = useRef(0);

  function calculate() {
    const outcome = evaluateExpression(expression, {
      angleMode,
      significantDigits: Number(digits),
      ans,
    });

    if (outcome.ok) {
      setResult(outcome.display);
      setError(null);
      setAns(outcome.value);
      setAnnouncement(`${expression.trim()} = ${outcome.display}`);
      nextId.current += 1;
      setHistory((entries) =>
        [
          { id: nextId.current, expression: expression.trim(), display: outcome.display },
          ...entries,
        ].slice(0, 20),
      );
      return;
    }

    setResult(null);
    setError(outcome.error);
    setAnnouncement('');
  }

  function insert(text: string) {
    setExpression((current) => `${current}${text}`);
  }

  function backspace() {
    setExpression((current) => current.slice(0, -1));
  }

  function clearEntry() {
    setExpression('');
    setResult(null);
    setError(null);
    setAnnouncement('');
  }

  function reset() {
    setExpression('');
    setAngleMode('deg');
    setDigits('12');
    setResult(null);
    setError(null);
    setAnnouncement('');
    setAns(0);
    setHistory([]);
  }

  function key(value: string) {
    return (
      <Button
        key={value}
        type="button"
        variant="outline"
        className="h-11 min-w-11 font-mono text-base"
        onClick={() => insert(value)}
        aria-label={`Insert ${value}`}
      >
        {value}
      </Button>
    );
  }

  const previous = formatNumber(ans, Number(digits));

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions text={result ?? ''} filename="calculation.txt" disabled={result === null} />
      }
    >
      <ToolStage title="Expression">
        <Label htmlFor="sci-calc-expression">Expression</Label>
        <Input
          id="sci-calc-expression"
          className="mt-2 h-11 font-mono text-base"
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              calculate();
            }
          }}
          placeholder="For example: 2 + 3 * sin(30)"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby="sci-calc-syntax"
        />
        <p id="sci-calc-syntax" className="mt-2 text-sm text-muted-foreground">
          Multiplication needs <span className="font-mono">*</span>:{' '}
          <span className="font-mono">2(3+4)</span> and <span className="font-mono">2pi</span> are
          rejected rather than guessed. Results are binary floating point, rounded for display.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="sci-calc-angle">Angle mode</Label>
            <Select value={angleMode} onValueChange={(next) => setAngleMode(next as AngleMode)}>
              <SelectTrigger id="sci-calc-angle" className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANGLE_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sci-calc-digits">Significant digits</Label>
            <Select value={digits} onValueChange={setDigits}>
              <SelectTrigger id="sci-calc-digits" className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIGITS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" className="h-11 flex-1" onClick={calculate}>
              Calculate
            </Button>
          </div>
        </div>

        <fieldset className="mt-4 grid grid-cols-6 gap-2 border-0 p-0 max-sm:grid-cols-4">
          <legend className="sr-only">Calculator keys</legend>
          {NUMBER_KEYS.map(key)}
          {OPERATOR_KEYS.map(key)}
          {OTHER_KEYS.map(key)}
          {FUNCTION_KEYS.map((name) => (
            <Button
              key={name}
              type="button"
              variant="outline"
              className="h-11 font-mono text-sm"
              onClick={() => insert(`${name}(`)}
              aria-label={`Insert ${name} of`}
            >
              {name}
            </Button>
          ))}
          <Button type="button" variant="ghost" className="h-11" onClick={backspace}>
            Del
          </Button>
          <Button type="button" variant="ghost" className="h-11" onClick={clearEntry}>
            Clear
          </Button>
        </fieldset>

        <ToolHint>
          Operators are + − × ÷ ^ and % (the remainder, not a percentage).{' '}
          <span className="font-mono">^</span> binds tighter than unary minus, so{' '}
          <span className="font-mono">-2^2</span> is −4. Functions: sin, cos, tan, asin, acos, atan,
          sinh, cosh, tanh, ln, log (base 10), log2, sqrt, cbrt, abs, exp, floor, ceil, round and
          factorial with <span className="font-mono">!</span>. Constants are pi and e; ans is the
          previous result in this session. Limits: 1,000 characters and 100 levels of brackets.
          History is kept for this page only.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Result">
        <p className="text-sm text-muted-foreground">Result</p>
        <p className="mt-1 min-h-11 break-all font-mono text-2xl tabular-nums">{result ?? '—'}</p>
        <p className="mt-1 text-sm text-muted-foreground">ans = {previous}</p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </ToolStage>

      <ToolStage title="History">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing calculated yet in this session.</p>
        ) : (
          <>
            <ol className="divide-y divide-border rounded-panel border border-border">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2"
                >
                  <span className="min-w-0 break-all font-mono text-sm text-muted-foreground">
                    {entry.expression}
                  </span>
                  <span className="font-mono text-sm tabular-nums">{entry.display}</span>
                </li>
              ))}
            </ol>
            <Button type="button" variant="ghost" className="mt-3" onClick={() => setHistory([])}>
              Clear history
            </Button>
          </>
        )}
      </ToolStage>
    </ToolFrame>
  );
}
