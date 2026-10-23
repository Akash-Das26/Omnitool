import {
  categoryName,
  characterOf,
  formatCodePoint,
  htmlEntity,
  parseCodePoint,
  utf8Bytes,
} from '@omnitool/tool-core';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { copyText } from '@/lib/download';
import { requireTool } from '@/lib/tool';

type Entry = readonly [codePoint: number, name: string, category: string];

interface BlockSummary {
  readonly name: string;
  readonly slug: string;
  readonly start: number;
  readonly end: number;
  readonly count: number;
  readonly parts: readonly string[];
}

interface Index {
  readonly version: string;
  readonly source: string;
  readonly blocks: readonly BlockSummary[];
}

const DEFAULT_BLOCK = 'basic-latin';
/** The grid renders at most this many characters; the count says how many match. */
const VISIBLE_LIMIT = 500;

function isPrintable(codePoint: number, category: string): boolean {
  if (
    category === 'Cc' ||
    category === 'Cf' ||
    category === 'Cs' ||
    category === 'Zl' ||
    category === 'Zp'
  ) {
    return false;
  }
  return characterOf(codePoint) !== '';
}

function CopyValue({ label, value }: { readonly label: string; readonly value: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await copyText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="break-all font-mono text-sm">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={copy}
        aria-label={`Copy ${label.toLowerCase()}`}
        aria-live="polite"
      >
        {state === 'copied' ? (
          <CheckIcon aria-hidden="true" className="size-4" />
        ) : (
          <CopyIcon aria-hidden="true" className="size-4" />
        )}
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Failed' : 'Copy'}
      </Button>
    </div>
  );
}

export default function GlyphBrowserTool() {
  const tool = requireTool('glyph-browser');
  const [index, setIndex] = useState<Index | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [blockSlug, setBlockSlug] = useState(DEFAULT_BLOCK);
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Entry | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/unicode/index.json')
      .then((response) => {
        if (!response.ok)
          throw new Error(`The character index is not available (${response.status}).`);
        return response.json() as Promise<Index>;
      })
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setIndexError(
            cause instanceof Error ? cause.message : 'The character index is not available.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const block = index?.blocks.find((candidate) => candidate.slug === blockSlug) ?? null;

  useEffect(() => {
    if (!block) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all(
      block.parts.map((part) =>
        fetch(`/unicode/blocks/${part}`).then((response) => {
          if (!response.ok) throw new Error(`Block data is not available (${response.status}).`);
          return response.json() as Promise<Entry[]>;
        }),
      ),
    )
      .then((parts) => {
        if (cancelled) return;
        setEntries(parts.flat());
        setSelected(null);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setLoadError(cause instanceof Error ? cause.message : 'Block data is not available.');
        setEntries([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [block]);

  const categories = useMemo(() => {
    const codes = new Set(entries.map((entry) => entry[2]));
    return [...codes].sort();
  }, [entries]);

  const matches = useMemo(() => {
    const text = query.trim();
    const codePointQuery = text === '' ? null : parseCodePoint(text);
    return entries.filter((entry) => {
      if (category !== 'all' && entry[2] !== category) return false;
      if (text === '') return true;
      if (codePointQuery !== null && entry[0] === codePointQuery) return true;
      return entry[1].toLowerCase().includes(text.toLowerCase());
    });
  }, [category, entries, query]);

  function reset() {
    setBlockSlug(DEFAULT_BLOCK);
    setQuery('');
    setCategory('all');
    setSelected(null);
  }

  const selectedCharacter = selected ? characterOf(selected[0]) : '';

  return (
    <ToolFrame tool={tool} onReset={reset}>
      <ToolStage title="Find a character">
        {indexError ? (
          <p role="alert" className="text-sm text-destructive">
            {indexError}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="glyph-block">Block</Label>
              <Select value={blockSlug} onValueChange={setBlockSlug}>
                <SelectTrigger id="glyph-block" className="mt-2">
                  <SelectValue placeholder="Choose a block" />
                </SelectTrigger>
                <SelectContent>
                  {(index?.blocks ?? []).map((candidate) => (
                    <SelectItem key={candidate.slug} value={candidate.slug}>
                      {`${candidate.name} (${candidate.count.toLocaleString('en-GB')})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="glyph-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="glyph-category" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((code) => (
                    <SelectItem key={code} value={code}>
                      {categoryName(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="glyph-query">Name or code point</Label>
              <Input
                id="glyph-query"
                className="mt-2"
                value={query}
                placeholder="LATIN SMALL LETTER A, or U+0041"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        )}
        <ToolHint>
          Choose a block, then filter by name or paste a code point. The block data is fetched once
          per block and cached by the service worker, so a block you have opened works offline.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Characters">
        <div className="h-80 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading this block…</p>
          ) : loadError ? (
            <p role="alert" className="text-sm text-destructive">
              {loadError}
            </p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing in this block matches. Try another block, or clear the search.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {`${matches.length.toLocaleString('en-GB')} matching characters`}
                {matches.length > VISIBLE_LIMIT
                  ? `; showing the first ${VISIBLE_LIMIT}. Narrow the search to see the rest.`
                  : '.'}
              </p>
              <ul className="grid grid-cols-6 gap-1 sm:grid-cols-10 md:grid-cols-12">
                {matches.slice(0, VISIBLE_LIMIT).map((entry) => {
                  const [codePoint, name, entryCategory] = entry;
                  const character = characterOf(codePoint);
                  const printable = isPrintable(codePoint, entryCategory);
                  return (
                    <li key={`${codePoint}-${name}`}>
                      <button
                        type="button"
                        onClick={() => setSelected(entry)}
                        // The visible glyph must be part of the accessible name,
                        // or the name and the label disagree (axe: label-content-name-mismatch).
                        aria-label={`${printable ? character : codePoint.toString(16).toUpperCase().padStart(4, '0')} ${name}, ${formatCodePoint(codePoint)}`}
                        aria-pressed={selected?.[0] === codePoint}
                        className="flex aspect-square w-full items-center justify-center rounded-control border border-border bg-surface text-lg hover:bg-surface-hover focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-ring aria-pressed:bg-surface-inset"
                      >
                        {printable ? (
                          <span aria-hidden="true">{character}</span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="font-mono text-xs text-muted-foreground"
                          >
                            {codePoint.toString(16).toUpperCase().padStart(4, '0')}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </ToolStage>

      <ToolStage title="Character">
        {selected ? (
          <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
            <div className="flex flex-col items-center gap-3 rounded-control border border-border bg-surface-inset p-4">
              <span className="text-6xl leading-none" aria-hidden="true">
                {selectedCharacter === '' ? '·' : selectedCharacter}
              </span>
              <p className="text-center text-sm font-medium">{selected[1]}</p>
              <p className="text-center font-mono text-sm text-muted-foreground">
                {formatCodePoint(selected[0])}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {`${categoryName(selected[2])} in ${block?.name ?? 'this block'}`}
              </p>
              <div className="mt-2">
                <CopyValue label="Character" value={selectedCharacter} />
                <CopyValue label="Code point" value={formatCodePoint(selected[0])} />
                <CopyValue
                  label="UTF-8 bytes"
                  value={utf8Bytes(selected[0])
                    .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
                    .join(' ')}
                />
                <CopyValue label="HTML entity" value={htmlEntity(selected[0])} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a character above to see its name, code point, UTF-8 bytes and HTML entity.
          </p>
        )}
      </ToolStage>

      <ToolStage title="About this data">
        <p className="text-sm text-muted-foreground">
          {`Unicode ${index?.version ?? '16.0.0'} block, category and name data generated from `}
          <span className="font-mono">@unicode/unicode-16.0.0 2.0.8</span>
          {
            ' (MIT), which is built from the Unicode Character Database. The Unicode Character Database is used under the Unicode licence v3. Nothing here is fetched from another site.'
          }
        </p>
      </ToolStage>
    </ToolFrame>
  );
}
