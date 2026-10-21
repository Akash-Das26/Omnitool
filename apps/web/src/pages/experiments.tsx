import { CATEGORIES } from '@omnitool/tools-registry';
import routeMeta from '@/app/route-meta.json';
import { Badge } from '@/components/ui/badge';
import { useDocumentMeta } from '@/lib/document-meta';
import { Link } from '@/lib/navigation';
import { isToolImplemented } from '@/lib/tool-modules';

/**
 * One line per sketch, in our own words. The registry supplies the name and the
 * description; this map says what is still unfinished about each one, because
 * "experiment" is a state and not a marketing label.
 */
const UNFINISHED: Readonly<Record<string, string>> = {
  'stupid-units':
    'The unit list is deliberately short and every size is sourced, so the choice is narrower than it looks. Conversions run both ways; there are no charts yet.',
  'recipe-table':
    'Volume-to-weight conversions cover a short list of ingredients. Anything else is scaled in the unit you typed in. No cooking timers or step editing.',
};

const EXPERIMENTS = CATEGORIES.find((category) => category.id === 'experiments')?.tools ?? [];

export function ExperimentsPage() {
  useDocumentMeta(routeMeta.experiments.title, routeMeta.experiments.description);

  return (
    <article className="mx-auto w-full max-w-[760px] px-4 py-8 md:px-8 md:py-12">
      <h1 className="text-2xl break-words md:text-3xl">Experiments</h1>
      <p className="prose-measure mt-4 text-muted-foreground">
        Unfinished sketches. They work, but they are narrower than the tools in the main index and
        may change shape. Each one says what it does not do yet.
      </p>

      <ul className="mt-6 divide-y divide-border rounded-panel border border-border bg-surface">
        {EXPERIMENTS.map((tool) => {
          const built = isToolImplemented(tool.id);
          return (
            <li key={tool.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                {built ? (
                  <Link
                    to={tool.href}
                    className="text-base font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {tool.name}
                  </Link>
                ) : (
                  <span className="text-base font-medium">{tool.name}</span>
                )}
                <Badge variant="outline">Sketch</Badge>
              </div>
              {tool.description ? (
                <p className="prose-measure mt-1 text-sm text-muted-foreground">
                  {tool.description}
                </p>
              ) : null}
              <p className="prose-measure mt-2 text-sm">
                {UNFINISHED[tool.id] ??
                  (built ? 'Built, but still being shaped.' : 'Not built yet.')}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-sm text-muted-foreground">
        Everything else lives in the{' '}
        <Link
          to="/"
          className="text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          tool index
        </Link>
        .
      </p>
    </article>
  );
}
