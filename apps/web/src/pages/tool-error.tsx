import { Link } from '@/lib/navigation';

export function ToolErrorPage({ error }: { readonly error: unknown }) {
  const message = error instanceof Error ? error.message : 'The tool stopped unexpectedly.';

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-16 md:px-8">
      <h1 className="text-2xl">This tool could not run</h1>
      <p className="prose-measure mt-3 text-muted-foreground">
        {message} Your files were not uploaded anywhere. Reload the page to try again, or choose a
        different tool.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-10 items-center rounded-control bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          Reload
        </button>
        <Link
          to="/"
          className="inline-flex min-h-10 items-center rounded-control border border-border px-3 text-sm font-medium"
        >
          Back to the index
        </Link>
      </div>
    </div>
  );
}

export function ToolPendingPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8" aria-busy="true">
      <p className="sr-only">Loading tool</p>
      <div className="h-8 w-48 animate-pulse rounded-control bg-muted" />
      <div className="mt-6 h-48 animate-pulse rounded-panel bg-muted" />
    </div>
  );
}
