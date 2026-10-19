import type { Tool } from '@omnitool/tools-registry';
import { Badge } from '@/components/ui/badge';
import { useDocumentMeta } from '@/lib/document-meta';
import { Link } from '@/lib/navigation';

/**
 * A registry route without a loader is a planned tool, not a broken link. It
 * gets a readable page and noindex rather than the 404 copy.
 */
export function PlannedToolPage({ tool }: { readonly tool: Tool }) {
  useDocumentMeta(
    `${tool.name} — planned — Omnitool`,
    `${tool.name} is planned for Omnitool but is not available yet.`,
    { noindex: true },
  );

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-16 md:px-8">
      <Badge variant="outline">Planned</Badge>
      <h1 className="mt-3 text-2xl md:text-3xl">{tool.name}</h1>
      <p className="prose-measure mt-3 text-muted-foreground">
        {tool.name} is planned. It is not available yet. The tool index lists the tools you can use
        now.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-control border border-border-strong bg-surface px-3 text-sm font-medium hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:h-10"
        >
          Back to the tool index
        </Link>
      </div>
    </div>
  );
}
