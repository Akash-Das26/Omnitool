import { SearchIcon } from 'lucide-react';
import routeMeta from '@/app/route-meta.json';
import { Button } from '@/components/ui/button';
import { useDocumentMeta } from '@/lib/document-meta';
import { Link } from '@/lib/navigation';
import { useOmniboxStore } from '@/lib/stores';

export function NotFoundPage() {
  useDocumentMeta(routeMeta['not-found'].title, routeMeta['not-found'].description);
  const openOmnibox = useOmniboxStore((state) => state.openOmnibox);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-16 md:px-8">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl md:text-3xl">Page not found</h1>
      <p className="prose-measure mt-3 text-muted-foreground">
        That page does not exist. The tool index is the best place to start.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={() => openOmnibox()}>
          <SearchIcon aria-hidden="true" className="size-4" />
          Search tools
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Back to the index</Link>
        </Button>
      </div>
    </div>
  );
}
