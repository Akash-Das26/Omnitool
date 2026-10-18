import type { Tool } from '@omnitool/tools-registry';
import { Link } from '@/lib/navigation';
import { isToolImplemented } from '@/lib/tool-modules';
import { ToolGlyphs } from './tool-glyphs';
import { Badge } from './ui/badge';

export function ToolRow({ tool }: { readonly tool: Tool }) {
  const ready = isToolImplemented(tool.id);

  const body = (
    <>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className={ready ? 'font-medium' : 'font-medium text-muted-foreground'}>
          {tool.name}
        </span>
        {tool.flags.includes('new') ? (
          <Badge className="border-transparent bg-highlight text-highlight-foreground">New</Badge>
        ) : null}
        {tool.flags.includes('beta') ? <Badge variant="outline">Beta</Badge> : null}
        {!ready ? (
          <span className="text-xs text-muted-foreground">Not built yet — phase {tool.phase}</span>
        ) : null}
      </span>
      {tool.description ? (
        <span className="min-w-0 text-sm text-muted-foreground">{tool.description}</span>
      ) : null}
      <span className="md:ml-auto md:shrink-0">
        <ToolGlyphs accepts={tool.accepts} produces={tool.produces} />
      </span>
    </>
  );

  const rowClass =
    'flex flex-col gap-1 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring md:flex-row md:items-center md:gap-4';

  if (!ready) {
    return (
      <li>
        <div aria-disabled="true" className={`${rowClass} bg-surface-inset`}>
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
