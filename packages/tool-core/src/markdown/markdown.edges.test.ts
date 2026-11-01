import Markdown from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { markdownSlug, parseMarkdown, renderMarkdownHtml, safeHref } from './index';

/** The first block of a parse, for the assertions that only need one. */
function firstBlock(source: string) {
  const [block] = parseMarkdown(source).blocks;
  return block;
}

/**
 * Branches the happy-path tests never reach. Note what the parser does *not*
 * do: markdown-it refuses to turn `javascript:` into a link in the first place,
 * so an unsafe link arrives as literal text and `safeHref` is the second line
 * of defence rather than the first.
 */
describe('blocked images say so in words', () => {
  it('names the alt text it kept', () => {
    expect(firstBlock('![a cat](https://example.com/cat.png)')).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: '[image blocked: a cat]' }],
    });
  });

  it('does not leave an empty bracket when there is no alt text', () => {
    expect(firstBlock('![](https://example.com/cat.png)')).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: '[image blocked]' }],
    });
  });

  it('keeps a local data image as an image', () => {
    expect(firstBlock('![dot](data:image/png;base64,iVBORw0KGgo=)')).toEqual({
      type: 'paragraph',
      children: [{ type: 'image', src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'dot' }],
    });
  });

  it('keeps a blocked image’s words when it sits inside emphasis', () => {
    const block = firstBlock('*see ![a cat](https://example.com/cat.png)*');
    expect(block).toEqual({
      type: 'paragraph',
      children: [
        {
          type: 'em',
          children: [
            { type: 'text', value: 'see ' },
            { type: 'text', value: '[image blocked: a cat]' },
          ],
        },
      ],
    });
  });
});

describe('refusals happen before the model is built', () => {
  it('leaves an unsafe destination as written rather than as a link', () => {
    for (const source of [
      '[x](javascript:alert(1))',
      '[x](vbscript:msgbox)',
      '[x](data:text/html,hi)',
      '[x](file:///etc/passwd)',
    ]) {
      expect(firstBlock(source), source).toEqual({
        type: 'paragraph',
        children: [{ type: 'text', value: source }],
      });
    }
  });

  it('decodes an entity in the destination and still refuses it', () => {
    expect(firstBlock('[x](javascript&colon;alert(1))')).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: '[x](javascript:alert(1))' }],
    });
  });
});

describe('heading ids from awkward text', () => {
  it('falls back to a section id when the heading is only punctuation', () => {
    const block = firstBlock('### !!!');
    if (block?.type !== 'heading') throw new Error('not a heading');
    expect(block.id).toBe(markdownSlug(''));
    expect(block.id.length).toBeGreaterThan(0);
  });

  it('uses the blocked-image words when it builds the id', () => {
    const block = firstBlock('## ![cat](https://example.com/cat.png) notes');
    if (block?.type !== 'heading') throw new Error('not a heading');
    expect(block.id).toBe('image-blocked-cat-notes');
  });
});

describe('a heading reads its inline words', () => {
  it('takes the words out of emphasis, strikethrough and links for the id', () => {
    const block = firstBlock('## A *b* ~~c~~ [d](/x) and `e`');
    if (block?.type !== 'heading') throw new Error('not a heading');
    expect(block.id).toBe('a-b-c-d-and-e');
  });

  it('keeps an image out of the id but not out of the page', () => {
    const block = firstBlock('# ![dot](data:image/png;base64,iVBORw0KGgo=) here');
    if (block?.type !== 'heading') throw new Error('not a heading');
    expect(block.id).toBe('here');
    expect(block.children.some((node) => node.type === 'image')).toBe(true);
  });
});

describe('lists and their markers', () => {
  it('starts an ordered list where it says', () => {
    expect(firstBlock('3. third\n4. fourth')).toMatchObject({
      type: 'list',
      ordered: true,
      start: 3,
    });
  });
});

describe('the exported document stays escaped', () => {
  it('writes an unsafe destination as text, with no anchor', () => {
    const html = renderMarkdownHtml(parseMarkdown('[x](javascript:alert(1))'));
    expect(html).not.toContain('<a ');
    expect(html).toContain('[x](javascript:alert(1))');
  });

  it('never writes a blocked image as an img element', () => {
    const html = renderMarkdownHtml(parseMarkdown('![cat](https://example.com/cat.png)'));
    expect(html).not.toContain('<img');
    expect(html).toContain('[image blocked: cat]');
  });

  it('writes emphasis, code and a titled link from the model', () => {
    const html = renderMarkdownHtml(parseMarkdown('*em* **bold** `x<1` [a](/docs "Docs")'));
    expect(html).toContain('<em>em</em>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>x&lt;1</code>');
    expect(html).toContain('rel="noopener noreferrer" title="Docs"');
  });

  it('writes task-list checkboxes and a blockquote', () => {
    const html = renderMarkdownHtml(parseMarkdown('- [x] done\n- [ ] todo\n\n> quoted'));
    expect(html).toContain('<input type="checkbox" disabled checked>');
    expect(html).toContain('<input type="checkbox" disabled>');
    expect(html).toContain('<blockquote><p>quoted</p></blockquote>');
  });

  it('leaves the class off a code block that names no language', () => {
    const html = renderMarkdownHtml(parseMarkdown('```\nplain\n```'));
    expect(html).toContain('<pre><code>plain');
    expect(html).not.toContain('class="language-');
  });
});

describe('the shapes the parser really produces', () => {
  it('keeps strong text when a heading id is built', () => {
    const block = firstBlock('## A **b** thing');
    if (block?.type !== 'heading') throw new Error('not a heading');
    expect(block.id).toBe('a-b-thing');
    expect(block.children.some((node) => node.type === 'strong')).toBe(true);
  });

  it('refuses a data: link that markdown-it allows, keeping the words', () => {
    const source = '[buy now](data:image/png;base64,iVBORw0KGgo=)';
    const document = parseMarkdown(source);
    expect(document.blocks[0]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: 'buy now (link removed)' }],
    });
    expect(document.warnings).toEqual([
      'One link was removed because its address is not http, https or mailto.',
    ]);
  });

  it('does not invent words for a refused link with no text', () => {
    const document = parseMarkdown('[](data:image/png;base64,iVBORw0KGgo=)');
    expect(document.blocks[0]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: '' }],
    });
    expect(renderMarkdownHtml(document)).toContain('<p></p>');
    expect(document.warnings).toHaveLength(1);
  });

  it('counts several refused links into one plural warning', () => {
    const document = parseMarkdown(
      '[a](data:image/png;base64,AA)\n\n[b](data:image/png;base64,AA)',
    );
    expect(document.warnings).toEqual([
      '2 links were removed because their addresses are not http, https or mailto.',
    ]);
  });

  it('renders a list item that has nothing in it', () => {
    const html = renderMarkdownHtml(parseMarkdown('- \n- second'));
    expect(html).toContain('<ul><li></li><li><p>second</p></li></ul>');
  });

  it('keeps a task item whose only content is its checkbox', () => {
    const document = parseMarkdown('- [x] done\n- [ ] to do');
    const [list] = document.blocks;
    if (list?.type !== 'list') throw new Error('not a list');
    expect(list.items[0]?.checked).toBe(true);
    expect(list.items[1]?.checked).toBe(false);
    const html = renderMarkdownHtml(document);
    expect(html).toContain('<input type="checkbox" disabled checked>');
  });

  it('gives a link no title attribute when it has no title', () => {
    const html = renderMarkdownHtml(parseMarkdown('[plain](/docs) and **bold**'));
    expect(html).toContain('<a href="/docs" rel="noopener noreferrer">plain</a>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders a hard break and a soft break differently', () => {
    const [soft] = parseMarkdown('line one\nline two').blocks;
    expect(soft).toMatchObject({
      type: 'paragraph',
      children: [
        { type: 'text', value: 'line one' },
        { type: 'text', value: ' ' },
        { type: 'text', value: 'line two' },
      ],
    });
    const [hard] = parseMarkdown('line one  \nline two').blocks;
    expect(hard).toMatchObject({
      type: 'paragraph',
      children: [
        { type: 'text', value: 'line one' },
        { type: 'break' },
        { type: 'text', value: 'line two' },
      ],
    });
    expect(renderMarkdownHtml(parseMarkdown('line one  \nline two'))).toContain('<br>');
  });

  it('keeps an indented code block and gives it no language', () => {
    const [block] = parseMarkdown('    const x = 1;').blocks;
    expect(block).toEqual({ type: 'code', language: '', value: 'const x = 1;\n' });
    expect(renderMarkdownHtml(parseMarkdown('    const x = 1;'))).toContain('<pre><code>');
  });

  it('renders a header-only table with an empty body', () => {
    const html = renderMarkdownHtml(parseMarkdown('| a | b |\n| --- | --- |'));
    expect(html).toContain(
      '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody></tbody></table>',
    );
  });

  it('renders alignment from the marker row', () => {
    const html = renderMarkdownHtml(parseMarkdown('| a | b |\n| :-- | --: |\n| 1 | 2 |'));
    expect(html).toContain('<th style="text-align:left">a</th>');
    expect(html).toContain('<td style="text-align:right">2</td>');
  });

  it('handles a blockquote that contains a list', () => {
    const html = renderMarkdownHtml(parseMarkdown('> quoted\n> - item'));
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<p>quoted</p>');
    expect(html).toContain('<ul><li><p>item</p></li></ul></blockquote>');
  });

  it('starts an ordered list at the number it was given', () => {
    const html = renderMarkdownHtml(parseMarkdown('10. ten\n11. eleven'));
    expect(html).toContain('<ol start="10">');
  });
});

describe('a setext heading is level one or two, never a hash count', () => {
  it('reads `=` as level 1 and `-` as level 2', () => {
    const [level1] = parseMarkdown('Title\n===').blocks;
    expect(level1).toMatchObject({ type: 'heading', level: 1, id: 'title' });
    const [level2] = parseMarkdown('Title\n---').blocks;
    expect(level2).toMatchObject({ type: 'heading', level: 2, id: 'title' });
    const html = renderMarkdownHtml(parseMarkdown('Title\n---'));
    expect(html).toContain('<h2 id="title">Title</h2>');
  });
});

/**
 * One payload per family of attack, shared by the corpus above and the token
 * inventory below.
 */
const payloads: readonly string[] = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<IMG SRC=x ONERROR=alert(1)>',
  '[click](javascript:alert(1))',
  '[click](JaVaScRiPt:alert(1))',
  '[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
  '[click](vbscript:msgbox)',
  '[click](file:///etc/passwd)',
  '<svg><script>alert(1)</script></svg>',
  '<svg onload=alert(1)>',
  '<iframe src="https://evil.example"></iframe>',
  '<style>body{background:url(https://evil.example/x)}</style>',
  '<meta http-equiv="refresh" content="0;url=https://evil.example">',
  '<div onmouseover="alert(1)">hover</div>',
  '<a href="javascript:alert(1)">x</a>',
  '<form action="https://evil.example"><input name="q"></form>',
  '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="></object>',
  '<embed src="https://evil.example/x">',
  '<base href="https://evil.example/">',
  '![x](https://evil.example/pixel.png)',
  '<a href="https://evil.example" target="_blank">same tab</a>',
  '&lt;script&gt;alert(1)&lt;/script&gt;',
  '[x](https://evil.example) <script>alert(1)</script>',
  '# heading <img src=x onerror=alert(1)>',
];

describe('the XSS corpus stays inert through the parser and the export', () => {
  it('never turns a payload into markup, in the model or the export', () => {
    /** The only elements the export may ever write: the document shell plus the model's own tags. */
    const allowedElements = new Set([
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
    const allowedAttributes =
      /^(?:\s+(?:href|rel|title|src|alt|id|type|disabled|checked|start|style|class|lang|charset|name|content)(?:="[^"]*")?)*\s*$/;
    const tag = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    for (const payload of payloads) {
      const document = parseMarkdown(payload);
      const html = renderMarkdownHtml(document, payload);
      for (const match of html.matchAll(tag)) {
        const [, name = '', attributes = ''] = match;
        expect(allowedElements.has(name.toLowerCase()), `${payload} → <${name}${attributes}>`).toBe(
          true,
        );
        expect(attributes, `${payload} → <${name}${attributes}>`).toMatch(allowedAttributes);
      }
      // And no link or image in the export points anywhere a reader could be sent.
      expect(html, payload).not.toMatch(/href="(javascript|data:text|vbscript|file):/i);
      expect(html, payload).not.toMatch(/src="(https?:)?\/\//i);
      // And the model holds only the node types the union allows.
      const seen = new Set<string>();
      const walk = (nodes: readonly unknown[]) => {
        for (const node of nodes) {
          const typed = node as { type?: string; children?: readonly unknown[] };
          if (typed.type) seen.add(typed.type);
          if (typed.children) walk(typed.children);
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
            'note',
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
    }
  });

  it('leaves the title of the export escaped too', () => {
    const html = renderMarkdownHtml(parseMarkdown('# ok'), '"><script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

/**
 * Why some branches in `index.ts` cannot be reached, and why the file's per-file
 * branch floor is lower than 90.
 *
 * `index.ts` converts markdown-it's token stream into the model. With the
 * parser's options fixed (`html: false`, `linkify: false`, `typographer: false`,
 * `breaks: false`), markdown-it 15.0.3 emits exactly the token types below —
 * checked over every construct the tests and the XSS corpus use. The branches
 * that remain uncovered in `index.ts` all belong to token types it never emits
 * (raw HTML, a stray inline token, a token with no href or src) or to opening
 * and closing a tag that markdown-it always balances itself, so no document a
 * reader can type reaches them. They are defence against a token stream that
 * this configuration cannot produce, and they are named in
 * `docs/implementation/IMPLEMENTATION.md` §9 rather than covered by a test that
 * fabricates tokens, which would prove only that the branch executes.
 */
describe('the token vocabulary is the one the converter knows', () => {
  it('emits no token type outside the converter’s switch', () => {
    const known = new Set([
      'paragraph_open',
      'paragraph_close',
      'heading_open',
      'heading_close',
      'inline',
      'blockquote_open',
      'blockquote_close',
      'bullet_list_open',
      'bullet_list_close',
      'ordered_list_open',
      'ordered_list_close',
      'list_item_open',
      'list_item_close',
      'fence',
      'code_block',
      'hr',
      'table_open',
      'table_close',
      'thead_open',
      'thead_close',
      'tbody_open',
      'tbody_close',
      'tr_open',
      'tr_close',
      'th_open',
      'th_close',
      'td_open',
      'td_close',
      'text',
      'code_inline',
      'softbreak',
      'hardbreak',
      'strong_open',
      'strong_close',
      'em_open',
      'em_close',
      's_open',
      's_close',
      'link_open',
      'link_close',
      'image',
    ]);
    const sources = [
      '# Heading',
      '## Heading',
      'Title\n===',
      'Title\n---',
      'paragraph',
      'a\nb',
      'a  \nb',
      '> quote',
      '> - item',
      '- item',
      '- [x] done',
      '1. one',
      '```js\ncode\n```',
      '```\ncode\n```',
      '    indented',
      '---',
      '| a | b |\n| :-- | --: |\n| 1 | 2 |',
      '| a |\n|---|',
      'a **b** *c* ~~d~~ `e` [f](/x "t") ![g](data:image/png;base64,AA)',
      ...payloads,
    ];
    const seen = new Set<string>();
    const parser = new Markdown({ html: false, linkify: false, typographer: false, breaks: false });
    for (const source of sources) {
      for (const token of parser.parse(source, {})) {
        seen.add(token.type);
        for (const child of token.children ?? []) seen.add(child.type);
      }
    }
    for (const type of seen) expect([...known], type).toContain(type);
    // A few that are only reachable with options this project never turns on.
    expect([...seen].some((type) => type.startsWith('html_'))).toBe(false);
    expect(seen.has('entity')).toBe(false);
  });
});

describe('safeHref decides by scheme', () => {
  it('accepts the three allowed protocols, relative paths and fragments', () => {
    for (const href of [
      'http://a.example',
      'https://a.example',
      'mailto:a@b.example',
      '/docs',
      '#top',
      '//a.example/x',
    ]) {
      expect(safeHref(href), href).not.toBeNull();
    }
  });

  it('refuses a scheme it does not know, and empty input', () => {
    for (const href of [
      'javascript:alert(1)',
      'data:text/html,<script>',
      'vbscript:x',
      'file:///etc/passwd',
      '',
      '   ',
    ]) {
      expect(safeHref(href), href).toBeNull();
    }
  });
});
