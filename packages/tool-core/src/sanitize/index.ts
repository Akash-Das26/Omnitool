/**
 * Untrusted HTML in, a document model out, and no DOM anywhere.
 *
 * Paste handling and document conversion both have to look at markup a reader
 * or a file supplied. The usual route — `DOMParser` or `innerHTML` — creates a
 * live document first and removes the dangerous parts afterwards, which is a
 * race with scripts, images and styles that have already started. This module
 * never builds a DOM from the input at all: it reads the bytes with its own
 * tokenizer and constructs the same node types `markdown/index.ts` uses. There
 * is nothing to execute because nothing is ever parsed by the browser.
 *
 * The allow-list is therefore an allow-list of *elements we build*, not of
 * elements we tolerate:
 *
 * - blocks: `p`, `div`, `section`, `article`, `header`, `footer`, `main`,
 *   `aside`, `nav`, `figure`, `figcaption`, `h1`–`h6`, `blockquote`, `ul`,
 *   `ol`, `li`, `pre`, `code`, `hr`;
 * - inline: `strong`, `b`, `em`, `i`, `del`, `s`, `strike`, `code`, `a`, `br`,
 *   `span`, `u`;
 * - attributes: `href` on a link (http, https, mailto only), `checked` and
 *   `type="checkbox"` on a list item, and `class="language-x"` on a code
 *   block. Every other attribute is dropped, including every `on*` handler;
 * - everything else — `script`, `style`, `iframe`, `object`, `embed`, `svg`,
 *   `math`, `form`, `meta`, `link`, `base`, `img`, `video`, `audio`, `canvas`
 *   and any unknown element — is dropped, counted, and (for the raw-text
 *   elements) skipped over without its contents ever becoming text.
 *
 * Images are dropped rather than kept: a remote image is a third-party
 * request, and an inline `data:` image of any size would be a denial-of-service
 * button. A placeholder text node is written instead so the reader can see
 * that something was there.
 */
import {
  type BlockNode,
  type InlineNode,
  type ListItem,
  type MarkdownDocument,
  markdownSlug,
  renderMarkdownHtml,
  safeHref,
  type TableRow,
} from '../markdown/index';

/** What a conversion dropped, so the tool can say so in words. */
export interface DropCounts {
  readonly scripts: number;
  readonly styles: number;
  readonly images: number;
  readonly links: number;
  readonly elements: number;
}

export interface SanitisedDocument {
  readonly document: MarkdownDocument;
  readonly dropped: DropCounts;
}

/** Input limits, mirrored in the tools that call this. */
export const SANITIZE_LIMITS = Object.freeze({
  /** Characters of HTML read in one go. */
  maxInputLength: 2_000_000,
  /** Nesting depth before the rest of the input is ignored. */
  maxDepth: 64,
  /** Blocks written before the rest of the input is ignored. */
  maxBlocks: 20_000,
});

/* ------------------------------------------------------------------ */
/* Entity decoding                                                     */
/* ------------------------------------------------------------------ */

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  shy: '',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  bull: '•',
  middot: '·',
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
  frac12: '½',
  euro: '€',
  pound: '£',
  yen: '¥',
  larr: '←',
  rarr: '→',
  uarr: '↑',
  darr: '↓',
  harr: '↔',
  check: '✓',
  cross: '✗',
};

/**
 * Decodes the entities a document may contain. An unknown name is left as it
 * was written — decoding something we do not recognise could invent markup.
 */
function decodeEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);?/gi, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? whole : named;
  });
}

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

export type HtmlToken =
  | { readonly kind: 'text'; readonly value: string }
  | {
      readonly kind: 'open';
      readonly name: string;
      readonly attributes: ReadonlyMap<string, string>;
    }
  | { readonly kind: 'close'; readonly name: string };

/** Elements whose contents are never text: consumed and thrown away. */
const RAW_TEXT = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'noscript',
  'title',
  'textarea',
]);
/** Elements that never have a closing tag. */
const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
/** Block-level elements: they end a paragraph rather than joining it. */
const BLOCK_LEVEL = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

function readAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const pattern = /([a-z][a-z0-9:_-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/gi;
  for (const match of source.matchAll(pattern)) {
    const name = (match[1] ?? '').toLowerCase();
    if (name === '') continue;
    // A browser decodes character references in an attribute before it looks
    // at it, so `href="&#106;avascript:..."` is a script address. Decoding here
    // is what lets the scheme check see the address it will actually follow.
    attributes.set(name, decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''));
  }
  return attributes;
}

/**
 * Reads HTML into tokens. Nothing here interprets the input: a `<script>` is
 * a name to skip over, not code to run, and a malformed tag is a tag we stop
 * reading at rather than a repaired one.
 */
export function tokenizeHtml(source: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf('<', index);
    if (open === -1) {
      tokens.push({ kind: 'text', value: decodeEntities(source.slice(index)) });
      break;
    }
    // A `<` that cannot start a tag — `1 < 2` — is text, as a browser reads it.
    if (!/[a-z/!?]/i.test(source[open + 1] ?? '')) {
      tokens.push({ kind: 'text', value: decodeEntities(source.slice(index, open + 1)) });
      index = open + 1;
      continue;
    }
    if (open > index) {
      tokens.push({ kind: 'text', value: decodeEntities(source.slice(index, open)) });
    }
    // Comments, doctypes, CDATA and processing instructions: skipped whole.
    if (source.startsWith('<!--', open)) {
      const end = source.indexOf('-->', open + 4);
      index = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<!', open) || source.startsWith('<?', open)) {
      const end = source.indexOf('>', open + 2);
      index = end === -1 ? source.length : end + 1;
      continue;
    }
    const close = source.indexOf('>', open + 1);
    if (close === -1) {
      // A `<` with no `>` is text, not a tag.
      tokens.push({ kind: 'text', value: decodeEntities(source.slice(open)) });
      break;
    }
    const inner = source.slice(open + 1, close).trim();
    if (inner.startsWith('/')) {
      const name = inner.slice(1).trim().toLowerCase().split(/\s+/)[0] ?? '';
      if (name !== '') tokens.push({ kind: 'close', name });
      index = close + 1;
      continue;
    }
    const name = inner.split(/[\s/>]/)[0]?.toLowerCase() ?? '';
    if (name === '') {
      index = close + 1;
      continue;
    }
    tokens.push({ kind: 'open', name, attributes: readAttributes(inner.slice(name.length)) });
    index = close + 1;
    if (RAW_TEXT.has(name) && !VOID.has(name)) {
      // Consume to the matching close tag without reading a word of it.
      const closeTag = new RegExp(`</${name}\\s*>`, 'i');
      const rest = source.slice(index);
      const match = closeTag.exec(rest);
      index = match ? index + match.index + match[0].length : source.length;
    }
  }
  return tokens;
}

/* ------------------------------------------------------------------ */
/* Model building                                                      */
/* ------------------------------------------------------------------ */

interface Counters {
  scripts: number;
  styles: number;
  images: number;
  links: number;
  elements: number;
}

/** Tags whose whole subtree is discarded, with a word written in its place. */
const DROPPED_WHOLE = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'video',
  'audio',
  'canvas',
  'form',
  'button',
  'select',
  'option',
  'textarea',
  'template',
  'dialog',
  'picture',
  'source',
]);
/** Tags whose text survives but whose element does not. */
const FLATTENED = new Set([
  'span',
  'u',
  'b',
  'i',
  's',
  'strike',
  'small',
  'big',
  'font',
  'center',
  'label',
  'abbr',
  'cite',
  'q',
  'em',
  'strong',
  'del',
  'code',
  'a',
  'mark',
  'sub',
  'sup',
  'ins',
  'time',
  'p',
  'div',
]);
/** Inline elements that belong inside a paragraph rather than beside it. */
const INLINE_TAGS = new Set([
  'strong',
  'b',
  'em',
  'i',
  'del',
  's',
  'strike',
  'code',
  'a',
  'span',
  'u',
  'mark',
  'sub',
  'sup',
  'small',
  'q',
  'cite',
  'abbr',
  'time',
  'ins',
  'big',
  'font',
  'center',
  'label',
  'var',
  'kbd',
  'samp',
  'dfn',
  'wbr',
]);

function isListItemCheckbox(tokens: readonly HtmlToken[], from: number): boolean | null {
  // A checkbox is the first thing in the item and is not inside another element
  // that would make it a form control we do not model.
  const first = tokens[from];
  if (first?.kind === 'open' && first.name === 'input') {
    const type = first.attributes.get('type');
    if (type === 'checkbox') return first.attributes.has('checked');
  }
  return null;
}

class ModelBuilder {
  private readonly counters: Counters = {
    scripts: 0,
    styles: 0,
    images: 0,
    links: 0,
    elements: 0,
  };

  constructor(private readonly tokens: readonly HtmlToken[]) {}

  private count(tag: string) {
    if (tag === 'script' || tag === 'noscript') this.counters.scripts += 1;
    else if (tag === 'style') this.counters.styles += 1;
    else if (tag === 'img') this.counters.images += 1;
    else this.counters.elements += 1;
  }

  build(): SanitisedDocument {
    const { blocks, next } = this.parseBlocks(0, null, 0);
    void next;
    return {
      document: { blocks, warnings: [] },
      dropped: { ...this.counters },
    };
  }

  private parseBlocks(
    start: number,
    stop: string | null,
    depth: number,
  ): { blocks: BlockNode[]; next: number } {
    const blocks: BlockNode[] = [];
    let index = start;
    let paragraph: InlineNode[] = [];

    const flush = () => {
      if (paragraph.length > 0) {
        blocks.push({ type: 'paragraph', children: paragraph });
        paragraph = [];
      }
    };

    while (index < this.tokens.length) {
      if (blocks.length > SANITIZE_LIMITS.maxBlocks || depth > SANITIZE_LIMITS.maxDepth) break;
      const token = this.tokens[index] as HtmlToken;
      if (token.kind === 'text') {
        if (token.value !== '') paragraph.push({ type: 'text', value: token.value });
        index += 1;
        continue;
      }
      const tag = token.kind === 'open' ? token.name : token.name;
      if (token.kind === 'close') {
        if (tag === stop) {
          flush();
          return { blocks, next: index + 1 };
        }
        index += 1;
        continue;
      }
      switch (tag) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6': {
          flush();
          const inner = this.parseInline(index + 1, tag, depth + 1);
          const text = inlineText(inner.children);
          blocks.push({
            type: 'heading',
            level: Number(tag.slice(1)),
            id: markdownSlug(text),
            children: inner.children,
          });
          index = inner.next;
          break;
        }
        case 'blockquote': {
          flush();
          const inner = this.parseBlocks(index + 1, tag, depth + 1);
          blocks.push({ type: 'blockquote', blocks: inner.blocks });
          index = inner.next;
          break;
        }
        case 'ul':
        case 'ol': {
          flush();
          const inner = this.parseList(index + 1, tag, depth + 1);
          blocks.push({
            type: 'list',
            ordered: tag === 'ol',
            start: Number(token.attributes.get('start') ?? '1') || 1,
            items: inner.items,
          });
          index = inner.next;
          break;
        }
        case 'pre': {
          flush();
          const inner = this.parseCode(index + 1, tag, depth + 1);
          blocks.push(inner.block);
          index = inner.next;
          break;
        }
        case 'hr': {
          flush();
          blocks.push({ type: 'rule' });
          index += 1;
          break;
        }
        case 'style':
        case 'meta':
        case 'link':
        case 'base':
        case 'head': {
          this.count(tag);
          index = this.skipElement(index, tag);
          break;
        }
        default: {
          if (DROPPED_WHOLE.has(tag)) {
            this.count(tag);
            index = this.skipElement(index, tag);
            break;
          }
          if (BLOCK_LEVEL.has(tag)) {
            // A block-level tag ends the paragraph it interrupts; its own
            // contents are read again inside this one.
            flush();
            const inner = this.parseBlocks(index + 1, tag, depth + 1);
            blocks.push(...inner.blocks);
            index = inner.next;
            break;
          }
          if (tag === 'img') {
            this.counters.images += 1;
            const alt = token.attributes.get('alt') ?? '';
            paragraph.push({
              type: 'text',
              value: alt === '' ? '[image dropped]' : `[image dropped: ${alt}]`,
            });
            index += 1;
            break;
          }
          if (tag === 'br') {
            paragraph.push({ type: 'break' });
            index += 1;
            break;
          }
          if (VOID.has(tag)) {
            // A form control or a head element: dropped and counted, one token.
            this.count(tag);
            index = this.skipElement(index, tag);
            break;
          }
          if (INLINE_TAGS.has(tag)) {
            // Phrasing content: read it into the paragraph, where the inline
            // parser keeps the marks we allow and drops the rest.
            const inner = this.parseInline(index, tag, depth + 1);
            paragraph.push(...inner.children);
            index = inner.next;
            break;
          }
          // An element we do not know: the tag is dropped and its words are
          // read again, because a browser would show them.
          this.count(tag);
          {
            const inner = this.parseBlocks(index + 1, tag, depth + 1);
            for (const block of inner.blocks) {
              if (block.type === 'paragraph' || block.type === 'heading') {
                paragraph.push(...block.children);
              }
            }
            index = inner.next;
          }
          break;
        }
      }
    }
    flush();
    return { blocks, next: index };
  }

  private parseList(
    start: number,
    tag: string,
    depth: number,
  ): { items: ListItem[]; next: number } {
    const items: ListItem[] = [];
    let index = start;
    while (index < this.tokens.length) {
      const token = this.tokens[index] as HtmlToken;
      if (token.kind === 'open' && token.name === tag) {
        const inner = this.parseList(index + 1, tag, depth);
        return { items: items.concat(inner.items), next: inner.next };
      }
      if (token.kind === 'open' && token.name === `/${tag}`) break;
      if (token.kind === 'close' && token.name === tag) return { items, next: index + 1 };
      if (token.kind === 'open' && token.name === 'li') {
        const checkbox = isListItemCheckbox(this.tokens, index + 1);
        const inner = this.parseBlocks(index + 1, 'li', depth + 1);
        items.push({ checked: checkbox, blocks: inner.blocks });
        index = inner.next;
        continue;
      }
      index += 1;
    }
    return { items, next: index };
  }

  private parseCode(start: number, tag: string, depth: number): { block: BlockNode; next: number } {
    let language = '';
    let value = '';
    let index = start;
    while (index < this.tokens.length) {
      const token = this.tokens[index] as HtmlToken;
      if (token.kind === 'close' && token.name === tag) {
        return { block: { type: 'code', language, value }, next: index + 1 };
      }
      if (token.kind === 'open' && token.name === 'code') {
        const declared = (token.attributes.get('class') ?? '').match(/language-([\w+#-]+)/);
        if (declared) language = declared[1] ?? '';
        index += 1;
        continue;
      }
      if (token.kind === 'text') value += token.value;
      else if (token.kind === 'open') this.count(token.name);
      index += 1;
    }
    void depth;
    return { block: { type: 'code', language, value }, next: index };
  }

  /** Reads until `stop` and returns inline nodes, ignoring block structure. */
  private parseInline(
    start: number,
    stop: string,
    depth: number,
  ): { children: InlineNode[]; next: number } {
    const root: InlineNode[] = [];
    const stack: { wrap: (nodes: InlineNode[]) => InlineNode; nodes: InlineNode[] }[] = [];
    const push = (node: InlineNode) => {
      const top = stack.at(-1);
      if (top) top.nodes.push(node);
      else root.push(node);
    };
    const open = (wrap: (nodes: InlineNode[]) => InlineNode) => {
      stack.push({ wrap, nodes: [] });
    };
    const close = () => {
      const top = stack.pop();
      if (top) push(top.wrap(top.nodes));
    };
    let index = start;

    while (index < this.tokens.length) {
      if (depth > SANITIZE_LIMITS.maxDepth) break;
      const token = this.tokens[index] as HtmlToken;
      if (token.kind === 'text') {
        if (token.value !== '') push({ type: 'text', value: token.value });
        index += 1;
        continue;
      }
      if (token.kind === 'close') {
        if (token.name === stop) {
          while (stack.length > 0) close();
          return { children: root, next: index + 1 };
        }
        if (stack.length > 0) close();
        index += 1;
        continue;
      }
      switch (token.name) {
        case 'strong':
        case 'b':
          open((nodes) => ({ type: 'strong', children: nodes }));
          index += 1;
          break;
        case 'em':
        case 'i':
          open((nodes) => ({ type: 'em', children: nodes }));
          index += 1;
          break;
        case 'del':
        case 's':
        case 'strike':
          open((nodes) => ({ type: 'del', children: nodes }));
          index += 1;
          break;
        case 'a': {
          this.counters.links += 1;
          const href = safeHref(token.attributes.get('href') ?? '');
          index += 1;
          // A refused destination keeps its words and loses the link.
          if (href === null) continue;
          open((nodes) => ({ type: 'link', href, children: nodes }));
          break;
        }
        case 'code':
          open((nodes) => ({ type: 'code', value: inlineText(nodes) }));
          index += 1;
          break;
        case 'img': {
          this.counters.images += 1;
          const alt = token.attributes.get('alt') ?? '';
          push({ type: 'text', value: alt === '' ? '[image dropped]' : `[image dropped: ${alt}]` });
          index += 1;
          break;
        }
        case 'br':
          push({ type: 'break' });
          index += 1;
          break;
        case 'style':
        case 'script':
        case 'iframe':
        case 'object':
        case 'embed':
        case 'svg':
        case 'math':
        case 'video':
        case 'audio':
        case 'canvas': {
          this.count(token.name);
          index = this.skipElement(index, token.name);
          break;
        }
        default: {
          if (BLOCK_LEVEL.has(token.name)) {
            // A block element inside a paragraph: its own content is read as
            // text, so nothing is lost, and the tag itself is dropped.
            const inner = this.parseBlocks(index + 1, token.name, depth + 1);
            for (const block of inner.blocks) {
              if (block.type === 'code') push({ type: 'code', value: block.value });
              else if (block.type === 'paragraph' || block.type === 'heading') {
                for (const node of block.children) push(node);
              }
            }
            index = inner.next;
            break;
          }
          if (FLATTENED.has(token.name)) {
            const inner = this.parseInline(index + 1, token.name, depth + 1);
            for (const node of inner.children) push(node);
            index = inner.next;
            break;
          }
          this.count(token.name);
          index = this.skipElement(index, token.name);
          break;
        }
      }
    }
    // An element left open at the end of the input is closed here, so the
    // words inside it survive instead of disappearing with the wrapper.
    while (stack.length > 0) close();
    return { children: root, next: index };
  }

  /** Consumes an element and everything inside it, returning the next index. */
  private skipElement(start: number, tag: string): number {
    // A void element is one token, and a raw-text element has already had its
    // whole body consumed by the tokenizer: neither has anything left to skip.
    if (VOID.has(tag) || RAW_TEXT.has(tag)) return start + 1;
    let depth = 1;
    let index = start;
    while (index < this.tokens.length) {
      const token = this.tokens[index] as HtmlToken;
      if (token.kind === 'open' && token.name === tag && !VOID.has(tag)) depth += 1;
      if (token.kind === 'close' && token.name === tag) {
        depth -= 1;
        if (depth === 0) return index + 1;
      }
      index += 1;
    }
    return index;
  }
}

function inlineText(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
        case 'code':
          return node.value;
        case 'image':
          return '';
        case 'break':
          return ' ';
        default:
          return inlineText(node.children);
      }
    })
    .join('');
}

/**
 * Converts pasted or converted HTML into the document model. The counts say
 * what was dropped, so a tool can report "3 links removed" rather than
 * silently changing the reader's document.
 */
export function htmlToModel(html: string): SanitisedDocument {
  const source =
    html.length > SANITIZE_LIMITS.maxInputLength
      ? html.slice(0, SANITIZE_LIMITS.maxInputLength)
      : html;
  const builder = new ModelBuilder(tokenizeHtml(source));
  return builder.build();
}

/* ------------------------------------------------------------------ */
/* Serialising the model back out                                      */
/* ------------------------------------------------------------------ */

/**
 * Escapes the characters that could open markup in a Markdown viewer. `<`, `>`
 * and `&` are included on purpose: a document that contains the words
 * `<script>alert(1)</script>` must not become a script when it is pasted into
 * another Markdown tool.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!|>~<>&])/g, '\\$1');
}

/** The document as Markdown, escaped so that the text cannot become markup. */
export function modelToMarkdown(document: MarkdownDocument): string {
  return document.blocks.map((block) => markdownBlock(block)).join('\n\n');
}

function markdownBlock(block: BlockNode): string {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level)} ${markdownInline(block.children)}`;
    case 'paragraph':
      return markdownInline(block.children);
    case 'blockquote':
      return block.blocks
        .map((inner) =>
          markdownBlock(inner)
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n'),
        )
        .join('\n\n');
    case 'list':
      return block.items
        .map((item, index) => {
          const marker = item.checked === null ? '' : item.checked ? '[x] ' : '[ ] ';
          const bullet = block.ordered ? `${block.start + index}. ` : '- ';
          const body = item.blocks.map(markdownBlock).join('\n\n').replace(/\n/g, '\n  ');
          return `${bullet}${marker}${body}`;
        })
        .join('\n');
    case 'code': {
      const fence = '```';
      return `${fence}${block.language}\n${block.value.replace(/\n$/, '')}\n${fence}`;
    }
    case 'table': {
      const row = (cells: readonly (readonly InlineNode[])[]) =>
        `| ${cells.map((cell) => markdownInline(cell).replaceAll('|', '\\|')).join(' | ')} |`;
      const head = block.rows.filter((r) => r.header);
      const body = block.rows.filter((r) => !r.header);
      const divider = `| ${block.align.map(() => '---').join(' | ')} |`;
      return [
        head.length > 0 ? row(head[0]?.cells ?? []) : null,
        divider,
        ...body.map((r) => row(r.cells)),
      ]
        .filter((line): line is string => line !== null)
        .join('\n');
    }
    case 'rule':
      return '---';
    case 'note':
      return block.value;
    default:
      return '';
  }
}

function markdownInline(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return escapeMarkdown(node.value);
        case 'code':
          return `\`${node.value.replaceAll('`', '\\`')}\``;
        case 'strong':
          return `**${markdownInline(node.children)}**`;
        case 'em':
          return `*${markdownInline(node.children)}*`;
        case 'del':
          return `~~${markdownInline(node.children)}~~`;
        case 'link':
          return `[${markdownInline(node.children)}](${node.href})`;
        case 'image':
          return `![${node.alt}](${node.src})`;
        case 'break':
          return '  \n';
        default:
          return '';
      }
    })
    .join('');
}

/** The document as plain text: no markup, one block after another. */
export function modelToText(document: MarkdownDocument): string {
  return document.blocks.map((block) => textBlock(block)).join('\n\n');
}

function textBlock(block: BlockNode): string {
  switch (block.type) {
    case 'heading':
      return inlineText(block.children);
    case 'paragraph':
      return inlineText(block.children);
    case 'blockquote':
      return block.blocks.map(textBlock).join('\n\n');
    case 'list':
      return block.items
        .map((item, index) => {
          const bullet = block.ordered ? `${block.start + index}. ` : '- ';
          const tick = item.checked === null ? '' : item.checked ? '[x] ' : '[ ] ';
          return `${bullet}${tick}${item.blocks.map(textBlock).join('\n')}`;
        })
        .join('\n');
    case 'code':
      return block.value.replace(/\n$/, '');
    case 'table':
      return block.rows
        .map((row: TableRow) => row.cells.map((cell) => inlineText(cell)).join('\t'))
        .join('\n');
    case 'rule':
      return '—'.repeat(3);
    case 'note':
      return block.value;
    default:
      return '';
  }
}

/**
 * The document as a standalone HTML file. The markup is written by
 * `renderMarkdownHtml`, which escapes every text node and only ever emits the
 * elements listed there, so the output cannot carry a script even when the
 * input did.
 */
export function modelToHtml(document: MarkdownDocument, title = 'Document'): string {
  return renderMarkdownHtml(document, title);
}
