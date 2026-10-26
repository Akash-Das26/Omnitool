/**
 * Markdown that cannot execute or fetch anything.
 *
 * markdown-it is used as a tokenizer only: raw HTML is off, linkify is off, and
 * the tokens are converted into this module's own tree. The UI renders that tree
 * as React elements, and the export serialises the same tree with escaped text,
 * so no markup string from the input ever reaches a DOM. Links keep only http,
 * https and mailto; images keep only inline data: URIs, because a remote image
 * would be a third-party request.
 */

import Markdown from 'markdown-it';
import { checkUrl, DATA_IMAGE, IMAGE_RULES, LINK_RULES } from '../url/index';

export type InlineNode =
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'strong'; readonly children: readonly InlineNode[] }
  | { readonly type: 'em'; readonly children: readonly InlineNode[] }
  | { readonly type: 'del'; readonly children: readonly InlineNode[] }
  | { readonly type: 'code'; readonly value: string }
  | {
      readonly type: 'link';
      readonly href: string;
      readonly title?: string;
      children: InlineNode[];
    }
  | { readonly type: 'image'; readonly src: string; readonly alt: string }
  | { readonly type: 'break' };

export type Align = 'left' | 'center' | 'right' | null;

export interface ListItem {
  readonly checked: boolean | null;
  readonly blocks: readonly BlockNode[];
}

export type BlockNode =
  | {
      readonly type: 'heading';
      readonly level: number;
      readonly id: string;
      readonly children: readonly InlineNode[];
    }
  | { readonly type: 'paragraph'; readonly children: readonly InlineNode[] }
  | { readonly type: 'blockquote'; readonly blocks: readonly BlockNode[] }
  | {
      readonly type: 'list';
      readonly ordered: boolean;
      readonly start: number;
      readonly items: readonly ListItem[];
    }
  | { readonly type: 'code'; readonly language: string; readonly value: string }
  | { readonly type: 'table'; readonly align: readonly Align[]; readonly rows: readonly TableRow[] }
  | { readonly type: 'rule' }
  | { readonly type: 'note'; readonly value: string };

export interface TableRow {
  readonly header: boolean;
  readonly cells: readonly (readonly InlineNode[])[];
}

export interface MarkdownDocument {
  readonly blocks: readonly BlockNode[];
  /** Plain sentences about what was dropped, shown above the preview. */
  readonly warnings: readonly string[];
}

export const MAX_MARKDOWN_LENGTH = 2_000_000;

/**
 * A destination markdown-it may turn into a link, or null if it must stay text.
 * The rules live in `@omnitool/tool-core/url` so every producer agrees.
 */
export function safeHref(raw: string): string | null {
  return checkUrl(raw, LINK_RULES);
}

/**
 * An image source. Only inline raster data and a same-origin or http(s)
 * address survive; a remote image would be a third-party request, so the
 * markdown parser still refuses http(s) images at the model level.
 */
export function safeImageSrc(raw: string): string | null {
  const value = checkUrl(raw, IMAGE_RULES);
  return value !== null && DATA_IMAGE.test(value) ? value : null;
}

/** A stable, readable id for a heading; never derived from raw markup. */
export function markdownSlug(text: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base === '' ? 'section' : base;
}

interface Token {
  readonly type: string;
  readonly content: string;
  readonly info: string;
  readonly markup: string;
  /** `h1`..`h6` on a heading, the tag name on a close token, empty otherwise. */
  readonly tag: string;
  readonly children: readonly Token[] | null;
  attrGet(name: string): string | null;
}

interface Context {
  readonly warnings: string[];
  readonly ids: Map<string, number>;
  blockedImages: number;
  unsafeLinks: number;
}

const parser = new Markdown({
  html: false,
  linkify: false,
  typographer: false,
  breaks: false,
});

function textOf(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
        case 'code':
          return node.value;
        case 'strong':
        case 'em':
        case 'del':
        case 'link':
          return textOf(node.children);
        default:
          return '';
      }
    })
    .join('');
}

function convertInline(tokens: readonly Token[], context: Context): InlineNode[] {
  const root: InlineNode[] = [];
  const stack: { children: InlineNode[]; wrap: (children: InlineNode[]) => InlineNode }[] = [];

  const push = (node: InlineNode) => {
    const top = stack.at(-1);
    if (top) top.children.push(node);
    else root.push(node);
  };

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        push({ type: 'text', value: token.content });
        break;
      case 'code_inline':
        push({ type: 'code', value: token.content });
        break;
      case 'softbreak':
        push({ type: 'text', value: ' ' });
        break;
      case 'hardbreak':
        push({ type: 'break' });
        break;
      case 'strong_open':
        stack.push({ children: [], wrap: (children) => ({ type: 'strong', children }) });
        break;
      case 'em_open':
        stack.push({ children: [], wrap: (children) => ({ type: 'em', children }) });
        break;
      case 's_open':
        stack.push({ children: [], wrap: (children) => ({ type: 'del', children }) });
        break;
      case 'strong_close':
      case 'em_close':
      case 's_close': {
        const top = stack.pop();
        if (!top) break;
        const node = top.wrap(top.children);
        const parent = stack.at(-1);
        if (parent) parent.children.push(node);
        else root.push(node);
        break;
      }
      case 'link_open': {
        const href = safeHref(token.attrGet('href') ?? '');
        const title = token.attrGet('title') ?? undefined;
        if (href === null) {
          context.unsafeLinks += 1;
          stack.push({
            children: [],
            wrap: (children) => {
              // Keep the words, drop the destination.
              const inner = textOf(children);
              return { type: 'text', value: inner === '' ? '' : `${inner} (link removed)` };
            },
          });
        } else {
          stack.push({
            children: [],
            wrap: (children) => ({ type: 'link', href, title, children }),
          });
        }
        break;
      }
      case 'link_close': {
        const top = stack.pop();
        if (!top) break;
        const node = top.wrap(top.children);
        const parent = stack.at(-1);
        if (parent) parent.children.push(node);
        else root.push(node);
        break;
      }
      case 'image': {
        const src = token.attrGet('src') ?? '';
        const alt = token.content;
        if (safeImageSrc(src) !== null) {
          // url-check: checked-above — safeImageSrc(src) is the branch condition
          push({ type: 'image', src: src.trim(), alt });
        } else {
          context.blockedImages += 1;
          push({ type: 'text', value: alt === '' ? '[image blocked]' : `[image blocked: ${alt}]` });
        }
        break;
      }
      case 'html_inline':
        // Raw HTML is text, never markup.
        push({ type: 'text', value: token.content });
        break;
      default:
        break;
    }
  }

  // An unclosed emphasis or link is closed here so the tree stays valid.
  while (stack.length > 0) {
    const top = stack.pop();
    if (!top) break;
    const node = top.wrap(top.children);
    const parent = stack.at(-1);
    if (parent) parent.children.push(node);
    else root.push(node);
  }
  return root;
}

function headingId(text: string, context: Context): string {
  const base = markdownSlug(text);
  const seen = context.ids.get(base) ?? 0;
  context.ids.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

function parseBlocks(
  tokens: readonly Token[],
  start: number,
  context: Context,
): { blocks: BlockNode[]; next: number } {
  const blocks: BlockNode[] = [];
  let index = start;

  while (index < tokens.length) {
    const token = tokens[index] as Token;

    switch (token.type) {
      case 'heading_open': {
        const inline = tokens[index + 1];
        // `tag` is `h1`..`h6` for every heading markdown-it builds. `markup` is
        // only the run of hashes for the ATX form: a setext heading's markup is
        // its underline (`Title` / `---`), whose length is not its level.
        const level = /^h[1-6]$/.test(token.tag) ? Number(token.tag.slice(1)) : 1;
        const children =
          inline?.type === 'inline' ? convertInline(inline.children ?? [], context) : [];
        blocks.push({ type: 'heading', level, id: headingId(textOf(children), context), children });
        index += 3;
        break;
      }
      case 'paragraph_open': {
        const inline = tokens[index + 1];
        const children =
          inline?.type === 'inline' ? convertInline(inline.children ?? [], context) : [];
        if (children.length > 0) blocks.push({ type: 'paragraph', children });
        index += 3;
        break;
      }
      case 'blockquote_open': {
        const inner = parseBlocks(tokens, index + 1, context);
        blocks.push({ type: 'blockquote', blocks: inner.blocks });
        index = inner.next + 1;
        break;
      }
      case 'bullet_list_open':
      case 'ordered_list_open': {
        const ordered = token.type === 'ordered_list_open';
        const startAttr = Number(token.attrGet('start') ?? '1');
        const items: ListItem[] = [];
        let cursor = index + 1;
        while (
          cursor < tokens.length &&
          tokens[cursor]?.type !== (ordered ? 'ordered_list_close' : 'bullet_list_close')
        ) {
          const item = tokens[cursor];
          if (item?.type !== 'list_item_open') {
            cursor += 1;
            continue;
          }
          const inner = parseBlocks(tokens, cursor + 1, context);
          let checked: boolean | null = null;
          const first = inner.blocks[0];
          if (first?.type === 'paragraph') {
            const firstText = first.children[0];
            if (firstText?.type === 'text' && /^\[[ xX]\]\s/.test(firstText.value)) {
              checked = /^\[[xX]\]/.test(firstText.value);
              const rest = firstText.value.replace(/^\[[ xX]\]\s+/, '');
              const children = [
                ...(rest === '' ? [] : [{ type: 'text' as const, value: rest }]),
                ...first.children.slice(1),
              ];
              const replaced: BlockNode = { type: 'paragraph', children };
              inner.blocks[0] = replaced;
            }
          }
          items.push({ checked, blocks: inner.blocks });
          cursor = inner.next + 1;
        }
        blocks.push({
          type: 'list',
          ordered,
          start: Number.isFinite(startAttr) ? startAttr : 1,
          items,
        });
        index = cursor + 1;
        break;
      }
      case 'fence':
      case 'code_block': {
        const language = token.type === 'fence' ? (token.info.trim().split(/\s+/)[0] ?? '') : '';
        blocks.push({ type: 'code', language, value: token.content });
        index += 1;
        break;
      }
      case 'hr':
        blocks.push({ type: 'rule' });
        index += 1;
        break;
      case 'html_block': {
        const value = token.content.trim();
        if (value !== '') blocks.push({ type: 'note', value });
        index += 1;
        break;
      }
      case 'table_open': {
        const align: Align[] = [];
        const rows: TableRow[] = [];
        let cursor = index + 1;
        let header = false;
        let currentCells: InlineNode[][] | null = null;
        while (cursor < tokens.length && tokens[cursor]?.type !== 'table_close') {
          const current = tokens[cursor] as Token;
          switch (current.type) {
            case 'thead_open':
              header = true;
              break;
            case 'tbody_open':
              header = false;
              break;
            case 'tr_open':
              currentCells = [];
              break;
            case 'tr_close':
              if (currentCells) rows.push({ header, cells: currentCells });
              currentCells = null;
              break;
            case 'th_open':
            case 'td_open': {
              const style = current.attrGet('style') ?? '';
              const found = /text-align:\s*(left|center|right)/.exec(style)?.[1];
              if (current.type === 'th_open' && (currentCells?.length ?? 0) === align.length) {
                align.push((found as Align) ?? null);
              }
              break;
            }
            case 'inline': {
              const children = convertInline(current.children ?? [], context);
              if (currentCells) currentCells.push(children);
              break;
            }
            default:
              break;
          }
          cursor += 1;
        }
        blocks.push({ type: 'table', align, rows });
        index = cursor + 1;
        break;
      }
      case 'inline': {
        // A stray inline token (inside a list item's tight paragraph) becomes a
        // paragraph of its own rather than being lost.
        const children = convertInline(token.children ?? [], context);
        if (children.length > 0) blocks.push({ type: 'paragraph', children });
        index += 1;
        break;
      }
      case 'list_item_close':
      case 'blockquote_close':
      case 'bullet_list_close':
      case 'ordered_list_close':
      case 'table_close':
        return { blocks, next: index };
      default:
        index += 1;
        break;
    }
  }

  return { blocks, next: index };
}

export function parseMarkdown(source: string): MarkdownDocument {
  if (source.trim() === '') return { blocks: [], warnings: [] };
  if (source.length > MAX_MARKDOWN_LENGTH) {
    return {
      blocks: [],
      warnings: [
        `This document is longer than ${MAX_MARKDOWN_LENGTH.toLocaleString('en-GB')} characters and was not rendered.`,
      ],
    };
  }

  const context: Context = { warnings: [], ids: new Map(), blockedImages: 0, unsafeLinks: 0 };
  const tokens = parser.parse(source, {}) as unknown as readonly Token[];
  const { blocks } = parseBlocks(tokens, 0, context);

  if (context.blockedImages > 0) {
    context.warnings.push(
      context.blockedImages === 1
        ? 'One image was blocked: only images you added as local data are shown.'
        : `${context.blockedImages} images were blocked: only images you added as local are shown.`,
    );
  }
  if (context.unsafeLinks > 0) {
    context.warnings.push(
      context.unsafeLinks === 1
        ? 'One link was removed because its address is not http, https or mailto.'
        : `${context.unsafeLinks} links were removed because their addresses are not http, https or mailto.`,
    );
  }

  return { blocks, warnings: context.warnings };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function inlineHtml(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return escapeHtml(node.value);
        case 'strong':
          return `<strong>${inlineHtml(node.children)}</strong>`;
        case 'em':
          return `<em>${inlineHtml(node.children)}</em>`;
        case 'del':
          return `<del>${inlineHtml(node.children)}</del>`;
        case 'code':
          return `<code>${escapeHtml(node.value)}</code>`;
        case 'break':
          return '<br>';
        case 'link': {
          const href = safeHref(node.href);
          if (href === null) return inlineHtml(node.children);
          const title = node.title ? ` title="${escapeHtml(node.title)}"` : '';
          return `<a href="${escapeHtml(href)}" rel="noopener noreferrer"${title}>${inlineHtml(node.children)}</a>`;
        }
        case 'image':
          return safeImageSrc(node.src) !== null
            ? `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}">`
            : escapeHtml(node.alt);
        default:
          return '';
      }
    })
    .join('');
}

function blocksHtml(blocks: readonly BlockNode[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `<h${block.level} id="${escapeHtml(block.id)}">${inlineHtml(block.children)}</h${block.level}>`;
        case 'paragraph':
          return `<p>${inlineHtml(block.children)}</p>`;
        case 'blockquote':
          return `<blockquote>${blocksHtml(block.blocks)}</blockquote>`;
        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul';
          const start = block.ordered && block.start !== 1 ? ` start="${block.start}"` : '';
          const items = block.items
            .map((item) => {
              const checkbox =
                item.checked === null
                  ? ''
                  : `<input type="checkbox" disabled${item.checked ? ' checked' : ''}> `;
              return `<li>${checkbox}${blocksHtml(item.blocks) || ''}</li>`;
            })
            .join('');
          return `<${tag}${start}>${items}</${tag}>`;
        }
        case 'code':
          return `<pre><code${block.language ? ` class="language-${escapeHtml(block.language)}"` : ''}>${escapeHtml(block.value)}</code></pre>`;
        case 'table': {
          const renderRow = (row: TableRow) => {
            const cells = row.cells
              .map((cell, index) => {
                const style = block.align[index] ? ` style="text-align:${block.align[index]}"` : '';
                return row.header
                  ? `<th${style}>${inlineHtml(cell)}</th>`
                  : `<td${style}>${inlineHtml(cell)}</td>`;
              })
              .join('');
            return `<tr>${cells}</tr>`;
          };
          const head = block.rows
            .filter((row) => row.header)
            .map(renderRow)
            .join('');
          const body = block.rows
            .filter((row) => !row.header)
            .map(renderRow)
            .join('');
          return `<table>${head ? `<thead>${head}</thead>` : ''}<tbody>${body}</tbody></table>`;
        }
        case 'rule':
          return '<hr>';
        case 'note':
          return `<pre>${escapeHtml(block.value)}</pre>`;
        default:
          return '';
      }
    })
    .join('\n');
}

/**
 * A standalone HTML file built from the same tree, with the plain-text notices
 * included. No script, no stylesheet, no remote reference.
 */
export function renderMarkdownHtml(document: MarkdownDocument, title = 'Document'): string {
  const notices =
    document.warnings.length > 0
      ? `<ul>${document.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`
      : '';
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body>
${notices}
${blocksHtml(document.blocks)}
</body>
</html>
`;
}

export const MARKDOWN_LIMITS = Object.freeze({
  maxLength: MAX_MARKDOWN_LENGTH,
  protocols: ['http:', 'https:', 'mailto:'],
});
