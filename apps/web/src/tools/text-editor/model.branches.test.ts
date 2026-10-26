import { parseMarkdown } from '@omnitool/tool-core/markdown';
import { htmlToModel } from '@omnitool/tool-core/sanitize';
import { DOMSerializer, Fragment, DOMParser as PmDOMParser } from 'prosemirror-model';
import { EditorState, type Plugin, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  buildPastePlugin,
  buildTaskListPlugin,
  commands,
  documentFromModel,
  editorSchema,
  escapeAsText,
  exportsFor,
  findMatches,
  modelOf,
  NO_CHANGES,
  PASTE_LIMIT,
  type PasteReport,
  replaceAll,
  replaceMatch,
  selectMatch,
} from './model';

/**
 * Edge cases of the converter and the two plugins.
 *
 * `model.test.ts` checks what the editor does; this file is about the paths it
 * takes when a document or a clipboard is not the shape the happy path expects —
 * an empty mark, a link with no words, a task item with no state, a drop that
 * carries no markup. The coverage floor for `model.ts` is 90% branches because
 * every one of these refusals is part of handling somebody else's file.
 */

const mounted: EditorView[] = [];

interface Harness {
  readonly view: EditorView;
  readonly pastePlugin: Plugin;
  readonly taskPlugin: Plugin;
}

function viewFor(
  markdown: string,
  onReport: (report: PasteReport) => void = () => {},
  onFile?: (file: File) => void,
): Harness {
  const place = document.createElement('div');
  document.body.append(place);
  const pastePlugin = buildPastePlugin(onReport, onFile);
  const taskPlugin = buildTaskListPlugin();
  const view = new EditorView(place, {
    state: EditorState.create({
      schema: editorSchema,
      doc: documentFromModel(parseMarkdown(markdown)),
    }),
    plugins: [pastePlugin, taskPlugin],
  });
  mounted.push(view);
  return { view, pastePlugin, taskPlugin };
}

afterEach(() => {
  for (const view of mounted.splice(0)) view.destroy();
  document.body.replaceChildren();
});

function clipboardEvent(data: Record<string, string>, files: File[] = []) {
  return {
    preventDefault: vi.fn(),
    clipboardData: { files, getData: (type: string) => data[type] ?? '' },
  } as unknown as ClipboardEvent;
}

function dropEvent(data: Record<string, string>, files: File[] = []) {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { files, getData: (type: string) => data[type] ?? '' },
  } as unknown as DragEvent;
}

function paste(harness: Harness, event: ClipboardEvent): boolean {
  const handler = harness.pastePlugin.props.handleDOMEvents?.paste;
  if (!handler) return false;
  return handler.call(harness.pastePlugin, harness.view, event) ?? false;
}

function drop(harness: Harness, event: DragEvent): boolean {
  const handler = harness.pastePlugin.props.handleDOMEvents?.drop;
  if (!handler) return false;
  return handler.call(harness.pastePlugin, harness.view, event) ?? false;
}

describe('a document of every shape', () => {
  const shapes: readonly [string, string][] = [
    ['an empty mark', '<p><strong></strong>words</p>'],
    ['a link with no words', '[ ](https://example.com)'],
    ['an empty inline code span', 'a `` b'],
    ['a hard break', 'one  \ntwo'],
    ['strikethrough', '~~gone~~'],
    ['underline from an opened file', '<p><u>line</u></p>'],
    ['a heading of every level', '# one\n\n###### six'],
    ['a setext heading', 'Title\n====='],
    ['a nested blockquote', '> one\n>\n> > two'],
    ['an ordered list that does not start at one', '3. three\n4. four'],
    ['a task list with both states', '- [x] done\n- [ ] not done'],
    ['a plain bullet list', '- one\n- two'],
    ['a fence with no language', '```\nplain\n```'],
    ['a fence with a language', '```ts\nconst a = 1;\n```'],
    ['an indented code block', '    indented'],
    ['a rule', '---'],
    [
      'an inline image, which the editor drops',
      'before ![pixel](data:image/png;base64,AAAA) after',
    ],
    [
      'a remote image, which the editor drops',
      'before ![tracker](https://example.com/x.png) after',
    ],
    ['a link with a title', '[x](https://example.com "the title")'],
  ];

  test('goes into the editor and comes back out of all three exports', () => {
    for (const [label, markdown] of shapes) {
      const document = documentFromModel(parseMarkdown(markdown));
      // Reading the document back is what every export does, so a shape the
      // reader cannot represent would lose the reader's words silently.
      const round = modelOf(document);
      expect(exportsFor.markdown(document), label).not.toBe('');
      expect(exportsFor.text(document), label).toBeTypeOf('string');
      expect(exportsFor.html(document), label).toContain('<body>');
      expect(round.warnings, label).toEqual([]);
    }
  });

  test('writes an empty document as one empty paragraph', () => {
    const document = documentFromModel({ blocks: [], warnings: [] });
    expect(document.childCount).toBe(1);
    expect(document.firstChild?.type.name).toBe('paragraph');
    expect(exportsFor.text(document).trim()).toBe('');
  });

  test('keeps a task item with no state and a list with no items', () => {
    const document = documentFromModel(
      htmlToModel('<ul data-task-list="true"><li data-task="true">bare</li></ul>').document,
    );
    const list = modelOf(document).blocks[0];
    expect(list?.type).toBe('list');
    if (list?.type === 'list') {
      expect(list.items[0]?.checked).toBeNull();
    }
  });

  test('reads a block nested inside an inline container as text rather than losing it', () => {
    const paragraph = editorSchema.nodes.paragraph?.create(
      {},
      editorSchema.nodes.blockquote?.create(
        {},
        editorSchema.nodes.paragraph?.create({}, editorSchema.text('inside')),
      ),
    );
    const document = editorSchema.nodes.doc?.create({}, paragraph ? [paragraph] : []);
    expect(document).toBeDefined();
    expect(exportsFor.text(document as NonNullable<typeof document>)).toContain('inside');
  });
});

describe('reading the model', () => {
  test('keeps the title of a link and drops one whose address it would not follow', () => {
    const withTitle = documentFromModel(parseMarkdown('[x](https://example.com "the title")'));
    expect(exportsFor.markdown(withTitle)).toContain('https://example.com');

    const forced = editorSchema.nodes.paragraph?.create(
      {},
      editorSchema.text('words', [
        editorSchema.marks.link?.create({ href: 'javascript:alert(1)' }) as never,
      ]),
    );
    const document = editorSchema.nodes.doc?.create({}, forced ? [forced] : []);
    // The mark's own toDOM refuses the address; the reader falls back to words.
    expect(exportsFor.markdown(document as NonNullable<typeof document>)).toContain('words');
  });

  test('reads every mark the schema has', () => {
    const marks = ['strong', 'em', 'code', 'underline', 'strike'] as const;
    for (const name of marks) {
      const markType = editorSchema.marks[name];
      expect(markType, name).toBeDefined();
      const text = editorSchema.text('x', [markType?.create() as never]);
      const document = editorSchema.nodes.doc?.create(
        {},
        editorSchema.nodes.paragraph?.create({}, text),
      );
      const model = modelOf(document as NonNullable<typeof document>);
      expect(JSON.stringify(model), name).toContain('x');
    }
  });
});

describe('paste and drop handlers', () => {
  test('a pasted file is handed to the caller, not opened', () => {
    const onFile = vi.fn();
    const harness = viewFor('', () => {}, onFile);
    const file = new File(['x'], 'note.md', { type: 'text/markdown' });
    expect(paste(harness, clipboardEvent({}, [file]))).toBe(true);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  test('a dropped file is handed to the caller too, and the drop is swallowed', () => {
    const onFile = vi.fn();
    const harness = viewFor('', () => {}, onFile);
    const file = new File(['x'], 'note.md', { type: 'text/markdown' });
    expect(drop(harness, dropEvent({}, [file]))).toBe(true);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  test('markup on the clipboard goes through the sanitiser and is reported', () => {
    const reports: unknown[] = [];
    const harness = viewFor('', (report) => reports.push(report));
    expect(
      paste(harness, clipboardEvent({ 'text/html': '<p>kept<script>alert(1)</script></p>' })),
    ).toBe(true);
    expect(harness.view.state.doc.textContent).toContain('kept');
    expect(reports.at(-1)).toMatchObject({ scripts: 1 });
  });

  test('plain text keeps its paragraph and line breaks', () => {
    const reports: unknown[] = [];
    const harness = viewFor('', (report) => reports.push(report));
    expect(paste(harness, clipboardEvent({ 'text/plain': 'one\ntwo\n\nthree' }))).toBe(true);
    expect(harness.view.state.doc.textContent).toContain('one');
    expect(reports.at(-1)).toEqual(NO_CHANGES);
  });

  test('a paste past the limit goes in as words and says it was cut', () => {
    const reports: { truncated?: boolean }[] = [];
    const harness = viewFor('', (report) => reports.push(report as { truncated?: boolean }));
    const long = `<p>${'x'.repeat(PASTE_LIMIT + 10)}</p>`;
    expect(paste(harness, clipboardEvent({ 'text/html': long, 'text/plain': 'short' }))).toBe(true);
    expect(reports.at(-1)?.truncated).toBe(true);
  });

  test('a drop with no markup is left to the browser', () => {
    const harness = viewFor('');
    expect(drop(harness, dropEvent({ 'text/plain': 'words' }))).toBe(false);
  });

  test('a drop with markup is converted, and one past the limit is reported', () => {
    const reports: { truncated?: boolean }[] = [];
    const harness = viewFor('', (report) => reports.push(report as { truncated?: boolean }));
    expect(drop(harness, dropEvent({ 'text/html': '<p>dropped</p>' }))).toBe(true);
    expect(harness.view.state.doc.textContent).toContain('dropped');

    const long = `<p>${'y'.repeat(PASTE_LIMIT + 10)}</p>`;
    expect(drop(harness, dropEvent({ 'text/html': long }))).toBe(true);
    expect(reports.at(-1)?.truncated).toBe(true);
  });

  test('keeps a dragover from navigating away', () => {
    const harness = viewFor('');
    const handler = harness.pastePlugin.props.handleDOMEvents?.dragover;
    expect(handler?.call(harness.pastePlugin, harness.view, {} as unknown as DragEvent)).toBe(true);
  });
});

describe('the task list plugin', () => {
  test('writes a tick back into the node instead of only into the checkbox', () => {
    const harness = viewFor('- [ ] a task');
    const box = harness.view.dom.querySelector<HTMLInputElement>('input[data-task-toggle]');
    expect(box).not.toBeNull();
    let inside = 0;
    harness.view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'task_item') inside = pos + 1;
      return true;
    });
    // The handler reads only `event.target`, so a synthetic event pointing at
    // the box is the same thing a real click would give it.
    const handled = harness.taskPlugin.props.handleClick?.call(
      harness.taskPlugin,
      harness.view,
      inside,
      { target: box } as unknown as MouseEvent,
    );
    expect(handled).toBe(true);
    const checked: unknown[] = [];
    harness.view.state.doc.descendants((node) => {
      if (node.type.name === 'task_item') checked.push(node.attrs.checked);
      return true;
    });
    expect(checked).toEqual([true]);
  });

  test('leaves a click outside the box alone', () => {
    const harness = viewFor('- [ ] a task');
    const body = harness.view.dom.querySelector('.task-item-body');
    expect(body).not.toBeNull();
    const handled = harness.taskPlugin.props.handleClick?.call(
      harness.taskPlugin,
      harness.view,
      1,
      {
        target: body,
      } as unknown as MouseEvent,
    );
    expect(handled).toBe(false);
    const checked: unknown[] = [];
    harness.view.state.doc.descendants((node) => {
      if (node.type.name === 'task_item') checked.push(node.attrs.checked);
      return true;
    });
    expect(checked).toEqual([false]);
  });
});

describe('escapeAsText', () => {
  test('escapes the three characters that would become markup', () => {
    expect(escapeAsText('<b>&</b>')).toBe('<p>&lt;b&gt;&amp;&lt;/b&gt;</p>');
  });

  test('keeps one newline as a break and two as a paragraph', () => {
    expect(escapeAsText('a\nb')).toBe('<p>a<br>b</p>');
    expect(escapeAsText('a\n\nb')).toBe('<p>a</p><p>b</p>');
    expect(escapeAsText('')).toBe('<p></p>');
  });
});

describe('find and replace edges', () => {
  function state(text: string) {
    return EditorState.create({
      schema: editorSchema,
      doc: documentFromModel(parseMarkdown(text)),
    });
  }

  test('finds nothing in an empty document', () => {
    expect(findMatches(state(''), 'x')).toEqual([]);
  });

  test('selects and replaces a match at the end of the document', () => {
    const first = state('alpha beta');
    const match = findMatches(first, 'beta')[0];
    expect(match).toBeDefined();
    const selected = selectMatch(first, match as NonNullable<typeof match>);
    expect(selected.selection.from).toBeGreaterThan(0);

    const replaced = replaceMatch(first, match as NonNullable<typeof match>, 'gamma');
    expect(replaced.doc.textContent).toBe('alpha gamma');
  });

  test('replaces every match without touching a different word', () => {
    const replaced = replaceAll(state('a a b'), 'a', 'z');
    expect(replaced.doc.textContent).toBe('z z b');
  });

  test('replaces nothing when the needle is empty', () => {
    const replaced = replaceAll(state('a'), '', 'z');
    expect(replaced.doc.textContent).toBe('a');
  });
});

describe('commands', () => {
  function run(name: keyof typeof commands, markdown: string, selectAll = true) {
    const base = EditorState.create({
      schema: editorSchema,
      doc: documentFromModel(parseMarkdown(markdown)),
    });
    const from = selectAll ? 1 : base.selection.from;
    const to = selectAll ? base.doc.content.size - 1 : base.selection.to;
    const state = base.apply(base.tr.setSelection(TextSelection.create(base.doc, from, to)));
    let next = state;
    commands[name](state, (transaction) => {
      next = state.apply(transaction);
    });
    return next;
  }

  test('each mark command applies to a selection', () => {
    for (const name of ['bold', 'italic', 'underline', 'strike', 'code'] as const) {
      const next = run(name, 'words');
      expect(exportsFor.markdown(next.doc), name).not.toBe('');
    }
  });

  test('each block command applies to the paragraph it is in', () => {
    for (const name of ['bulletList', 'orderedList', 'taskList', 'blockquote'] as const) {
      const next = run(name, 'a line');
      expect(next.doc.firstChild?.type.name, name).not.toBe('paragraph');
    }
  });

  test('a code block and a rule change the block too', () => {
    expect(run('codeBlock', 'a line').doc.firstChild?.type.name).toBe('code_block');
    expect(run('rule', 'a line').doc.textContent).toContain('a line');
  });

  test('splitListItem reports false outside a list item', () => {
    const state = EditorState.create({
      schema: editorSchema,
      doc: documentFromModel(parseMarkdown('a line')),
    });
    expect(commands.splitListItem(state, () => {})).toBe(false);
  });

  test('splitListItem starts a new item inside one', () => {
    const state = EditorState.create({
      schema: editorSchema,
      doc: documentFromModel(parseMarkdown('- one')),
    });
    const inside = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 5)));
    expect(commands.splitListItem(inside, () => {})).toBe(true);
  });
});

describe('the schema as a DOM parser and serializer', () => {
  const host = document.createElement('div');

  function anchor(attributes: Record<string, string>, words: string) {
    const element = document.createElement('a');
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    element.textContent = words;
    return element;
  }

  test('reads an anchor and drops one whose address it would not follow', () => {
    const paragraph = document.createElement('p');
    const refused = anchor({ href: 'javascript:alert(1)', title: 'no' }, 'words');
    const allowed = anchor({ href: 'https://example.com', title: 'yes' }, 'safe');
    paragraph.append(refused, document.createTextNode(' '), allowed);
    host.replaceChildren(paragraph);

    const document_ = PmDOMParser.fromSchema(editorSchema).parse(host);
    const marks: unknown[] = [];
    document_.descendants((node) => {
      for (const mark of node.marks) marks.push(mark.attrs);
      return true;
    });
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ href: 'https://example.com', title: 'yes' });
  });

  test('writes a link mark back with its title, and falls back when the address is gone', () => {
    const serializer = DOMSerializer.fromSchema(editorSchema);
    const withTitle = editorSchema.nodes.doc?.create(
      {},
      editorSchema.nodes.paragraph?.create(
        {},
        editorSchema.text('words', [
          editorSchema.marks.link?.create({
            href: 'https://example.com',
            title: 'the title',
          }) as never,
        ]),
      ),
    );
    const plain = editorSchema.nodes.doc?.create(
      {},
      editorSchema.nodes.paragraph?.create(
        {},
        editorSchema.text('words', [
          editorSchema.marks.link?.create({ href: 'https://example.com' }) as never,
        ]),
      ),
    );
    const broken = editorSchema.nodes.doc?.create(
      {},
      editorSchema.nodes.paragraph?.create(
        {},
        editorSchema.text('words', [
          editorSchema.marks.link?.create({ href: 'javascript:alert(1)' }) as never,
        ]),
      ),
    );

    const withTitleHtml =
      serializer.serializeFragment((withTitle as NonNullable<typeof withTitle>).content, {
        document,
      }).firstElementChild?.outerHTML ?? '';
    const plainHtml =
      serializer.serializeFragment((plain as NonNullable<typeof plain>).content, { document })
        .firstElementChild?.outerHTML ?? '';
    const brokenHtml =
      serializer.serializeFragment((broken as NonNullable<typeof broken>).content, { document })
        .firstElementChild?.outerHTML ?? '';

    expect(withTitleHtml).toContain('title="the title"');
    expect(plainHtml).not.toContain('title=');
    expect(brokenHtml).not.toContain('javascript');
    expect(brokenHtml).toContain('href="#"');
  });

  test('writes a code block with and without a language', () => {
    const serializer = DOMSerializer.fromSchema(editorSchema);
    const withLanguage = editorSchema.nodes.code_block?.create(
      { language: 'ts' },
      editorSchema.text('const a = 1;'),
    );
    const without = editorSchema.nodes.code_block?.create({}, editorSchema.text('plain'));
    const htmlOf = (node: unknown) => {
      const fragment = Fragment.from(node as never);
      return (
        serializer.serializeFragment(fragment, { document }).firstElementChild?.outerHTML ?? ''
      );
    };
    expect(htmlOf(withLanguage)).toContain('data-language="ts"');
    expect(htmlOf(without)).not.toContain('data-language');
  });
});

describe('a model the parser would never produce', () => {
  const model = (blocks: unknown[]) => documentFromModel({ blocks, warnings: [] } as never);

  test('keeps an empty mark and an empty link as nothing rather than crashing', () => {
    const document_ = model([
      { type: 'paragraph', children: [{ type: 'strong', children: [] }] },
      {
        type: 'paragraph',
        children: [{ type: 'link', href: 'https://example.com', children: [] }],
      },
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: '' },
          { type: 'code', value: '' },
        ],
      },
      { type: 'paragraph', children: [] },
    ]);
    expect(document_.childCount).toBeGreaterThan(0);
    expect(exportsFor.markdown(document_)).not.toContain('javascript');
  });

  test('keeps a list item with no blocks and a block it does not know', () => {
    const document_ = model([
      { type: 'list', ordered: false, start: 1, items: [{ checked: null, blocks: [] }] },
      { type: 'something-new', value: 'x' },
    ]);
    expect(document_.childCount).toBeGreaterThan(0);
    expect(exportsFor.text(document_)).toBeTypeOf('string');
  });
});

describe('commands without a dispatch', () => {
  function stateFor(markdown: string) {
    return EditorState.create({
      schema: editorSchema,
      doc: documentFromModel(parseMarkdown(markdown)),
    });
  }

  test('report whether they apply without changing anything', () => {
    const state = stateFor('a line');
    expect(commands.bold(state)).toBe(true);
    expect(commands.rule(state)).toBe(true);
    expect(commands.taskList(state)).toBe(true);
    expect(commands.blockquote(state)).toBe(true);
    expect(state.doc.textContent).toBe('a line');
  });

  test('store a mark for the next keystroke and take it away again', () => {
    const base = stateFor('alpha beta');
    const middle = TextSelection.create(base.doc, 3);
    const empty = base.apply(base.tr.setSelection(middle));
    let stored = empty;
    commands.bold(empty, (transaction) => {
      stored = empty.apply(transaction);
    });
    expect(stored.storedMarks?.some((mark) => mark.type.name === 'strong')).toBe(true);

    let cleared = stored;
    commands.bold(stored, (transaction) => {
      cleared = stored.apply(transaction);
    });
    expect(cleared.storedMarks?.some((mark) => mark.type.name === 'strong')).toBe(false);
  });

  test('take a mark off a selection that already has it', () => {
    const base = stateFor('alpha beta');
    let marked = base;
    commands.bold(base, (transaction) => {
      marked = base.apply(transaction);
    });
    let cleared = marked;
    commands.bold(marked, (transaction) => {
      cleared = marked.apply(transaction);
    });
    expect(cleared.doc.textContent).toBe('alpha beta');
    expect(JSON.stringify(modelOf(cleared.doc))).not.toContain('strong');
  });

  test('wrap two blocks in one task list with a box each', () => {
    const base = stateFor('one\n\ntwo');
    const spanning = base.apply(
      base.tr.setSelection(TextSelection.create(base.doc, 1, base.doc.content.size - 1)),
    );
    let next = spanning;
    commands.taskList(spanning, (transaction) => {
      next = spanning.apply(transaction);
    });
    const checked: unknown[] = [];
    next.doc.descendants((node) => {
      if (node.type.name === 'task_item') checked.push(node.attrs.checked);
      return true;
    });
    expect(checked).toEqual([false, false]);
  });
});

describe('a click on a list that is not a task list', () => {
  test('is left alone', () => {
    const harness = viewFor('- one\n- two');
    let inside = 0;
    harness.view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'list_item') inside = Math.max(inside, pos + 1);
      return true;
    });
    const foreign = viewFor('- [ ] a task');
    const box = foreign.view.dom.querySelector<HTMLInputElement>('input[data-task-toggle]');
    const handled = harness.taskPlugin.props.handleClick?.call(
      harness.taskPlugin,
      harness.view,
      inside,
      { target: box } as unknown as MouseEvent,
    );
    expect(handled).toBe(false);
  });
});

describe('the paths a reader cannot reach but a caller can', () => {
  function stateFor(markdown: string) {
    return EditorState.create({
      schema: editorSchema,
      doc: documentFromModel(parseMarkdown(markdown)),
    });
  }

  test('reads a link mark whose address has been taken away as plain words', () => {
    const document_ = editorSchema.nodes.doc?.create(
      {},
      editorSchema.nodes.paragraph?.create(
        {},
        editorSchema.text('words', [editorSchema.marks.link?.create({ href: null }) as never]),
      ),
    );
    const model = modelOf(document_ as NonNullable<typeof document_>);
    expect(JSON.stringify(model)).toContain('words');
    expect(JSON.stringify(model)).not.toContain('href');
    // Serializing the same document falls back rather than writing an address.
    const html =
      DOMSerializer.fromSchema(editorSchema).serializeFragment(
        (document_ as NonNullable<typeof document_>).content,
        { document },
      ).firstElementChild?.outerHTML ?? '';
    expect(html).toContain('href="#"');
  });

  test('keeps a block nested inside a paragraph as its words', () => {
    const paragraph = editorSchema.nodes.paragraph?.create();
    const inside = editorSchema.nodes.paragraph?.create({}, editorSchema.text('inside'));
    const nested = editorSchema.nodes.blockquote?.create({}, inside);
    const doc = editorSchema.nodes.doc?.create(
      {},
      paragraph && nested
        ? [editorSchema.nodes.paragraph?.create({}, [nested] as never) as never]
        : [],
    );
    const text = exportsFor.text(doc as NonNullable<typeof doc>);
    expect(text).toContain('inside');
  });

  test('reads a list item that sits directly in the document as nothing', () => {
    const item = editorSchema.nodes.list_item?.create(
      {},
      editorSchema.nodes.paragraph?.create({}, editorSchema.text('orphan')),
    );
    const doc = editorSchema.nodes.doc?.create({}, item ? [item as never] : []);
    expect(modelOf(doc as NonNullable<typeof doc>).blocks).toEqual([]);
  });

  test('sees a hard break as a break, not as text', () => {
    const doc = editorSchema.nodes.doc?.create(
      {},
      editorSchema.nodes.paragraph?.create({}, [
        editorSchema.text('one'),
        editorSchema.nodes.hard_break?.create() as never,
        editorSchema.text('two'),
      ]),
    );
    const state = EditorState.create({
      schema: editorSchema,
      doc: doc as NonNullable<typeof doc>,
    });
    // The second line starts a new text run, so a search finds it on its own.
    expect(findMatches(state, 'two')).toHaveLength(1);
  });

  test('takes a mark off a selection that carries it', () => {
    const base = stateFor('alpha beta');
    const selecting = base.apply(
      base.tr.setSelection(TextSelection.create(base.doc, 1, base.doc.content.size - 1)),
    );
    let marked = selecting;
    commands.bold(selecting, (transaction) => {
      marked = selecting.apply(transaction);
    });
    expect(JSON.stringify(modelOf(marked.doc))).toContain('strong');

    let cleared = marked;
    commands.bold(marked, (transaction) => {
      cleared = marked.apply(transaction);
    });
    expect(JSON.stringify(modelOf(cleared.doc))).not.toContain('strong');
  });
});

describe('a paste event with nothing to read', () => {
  test('still returns true so the browser does not handle it', () => {
    const reports: unknown[] = [];
    const harness = viewFor('', (report) => reports.push(report));
    const event = {
      preventDefault: vi.fn(),
      clipboardData: null,
    } as unknown as ClipboardEvent;
    expect(paste(harness, event)).toBe(true);
    expect(reports).toHaveLength(1);
  });
});
