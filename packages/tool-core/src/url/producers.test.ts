import { describe, expect, it } from 'vitest';
import { type MarkdownDocument, parseMarkdown, renderMarkdownHtml } from '../markdown/index';
import { buildMetaTags } from '../meta/index';
import { htmlToModel } from '../sanitize/index';
import { ALLOWED_LINKS, INLINE_PNG, URL_TRICKS } from './corpus';
import { checkUrl, LINK_RULES } from './index';

/**
 * Every producer of a link runs the same corpus.
 *
 * These are the paths that turn somebody else's text or file into markup this
 * project shows or exports. Each one must either drop a refused destination or
 * keep it as text; none may write it into an `href` or `src`. The text editor's
 * paste, drop and open-a-document paths are covered in
 * `apps/web/src/tools/text-editor/corpus-paths.test.ts`, which has the same
 * corpus imported.
 */

const HREF = /<a\s[^>]*href="([^"]*)"/gi;
const SRC = /<img\s[^>]*src="([^"]*)"/gi;

function hrefsOf(html: string): string[] {
  return [...html.matchAll(HREF)].map((match) => match[1] ?? '');
}

function srcsOf(html: string): string[] {
  return [...html.matchAll(SRC)].map((match) => match[1] ?? '');
}

function linkHrefs(document: MarkdownDocument): string[] {
  const found: string[] = [];
  const inline = (nodes: readonly unknown[]): void => {
    for (const node of nodes as readonly {
      type?: string;
      href?: string;
      children?: readonly unknown[];
    }[]) {
      if (node.type === 'link' && typeof node.href === 'string') found.push(node.href);
      if (Array.isArray(node.children)) inline(node.children);
    }
  };
  const blocks = (nodes: readonly unknown[]): void => {
    for (const node of nodes as readonly {
      children?: readonly unknown[];
      blocks?: readonly unknown[];
      items?: readonly { blocks: readonly unknown[] }[];
    }[]) {
      if (Array.isArray(node.children)) inline(node.children);
      if (Array.isArray(node.blocks)) blocks(node.blocks);
      if (Array.isArray(node.items)) for (const item of node.items) blocks(item.blocks);
    }
  };
  blocks(document.blocks);
  return found;
}

/**
 * `markdown-it` percent-encodes a destination before the check sees it, so a
 * malformed value arrives as a well-formed relative path: `%%%` becomes
 * `%25%25%25`. That is not a scheme escape – a browser reads it as a
 * same-origin path – so the link is kept, and the test below checks it as one.
 */
const NORMALISED_TO_RELATIVE: Readonly<Record<string, string>> = Object.freeze({
  '%%%': '%25%25%25',
});

describe('the markdown parser', () => {
  it('drops the destination of every trick and keeps the words', () => {
    for (const trick of URL_TRICKS) {
      const document = parseMarkdown(`[click](${trick.value})`);
      const normalised = NORMALISED_TO_RELATIVE[trick.value];
      if (normalised !== undefined) {
        expect(linkHrefs(document), trick.value).toEqual([normalised]);
        expect(checkUrl(normalised, LINK_RULES), normalised).not.toBeNull();
        continue;
      }
      expect(linkHrefs(document), `${trick.family}: ${trick.value}`).toEqual([]);

      const html = renderMarkdownHtml(document);
      expect(hrefsOf(html), `${trick.family}: ${trick.value}`).toEqual([]);
      expect(html).not.toContain('<a ');
    }
  });

  it('refuses every trick as an image source as well as a link', () => {
    for (const trick of URL_TRICKS) {
      const document = parseMarkdown(`![alt](${trick.value})`);
      const html = renderMarkdownHtml(document);
      expect(srcsOf(html), `${trick.family}: ${trick.value}`).toEqual([]);
      expect(html).not.toContain('<img ');
    }
  });

  it('keeps the ordinary destinations, and an inline raster image where images are allowed', () => {
    for (const allowed of ALLOWED_LINKS) {
      const html = renderMarkdownHtml(parseMarkdown(`[click](${allowed.value})`));
      expect(hrefsOf(html), allowed.value).toEqual([allowed.value]);
    }
    // The model-level image rule is stricter than the URL rule: only inline
    // raster data survives, because anything else would be a third-party fetch.
    expect(srcsOf(renderMarkdownHtml(parseMarkdown(`![pixel](${INLINE_PNG})`)))).toEqual([
      INLINE_PNG,
    ]);
  });
});

describe('the HTML sanitiser', () => {
  it('keeps no link and no image from a trick, in the model or in the export', () => {
    for (const trick of URL_TRICKS) {
      const source = `<p><a href="${trick.value}">click</a><img src="${trick.value}" alt="x"></p>`;
      const { document } = htmlToModel(source);
      expect(linkHrefs(document), `${trick.family}: ${trick.value}`).toEqual([]);

      const html = renderMarkdownHtml(document);
      expect(hrefsOf(html), `${trick.family}: ${trick.value}`).toEqual([]);
      expect(srcsOf(html), `${trick.family}: ${trick.value}`).toEqual([]);
    }
  });

  it('keeps an ordinary link the reader pasted', () => {
    const { document } = htmlToModel('<p><a href="https://example.com/a">click</a></p>');
    expect(linkHrefs(document)).toEqual(['https://example.com/a']);
  });
});

describe('the meta tag builder', () => {
  it('writes no address at all when the canonical URL or the image is a trick', () => {
    for (const trick of URL_TRICKS) {
      const { html, warnings } = buildMetaTags({
        title: '',
        description: '',
        canonical: trick.value,
        language: '',
        robots: '',
        themeColour: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: trick.value,
        ogType: '',
        twitterCard: '',
        twitterSite: '',
      });
      expect(html, `${trick.family}: ${trick.value}`).not.toContain('<link rel="canonical"');
      expect(html, `${trick.family}: ${trick.value}`).not.toContain('property="og:image"');
      expect(html, `${trick.family}: ${trick.value}`).not.toContain('name="twitter:image"');
      expect(html, `${trick.family}: ${trick.value}`).not.toContain('property="og:url"');
      if (trick.value.trim() !== '') expect(warnings.length).toBeGreaterThan(0);
    }
  });
});
