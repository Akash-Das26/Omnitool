import routeMeta from '@/app/route-meta.json';
import { useDocumentMeta } from '@/lib/document-meta';
import { Link } from '@/lib/navigation';

export function PrivacyPage() {
  useDocumentMeta(routeMeta.privacy.title, routeMeta.privacy.description);

  return (
    <article className="mx-auto w-full max-w-[760px] px-4 py-8 md:px-8 md:py-12">
      <h1 className="text-2xl md:text-3xl">Privacy</h1>
      <div className="prose-measure mt-6 space-y-5">
        <p>
          Omnitool runs entirely in your browser. There is no server that receives your files, no
          account to create and no analytics or telemetry of any kind.
        </p>

        <section aria-labelledby="stored">
          <h2 id="stored" className="text-xl">
            What is stored on your device
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Your theme choice and whether the category rail is collapsed, in local storage.</li>
            <li>
              A service worker cache so the app and its tools can open without a network connection.
              You can clear it in your browser settings at any time.
            </li>
            <li>
              Tool inputs and outputs stay in memory unless you download them. Omnitool does not
              write your files to storage on its own.
            </li>
          </ul>
        </section>

        <section aria-labelledby="not-collected">
          <h2 id="not-collected" className="text-xl">
            What is not collected
          </h2>
          <p>
            No page views, clicks, device details, file names, file contents or IP addresses are
            recorded by Omnitool. There are no third-party scripts, advertising pixels or tracking
            fonts. Typefaces are served from this site.
          </p>
        </section>

        <section aria-labelledby="downloads">
          <h2 id="downloads" className="text-xl">
            One-time downloads
          </h2>
          <p>
            Some later tools need a large codec or model that cannot be bundled. Those tools will
            ask before downloading, state the size, and work offline afterwards. The download hosts
            are listed in the project documentation. No download happens without you starting it.
          </p>
        </section>

        <section aria-labelledby="contact">
          <h2 id="contact" className="text-xl">
            Questions
          </h2>
          <p>
            The source code is public. Open an issue in the repository if something here does not
            match what the app does.
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
