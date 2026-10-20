import {
  findStatus,
  type HttpStatus,
  STATUS_CLASSES,
  type StatusClass,
  searchStatuses,
} from '@omnitool/tool-core';
import { useMemo, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requireTool } from '@/lib/tool';
import { cn } from '@/lib/utils';

function detailsText(status: HttpStatus): string {
  return [
    `${status.code} ${status.name}`,
    `Class ${status.className}`,
    status.meaning,
    `Typically ${status.use.charAt(0).toLowerCase()}${status.use.slice(1)}`,
  ].join('\n');
}

export default function HttpStatusTool() {
  const tool = requireTool('http-status');
  const [query, setQuery] = useState('404');
  const [filter, setFilter] = useState<StatusClass | 'all'>('all');
  const [selected, setSelected] = useState<number | null>(404);

  const results = useMemo(() => searchStatuses(query, filter), [query, filter]);
  const detail = selected === null ? undefined : findStatus(selected);

  function reset() {
    setQuery('');
    setFilter('all');
    setSelected(null);
  }

  return (
    <ToolFrame tool={tool} onReset={reset}>
      <ToolStage title="Find a code">
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div className="space-y-2">
            <Label htmlFor="http-query">Code, name or words</Label>
            <Input
              id="http-query"
              type="search"
              value={query}
              autoComplete="off"
              placeholder="404, gateway, rate limit"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="http-class">Class</Label>
            <Select value={filter} onValueChange={(next) => setFilter(next as StatusClass | 'all')}>
              <SelectTrigger id="http-class" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every class</SelectItem>
                {STATUS_CLASSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ToolHint>
          Codes come from the IANA registry and the meanings follow RFC 9110. Search matches the
          code, the registered name or words in the explanation; a class filter narrows first.
        </ToolHint>
      </ToolStage>

      <ToolStage
        title="Results"
        actions={<Badge variant="secondary">{results.length} shown</Badge>}
      >
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing matches that search. Try a code such as 418, or a word such as gateway.
          </p>
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2">
            {results.map((status) => {
              const active = status.code === selected;
              return (
                <li key={status.code}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(status.code)}
                    className={cn(
                      'flex w-full items-baseline gap-3 rounded-control px-2 py-2 text-left hover:bg-surface-hover',
                      active && 'bg-surface-hover',
                    )}
                  >
                    <span className="font-mono text-sm font-medium">{status.code}</span>
                    <span className="min-w-0 flex-1 text-sm">{status.name}</span>
                    <span className="text-xs text-muted-foreground">{status.className}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ToolStage>

      {detail ? (
        <ToolStage
          title={`${detail.code} ${detail.name}`}
          actions={
            <OutputActions text={detailsText(detail)} filename={`http-${detail.code}.txt`} />
          }
        >
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium">Meaning</dt>
              <dd className="mt-1 text-muted-foreground">{detail.meaning}</dd>
            </div>
            <div>
              <dt className="font-medium">Typical use</dt>
              <dd className="mt-1 text-muted-foreground">{detail.use}</dd>
            </div>
          </dl>
        </ToolStage>
      ) : null}
    </ToolFrame>
  );
}
