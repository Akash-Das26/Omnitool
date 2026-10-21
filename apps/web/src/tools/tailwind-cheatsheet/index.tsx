import {
  categoryCounts,
  categoryLabel,
  searchUtilities,
  TAILWIND_VERSION,
  UTILITIES,
  UTILITY_CATEGORY_IDS,
  type UtilityCategoryId,
  type UtilityEntry,
} from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { copyText } from '@/lib/download';
import { requireTool } from '@/lib/tool';
import { cn } from '@/lib/utils';

/** Bounded so a broad query cannot put hundreds of rows in the first render. */
const VISIBLE_LIMIT = 60;

/**
 * The visible words stay part of the accessible name (axe rule
 * label-content-name-mismatch), so the class name rides along as hidden text.
 */
function CopyButton({
  text,
  label,
  suffix,
}: {
  readonly text: string;
  readonly label: string;
  readonly suffix: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await copyText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <Button type="button" variant="ghost" className="h-9 px-2 text-sm" onClick={copy}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
      <span className="sr-only"> {suffix}</span>
    </Button>
  );
}

function EntryRow({ entry }: { readonly entry: UtilityEntry }) {
  return (
    <li className="px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <code className="inline-block rounded-control border border-border bg-surface-inset px-2 py-0.5 font-mono text-sm">
            {entry.class}
          </code>
          <p className="prose-measure mt-1 text-sm text-muted-foreground">{entry.note}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center">
          {' '}
          <CopyButton text={entry.class} label="Copy class" suffix={entry.class} />
          <CopyButton text={entry.css} label="Copy CSS" suffix={`for ${entry.class}`} />
        </div>
      </div>
      <details className="mt-2">
        <summary className="w-fit cursor-pointer rounded-control text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          CSS
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-control border border-border bg-surface-inset p-3 font-mono text-xs">
          {entry.css}
        </pre>
      </details>
    </li>
  );
}

export default function TailwindCheatsheetTool() {
  const tool = requireTool('tailwind-cheatsheet');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<UtilityCategoryId | 'all'>('all');

  const counts = categoryCounts();
  const matches = useMemo(() => searchUtilities(query, category), [query, category]);
  const shown = matches.slice(0, VISIBLE_LIMIT);

  const groups = UTILITY_CATEGORY_IDS.map((id) => ({
    id,
    label: categoryLabel(id),
    entries: shown.filter((entry) => entry.category === id),
  })).filter((group) => group.entries.length > 0);

  const summary =
    query.trim() === '' && category === 'all'
      ? `${UTILITIES.length} classes compiled by Tailwind ${TAILWIND_VERSION}`
      : `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`;

  function reset() {
    setQuery('');
    setCategory('all');
  }

  return (
    <ToolFrame tool={tool} onReset={reset}>
      <ToolStage title="Search">
        <Label htmlFor="cheatsheet-search">Class, property or words</Label>
        <Input
          id="cheatsheet-search"
          className="mt-2 h-11"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try flex, margin, centre or grid-cols"
          autoComplete="off"
          spellCheck={false}
        />
        <fieldset className="mt-4 border-0 p-0">
          <legend className="text-sm font-medium">Category</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={category === 'all' ? 'default' : 'outline'}
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
              className="h-9"
            >
              All
            </Button>
            {counts.map((entry) => (
              <Button
                key={entry.id}
                type="button"
                variant={category === entry.id ? 'default' : 'outline'}
                aria-pressed={category === entry.id}
                onClick={() => setCategory(entry.id)}
                className="h-9"
              >
                {entry.label}
                <span className="ml-1.5 text-xs opacity-80">{entry.count}</span>
              </Button>
            ))}
          </div>
        </fieldset>
        <ToolHint>
          The CSS is generated at build time by this site's pinned Tailwind compiler, then committed
          and checked in the test suite, so an upgrade has to be reviewed rather than quietly
          changing what you copy. Notes are ours. Spacing values resolve from the 0.25rem spacing
          scale, and colours from the default palette variables.
        </ToolHint>
      </ToolStage>

      <ToolStage title="Classes">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {summary}
        </p>
        {matches.length > VISIBLE_LIMIT ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Showing the first {VISIBLE_LIMIT}. Add a word or pick a category to narrow it.
          </p>
        ) : null}

        {groups.length === 0 ? (
          <p className="mt-3 rounded-panel border border-border bg-surface-inset px-3 py-6 text-sm text-muted-foreground">
            No class matches “{query.trim()}”. Try a property such as display or margin, or pick
            another category.
          </p>
        ) : (
          <div className="mt-3 space-y-6">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`cheatsheet-${group.id}`}>
                <h3
                  id={`cheatsheet-${group.id}`}
                  className={cn(
                    'flex items-center gap-2 border-b border-border pb-1 text-sm font-medium',
                  )}
                >
                  {group.label}
                  <span className="text-xs font-normal text-muted-foreground">
                    {group.entries.length}
                  </span>
                </h3>
                <ul className="divide-y divide-border">
                  {group.entries.map((entry) => (
                    <EntryRow key={entry.class} entry={entry} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </ToolStage>
    </ToolFrame>
  );
}
