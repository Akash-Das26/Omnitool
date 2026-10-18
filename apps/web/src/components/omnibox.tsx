import { formatBytes } from '@omnitool/tool-core';
import { CATEGORIES, searchTools, type Tool } from '@omnitool/tools-registry';
import { FileIcon, XIcon } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from '@/lib/navigation';
import { useOmniboxStore } from '@/lib/stores';
import { isToolImplemented } from '@/lib/tool-modules';

/** The most a single "accepts this file" group shows before the categories take over. */
const FILE_MATCH_LIMIT = 6;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matching text is underlined, never coloured (DESIGN.md, Components). */
function Highlight({ text, query }: { readonly text: string; readonly query: string }) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  let offset = 0;
  const parts = text.split(pattern).map((part) => {
    const key = `${offset}:${part}`;
    offset += part.length;
    return { key, part };
  });

  return (
    <>
      {parts.map(({ key, part }) =>
        terms.includes(part.toLowerCase()) ? (
          <mark
            key={key}
            className="bg-transparent text-inherit underline decoration-2 underline-offset-2"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={key}>{part}</Fragment>
        ),
      )}
    </>
  );
}

interface OmniboxFile {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

function resultGroups(query: string, file: OmniboxFile | null) {
  const results = searchTools(query);
  const accepting = file ? searchTools(query, { accepts: file }) : [];
  const shown = new Set(accepting.slice(0, FILE_MATCH_LIMIT).map((tool) => tool.id));

  return {
    accepting: accepting.slice(0, FILE_MATCH_LIMIT),
    acceptingCount: accepting.length,
    categories: CATEGORIES.map((category) => ({
      ...category,
      tools: results.filter((tool) => tool.category === category.id && !shown.has(tool.id)),
    })).filter((category) => category.tools.length > 0),
    total: results.length,
  };
}

export function Omnibox() {
  const open = useOmniboxStore((state) => state.open);
  const file = useOmniboxStore((state) => state.file);
  const openOmnibox = useOmniboxStore((state) => state.openOmnibox);
  const closeOmnibox = useOmniboxStore((state) => state.closeOmnibox);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => resultGroups(query, file), [query, file]);

  function choose(tool: Tool) {
    if (!isToolImplemented(tool.id)) return;
    closeOmnibox();
    setQuery('');
    void navigate({ to: '/tools/$toolId', params: { toolId: tool.id } });
  }

  function renderItem(tool: Tool) {
    const ready = isToolImplemented(tool.id);
    return (
      <CommandItem
        key={tool.id}
        value={`${tool.name} ${tool.id}`}
        disabled={!ready}
        onSelect={() => choose(tool)}
        className="flex items-start gap-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium">
            <Highlight text={tool.name} query={query} />
          </span>
          {tool.description ? (
            <span className="mt-0.5 line-clamp-1 block text-xs font-normal text-muted-foreground">
              <Highlight text={tool.description} query={query} />
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {ready ? tool.categoryName : `Not built yet — phase ${tool.phase}`}
        </span>
      </CommandItem>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) openOmnibox(file);
        else {
          closeOmnibox();
          setQuery('');
        }
      }}
    >
      <DialogContent className="top-[10%] max-h-[80vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Search tools</DialogTitle>
          <DialogDescription>
            Search by tool name, category or file type. Use the arrow keys to move, Enter to open a
            tool and Escape to close.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} loop>
          <div className="relative">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search tools or a file type"
              aria-label="Search tools"
              autoFocus
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-control border border-border-strong px-2 py-1 text-xs hover:bg-surface-hover"
              >
                Clear
              </button>
            ) : null}
          </div>

          {file ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-inset px-3 py-2">
              <span className="inline-flex min-w-0 items-center gap-2 rounded-control border border-border-strong bg-surface px-2.5 py-1 font-mono text-xs">
                <FileIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-all">{file.name}</span>
                <span className="shrink-0 text-muted-foreground">{formatBytes(file.size)}</span>
                <span className="hidden shrink-0 text-muted-foreground sm:inline">
                  {file.type || 'unknown type'}
                </span>
                <button
                  type="button"
                  onClick={() => openOmnibox(null)}
                  aria-label="Remove file filter"
                  className="shrink-0 rounded-control p-1 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                </button>
              </span>
              <span className="text-xs text-muted-foreground">Filtering compatible tools</span>
            </div>
          ) : null}

          <CommandList aria-label="Tools" className="max-h-[56vh]">
            <CommandEmpty>No tools match that search.</CommandEmpty>
            {groups.accepting.length > 0 ? (
              <CommandGroup heading={`Tools that accept this file (${groups.acceptingCount})`}>
                {groups.accepting.map(renderItem)}
              </CommandGroup>
            ) : null}
            {groups.categories.map((group) => (
              <CommandGroup key={group.id} heading={group.name}>
                {group.tools.map(renderItem)}
              </CommandGroup>
            ))}
          </CommandList>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border-strong px-1.5 py-0.5 font-mono text-xs">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border-strong px-1.5 py-0.5 font-mono text-xs">
                ↵
              </kbd>
              Open
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border-strong px-1.5 py-0.5 font-mono text-xs">
                Tab
              </kbd>
              Cycle categories
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border-strong px-1.5 py-0.5 font-mono text-xs">
                Esc
              </kbd>
              Close
            </span>
            <span className="ml-auto">{groups.total} results</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
