import { useEffect } from 'react';

interface DocumentMetaOptions {
  /** Planned pages are not prerendered and must not be indexed. */
  readonly noindex?: boolean;
}

export function useDocumentMeta(
  title: string,
  description: string,
  options: DocumentMetaOptions = {},
): void {
  const noindex = options.noindex ?? false;

  useEffect(() => {
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.append(meta);
    }
    meta.content = description;

    if (!noindex) return;

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = robots?.getAttribute('content') ?? null;
    let created = false;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.append(robots);
      created = true;
    }
    robots.content = 'noindex';

    return () => {
      if (created) robots?.remove();
      else if (robots && previous !== null) robots.content = previous;
    };
  }, [title, description, noindex]);
}
