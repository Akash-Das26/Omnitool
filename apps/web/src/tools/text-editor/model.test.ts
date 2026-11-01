import { parseMarkdown } from '@omnitool/tool-core/markdown';
import { PASTE_CORPUS } from '@omnitool/tool-core/sanitize/corpus';
import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, test } from 'vitest';
import {
  commands,
  documentFromModel,
  editorSchema,
  escapeAsText,
  exportsFor,
  findMatches,
  insertPastedHtml,
  PASTE_LIMIT,
  replaceAll,
  replaceMatch,
  selectMatch,
} from './model';

function stateFor(markdown: string): EditorState {
  return EditorState.create({
    schema: editorSchema,
    doc: documentFromModel(parseMarkdown(markdown)),
  });
}

function noDispatch(): void {
  // A command run without a dispatch function only reports whether it applies.
}

describe('the editor schema', () => {
  test('has the block and inline types the model needs', () => {
    for (const name of [
      'doc',
      'paragraph',
      'heading',
      'blockquote',
      'bullet_list',
      'ordered_list',
      'list_item',
      'task_list',
      'task_item',
      'code_block',
      'horizontal_rule',
      'text',
      'hard_break',
    ]) {
      expect(editorSchema.nodes[name], name).toBeDefined();
    }
    expect(editorSchema.topNodeType.name).toBe('doc');
  });

  test('has no image node, so nothing can point at a remote resource', () => {
    expect(editorSchema.nodes.image).toBeUndefined();
  });

  test('accepts only http, https and mailto links', () => {
    const link = editorSchema.marks.link?.spec.parseDOM?.[0];
    const getAttrs =
      link && 'getAttrs' in link
        ? (link.getAttrs as unknown as ((element: HTMLElement) => unknown) | undefined)
        : undefined;
    expect(getAttrs).toBeTypeOf('function');
    const anchor = (href: string) => {
      const element = document.createElement('a');
      element.setAttribute('href', href);
      return element;
    };
    expect(getAttrs?.(anchor('https://example.com'))).toEqual({
      href: 'https://example.com',
      title: null,
    });
    expect(getAttrs?.(anchor('mailto:someone@example.com'))).toEqual({
      href: 'mailto:someone@example.com',
      title: null,
    });
    expect(getAttrs?.(anchor('javascript:alert(1)'))).toBe(false);
    expect(getAttrs?.(anchor('data:text/html,<b>hi</b>'))).toBe(false);
  });
});

describe('documentFromModel', () => {
  test('keeps headings, marks, lists and code', () => {
    const state = stateFor(
      '# Title\n\nSome **bold**, *italic* and `code`.\n\n- one\n- two\n\n1. first\n2. second\n\n```js\nlet a = 1;\n```\n',
    );
    const markdown = exportsFor.markdown(state.doc);
    expect(markdown).toContain('# Title');
    expect(markdown).toContain('**bold**');
    expect(markdown).toContain('*italic*');
    expect(markdown).toContain('`code`');
    expect(markdown).toContain('- one');
    expect(markdown).toContain('1. first');
    expect(markdown).toContain('```js');
  });

  test('keeps a task list as task items with their state', () => {
    const state = stateFor('- [ ] open\n- [x] done\n');
    const list = state.doc.firstChild;
    expect(list?.type.name).toBe('task_list');
    expect(list?.child(0).type.name).toBe('task_item');
    expect(list?.child(0).attrs.checked).toBe(false);
    expect(list?.child(1).attrs.checked).toBe(true);
    expect(exportsFor.markdown(state.doc)).toContain('- [x] done');
  });

  test('keeps the three exports independent of one another', () => {
    const state = stateFor('# Title\n\nA **bold** word.\n');
    expect(exportsFor.markdown(state.doc)).toContain('**bold**');
    expect(exportsFor.text(state.doc)).toBe('Title\n\nA bold word.');
    expect(exportsFor.html(state.doc)).toContain('<strong>bold</strong>');
  });

  test('drops a link the model would not follow and keeps its words', () => {
    const doc = documentFromModel({
      blocks: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              href: 'javascript:alert(1)',
              children: [{ type: 'text', value: 'bad' }],
            },
          ],
        },
      ],
      warnings: [],
    });
    expect(doc.textContent).toBe('bad');
    expect(doc.rangeHasMark(0, doc.content.size, editorSchema.marks.link as never)).toBe(false);
  });
});

describe('paste', () => {
  test('keeps nothing from a script and reports what it dropped', () => {
    const state = stateFor('');
    const { transaction, report } = insertPastedHtml(
      state,
      '<p>Pasted <strong>text</strong><script>window.x = 1;</script><img src="https://example.com/p.png"></p>',
    );
    expect(transaction).not.toBeNull();
    const next = state.apply(transaction as NonNullable<typeof transaction>);
    expect(next.doc.textContent).toContain('Pasted text');
    expect(next.doc.textContent).not.toContain('window.x');
    expect(report.scripts).toBe(1);
    expect(report.images).toBe(1);
  });

  test('takes the shared attack corpus without keeping any markup', () => {
    for (const payload of PASTE_CORPUS) {
      const state = stateFor('');
      const { transaction } = insertPastedHtml(state, payload);
      const next = transaction ? state.apply(transaction) : state;
      const html = exportsFor.html(next.doc);
      // The export shell has a head, but no script, event handler, image or
      // address that would send a request, whatever arrived.
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/\son[a-z]+=/i);
      expect(html).not.toMatch(/<img/i);
      expect(html).not.toMatch(/src=/i);
      expect(html).not.toMatch(/javascript:/i);
      next.doc.descendants((node) => {
        for (const mark of node.marks) {
          if (mark.type.name === 'link') expect(mark.attrs.href).toMatch(/^(https?:|mailto:)/);
        }
        return true;
      });
    }
  });

  test('keeps paragraph and line breaks when the paste is plain text', () => {
    const state = stateFor('');
    const { transaction } = insertPastedHtml(
      state,
      escapeAsText('one line\nsecond line\n\nnew paragraph'),
    );
    const next = state.apply(transaction as NonNullable<typeof transaction>);
    // A Markdown hard break is a line break; plain text has to flatten it.
    expect(exportsFor.markdown(next.doc)).toBe('one line  \nsecond line\n\nnew paragraph');
    expect(exportsFor.text(next.doc)).toBe('one line second line\n\nnew paragraph');
  });

  test('refuses markup past the paste limit and says so', () => {
    const state = stateFor('');
    const { transaction, report } = insertPastedHtml(state, `<p>${'a'.repeat(PASTE_LIMIT)}</p>`);
    expect(transaction).toBeNull();
    expect(report.truncated).toBe(true);
    expect(report.scripts).toBe(0);
  });

  test('keeps an allowed link through the mark', () => {
    const state = stateFor('');
    const { transaction } = insertPastedHtml(
      state,
      '<p><a href="https://example.com">example</a></p>',
    );
    expect(transaction).not.toBeNull();
    const next = state.apply(transaction as NonNullable<typeof transaction>);
    expect(exportsFor.markdown(next.doc)).toContain('[example](https://example.com)');
  });
});

describe('find and replace', () => {
  test('finds a match in a later block and replaces only that one', () => {
    const state = stateFor('First line\n\nSecond line with target words\n');
    const matches = findMatches(state, 'target');
    expect(matches).toHaveLength(1);
    expect(state.doc.textBetween(matches[0]?.from ?? 0, matches[0]?.to ?? 0)).toBe('target');

    const next = state.apply(replaceAll(state, 'target', 'needle'));
    expect(exportsFor.text(next.doc)).toBe('First line\n\nSecond line with needle words');
  });

  test('selects a match so the next keystroke replaces it', () => {
    const state = stateFor('one target two');
    const match = findMatches(state, 'target')[0];
    expect(match).toBeDefined();
    const next = state.apply(selectMatch(state, match as NonNullable<typeof match>));
    expect(next.doc.textBetween(next.selection.from, next.selection.to)).toBe('target');
  });

  test('replaces one match without touching the others', () => {
    const state = stateFor('target and target');
    const match = findMatches(state, 'target')[1];
    const next = state.apply(replaceMatch(state, match as NonNullable<typeof match>, 'done'));
    expect(exportsFor.text(next.doc)).toBe('target and done');
  });

  test('finds nothing for an empty needle', () => {
    expect(findMatches(stateFor('words'), '')).toEqual([]);
  });
});

describe('commands', () => {
  test('wrap each selected block in a task list as one box per block', () => {
    const base = stateFor('one\n\ntwo');
    const state = base.apply(
      base.tr.setSelection(TextSelection.create(base.doc, 1, base.doc.content.size - 1)),
    );
    let applied: EditorState | null = null;
    commands.taskList(state, (transaction) => {
      applied = state.apply(transaction);
    });
    const next = applied as EditorState | null;
    expect(next).not.toBeNull();
    const list = next?.doc.firstChild;
    expect(list?.type.name).toBe('task_list');
    expect(list?.childCount).toBe(2);
    expect(list?.child(0).type.name).toBe('task_item');
    expect(list?.child(0).attrs.checked).toBe(false);
  });

  test('report that a command does not apply without a dispatch', () => {
    expect(commands.taskList(stateFor('words'), undefined)).toBe(true);
    expect(commands.blockquote(stateFor('words'), noDispatch)).toBe(true);
    expect(commands.rule(stateFor('words'), noDispatch)).toBe(true);
  });

  test('turn a paragraph into a blockquote and back into words', () => {
    const state = stateFor('quoted words');
    let applied: EditorState | null = null;
    commands.blockquote(state, (transaction) => {
      applied = state.apply(transaction);
    });
    const next = applied as EditorState | null;
    expect(next?.doc.firstChild?.type.name).toBe('blockquote');
    expect(next ? exportsFor.markdown(next.doc) : '').toContain('> quoted words');
  });

  test('put a rule after the block the cursor is in', () => {
    const state = stateFor('words');
    let applied: EditorState | null = null;
    commands.rule(state, (transaction) => {
      applied = state.apply(transaction);
    });
    const next = applied as EditorState | null;
    expect(next?.doc.childCount).toBe(2);
    expect(next?.doc.child(1).type.name).toBe('horizontal_rule');
  });
});
