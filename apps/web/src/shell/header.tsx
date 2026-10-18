import { SearchIcon } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { useOmniboxStore } from '@/lib/stores';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  const openOmnibox = useOmniboxStore((state) => state.openOmnibox);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-3 md:px-5">
        <Link
          to="/"
          className="rounded-control px-1 text-lg font-bold tracking-[-0.02em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Omnitool
        </Link>

        <button
          type="button"
          onClick={() => openOmnibox()}
          aria-keyshortcuts="Meta+K Control+K"
          className="ml-2 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-left text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground md:ml-6 md:max-w-md"
        >
          <SearchIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 overflow-hidden">Find a tool or drop a file</span>
          <kbd className="ml-auto hidden rounded-control border border-border-strong px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-1 flex shrink-0 items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
