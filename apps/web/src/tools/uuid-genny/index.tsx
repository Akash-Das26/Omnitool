import { generateUuids, nanoid } from '@omnitool/tool-core';
import { CheckIcon, CopyIcon, DownloadIcon, RefreshCwIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  const [version, setVersion] = useState<Version>('v4');
  const [count, setCount] = useState(5);
  const [size, setSize] = useState(21);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [values, setValues] = useState<string[]>(() => createValues('v4', 5, 21, false, true));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => values.join('\n'), [values]);

  function generate() {
    try {
      setValues(createValues(version, count, size, uppercase, hyphens));
      setError(null);
      setCopied(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not generate values');
    }
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
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
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
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={uppercase}
                disabled={version === 'nanoid'}
                onChange={(event) => setUppercase(event.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Upper case
              {version === 'nanoid' ? (
                <span className="text-muted-foreground">(Nano IDs are case-sensitive)</span>
              ) : null}
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hyphens}
                disabled={version === 'nanoid'}
                onChange={(event) => setHyphens(event.target.checked)}
                className="size-4 accent-[var(--primary)]"
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
          <Label htmlFor="uuid-output" className="sr-only">
            Generated values
          </Label>
          <textarea
            id="uuid-output"
            readOnly
            value={output}
            rows={Math.min(16, Math.max(5, values.length))}
            className="w-full resize-y rounded-control border border-border bg-background p-3 font-mono text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={copyAll} aria-live="polite">
              {copied ? (
                <CheckIcon aria-hidden="true" className="size-4" />
              ) : (
                <CopyIcon aria-hidden="true" className="size-4" />
              )}
              {copied ? 'Copied' : 'Copy all'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadText(output, `${version}-values.txt`)}
            >
              <DownloadIcon aria-hidden="true" className="size-4" />
              Download .txt
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Generated with the browser's cryptographic random source. Nothing is sent anywhere.
          </p>
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
