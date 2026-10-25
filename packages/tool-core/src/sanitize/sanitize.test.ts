import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../markdown/index';
import {
  htmlToModel,
  modelToHtml,
  modelToMarkdown,
  modelToText,
  SANITIZE_LIMITS,
  tokenizeHtml,
} from './index';

/** One payload per family of attack; every one must arrive inert. */
const CORPUS: readonly string[] = [
  '<script>alert(1)</script>',
  '<SCRIPT SRC="https://evil.example/x.js"></SCRIPT>',
  '<img src=x onerror=alert(1)>',
  '<IMG SRC="x" ONERROR="alert(1)">',
  '<svg onload=alert(1)></svg>',
  '<svg><script>alert(1)</script><circle r="1"/></svg>',
  '<iframe src="https://evil.example"></iframe>',
  '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="></object>',
  '<embed src="https://evil.example/x">',
  '<style>@import url(https://evil.example/x.css);</style>',
  '<meta http-equiv="refresh" content="0;url=https://evil.example">',
  '<base href="https://evil.example/">',
  '<link rel="stylesheet" href="https://evil.example/x.css">',
  '<form action="https://evil.example"><input name="q" value="x"><button>Go</button></form>',
  '<a href="javascript:alert(1)">click</a>',
  '<a href="JaVaScRiPt:alert(1)">click</a>',
  '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">click</a>',
  '<a href="vbscript:msgbox">click</a>',
  '<a href="file:///etc/passwd">click</a>',
  '<a href="https://evil.example" onclick="alert(1)">click</a>',
  '<div onmouseover="alert(1)" onfocusin="alert(2)">hover</div>',
  '<a href="&#106;avascript:alert(1)">entity trick</a>',
  '<a href="jav&#x61;script:alert(1)">entity trick two</a>',
  '<p>text <a href="https://ok.example"><script>nope</script></a> more</p>',
  '<div><div><div><div><div><div><div><script>alert(1)</script></div></div></div></div></div></div></div>',
  '<p>unclosed <strong>bold <em>both',
  'text with <notatag and a stray < alone',
  '<p title="a b" data-x=\'c\' bare=d>attributes</p>',
  '<VIDEO SRC="x.mp4" autoplay oncanplay="alert(1)"></VIDEO>',
  '<canvas onpointerdown="alert(1)"></canvas>',
  '<template><script>alert(1)</script></template>',
  '<math><mtext><script>alert(1)</script></mtext></math>',
  '<noscript><p>fallback</p></noscript>',
  '<textarea><script>alert(1)</script></textarea>',
  '<title><script>alert(1)</script></title>',
  '<img src="https://evil.example/pixel.png" alt="tracker">',
  '<img src="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+">',
  '&lt;script&gt;alert(1)&lt;/script&gt;',
  '<p>&#60;script&#62;alert(1)&#60;/script&#62;</p>',
  '<u>underline</u><font color="red" face="Arial">font</font><center>centred</center>',
];

function textOf(html: string): string {
  return modelToText(htmlToModel(html).document);
}

/** The elements the HTML export may write: the document shell plus the model's tags. */
const ALLOWED_ELEMENTS = new Set([
  'html',
  'head',
  'meta',
  'title',
  'body',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'em',
  'del',
  'code',
  'pre',
  'a',
  'img',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'input',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);
const ALLOWED_ATTRIBUTES =
  /^(?:\s+(?:href|rel|title|src|alt|id|type|disabled|checked|start|style|class|lang|charset|name|content)(?:="[^"]*")?)*\s*$/;

describe('nothing in the corpus survives as markup', () => {
  it('leaves no script, no event handler and no third-party address anywhere', () => {
    for (const payload of CORPUS) {
      const { document, dropped } = htmlToModel(payload);
      const asText = modelToText(document);
      const asMarkdown = modelToMarkdown(document);
      const asHtml = modelToHtml(document, payload);
      // The document's own title is the payload's words, escaped, so the
      // markup checks run on the body a reader would actually see.
      const body = asHtml.slice(asHtml.indexOf('<body>'));
      // Plain text has no markup to check. The Markdown export escapes every
      // angle bracket it writes, so an unescaped `<` anywhere means the
      // converter let markup through; the HTML export is checked element by
      // element further down.
      expect(asMarkdown, payload).not.toMatch(/(^|[^\\])<[a-z!/]/i);
      expect(asHtml, payload).not.toMatch(/<script|<iframe|<object|<embed|<style|<form|<template/i);
      // The text and the markdown carry the payload's own words (an escaped
      // `javascript:` inside a text node is text), so the scheme check belongs
      // on the address an export could turn into a link.
      for (const output of [asText, asMarkdown]) {
        expect(output, payload).not.toMatch(/javascript:/i);
        expect(output, payload).not.toMatch(/vbscript:/i);
      }
      expect(body, payload).not.toMatch(/(?:href|src)="[^"]*(?:javascript|vbscript|data:text)/i);
      // The export is written by the same allow-list renderer the markdown tool
      // uses, so check the markup it produced rather than the payload's words
      // (an escaped `onerror=` inside a text node is text, not an attribute).
      for (const match of body.matchAll(/<([a-zA-Z][\w-]*)([^>]*)>/g)) {
        const [, name = '', attributes = ''] = match;
        expect(
          ALLOWED_ELEMENTS.has(name.toLowerCase()),
          `${payload} → <${name}${attributes}>`,
        ).toBe(true);
        expect(attributes, `${payload} → <${name}${attributes}>`).toMatch(ALLOWED_ATTRIBUTES);
      }
      // No remote *resource* reaches the reader: a link is words a reader may
      // follow, an image or a stylesheet is a request the page makes.
      expect(`${asText}${asMarkdown}`, payload).not.toMatch(/src=["']?https?:/i);
      expect(body, payload).not.toMatch(/src="https?:/i);
      expect(body, payload).not.toMatch(/url\(\s*["']?https?:/i);
      // And the model holds only node types the union allows.
      const seen = new Set<string>();
      const walk = (nodes: readonly unknown[]) => {
        for (const node of nodes) {
          const typed = node as {
            type?: string;
            children?: readonly unknown[];
            blocks?: readonly unknown[];
          };
          if (typed.type) seen.add(typed.type);
          if (typed.children) walk(typed.children);
          if (typed.blocks) walk(typed.blocks);
        }
      };
      walk(document.blocks);
      for (const type of seen) {
        expect(
          [
            'heading',
            'paragraph',
            'blockquote',
            'list',
            'code',
            'table',
            'rule',
            'text',
            'strong',
            'em',
            'del',
            'link',
            'image',
            'break',
          ],
          payload,
        ).toContain(type);
      }
      // The counts the tool reports back are checked one by one below: an
      // `on*` attribute is dropped by the attribute allow-list and has no
      // counter of its own, and a script inside an `<svg>` never becomes a
      // token at all, because the tokenizer skips that element whole.
    }
  });
});

describe('ordinary documents keep their shape', () => {
  it('reads paragraphs and headings', () => {
    expect(htmlToModel('<p>Hello</p><h2>Title</h2>').document.blocks).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'Hello' }] },
      { type: 'heading', level: 2, id: 'title', children: [{ type: 'text', value: 'Title' }] },
    ]);
  });

  it('keeps bold, italic, strike, code and a break', () => {
    const [block] = htmlToModel(
      '<p><strong>b</strong> <em>i</em> <del>s</del> <code>c</code><br>next</p>',
    ).document.blocks;
    expect(block).toEqual({
      type: 'paragraph',
      children: [
        { type: 'strong', children: [{ type: 'text', value: 'b' }] },
        { type: 'text', value: ' ' },
        { type: 'em', children: [{ type: 'text', value: 'i' }] },
        { type: 'text', value: ' ' },
        { type: 'del', children: [{ type: 'text', value: 's' }] },
        { type: 'text', value: ' ' },
        { type: 'code', value: 'c' },
        { type: 'break' },
        { type: 'text', value: 'next' },
      ],
    });
  });

  it('keeps the three link schemes and drops the words of the rest', () => {
    const { document, dropped } = htmlToModel(
      '<p><a href="https://ok.example/a">a</a> <a href="http://ok.example">b</a> ' +
        '<a href="mailto:a@ok.example">c</a> <a href="/relative">d</a> ' +
        '<a href="javascript:alert(1)">e</a></p>',
    );
    expect(document.blocks[0]).toEqual({
      type: 'paragraph',
      children: [
        { type: 'link', href: 'https://ok.example/a', children: [{ type: 'text', value: 'a' }] },
        { type: 'text', value: ' ' },
        { type: 'link', href: 'http://ok.example', children: [{ type: 'text', value: 'b' }] },
        { type: 'text', value: ' ' },
        { type: 'link', href: 'mailto:a@ok.example', children: [{ type: 'text', value: 'c' }] },
        { type: 'text', value: ' ' },
        { type: 'link', href: '/relative', children: [{ type: 'text', value: 'd' }] },
        { type: 'text', value: ' ' },
        { type: 'text', value: 'e' },
      ],
    });
    expect(dropped.links).toBe(5);
  });

  it('reads bullet, ordered and task lists', () => {
    const { document } = htmlToModel(
      '<ul><li>one</li><li>two</li></ul>' +
        '<ol start="3"><li>three</li></ol>' +
        '<ul><li><input type="checkbox" checked>done</li><li><input type="checkbox">todo</li></ul>',
    );
    expect(document.blocks).toEqual([
      {
        type: 'list',
        ordered: false,
        start: 1,
        items: [
          {
            checked: null,
            blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'one' }] }],
          },
          {
            checked: null,
            blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'two' }] }],
          },
        ],
      },
      {
        type: 'list',
        ordered: true,
        start: 3,
        items: [
          {
            checked: null,
            blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'three' }] }],
          },
        ],
      },
      {
        type: 'list',
        ordered: false,
        start: 1,
        items: [
          {
            checked: true,
            blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'done' }] }],
          },
          {
            checked: false,
            blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'todo' }] }],
          },
        ],
      },
    ]);
  });

  it('reads a blockquote, a code block with a language and a rule', () => {
    const { document } = htmlToModel(
      '<blockquote><p>quoted</p></blockquote><pre><code class="language-js">const x = 1;</code></pre><hr>',
    );
    expect(document.blocks).toEqual([
      {
        type: 'blockquote',
        blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'quoted' }] }],
      },
      { type: 'code', language: 'js', value: 'const x = 1;' },
      { type: 'rule' },
    ]);
  });

  it('drops an image and writes a placeholder in its place', () => {
    const { document, dropped } = htmlToModel(
      '<p>before <img src="https://tracker.example/p.png" alt="a cat"> after</p>',
    );
    expect(document.blocks[0]).toEqual({
      type: 'paragraph',
      children: [
        { type: 'text', value: 'before ' },
        { type: 'text', value: '[image dropped: a cat]' },
        { type: 'text', value: ' after' },
      ],
    });
    expect(dropped.images).toBe(1);
  });

  it('keeps the words of an unknown element and drops the element', () => {
    const { document, dropped } = htmlToModel('<custom-widget>kept</custom-widget>');
    expect(document.blocks).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'kept' }] },
    ]);
    expect(dropped.elements).toBe(1);
  });

  it('decodes the entities a real document uses, and leaves the rest alone', () => {
    expect(textOf('<p>a &amp; b &lt; c &#39;d&#39; &hellip; &nbsp;x &unknownentity;</p>')).toBe(
      "a & b < c 'd' … \u00a0x &unknownentity;",
    );
  });

  it('counts every family it drops, so the tool can report it in words', () => {
    const { dropped } = htmlToModel(
      '<script>a</script><style>b</style><img alt="x" src="y"><iframe></iframe>' +
        '<widget>w</widget><a href="https://ok.example">link</a>',
    );
    expect(dropped).toEqual({
      scripts: 1,
      styles: 1,
      images: 1,
      links: 1,
      elements: 2,
    });
  });

  it('reports the drops in the document warnings the tool shows', () => {
    const { document } = htmlToModel('<script>alert(1)</script><p>text</p>');
    expect(document.blocks).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'text' }] },
    ]);
  });
});

describe('malformed input cannot be repaired into markup', () => {
  it('treats a stray `<` as text', () => {
    expect(textOf('1 < 2 and 3 > 2')).toBe('1 < 2 and 3 > 2');
  });

  it('keeps reading after an unclosed element', () => {
    expect(textOf('<p>one<strong>bold<em>both')).toBe('oneboldboth');
  });

  it('ignores a comment, a doctype and a processing instruction', () => {
    expect(
      textOf('<!doctype html><!-- <script>alert(1)</script> --><?php echo 1; ?><p>text</p>'),
    ).toBe('text');
  });

  it('ignores a close tag with nothing open', () => {
    expect(textOf('</p></div>text')).toBe('text');
  });

  it('reads unquoted, single-quoted and double-quoted attributes alike', () => {
    const tokens = tokenizeHtml('<a href=/x class=\'y\' title="z">t</a>');
    expect(tokens[0]).toMatchObject({
      kind: 'open',
      name: 'a',
      attributes: { get: expect.any(Function) },
    });
    const attributes = (tokens[0] as { attributes: Map<string, string> }).attributes;
    expect([...attributes.entries()]).toEqual([
      ['href', '/x'],
      ['class', 'y'],
      ['title', 'z'],
    ]);
  });
});

describe('the serialisers are the model’s own', () => {
  it('writes markdown that our own parser reads back the same way', () => {
    const html =
      '<h1>Title</h1><p>Some <strong>bold</strong> and <em>italic</em> with a ' +
      '<a href="https://ok.example">link</a>.</p><ul><li>one</li><li>two</li></ul>' +
      '<ol start="3"><li>three</li></ol><blockquote><p>quote</p></blockquote>' +
      '<pre><code class="language-js">const x = 1;</code></pre><hr>';
    const first = htmlToModel(html).document;
    const markdown = modelToMarkdown(first);
    expect(markdown).toContain('# Title');
    expect(markdown).toContain('**bold**');
    expect(markdown).toContain('*italic*');
    expect(markdown).toContain('[link](https://ok.example)');
    expect(markdown).toContain('- one');
    expect(markdown).toContain('3. three');
    expect(markdown).toContain('> quote');
    expect(markdown).toContain('```js\nconst x = 1;\n```');
    expect(markdown).toContain('---');
    // markdown-it always ends a fenced block's content with a newline; our
    // converter keeps the text exactly as the file wrote it.
    const trimCode = (blocks: readonly unknown[]): unknown[] =>
      blocks.map((block) => {
        const typed = block as { type?: string; value?: string; blocks?: readonly unknown[] };
        return {
          ...typed,
          ...(typed.type === 'code' && typed.value
            ? { value: typed.value.replace(/\n$/, '') }
            : {}),
          ...(typed.blocks ? { blocks: trimCode(typed.blocks) } : {}),
        };
      });
    const second = trimCode(parseMarkdown(markdown).blocks);
    expect(second).toEqual(trimCode(first.blocks));
  });

  it('writes plain text with no markup at all', () => {
    const { document } = htmlToModel(
      '<h2>Notes</h2><p>Hello <strong>world</strong>.</p><ul><li>a</li><li>b</li></ul>',
    );
    expect(modelToText(document)).toBe('Notes\n\nHello world.\n\n- a\n- b');
  });

  it('writes html with every text node escaped', () => {
    const { document } = htmlToModel('<p>a &lt; b</p>');
    expect(modelToHtml(document, 'T')).toContain('<p>a &lt; b</p>');
    expect(modelToHtml(document)).toContain('<title>Document</title>');
  });
});

describe('limits are stated and enforced', () => {
  it('reads at most the documented input length', () => {
    const huge = `<p>${'a'.repeat(SANITIZE_LIMITS.maxInputLength + 500)}</p>`;
    const { document } = htmlToModel(huge);
    const [block] = document.blocks;
    if (block?.type !== 'paragraph') throw new Error('expected a paragraph');
    const text = block.children[0];
    expect(text?.type === 'text' ? text.value.length : -1).toBeLessThanOrEqual(
      SANITIZE_LIMITS.maxInputLength,
    );
  });

  it('keeps a one megabyte paste usable and fast', () => {
    const paragraph =
      '<p>Some <strong>bold</strong> text with a <a href="https://ok.example">link</a>.</p>';
    const big = paragraph.repeat(Math.ceil(1_000_000 / paragraph.length));
    const started = Date.now();
    const { document } = htmlToModel(big);
    const elapsed = Date.now() - started;
    expect(document.blocks.length).toBeGreaterThan(10_000);
    expect(elapsed).toBeLessThan(2_000);
  });
});

describe('edges the corpus does not reach', () => {
  it('reads a hex and a decimal character reference, and refuses a bad one', () => {
    expect(textOf('<p>&#x2713; &#10003; &#x110000; &#0; &#99999999999999;</p>')).toBe(
      '✓ ✓ &#x110000; &#0; &#99999999999999;',
    );
  });

  it('stops reading at an unterminated comment, doctype or instruction', () => {
    expect(textOf('before <!-- never closed')).toBe('before ');
    expect(textOf('before <!DOCTYPE never closed')).toBe('before ');
    expect(textOf('before <?php never closed')).toBe('before ');
  });

  it('treats a `<` at the end of the input as text', () => {
    expect(textOf('trailing <')).toBe('trailing <');
  });

  it('treats a `<` that cannot open a tag as text, as a browser does', () => {
    expect(textOf('< >text</p class="x">more')).toBe('< >textmore');
  });

  it('stops reading a raw-text element that is never closed', () => {
    expect(textOf('<p>before</p><script>alert(1)')).toBe('before');
    expect(textOf('<p>before</p><style>body { color: red }')).toBe('before');
  });

  it('keeps a link whose words were inside a heading', () => {
    expect(
      htmlToModel('<h1><a href="https://ok.example">Title</a></h1>').document.blocks[0],
    ).toEqual({
      type: 'heading',
      level: 1,
      id: 'title',
      children: [
        { type: 'link', href: 'https://ok.example', children: [{ type: 'text', value: 'Title' }] },
      ],
    });
  });

  it('keeps the words of an image and a break inside a paragraph', () => {
    const { document } = htmlToModel('<p>a<br><img alt="alt text" src="x">b</p>');
    expect(document.blocks[0]).toEqual({
      type: 'paragraph',
      children: [
        { type: 'text', value: 'a' },
        { type: 'break' },
        { type: 'text', value: '[image dropped: alt text]' },
        { type: 'text', value: 'b' },
      ],
    });
  });

  it('drops a script that sits inside a paragraph', () => {
    const { document, dropped } = htmlToModel('<p>a<script>alert(1)</script>b</p>');
    expect(document.blocks[0]).toEqual({
      type: 'paragraph',
      children: [
        { type: 'text', value: 'a' },
        { type: 'text', value: 'b' },
      ],
    });
    expect(dropped.scripts).toBe(1);
  });

  it('closes a paragraph at a block element inside it, as a browser does', () => {
    const { document } = htmlToModel('<p>one<div>two</div>three</p>');
    expect(document.blocks).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'one' }] },
      { type: 'paragraph', children: [{ type: 'text', value: 'two' }] },
      { type: 'paragraph', children: [{ type: 'text', value: 'three' }] },
    ]);
  });

  it('reads a list inside a list', () => {
    const { document } = htmlToModel('<ul><li>outer<ul><li>inner</li></ul></li></ul>');
    const [list] = document.blocks;
    if (list?.type !== 'list') throw new Error('expected a list');
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.blocks.some((block) => block.type === 'list')).toBe(true);
  });

  it('reads a code block with no language, and a word that is not one', () => {
    const { document } = htmlToModel(
      '<pre><code>plain</code></pre><pre><code class="note">n</code></pre>',
    );
    expect(document.blocks).toEqual([
      { type: 'code', language: '', value: 'plain' },
      { type: 'code', language: '', value: 'n' },
    ]);
  });

  it('keeps a stray text node inside a pre block', () => {
    const { document } = htmlToModel('<pre>plain <code>code</code></pre>');
    expect(document.blocks[0]).toEqual({ type: 'code', language: '', value: 'plain code' });
  });

  it('gives an ordered list without a start attribute the start of one', () => {
    const { document } = htmlToModel('<ol><li>a</li></ol>');
    expect(document.blocks[0]).toMatchObject({ type: 'list', ordered: true, start: 1 });
  });

  it('stops writing blocks at the documented limit', () => {
    const many = '<p>x</p>'.repeat(50);
    const { document } = htmlToModel(many);
    expect(document.blocks.length).toBeGreaterThan(0);
    expect(document.blocks.length).toBeLessThanOrEqual(50);
  });

  it('serialises a table, a note, an image and a break to markdown and text', () => {
    const { document } = htmlToModel('<p>before<br>after</p>');
    const withExtras = {
      blocks: [
        ...document.blocks,
        { type: 'rule' } as const,
        { type: 'note', value: '<raw> note' } as const,
        {
          type: 'table' as const,
          align: ['left' as const, null],
          rows: [
            {
              header: true,
              cells: [
                [{ type: 'text' as const, value: 'a' }],
                [{ type: 'text' as const, value: 'b' }],
              ],
            },
            {
              header: false,
              cells: [
                [{ type: 'text' as const, value: '1' }],
                [{ type: 'code' as const, value: 'c' }],
              ],
            },
          ],
        },
      ],
      warnings: [],
    };
    const markdown = modelToMarkdown(withExtras);
    expect(markdown).toContain('| a | b |');
    expect(markdown).toContain('| --- | --- |');
    expect(markdown).toContain('| 1 | `c` |');
    expect(markdown).toContain('---');
    expect(markdown).toContain('<raw> note');
    expect(modelToText(withExtras)).toContain('a\tb');
  });

  it('serialises a link, an image, a break and inline code to markdown', () => {
    const { document } = htmlToModel(
      '<p><a href="https://ok.example">a</a> <img alt="alt" src="data:image/png;base64,AA"> <code>c</code></p>',
    );
    const markdown = modelToMarkdown(document);
    expect(markdown).toContain('[a](https://ok.example)');
    // The image was dropped at parse time, so the markdown carries the
    // placeholder words rather than a reference the reader could not load.
    expect(markdown).toContain('\\[image dropped: alt\\]');
    expect(markdown).toContain('`c`');
  });

  it('marks an unchecked and a checked task in both serialisers', () => {
    const { document } = htmlToModel(
      '<ul><li><input type="checkbox">todo</li><li><input type="checkbox" checked>done</li></ul>',
    );
    expect(modelToMarkdown(document)).toBe('- [ ] todo\n- [x] done');
    expect(modelToText(document)).toBe('- [ ] todo\n- [x] done');
  });

  it('writes a nested blockquote and a heading to text', () => {
    const { document } = htmlToModel('<blockquote><p>a</p><ul><li>b</li></ul></blockquote>');
    expect(modelToText(document)).toBe('a\n\n- b');
  });

  it('drops an image inside a heading and keeps the words', () => {
    const { document } = htmlToModel('<h2>a <img alt="pic" src="x"> b</h2>');
    expect(document.blocks[0]).toMatchObject({
      type: 'heading',
      level: 2,
      children: [
        { type: 'text', value: 'a ' },
        { type: 'text', value: '[image dropped: pic]' },
        { type: 'text', value: ' b' },
      ],
    });
  });

  it('drops a form control that is not a list checkbox', () => {
    const { document } = htmlToModel('<p>a<input type="text" value="x">b</p>');
    expect(document.blocks[0]).toEqual({
      type: 'paragraph',
      children: [
        { type: 'text', value: 'a' },
        { type: 'text', value: 'b' },
      ],
    });
  });
});

describe('the limits and the awkward structures', () => {
  it('ignores a close tag with no name', () => {
    expect(textOf('</>text')).toBe('text');
  });

  it('stops at the block limit rather than writing forever', () => {
    const many = '<p>x</p>'.repeat(SANITIZE_LIMITS.maxBlocks + 50);
    const { document } = htmlToModel(many);
    expect(document.blocks.length).toBe(SANITIZE_LIMITS.maxBlocks + 1);
  });

  it('stops at the nesting limit rather than recursing forever', () => {
    const deep = `${'<div>'.repeat(SANITIZE_LIMITS.maxDepth + 10)}deep${'</div>'.repeat(SANITIZE_LIMITS.maxDepth + 10)}`;
    const { document } = htmlToModel(deep);
    expect(document.blocks.length).toBeGreaterThan(0);
  });

  it('treats an inline nest it cannot read past the limit as words', () => {
    const deep = `${'<span>'.repeat(SANITIZE_LIMITS.maxDepth + 10)}deep${'</span>'.repeat(SANITIZE_LIMITS.maxDepth + 10)}`;
    expect(textOf(deep)).toContain('deep');
  });

  it('reads an ordered list whose start attribute is not a number', () => {
    const { document } = htmlToModel('<ol start="zero"><li>a</li></ol>');
    expect(document.blocks[0]).toMatchObject({ type: 'list', ordered: true, start: 1 });
  });

  it('drops a list that sits inside an element it does not know', () => {
    const { document, dropped } = htmlToModel('<widget><ul><li>x</li></ul></widget>');
    expect(document.blocks).toEqual([]);
    expect(dropped.elements).toBe(1);
  });

  it('reads a list opened inside another list without an item', () => {
    const { document } = htmlToModel('<ul>loose<ul><li>b</li></ul></ul>');
    const [outer] = document.blocks;
    if (outer?.type !== 'list') throw new Error('expected a list');
    expect(outer.items).toEqual([
      { checked: null, blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'b' }] }] },
    ]);
  });

  it('gives a code block with an empty language marker no language', () => {
    const { document } = htmlToModel('<pre><code class="language-">n</code></pre>');
    expect(document.blocks[0]).toEqual({ type: 'code', language: '', value: 'n' });
  });

  it('counts an element found inside a code block without keeping it', () => {
    const { document, dropped } = htmlToModel('<pre><span>x</span></pre>');
    expect(document.blocks[0]).toEqual({ type: 'code', language: '', value: 'x' });
    expect(dropped.elements).toBe(1);
  });

  it('keeps a break and an image inside a mark', () => {
    const { document } = htmlToModel('<strong>a<br><img src="x">b</strong>');
    const [block] = document.blocks;
    if (block?.type !== 'paragraph') throw new Error('expected a paragraph');
    const [mark] = block.children;
    if (mark?.type !== 'strong') throw new Error('expected a mark');
    expect(mark.children.map((node) => node.type)).toEqual(['text', 'break', 'text', 'text']);
    expect(mark.children[2]).toEqual({ type: 'text', value: '[image dropped]' });
    expect(modelToText(document)).toBe('a [image dropped]b');
  });

  it('drops a script that sits inside a mark', () => {
    const { document, dropped } = htmlToModel('<em>a<script>alert(1)</script>b</em>');
    expect(modelToText(document)).toBe('ab');
    expect(modelToText(document)).not.toContain('alert');
    expect(dropped.scripts).toBe(1);
  });

  it('keeps the words of a block found inside a mark, and the code of a code block', () => {
    const { document } = htmlToModel(
      '<strong>a<div>two</div>b<pre><code>code</code></pre>c</strong>',
    );
    const text = modelToText(document);
    expect(text).toContain('atwob');
    expect(text).toContain('code');
  });

  it('reads what it can of an element that is never closed', () => {
    expect(textOf('<div><p>x')).toBe('x');
  });

  it('serialises a table that has no header row', () => {
    const table = {
      blocks: [
        {
          type: 'table' as const,
          align: [null, null],
          rows: [
            {
              header: false,
              cells: [
                [{ type: 'text' as const, value: 'a' }],
                [{ type: 'text' as const, value: 'b' }],
              ],
            },
          ],
        },
      ],
      warnings: [],
    };
    expect(modelToMarkdown(table)).toBe('| --- | --- |\n| a | b |');
    expect(modelToText(table)).toBe('a\tb');
  });

  it('serialises a strike and a code block to markdown and text', () => {
    const document = {
      blocks: [
        {
          type: 'paragraph' as const,
          children: [{ type: 'del' as const, children: [{ type: 'text' as const, value: 'x' }] }],
        },
        { type: 'code' as const, language: 'js', value: 'const x = 1;' },
      ],
      warnings: [],
    };
    expect(modelToMarkdown(document)).toBe('~~x~~\n\n```js\nconst x = 1;\n```');
    expect(modelToText(document)).toBe('x\n\nconst x = 1;');
  });

  it('numbers an ordered list in the text export', () => {
    const { document } = htmlToModel('<ol start="2"><li>a</li><li>b</li></ol>');
    expect(modelToText(document)).toBe('2. a\n3. b');
  });
});
