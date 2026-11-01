import { parseMarkdown } from '@omnitool/tool-core/markdown';
import { htmlToModel } from '@omnitool/tool-core/sanitize';
import { PASTE_CORPUS } from '@omnitool/tool-core/sanitize/corpus';
import { checkUrl, LINK_RULES } from '@omnitool/tool-core/url';
import { URL_TRICKS } from '@omnitool/tool-core/url/corpus';
import { EditorState } from 'prosemirror-state';
import { describe, expect, test } from 'vitest';
import { documentFromModel, editorSchema, exportsFor, insertPastedHtml } from './model';

/**
 * Elements the editor never produces. If one appears in an exported body, a
 * payload has arrived as markup rather than as text.
 */
const FOREIGN_TAG =
  /<(?:script|img|svg|iframe|object|embed|style|form|video|canvas|template|math|textarea|noscript)\b/i;

function hrefsOf(document: import('@omnitool/tool-core/markdown').MarkdownDocument): string[] {
  const found: string[] = [];
  const visit = (nodes: readonly unknown[]): void => {
    for (const entry of nodes as readonly {
      type?: string;
      href?: string;
      children?: readonly unknown[];
    }[]) {
      if (entry.type === 'link' && typeof entry.href === 'string') found.push(entry.href);
      if (Array.isArray(entry.children)) visit(entry.children);
    }
  };
  const blocks = (list: readonly unknown[]): void => {
    for (const entry of list as readonly {
      children?: readonly unknown[];
      blocks?: readonly unknown[];
      items?: readonly { blocks: readonly unknown[] }[];
    }[]) {
      if (Array.isArray(entry.children)) visit(entry.children);
      if (Array.isArray(entry.blocks)) blocks(entry.blocks);
      if (Array.isArray(entry.items)) for (const item of entry.items) blocks(item.blocks);
    }
  };
  blocks(document.blocks);
  return found;
}

function bodyOf(html: string): string {
  const start = html.indexOf('<body>');
  const end = html.indexOf('</body>');
  return start === -1 || end === -1 ? html : html.slice(start + 6, end);
}

describe('the attack corpus through every editor path', () => {
  test('a paste or a drop never brings markup, and every link it keeps is allowed', () => {
    for (const payload of PASTE_CORPUS) {
      const state = EditorState.create({
        schema: editorSchema,
        doc: documentFromModel(parseMarkdown('')),
      });
      const { transaction } = insertPastedHtml(state, payload);
      const next = transaction ? state.apply(transaction) : state;
      const body = bodyOf(exportsFor.html(next.doc));
      expect(body, payload).not.toMatch(FOREIGN_TAG);

      next.doc.descendants((node) => {
        for (const mark of node.marks) {
          if (mark.type.name === 'link') {
            expect(checkUrl(String(mark.attrs.href ?? ''), LINK_RULES), payload).not.toBeNull();
          }
        }
        return true;
      });
    }
  });

  test('an opened HTML file is read by the sanitiser and brings no markup either', () => {
    for (const payload of PASTE_CORPUS) {
      const document = htmlToModel(payload).document;
      // The editor converts the model into its schema before rendering, and
      // the export escapes text, so a real tag in the body would be a bug.
      const state = EditorState.create({
        schema: editorSchema,
        doc: documentFromModel(document),
      });
      const body = bodyOf(exportsFor.html(state.doc));
      expect(body, payload).not.toMatch(FOREIGN_TAG);
      for (const href of hrefsOf(document)) {
        expect(checkUrl(href, LINK_RULES), payload).not.toBeNull();
      }
    }
  });

  test('an opened Markdown file keeps raw HTML as text, never as markup', () => {
    for (const payload of PASTE_CORPUS) {
      const state = EditorState.create({
        schema: editorSchema,
        doc: documentFromModel(parseMarkdown(payload)),
      });
      const body = bodyOf(exportsFor.html(state.doc));
      expect(body, payload).not.toMatch(FOREIGN_TAG);
      for (const href of hrefsOf(parseMarkdown(payload))) {
        expect(checkUrl(href, LINK_RULES), payload).not.toBeNull();
      }
    }
  });
});

/**
 * The scheme corpus on the same three paths. A paste, a drop and an opened
 * document all reach the editor through `insertPastedHtml` or `htmlToModel`,
 * so a destination that survives one of them would survive all three.
 */
describe('the scheme corpus through every editor path', () => {
  function linkHrefs(document: import('@omnitool/tool-core/markdown').MarkdownDocument): string[] {
    return hrefsOf(document);
  }

  test('a pasted link with a hidden scheme never becomes a link', () => {
    for (const trick of URL_TRICKS) {
      const state = EditorState.create({
        schema: editorSchema,
        doc: documentFromModel(parseMarkdown('')),
      });
      const { transaction } = insertPastedHtml(state, `<a href="${trick.value}">click</a>`);
      const next = transaction ? state.apply(transaction) : state;
      next.doc.descendants((node) => {
        for (const mark of node.marks) {
          if (mark.type.name === 'link') {
            expect(checkUrl(String(mark.attrs.href ?? ''), LINK_RULES), trick.value).not.toBeNull();
          }
        }
        return true;
      });
      const body = bodyOf(exportsFor.html(next.doc));
      expect(body, `${trick.family}: ${trick.value}`).not.toContain('href=');
    }
  });

  test('an opened HTML file and an opened Markdown file keep no trick destination', () => {
    for (const trick of URL_TRICKS) {
      const fromHtml = htmlToModel(`<p><a href="${trick.value}">click</a></p>`).document;
      for (const href of linkHrefs(fromHtml)) {
        expect(checkUrl(href, LINK_RULES), `${trick.family}: ${trick.value}`).not.toBeNull();
      }

      const fromMarkdown = parseMarkdown(`[click](${trick.value})`);
      for (const href of linkHrefs(fromMarkdown)) {
        expect(checkUrl(href, LINK_RULES), `${trick.family}: ${trick.value}`).not.toBeNull();
      }
    }
  });
});
