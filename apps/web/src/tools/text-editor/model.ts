/**
 * The editor's document model: a ProseMirror schema built from the basics,
 * with the links we allow and no way to reach a remote resource.
 *
 * Two rules govern everything here:
 *
 * 1. **The model is the only truth.** Pasted or dropped markup is read by
 *    `@omnitool/tool-core/sanitize`, which never builds a DOM, and the result
 *    is turned into ProseMirror nodes. ProseMirror's own clipboard parser
 *    (`readHTML` in `prosemirror-view`, which sets `innerHTML` on a detached
 *    document) is never handed untrusted markup: our `handlePaste` and
 *    `handleDrop` handlers run first and return true, so the built-in ones
 *    never see the event.
 * 2. **A link is a destination we would let a reader follow.** The link mark
 *    refuses anything outside http, https and mailto both when it is parsed
 *    from the DOM and when it is written back out, so a command cannot be
 *    talked into a `javascript:` address either.
 */

import type {
  BlockNode,
  InlineNode,
  ListItem,
  MarkdownDocument,
} from '@omnitool/tool-core/markdown';
import { safeHref } from '@omnitool/tool-core/markdown';
import {
  htmlToModel,
  modelToHtml,
  modelToMarkdown,
  modelToText,
  SANITIZE_LIMITS,
  type SanitisedDocument,
} from '@omnitool/tool-core/sanitize';
import { setBlockType, wrapIn } from 'prosemirror-commands';
import { redo, undo } from 'prosemirror-history';
import {
  Fragment,
  type MarkSpec,
  type MarkType,
  type NodeSpec,
  type NodeType,
  type Node as PmNode,
  Schema,
  Slice,
} from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes, splitListItem, wrapInList } from 'prosemirror-schema-list';
import {
  type Command,
  type EditorState,
  Plugin,
  TextSelection,
  type Transaction,
} from 'prosemirror-state';

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

const taskItem: NodeSpec = {
  attrs: { checked: { default: null } },
  defining: true,
  content: 'paragraph block*',
  parseDOM: [
    {
      tag: 'li[data-task]',
      getAttrs: (element) => ({
        checked: (element as HTMLElement).getAttribute('data-checked') === 'true',
      }),
    },
  ],
  toDOM: (node) => [
    'li',
    {
      'data-task': 'true',
      'data-checked': String(node.attrs.checked === true),
      class: 'task-item',
    },
    [
      'input',
      {
        type: 'checkbox',
        'data-task-toggle': 'true',
        contenteditable: 'false',
        ...(node.attrs.checked === true ? { checked: 'checked' } : {}),
      },
    ],
    ['div', { class: 'task-item-body' }, 0],
  ],
};

const taskList: NodeSpec = {
  content: 'task_item+',
  group: 'block',
  parseDOM: [{ tag: 'ul[data-task-list]' }],
  toDOM: () => ['ul', { 'data-task-list': 'true', class: 'task-list' }, 0],
};

/** The link mark, restricted to the three protocols the whole project allows. */
const linkMark: NodeSpec = {
  attrs: { href: {}, title: { default: null } },
  inclusive: false,
  parseDOM: [
    {
      tag: 'a[href]',
      getAttrs: (element) => {
        const anchor = element as HTMLElement;
        const href = safeHref(anchor.getAttribute('href') ?? '');
        // A destination we would not allow is not a link at all: the words
        // survive as plain text instead.
        return href === null ? false : { href, title: anchor.getAttribute('title') };
      },
    },
  ],
  toDOM: (node) => {
    const href = safeHref(node.attrs.href ?? '') ?? '#';
    const title = node.attrs.title ? { title: node.attrs.title } : {};
    return ['a', { href, ...title, rel: 'noopener noreferrer' }, 0];
  },
};

const underlineMark: NodeSpec = {
  parseDOM: [{ tag: 'u' }],
  toDOM: () => ['u', 0],
};

const strikeMark: NodeSpec = {
  parseDOM: [{ tag: 's' }, { tag: 'del' }],
  toDOM: () => ['s', 0],
};

/** `OrderedMap.forEach` hands the key first, which is the reverse of a Map. */
function specs<T>(source: {
  forEach: (fn: (key: string, value: T) => void) => void;
}): Record<string, T> {
  const out: Record<string, T> = {};
  source.forEach((key, value) => {
    out[key] = value;
  });
  return out;
}

/** `prosemirror-schema-basic` has no language attribute, and a code fence needs one. */
const codeBlock: NodeSpec = {
  content: 'text*',
  marks: '',
  group: 'block',
  code: true,
  defining: true,
  attrs: { language: { default: '' } },
  parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
  toDOM: (node) => [
    'pre',
    { 'data-language': node.attrs.language === '' ? null : node.attrs.language },
    ['code', 0],
  ],
};

const nodesWithLists = addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block');
const nodeSpecs = specs<NodeSpec>(
  nodesWithLists as unknown as Parameters<typeof specs<NodeSpec>>[0],
);
Object.assign(nodeSpecs, { task_list: taskList, task_item: taskItem, code_block: codeBlock });
// No image node: this editor never references a resource it did not receive
// as bytes, so there is nothing for one to point at.
delete nodeSpecs.image;

const markSpecs = specs<MarkSpec>(
  basicSchema.spec.marks as unknown as Parameters<typeof specs<MarkSpec>>[0],
);
Object.assign(markSpecs, { link: linkMark, underline: underlineMark, strike: strikeMark });

export const editorSchema = new Schema({ nodes: nodeSpecs, marks: markSpecs });

function node(name: string): NodeType {
  const found = editorSchema.nodes[name];
  if (!found) throw new Error(`the editor schema has no node called ${name}`);
  return found;
}

function mark(name: string): MarkType {
  const found = editorSchema.marks[name];
  if (!found) throw new Error(`the editor schema has no mark called ${name}`);
  return found;
}

const N = {
  doc: node('doc'),
  paragraph: node('paragraph'),
  heading: node('heading'),
  blockquote: node('blockquote'),
  bulletList: node('bullet_list'),
  orderedList: node('ordered_list'),
  listItem: node('list_item'),
  taskList: node('task_list'),
  taskItem: node('task_item'),
  codeBlock: node('code_block'),
  rule: node('horizontal_rule'),
  text: node('text'),
  hardBreak: node('hard_break'),
};

const M = {
  strong: mark('strong'),
  em: mark('em'),
  strike: mark('strike'),
  underline: mark('underline'),
  link: mark('link'),
  code: mark('code'),
};

/* ------------------------------------------------------------------ */
/* Model to ProseMirror                                                */
/* ------------------------------------------------------------------ */

function withMark(nodes: readonly PmNode[], which: MarkType): PmNode[] {
  const value = nodes.map((entry) => entry.text ?? '').join('');
  if (value === '') return [];
  return [editorSchema.text(value, [which.create()])];
}

function inlineNodes(nodes: readonly InlineNode[]): PmNode[] {
  const out: PmNode[] = [];
  for (const inline of nodes) {
    switch (inline.type) {
      case 'text':
        if (inline.value !== '') out.push(editorSchema.text(inline.value));
        break;
      case 'break':
        out.push(N.hardBreak.create());
        break;
      case 'code':
        if (inline.value !== '') {
          out.push(editorSchema.text(inline.value, [M.code.create()]));
        }
        break;
      case 'strong':
        out.push(...withMark(inlineNodes(inline.children), M.strong));
        break;
      case 'em':
        out.push(...withMark(inlineNodes(inline.children), M.em));
        break;
      case 'del':
        out.push(...withMark(inlineNodes(inline.children), M.strike));
        break;
      case 'link': {
        const href = safeHref(inline.href);
        if (href === null) {
          out.push(...inlineNodes(inline.children));
          break;
        }
        const words = inlineNodes(inline.children);
        const value = words.map((entry) => entry.text ?? '').join('');
        if (value !== '') {
          out.push(
            editorSchema.text(value, [M.link.create({ href, title: inline.title ?? null })]),
          );
        }
        break;
      }
      default:
        break;
    }
  }
  return out;
}

function listOf(block: Extract<BlockNode, { type: 'list' }>): PmNode {
  const items = block.items.map((item: ListItem) => {
    const content = blocks(item.blocks);
    const body = content.length > 0 ? content : [N.paragraph.create()];
    return item.checked === null
      ? N.listItem.create({}, body)
      : N.taskItem.create({ checked: item.checked }, body);
  });
  const usesTasks = block.items.some((item) => item.checked !== null);
  if (usesTasks) return N.taskList.create({}, items);
  return block.ordered
    ? N.orderedList.create(block.start === 1 ? {} : { start: block.start }, items)
    : N.bulletList.create({}, items);
}

function blocks(input: readonly BlockNode[]): PmNode[] {
  const out: PmNode[] = [];
  for (const block of input) {
    switch (block.type) {
      case 'paragraph': {
        const inline = inlineNodes(block.children);
        if (inline.length > 0) out.push(N.paragraph.create({}, inline));
        break;
      }
      case 'heading':
        out.push(N.heading.create({ level: block.level }, inlineNodes(block.children)));
        break;
      case 'blockquote':
        out.push(N.blockquote.create({}, blocks(block.blocks)));
        break;
      case 'list':
        out.push(listOf(block));
        break;
      case 'code':
        out.push(
          N.codeBlock.create({ language: block.language || null }, editorSchema.text(block.value)),
        );
        break;
      case 'rule':
        out.push(N.rule.create());
        break;
      default:
        break;
    }
  }
  return out;
}

/** A ProseMirror document from our model, for a paste or a converted file. */
export function documentFromModel(model: MarkdownDocument): PmNode {
  const content = blocks(model.blocks);
  return N.doc.create({}, content.length > 0 ? content : [N.paragraph.create()]);
}

/* ------------------------------------------------------------------ */
/* ProseMirror to the model                                            */
/* ------------------------------------------------------------------ */

function readInline(node: PmNode): InlineNode[] {
  const out: InlineNode[] = [];
  node.forEach((child) => {
    if (child.isText && child.text) {
      const names = child.marks.map((entry) => entry.type.name);
      const words: InlineNode = { type: 'text', value: child.text };
      if (names.includes('code')) out.push({ type: 'code', value: child.text });
      else if (names.includes('link')) {
        const linkMarkNode = child.marks.find((entry) => entry.type.name === 'link');
        const href = safeHref(linkMarkNode?.attrs.href ?? '');
        out.push(
          href === null
            ? words
            : {
                type: 'link',
                href,
                title: linkMarkNode?.attrs.title ?? undefined,
                children: [words],
              },
        );
      } else if (names.includes('strong')) out.push({ type: 'strong', children: [words] });
      else if (names.includes('em')) out.push({ type: 'em', children: [words] });
      else if (names.includes('strike')) out.push({ type: 'del', children: [words] });
      else out.push(words);
      return;
    }
    if (child.type.name === 'hard_break') {
      out.push({ type: 'break' });
      return;
    }
    if (child.isBlock) out.push({ type: 'text', value: child.textContent });
  });
  return out;
}

function readBlocks(node: PmNode): BlockNode[] {
  const out: BlockNode[] = [];
  node.forEach((child) => {
    switch (child.type.name) {
      case 'paragraph': {
        const inline = readInline(child);
        if (inline.length > 0) out.push({ type: 'paragraph', children: inline });
        break;
      }
      case 'heading':
        out.push({
          type: 'heading',
          level: child.attrs.level ?? 1,
          id: '',
          children: readInline(child),
        });
        break;
      case 'blockquote':
        out.push({ type: 'blockquote', blocks: readBlocks(child) });
        break;
      case 'bullet_list':
      case 'ordered_list': {
        const items: ListItem[] = [];
        child.forEach((item) => {
          items.push({ checked: null, blocks: readBlocks(item) });
        });
        out.push({
          type: 'list',
          ordered: child.type.name === 'ordered_list',
          start: child.attrs.start ?? 1,
          items,
        });
        break;
      }
      case 'task_list': {
        const items: ListItem[] = [];
        child.forEach((item) => {
          items.push({ checked: item.attrs.checked === true, blocks: readBlocks(item) });
        });
        out.push({ type: 'list', ordered: false, start: 1, items });
        break;
      }
      case 'code_block':
        out.push({ type: 'code', language: child.attrs.language ?? '', value: child.textContent });
        break;
      case 'horizontal_rule':
        out.push({ type: 'rule' });
        break;
      default:
        break;
    }
  });
  return out;
}

/** The model, for the three exports. */
export function modelOf(document: PmNode): MarkdownDocument {
  return { blocks: readBlocks(document), warnings: [] };
}

export const exportsFor = {
  markdown: (document: PmNode) => modelToMarkdown(modelOf(document)),
  text: (document: PmNode) => modelToText(modelOf(document)),
  html: (document: PmNode) => modelToHtml(modelOf(document), 'Document'),
};

/* ------------------------------------------------------------------ */
/* Paste and drop: the only way markup enters                          */
/* ------------------------------------------------------------------ */

/** What a paste or a drop dropped, for the status line. */
export interface PasteReport {
  readonly scripts: number;
  readonly images: number;
  readonly links: number;
  readonly elements: number;
  /** True when the paste was longer than the converter reads in one go. */
  readonly truncated: boolean;
}

export const NO_CHANGES: PasteReport = {
  scripts: 0,
  images: 0,
  links: 0,
  elements: 0,
  truncated: false,
};

/**
 * A paste longer than this is inserted as plain text instead of being parsed.
 * The converter reads `SANITIZE_LIMITS.maxInputLength` characters in one go, and
 * turning a multi-megabyte clipboard into blocks on the main thread would block
 * typing for seconds.
 */
export const PASTE_LIMIT = SANITIZE_LIMITS.maxInputLength;

/**
 * The transaction for pasted or dropped HTML, built from our own converter.
 * ProseMirror's clipboard parser never sees the markup.
 */
export function insertPastedHtml(
  state: EditorState,
  html: string,
): {
  readonly transaction: Transaction | null;
  readonly report: PasteReport;
} {
  if (html.length > PASTE_LIMIT) {
    return { transaction: null, report: { ...NO_CHANGES, truncated: true } };
  }
  const { document, dropped }: SanitisedDocument = htmlToModel(html);
  const node = documentFromModel(document);
  const report: PasteReport = {
    scripts: dropped.scripts,
    images: dropped.images,
    links: dropped.links,
    elements: dropped.elements,
    truncated: false,
  };
  if (node.childCount === 0) return { transaction: null, report };
  return { transaction: state.tr.replaceSelection(new Slice(Fragment.from(node), 0, 0)), report };
}

/* ------------------------------------------------------------------ */
/* Find and replace                                                    */
/* ------------------------------------------------------------------ */

export interface FindResult {
  readonly from: number;
  readonly to: number;
}

/**
 * A block's text and the document position it started at. Blocks are joined by
 * a newline so a search cannot run from one block into the next, and each run
 * remembers where it came from so an offset can be turned back into a
 * position.
 */
interface TextRun {
  readonly start: number;
  readonly from: number;
  readonly length: number;
}

interface TextIndex {
  readonly text: string;
  readonly runs: readonly TextRun[];
}

function indexOfDocument(doc: PmNode): TextIndex {
  let text = '';
  const runs: TextRun[] = [];
  let separatorPending = false;
  doc.descendants((node, pos) => {
    if (node.isText) {
      if (separatorPending) {
        text += '\n';
        separatorPending = false;
      }
      const value = node.text ?? '';
      runs.push({ start: text.length, from: pos, length: value.length });
      text += value;
      return false;
    }
    if (node.isBlock) separatorPending = text.length > 0;
    return true;
  });
  return { text, runs };
}

/** Maps an offset in the indexed text back to a document position. */
function positionFor(index: TextIndex, offset: number): number {
  let fallback = 0;
  for (const run of index.runs) {
    if (offset <= run.start) return run.from;
    if (offset <= run.start + run.length) return run.from + (offset - run.start);
    fallback = run.from + run.length;
  }
  return fallback;
}

/** Every match of `needle`, as document positions ready for a selection. */
export function findMatches(state: EditorState, needle: string): FindResult[] {
  if (needle === '') return [];
  const index = indexOfDocument(state.doc);
  const lowered = index.text.toLowerCase();
  const target = needle.toLowerCase();
  const matches: FindResult[] = [];
  let cursor = lowered.indexOf(target);
  while (cursor !== -1 && matches.length < 5000) {
    matches.push({
      from: positionFor(index, cursor),
      to: positionFor(index, cursor + needle.length),
    });
    cursor = lowered.indexOf(target, cursor + needle.length);
  }
  return matches;
}

export const selectMatch = (state: EditorState, match: FindResult): Transaction =>
  state.tr.setSelection(TextSelection.create(state.doc, match.from, match.to));

export const replaceMatch = (
  state: EditorState,
  match: FindResult,
  withText: string,
): Transaction =>
  state.tr.setSelection(TextSelection.create(state.doc, match.from, match.to)).insertText(withText);

export const replaceAll = (state: EditorState, needle: string, withText: string): Transaction => {
  let transaction = state.tr;
  for (const match of [...findMatches(state, needle)].reverse()) {
    transaction = transaction.insertText(withText, match.from, match.to);
  }
  return transaction;
};

/* ------------------------------------------------------------------ */
/* Commands and plugins                                                */
/* ------------------------------------------------------------------ */

const toggleMark =
  (which: MarkType): Command =>
  (state, dispatch) => {
    const { empty, from, to } = state.selection;
    if (dispatch) {
      const transaction = state.tr;
      if (empty) {
        const stored = state.storedMarks ?? state.selection.$from.marks();
        transaction.setStoredMarks(
          which.isInSet(stored)
            ? stored.filter((entry) => entry.type !== which)
            : [...stored, which.create()],
        );
      } else if (state.doc.rangeHasMark(from, to, which)) {
        transaction.removeMark(from, to, which);
      } else {
        transaction.addMark(from, to, which.create());
      }
      dispatch(transaction.scrollIntoView());
    }
    return true;
  };

/**
 * A task list is not a plain list: its children are `task_item`s, which
 * `wrapInList` from `prosemirror-schema-list` does not know about. Each selected
 * block becomes one task item, so a two-paragraph selection gives two boxes.
 */
const wrapInTaskList: Command = (state, dispatch) => {
  const range = state.selection.$from.blockRange(state.selection.$to);
  if (!range) return false;
  const blocks: PmNode[] = [];
  for (let index = range.startIndex; index < range.endIndex; index += 1) {
    const block = range.parent.child(index);
    blocks.push(N.taskItem.create({ checked: false }, block));
  }
  if (blocks.length === 0) return false;
  const list = N.taskList.create({}, blocks);
  if (dispatch) dispatch(state.tr.replaceRangeWith(range.start, range.end, list).scrollIntoView());
  return true;
};

/** A rule goes after the block the cursor is in, never inside a paragraph. */
const insertRule: Command = (state, dispatch) => {
  const { $from } = state.selection;
  if (dispatch) {
    dispatch(state.tr.insert($from.after($from.depth), N.rule.create()).scrollIntoView());
  }
  return true;
};

/**
 * The checkbox in a task item is part of the document, not decoration: a click
 * sets `checked` on the item so the state survives export and reload.
 */
export function buildTaskListPlugin(): Plugin {
  return new Plugin({
    props: {
      handleClick: (view, pos, event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.dataset.taskToggle !== 'true') {
          return false;
        }
        const $pos = view.state.doc.resolve(pos);
        for (let depth = $pos.depth; depth > 0; depth -= 1) {
          const item = $pos.node(depth);
          if (item.type.name !== 'task_item') continue;
          const checked = item.attrs.checked !== true;
          view.dispatch(
            view.state.tr
              .setNodeMarkup($pos.before(depth), undefined, { ...item.attrs, checked })
              .scrollIntoView(),
          );
          return true;
        }
        return false;
      },
    },
  });
}

/**
 * Paste and drop: our converter, never ProseMirror's clipboard parser. A
 * dropped file is handed to `onFile` rather than opened by the browser, which
 * would navigate away from the editor.
 */
export function buildPastePlugin(
  onReport: (report: PasteReport) => void,
  onFile?: (file: File) => void,
): Plugin {
  return new Plugin({
    props: {
      handleDOMEvents: {
        paste: (view, event) => {
          const clipboard = (event as ClipboardEvent).clipboardData;
          const file = clipboard?.files?.[0];
          if (file && onFile) {
            event.preventDefault();
            onFile(file);
            return true;
          }
          const html = clipboard?.getData('text/html');
          const text = clipboard?.getData('text/plain') ?? '';
          // Plain text keeps its newlines; anything else goes through the
          // allow-list converter, which never builds a DOM from it.
          event.preventDefault();
          const payload = html && html.trim() !== '' ? html : escapeAsText(text);
          if (payload.length > PASTE_LIMIT) {
            // Too large to read as markup: the words still go in, cut to what
            // the converter would have looked at, and the reader is told.
            view.dispatch(view.state.tr.insertText(text.slice(0, PASTE_LIMIT)).scrollIntoView());
            onReport({ ...NO_CHANGES, truncated: true });
            return true;
          }
          const { transaction, report } = insertPastedHtml(view.state, payload);
          if (transaction) {
            view.dispatch(transaction.scrollIntoView());
            onReport(report);
          } else {
            view.dispatch(view.state.tr.insertText(text).scrollIntoView());
            onReport(report);
          }
          return true;
        },
        drop: (view, event) => {
          const data = (event as DragEvent).dataTransfer;
          const file = data?.files?.[0];
          if (file && onFile) {
            event.preventDefault();
            onFile(file);
            return true;
          }
          const html = data?.getData('text/html');
          if (!html || html.trim() === '') return false;
          event.preventDefault();
          if (html.length > PASTE_LIMIT) {
            onReport({ ...NO_CHANGES, truncated: true });
            return true;
          }
          const { transaction, report } = insertPastedHtml(view.state, html);
          if (transaction) {
            view.dispatch(transaction.scrollIntoView());
            onReport(report);
          }
          return true;
        },
        dragover: () => true,
      },
    },
  });
}

/**
 * Plain text pasted into an HTML-shaped slot: escaped, so it stays words, with
 * a blank line kept as a paragraph break and a single newline as a line break.
 */
export function escapeAsText(text: string): string {
  const escaped = (value: string) =>
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${block.split('\n').map(escaped).join('<br>')}</p>`)
    .join('');
}

export const undoCommand: Command = (state, dispatch) => undo(state, dispatch);
export const redoCommand: Command = (state, dispatch) => redo(state, dispatch);

export const commands = {
  bold: toggleMark(M.strong),
  italic: toggleMark(M.em),
  underline: toggleMark(M.underline),
  strike: toggleMark(M.strike),
  code: toggleMark(M.code),
  bulletList: wrapInList(N.bulletList),
  orderedList: wrapInList(N.orderedList),
  taskList: wrapInTaskList,
  blockquote: wrapIn(N.blockquote),
  codeBlock: setBlockType(N.codeBlock),
  rule: insertRule,
  splitListItem: splitListItem(N.listItem),
};
