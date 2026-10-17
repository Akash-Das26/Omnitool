import { CATEGORIES, type CategoryId } from '@omnitool/tools-registry';
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
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 md:px-8 md:py-12">
      <h1 className="sr-only">Omnitool tools index</h1>

      <div
        className={cn(
          'rounded-panel border border-border bg-surface p-2 transition-colors',
          dragging && 'border-solid border-primary bg-highlight/20',
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
          className="flex min-h-14 w-full items-center gap-3 rounded-control px-3 text-left hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-16 md:px-4"
        >
          <SearchIcon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-lg text-muted-foreground md:text-xl">
            Find a tool or drop a file
          </span>
          <kbd className="hidden shrink-0 rounded border border-border px-2 py-1 text-xs text-muted-foreground sm:inline">
            Ctrl K
          </kbd>
        </button>
      </div>
      <p className="mt-2 px-1 text-sm text-muted-foreground">
        Drop a file here to see which tools can open it.
      </p>

      <div className="mt-6 flex items-center justify-between gap-3 md:hidden">
        <label htmlFor="category-filter" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category-filter"
          value={category ?? ''}
          onChange={(event) => changeCategory(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-control border border-border bg-surface px-2 text-sm"
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
            <div className="mb-2 flex items-baseline gap-2">
              <h2 id={`category-${entry.id}`} className="text-lg">
                {entry.name}
              </h2>
              <span className="text-sm text-muted-foreground">{entry.tools.length}</span>
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
            <ul className="overflow-hidden rounded-panel border border-border bg-surface">
              {entry.tools.map((tool) => (
                <ToolRow key={tool.id} tool={tool} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
