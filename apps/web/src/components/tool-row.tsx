import type { Tool } from '@omnitool/tools-registry';
import { Link } from '@/lib/navigation';
import { isToolImplemented } from '@/lib/tool-modules';
import { ToolGlyphs } from './tool-glyphs';
import { Badge } from './ui/badge';

export function ToolRow({ tool }: { readonly tool: Tool }) {
  const ready = isToolImplemented(tool.id);

  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-y-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span data-row-name className={ready ? 'font-medium' : 'font-medium text-foreground'}>
            {tool.name}
          </span>
          {tool.flags.includes('new') ? (
            <Badge className="border-transparent bg-highlight text-highlight-foreground">New</Badge>
          ) : null}
          {tool.flags.includes('beta') ? <Badge variant="outline">Beta</Badge> : null}
          {!ready ? <Badge variant="outline">Planned</Badge> : null}
        </span>
        {tool.description ? (
          <span data-row-description className="min-w-0 text-sm text-muted-foreground">
            {tool.description}
          </span>
        ) : null}
      </span>
      <span className="md:ml-auto md:shrink-0">
        <ToolGlyphs accepts={tool.accepts} produces={tool.produces} />
      </span>
    </>
  );

  const rowClass =
    'flex min-h-11 flex-col gap-y-1 px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring md:flex-row md:items-center md:gap-4';

  if (!ready) {
    return (
      <li>
        <div data-row-planned className={`${rowClass} bg-surface-inset`}>
          {body}
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        to="/tools/$toolId"
        params={{ toolId: tool.id }}
        className={`${rowClass} hover:bg-surface-hover`}
      >
        {body}
      </Link>
    </li>
  );
}
