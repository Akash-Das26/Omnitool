import {
  categoryName,
  characterOf,
  formatCodePoint,
  htmlEntity,
  parseCodePoint,
  utf8Bytes,
} from '@omnitool/tool-core';
import { GLYPH_RESULT_LIMIT, isUnnamed } from '@omnitool/tool-core/unicode/search';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { copyText } from '@/lib/download';
import { requireTool } from '@/lib/tool';
import { type Entry, GlyphGrid } from './glyph-grid';
import { createWorkerBackend } from './search-client';
import { createGlyphSearch, type GlyphSearchState } from './search-controller';

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

interface Selected {
  readonly codePoint: number;
  readonly name: string;
  readonly category: string;
  readonly block: string;
}

const DEFAULT_BLOCK = 'basic-latin';
/** Typing settles this long before the worker is asked; a stale query is dropped. */
const SEARCH_DEBOUNCE_MS = 250;

const SELECT_CLASS =
  'mt-2 h-8 w-full rounded-lg border border-input bg-transparent py-1 pr-2 pl-2.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

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
  const [selected, setSelected] = useState<Selected | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchLimit, setSearchLimit] = useState(GLYPH_RESULT_LIMIT);
  const [searchState, setSearchState] = useState<GlyphSearchState>({ status: 'idle' });

  const search = useMemo(() => createGlyphSearch(createWorkerBackend, setSearchState), []);

  useEffect(() => () => search.dispose(), [search]);

  useEffect(() => {
    const text = searchText.trim();
    if (text === '') {
      search.dispose();
      setSearchState({ status: 'idle' });
      return;
    }
    const timer = setTimeout(
      () => search.search({ query: text, limit: searchLimit }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [search, searchLimit, searchText]);

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
    setSearchText('');
    setSearchLimit(GLYPH_RESULT_LIMIT);
  }

  const selectedCharacter = selected ? characterOf(selected.codePoint) : '';
  const searchDone = searchState.status === 'done' ? searchState : null;
  const searchData = searchDone?.data ?? null;

  return (
    <ToolFrame tool={tool} onReset={reset}>
      <ToolStage title="Search every character">
        <Label htmlFor="glyph-search">Words, a character or a code point</Label>
        <Input
          id="glyph-search"
          className="mt-2"
          value={searchText}
          placeholder="grinning face, A, or U+1F600"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setSearchLimit(GLYPH_RESULT_LIMIT);
            setSearchText(event.target.value);
          }}
        />
        <div id="glyph-search-status" className="mt-3" aria-live="polite" role="status">
          {searchState.status === 'running' ? (
            <p className="text-sm text-muted-foreground">{searchState.label ?? 'Searching…'}</p>
          ) : searchState.status === 'error' ? (
            <p className="text-sm text-destructive">{searchState.message}</p>
          ) : searchData ? (
            <p className="text-sm text-muted-foreground">
              {searchData.total === 0
                ? `No characters match “${searchDone?.query ?? ''}”.`
                : searchData.total === 1
                  ? '1 character matches.'
                  : `${searchData.total.toLocaleString('en-GB')} characters match.`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Every named character in Unicode, by name word or code point.
            </p>
          )}
        </div>
        {searchData && searchData.results.length > 0 ? (
          <>
            <ul className="mt-3 flex flex-col gap-1">
              {searchData.results.map((row) => {
                const character = characterOf(row.codePoint);
                return (
                  <li key={row.codePoint}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected({
                          codePoint: row.codePoint,
                          name: row.name,
                          category: row.category,
                          block: row.block,
                        })
                      }
                      aria-pressed={selected?.codePoint === row.codePoint}
                      className="flex w-full items-start gap-3 rounded-control border border-border bg-surface p-2 text-left hover:bg-surface-hover focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-ring aria-pressed:bg-surface-inset"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center text-xl"
                      >
                        {character === ''
                          ? row.codePoint.toString(16).toUpperCase().padStart(4, '0')
                          : character}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm">
                          {isUnnamed(row.name) ? 'No name data' : row.name}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {formatCodePoint(row.codePoint)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {`${row.block}, ${categoryName(row.category)}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {searchData.total > searchData.results.length ? (
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSearchLimit((limit) => limit + GLYPH_RESULT_LIMIT)}
                >
                  {`Show ${GLYPH_RESULT_LIMIT} more`}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
        <ToolHint>
          {searchData
            ? `The names are ${(searchData.gzipBytes / 1024 / 1024).toFixed(1)} MB gzipped and are fetched once; the service worker keeps them, so searching works offline afterwards.`
            : 'The first search fetches the whole name table once; the service worker caches it, so searching works offline afterwards.'}
        </ToolHint>
      </ToolStage>

      <ToolStage title="Browse a block">
        {indexError ? (
          <p role="alert" className="text-sm text-destructive">
            {indexError}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="glyph-block">Block</Label>
              <select
                id="glyph-block"
                className={SELECT_CLASS}
                value={blockSlug}
                onChange={(event) => setBlockSlug(event.target.value)}
              >
                {(index?.blocks ?? []).map((candidate) => (
                  <option key={candidate.slug} value={candidate.slug}>
                    {`${candidate.name} (${candidate.count.toLocaleString('en-GB')})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="glyph-category">Category</Label>
              <select
                id="glyph-category"
                className={SELECT_CLASS}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((code) => (
                  <option key={code} value={code}>
                    {categoryName(code)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="glyph-query">Name or code point in this block</Label>
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
        {/* A fixed height for every state: the grid is 320 px tall, so the page
            must not grow by that much when the block arrives (that was 0.09 CLS). */}
        <div className="flex h-80 flex-col">
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
                {`${matches.length.toLocaleString('en-GB')} matching characters.`}
              </p>
              <GlyphGrid
                key={`${blockSlug}:${category}:${query}`}
                entries={matches}
                label={`Characters in ${block?.name ?? 'this block'}`}
                selectedCodePoint={selected?.codePoint ?? null}
                onSelect={(entry) =>
                  setSelected({
                    codePoint: entry[0],
                    name: entry[1],
                    category: entry[2],
                    block: block?.name ?? 'No block',
                  })
                }
              />
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
              <p className="text-center text-sm font-medium">
                {isUnnamed(selected.name) ? 'No name data' : selected.name}
              </p>
              <p className="text-center font-mono text-sm text-muted-foreground">
                {formatCodePoint(selected.codePoint)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {`${categoryName(selected.category)} in ${selected.block}`}
              </p>
              <div className="mt-2">
                <CopyValue label="Character" value={selectedCharacter} />
                <CopyValue label="Code point" value={formatCodePoint(selected.codePoint)} />
                <CopyValue
                  label="UTF-8 bytes"
                  value={utf8Bytes(selected.codePoint)
                    .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
                    .join(' ')}
                />
                <CopyValue label="HTML entity" value={htmlEntity(selected.codePoint)} />
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
