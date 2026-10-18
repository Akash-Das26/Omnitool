import { generateUuids, nanoid } from '@omnitool/tool-core';
import { CheckIcon, DownloadIcon, RefreshCwIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { OutputList, OutputRow } from '@/components/output-row';
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
import { copyText, downloadText } from '@/lib/download';
import { requireTool } from '@/lib/tool';

type Version = 'v4' | 'v7' | 'nanoid';

const DEFAULTS = {
  version: 'v4' as Version,
  count: 5,
  size: 21,
  uppercase: false,
  hyphens: true,
};

function createValues(
  version: Version,
  count: number,
  size: number,
  uppercase: boolean,
  hyphens: boolean,
): string[] {
  if (version === 'nanoid') {
    return Array.from({ length: count }, () => nanoid(size));
  }
  return generateUuids({ version, count, uppercase, hyphens });
}

export default function UuidGennyTool() {
  const tool = requireTool('uuid-genny');
  const [version, setVersion] = useState<Version>(DEFAULTS.version);
  const [count, setCount] = useState(DEFAULTS.count);
  const [size, setSize] = useState(DEFAULTS.size);
  const [uppercase, setUppercase] = useState(DEFAULTS.uppercase);
  const [hyphens, setHyphens] = useState(DEFAULTS.hyphens);
  const [values, setValues] = useState<string[]>(() =>
    createValues(
      DEFAULTS.version,
      DEFAULTS.count,
      DEFAULTS.size,
      DEFAULTS.uppercase,
      DEFAULTS.hyphens,
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => values.join('\n'), [values]);

  // Values repeat, so the row key needs a stable position as well as the value.
  const rows = useMemo(() => {
    let position = 0;
    return values.map((value) => {
      position += 1;
      return { key: `${position}:${value}`, position, value };
    });
  }, [values]);

  function generate() {
    try {
      setValues(createValues(version, count, size, uppercase, hyphens));
      setError(null);
      setCopied(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not generate values');
    }
  }

  function reset() {
    setVersion(DEFAULTS.version);
    setCount(DEFAULTS.count);
    setSize(DEFAULTS.size);
    setUppercase(DEFAULTS.uppercase);
    setHyphens(DEFAULTS.hyphens);
    setValues(
      createValues(
        DEFAULTS.version,
        DEFAULTS.count,
        DEFAULTS.size,
        DEFAULTS.uppercase,
        DEFAULTS.hyphens,
      ),
    );
    setError(null);
  }

  async function copyAll() {
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not copy');
    }
  }

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <>
          <Button type="button" onClick={copyAll} aria-live="polite">
            {copied ? <CheckIcon aria-hidden="true" className="size-4" /> : null}
            {copied ? 'Copied all' : 'Copy all'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadText(output, `${version}-values.txt`)}
          >
            <DownloadIcon aria-hidden="true" className="size-4" />
            Download .txt
          </Button>
        </>
      }
    >
      <ToolStage title="Input">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="uuid-version">Version</Label>
            <Select value={version} onValueChange={(value) => setVersion(value as Version)}>
              <SelectTrigger id="uuid-version" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v4">UUID v4 (random)</SelectItem>
                <SelectItem value="v7">UUID v7 (time-ordered)</SelectItem>
                <SelectItem value="nanoid">Nano ID</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uuid-count">How many</Label>
            <Input
              id="uuid-count"
              type="number"
              min={1}
              max={5000}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </div>

          {version === 'nanoid' ? (
            <div className="space-y-2">
              <Label htmlFor="nano-size">Length</Label>
              <Input
                id="nano-size"
                type="number"
                min={1}
                max={256}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
              />
            </div>
          ) : null}
        </div>
      </ToolStage>

      <ToolStage title="Options">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={uppercase}
              disabled={version === 'nanoid'}
              onChange={(event) => setUppercase(event.target.checked)}
              className="size-5 accent-[var(--primary)]"
            />
            Upper case
            {version === 'nanoid' ? (
              <span className="text-muted-foreground">(Nano IDs are case-sensitive)</span>
            ) : null}
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hyphens}
              disabled={version === 'nanoid'}
              onChange={(event) => setHyphens(event.target.checked)}
              className="size-5 accent-[var(--primary)]"
            />
            Hyphens
          </label>
        </div>
        <div className="mt-4">
          <Button type="button" onClick={generate}>
            <RefreshCwIcon aria-hidden="true" className="size-4" />
            Generate
          </Button>
        </div>
      </ToolStage>

      <ToolStage title="Output">
        {error ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <OutputList className="max-h-[60vh] overflow-auto rounded-control border border-border">
          {rows.map((row) => (
            <OutputRow key={row.key} label={`Value ${row.position}`} value={row.value} />
          ))}
        </OutputList>
        <p className="mt-3 text-sm text-muted-foreground">
          Generated with the browser's cryptographic random source. Nothing is sent anywhere.
        </p>
      </ToolStage>
    </ToolFrame>
  );
}
