import { formatBytes } from '@omnitool/tool-core';
import { CATEGORIES, searchTools, type Tool } from '@omnitool/tools-registry';
import { FileIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
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

function resultGroups(query: string, file: { name: string; type: string } | null) {
  const results = searchTools(query, { accepts: file ?? undefined });
  return CATEGORIES.map((category) => ({
    ...category,
    tools: results.filter((tool) => tool.category === category.id),
  })).filter((category) => category.tools.length > 0);
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
      <DialogContent className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Search tools</DialogTitle>
          <DialogDescription>
            Search by tool name, category or file type. Use the arrow keys and Enter to open a tool.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} loop>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search tools or a file type"
            aria-label="Search tools"
            autoFocus
          />
          {file ? (
            <div className="mx-2 mt-2 flex items-center gap-2 rounded-control border border-border bg-muted px-2 py-1.5 text-sm">
              <FileIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {file.type || 'Unknown type'}, {formatBytes(file.size)}
              </span>
              <button
                type="button"
                onClick={() => openOmnibox(null)}
                aria-label="Remove file filter"
                className="ml-auto rounded-control p-1 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <XIcon aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          ) : null}
          <CommandList label="Tools">
            <CommandEmpty>No tools match that search.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.id} heading={group.name}>
                {group.tools.map((tool) => {
                  const ready = isToolImplemented(tool.id);
                  return (
                    <CommandItem
                      key={tool.id}
                      value={`${tool.name} ${tool.id}`}
                      disabled={!ready}
                      onSelect={() => choose(tool)}
                      className="flex items-center gap-2"
                    >
                      <span>{tool.name}</span>
                      {!ready ? (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Phase {tool.phase}
                        </span>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Arrow keys move. Enter opens. Esc closes.
        </p>
      </DialogContent>
    </Dialog>
  );
}
