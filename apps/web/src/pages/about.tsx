import routeMeta from '@/app/route-meta.json';
import { useDocumentMeta } from '@/lib/document-meta';
import { Link } from '@/lib/navigation';

const DEPENDENCIES = [
  ['React', 'MIT'],
  ['TanStack Router', 'MIT'],
  ['Tailwind CSS', 'MIT'],
  ['shadcn/ui', 'MIT'],
  ['Radix UI', 'MIT'],
  ['Lucide', 'ISC'],
  ['Valibot', 'MIT'],
  ['Comlink', 'Apache-2.0'],
  ['qrcode', 'MIT'],
  ['vite-plugin-pwa and Workbox', 'MIT'],
  ['Schibsted Grotesk and Geist Mono (Fontsource)', 'SIL OFL 1.1'],
] as const;

const DEVELOPMENT_TOOLS = [
  ['Vite', 'MIT'],
  ['Vitest', 'MIT'],
  ['Testing Library', 'MIT'],
  ['Playwright', 'Apache-2.0'],
  ['axe-core', 'MPL-2.0 (development only)'],
  ['Biome', 'MIT or Apache-2.0'],
  ['TypeScript', 'Apache-2.0'],
] as const;

export function AboutPage() {
  useDocumentMeta(routeMeta.about.title, routeMeta.about.description);

  return (
    <article className="mx-auto w-full max-w-[760px] px-4 py-8 md:px-8 md:py-12">
      <h1 className="text-2xl break-words md:text-3xl">Acknowledgements</h1>
      <div className="prose-measure mt-6 space-y-5">
        <p>
          Omnitool is an independent toolkit. It shares a product idea with earlier browser tool
          collections but uses its own code, design and copy.
        </p>

        <section aria-labelledby="runtime">
          <h2 id="runtime" className="text-xl">
            Runtime libraries
          </h2>
          <ul className="mt-2 divide-y divide-border rounded-panel border border-border">
            {DEPENDENCIES.map(([name, licence]) => (
              <li
                key={name}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">{name}</span>
                <span className="shrink-0 text-right text-muted-foreground">{licence}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="build-tools">
          <h2 id="build-tools" className="text-xl">
            Development tools
          </h2>
          <ul className="mt-2 divide-y divide-border rounded-panel border border-border">
            {DEVELOPMENT_TOOLS.map(([name, licence]) => (
              <li
                key={name}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">{name}</span>
                <span className="shrink-0 text-right text-muted-foreground">{licence}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted-foreground">
            axe-core is used only while testing and is not shipped to visitors.
          </p>
        </section>

        <section aria-labelledby="licence">
          <h2 id="licence" className="text-xl">
            Licence
          </h2>
          <p>
            Omnitool is released under the MIT licence, copyright 2026 Omnitool contributors. A full
            third-party notice file will be generated before release.
          </p>
        </section>
      </div>

      <p className="mt-8">
        <Link to="/" className="text-primary underline-offset-4 hover:underline">
          Back to the tool index
        </Link>
      </p>
    </article>
  );
}
