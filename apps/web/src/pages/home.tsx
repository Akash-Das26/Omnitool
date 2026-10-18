import { CATEGORIES, type CategoryId, TOOL_COUNT } from '@omnitool/tools-registry';
import { SearchIcon } from 'lucide-react';
import { type DragEvent, useState } from 'react';
import routeMeta from '@/app/route-meta.json';
import { ToolRow } from '@/components/tool-row';
import { useDocumentMeta } from '@/lib/document-meta';
import { useNavigate, useSearch } from '@/lib/navigation';
import { validateSharedSearch } from '@/lib/search-params';
import { toIntakeFile, useOmniboxStore } from '@/lib/stores';
import { cn } from '@/lib/utils';

export function HomePage() {
  useDocumentMeta(routeMeta.home.title, routeMeta.home.description);
  const search = validateSharedSearch(useSearch({ strict: false }) as Record<string, unknown>);
  const navigate = useNavigate();
  const openOmnibox = useOmniboxStore((state) => state.openOmnibox);
  const [dragging, setDragging] = useState(false);

  const category = search.category;
  const visibleCategories = category
    ? CATEGORIES.filter((entry) => entry.id === category)
    : CATEGORIES;

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    openOmnibox(file ? toIntakeFile(file) : null);
  }

  function changeCategory(value: string) {
    void navigate({
      to: '/',
      search: value ? { category: value as CategoryId } : {},
      replace: true,
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 md:px-8 md:py-10">
      <h1 className="sr-only">Omnitool tools index</h1>

      <div
        className={cn(
          'overflow-hidden rounded-panel border bg-surface transition-colors',
          dragging ? 'border-solid border-primary' : 'border-border-strong',
        )}
      >
        <button
          type="button"
          onClick={() => openOmnibox()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          aria-keyshortcuts="Meta+K Control+K"
          className={cn(
            'flex min-h-16 w-full items-center gap-3 px-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring md:min-h-[72px] md:px-5',
            dragging && 'bg-highlight/20',
          )}
        >
          <SearchIcon aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-lg text-muted-foreground md:text-xl">
            Find a tool or drop a file
          </span>
          <kbd className="hidden shrink-0 rounded-control border border-border-strong px-2 py-1 font-mono text-xs text-muted-foreground sm:inline">
            Ctrl K
          </kbd>
        </button>
        <p className="border-t border-border bg-surface-inset px-3 py-2 text-sm text-muted-foreground md:px-5">
          {TOOL_COUNT} tools. Drop a file here to see which ones can open it.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-3 md:hidden">
        <label htmlFor="category-filter" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category-filter"
          value={category ?? ''}
          onChange={(event) => changeCategory(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-control border border-border-strong bg-surface px-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name} ({entry.tools.length})
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 space-y-8">
        {visibleCategories.map((entry) => (
          <section key={entry.id} aria-labelledby={`category-${entry.id}`}>
            <div className="overflow-hidden rounded-panel border border-border bg-surface">
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-inset px-3 py-2">
                <h2 id={`category-${entry.id}`} className="text-base">
                  {entry.name}
                </h2>
                <span className="text-xs text-muted-foreground">{entry.tools.length} tools</span>
                {category ? (
                  <button
                    type="button"
                    onClick={() => changeCategory('')}
                    className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Show all
                  </button>
                ) : null}
              </div>
              <ul className="divide-y divide-border">
                {entry.tools.map((tool) => (
                  <ToolRow key={tool.id} tool={tool} />
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
