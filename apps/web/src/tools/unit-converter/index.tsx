import {
  convert,
  convertAll,
  DEFAULT_PRECISION,
  getCategory,
  UNIT_CATEGORIES,
  UnitConversionError,
} from '@omnitool/tool-core';
import { ArrowLeftRightIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
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

const INITIAL_CATEGORY = getCategory('length');

export default function UnitConverterTool() {
  const tool = requireTool('unit-converter');
  const [categoryId, setCategoryId] = useState(INITIAL_CATEGORY.id);
  const [fromId, setFromId] = useState(INITIAL_CATEGORY.defaultFrom);
  const [toId, setToId] = useState(INITIAL_CATEGORY.defaultTo);
  const [value, setValue] = useState('1');
  const [precision, setPrecision] = useState(String(DEFAULT_PRECISION));

  const category = getCategory(categoryId);
  const places = Math.min(12, Math.max(0, Math.trunc(Number(precision)) || 0));

  const result = useMemo(() => {
    if (value.trim() === '') return { text: '', error: null };
    try {
      return {
        text: String(convert(Number(value), categoryId, fromId, toId, places)),
        error: null,
      };
    } catch (cause) {
      return {
        text: '',
        error:
          cause instanceof UnitConversionError
            ? cause.message
            : 'That value could not be converted',
      };
    }
  }, [value, categoryId, fromId, toId, places]);

  const rows = useMemo(() => {
    if (value.trim() === '') return [];
    try {
      return convertAll(Number(value), categoryId, fromId, places);
    } catch {
      return [];
    }
  }, [value, categoryId, fromId, places]);

  const fromUnit = category.units.find((unit) => unit.id === fromId);
  const toUnit = category.units.find((unit) => unit.id === toId);

  const tableText = [
    `${value || '?'} ${fromUnit?.name ?? fromId} in every ${category.name.toLowerCase()} unit`,
    ...rows.map((row) => `${row.value} ${row.unit.symbol}\t${row.unit.name}`),
  ].join('\n');

  function selectCategory(nextId: string) {
    const next = getCategory(nextId);
    setCategoryId(next.id);
    setFromId(next.defaultFrom);
    setToId(next.defaultTo);
  }

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  function reset() {
    setCategoryId(INITIAL_CATEGORY.id);
    setFromId(INITIAL_CATEGORY.defaultFrom);
    setToId(INITIAL_CATEGORY.defaultTo);
    setValue('1');
    setPrecision(String(DEFAULT_PRECISION));
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions
          text={tableText}
          filename="unit-conversion.txt"
          disabled={rows.length === 0}
        />
      }
    >
      <ToolStage title="Convert">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unit-category">Category</Label>
            <Select value={categoryId} onValueChange={selectCategory}>
              <SelectTrigger id="unit-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_CATEGORIES.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-precision">Decimal places</Label>
            <Input
              id="unit-precision"
              type="number"
              min={0}
              max={12}
              value={precision}
              onChange={(event) => setPrecision(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-from-value">Value</Label>
            <Input
              id="unit-from-value"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <Label htmlFor="unit-from">Convert from</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger id="unit-from" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {category.units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="unit-to">Convert to</Label>
              <Button type="button" variant="ghost" onClick={swap} aria-label="Swap units">
                <ArrowLeftRightIcon aria-hidden="true" className="size-4" />
                Swap
              </Button>
            </div>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger id="unit-to" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {category.units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Equals</p>
            <Input
              aria-label="Converted value"
              readOnly
              className="font-mono"
              value={result.text}
            />
            {result.error ? (
              <p role="alert" className="text-sm text-destructive">
                {result.error}
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Factors are exact definitions: an inch is 25.4 mm by definition, a pound 0.45359237 kg,
          and a kibibyte 1024 bytes. Temperatures convert through Celsius, so the offsets between
          the scales are handled in both directions.
        </p>
      </ToolStage>

      <ToolStage title={`All ${category.name.toLowerCase()} units`}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Enter a number to see the full table.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full max-w-xl border-collapse text-sm">
              <caption className="sr-only">
                {value} {fromUnit?.name ?? fromId} in every unit of {category.name}
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-6 font-medium">
                    Unit
                  </th>
                  <th scope="col" className="py-2 pr-6 font-medium">
                    Symbol
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.unit.id}
                    className={row.unit.id === toId ? 'bg-surface-inset font-medium' : undefined}
                  >
                    <td className="py-1.5 pr-6">{row.unit.name}</td>
                    <td className="py-1.5 pr-6 font-mono text-muted-foreground">
                      {row.unit.symbol}
                    </td>
                    <td className="py-1.5 font-mono">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {toUnit ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Highlighted row: {toUnit.name}. Change the decimal places to trade length for precision.
          </p>
        ) : null}
      </ToolStage>
    </ToolFrame>
  );
}
