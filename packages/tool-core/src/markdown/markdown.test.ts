import { describe, expect, it } from 'vitest';
import {
  type BlockNode,
  escapeHtml,
  type InlineNode,
  MAX_MARKDOWN_LENGTH,
  markdownSlug,
  parseMarkdown,
  renderMarkdownHtml,
  safeHref,
} from './index';

function plainText(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text' || node.type === 'code') return node.value;
      if (node.type === 'image') return node.alt;
      if ('children' in node) return plainText(node.children);
      return '';
    })
    .join('');
}

function allInline(blocks: readonly BlockNode[]): InlineNode[] {
  return blocks.flatMap((block) => {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
        return block.children;
      case 'blockquote':
        return allInline(block.blocks);
      case 'list':
        return block.items.flatMap((item) => allInline(item.blocks));
      case 'table':
        return block.rows.flatMap((row) => row.cells.flat());
      default:
        return [];
    }
  });
}

describe('parseMarkdown', () => {
  it('builds headings with ids from their text', () => {
    const document = parseMarkdown('# Hello, World!\n\n## Hello, World!');
    const headings = document.blocks.filter((block) => block.type === 'heading');
    expect(headings).toHaveLength(2);
    expect(headings[0]).toMatchObject({ level: 1, id: 'hello-world' });
    expect(headings[1]).toMatchObject({ level: 2, id: 'hello-world-2' });
  });

  it('keeps emphasis, code, links and inline code as nodes', () => {
    const document = parseMarkdown('A **bold** and *quick* `code` [link](https://example.com/x).');
    const text = allInline(document.blocks);
    expect(text.some((node) => node.type === 'strong')).toBe(true);
    expect(text.some((node) => node.type === 'em')).toBe(true);
    expect(text.some((node) => node.type === 'code')).toBe(true);
    const link = text.find((node) => node.type === 'link');
    expect(link && 'href' in link ? link.href : null).toBe('https://example.com/x');
  });

  it('supports tables with alignment', () => {
    const document = parseMarkdown('| a | b |\n|:--|--:|\n| 1 | 2 |');
    const table = document.blocks.find((block) => block.type === 'table');
    expect(table).toBeDefined();
    if (table?.type !== 'table') throw new Error('no table');
    expect(table.align).toEqual(['left', 'right']);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]?.header).toBe(true);
    expect(table.rows[1]?.cells.map(plainText)).toEqual(['1', '2']);
  });

  it('supports strikethrough and ordered lists', () => {
    const document = parseMarkdown('~~gone~~\n\n3. three\n4. four');
    const text = allInline(document.blocks);
    expect(text.some((node) => node.type === 'del')).toBe(true);
    const list = document.blocks.find((block) => block.type === 'list');
    expect(list?.type === 'list' ? list.items.length : 0).toBe(2);
    expect(list?.type === 'list' ? list.start : 0).toBe(3);
  });

  it('marks task list items and strips the marker from the text', () => {
    const document = parseMarkdown('- [x] done\n- [ ] todo');
    const list = document.blocks.find((block) => block.type === 'list');
    if (list?.type !== 'list') throw new Error('no list');
    expect(list.items.map((item) => item.checked)).toEqual([true, false]);
    const first = list.items[0]?.blocks[0];
    expect(first?.type === 'paragraph' ? plainText(first.children) : '').toBe('done');
  });

  it('keeps fenced code and its language', () => {
    const document = parseMarkdown('```ts\nconst x = 1 < 2;\n```');
    const code = document.blocks.find((block) => block.type === 'code');
    expect(code).toMatchObject({ type: 'code', language: 'ts', value: 'const x = 1 < 2;\n' });
  });

  it('returns nothing for empty input and a warning for oversized input', () => {
    expect(parseMarkdown('   ').blocks).toEqual([]);
    const huge = 'a'.repeat(MAX_MARKDOWN_LENGTH + 1);
    expect(parseMarkdown(huge).warnings.join(' ')).toContain('was not rendered');
  });

  it('keeps the same output for the same input', () => {
    const source = '# Title\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |';
    expect(parseMarkdown(source)).toEqual(parseMarkdown(source));
  });
});

describe('links and images', () => {
  it('allows http, https and mailto only', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref('http://example.com')).toBe('http://example.com');
    expect(safeHref('mailto:a@example.com')).toBe('mailto:a@example.com');
    expect(safeHref('/relative/path')).toBe('/relative/path');
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
    expect(safeHref('vbscript:msgbox')).toBeNull();
  });

  it('never turns an unsafe destination into a link', () => {
    const document = parseMarkdown('[click](javascript:alert(1))');
    const link = allInline(document.blocks).find((node) => node.type === 'link');
    expect(link).toBeUndefined();
    expect(renderMarkdownHtml(document)).not.toContain('<a ');
  });

  it('keeps a local data image and blocks a remote one', () => {
    const local = parseMarkdown('![pixel](data:image/png;base64,iVBORw0KGgo=)');
    expect(allInline(local.blocks).some((node) => node.type === 'image')).toBe(true);

    const remote = parseMarkdown('![tracker](https://example.com/pixel.png)');
    expect(remote.warnings.join(' ')).toContain('image was blocked');
    expect(allInline(remote.blocks).some((node) => node.type === 'image')).toBe(false);
    expect(renderMarkdownHtml(remote)).not.toContain('<img');
  });

  it('blocks an SVG data URI, which can carry script', () => {
    const document = parseMarkdown('![x](data:image/svg+xml;base64,PHN2Zz4=)');
    expect(allInline(document.blocks).some((node) => node.type === 'image')).toBe(false);
    expect(renderMarkdownHtml(document)).not.toContain('<img');
  });
});

describe('raw HTML is text', () => {
  const corpus = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<iframe src="https://example.com"></iframe>',
    '<svg onload="alert(1)"></svg>',
    '<a href="javascript:alert(1)">x</a>',
    '<style>body{background:url(https://example.com/x)}</style>',
    '<div onclick="alert(1)">click</div>',
    '<!-- comment -->',
    '<object data="data:text/html,<script>alert(1)</script>"></object>',
    '<math><mtext><script>alert(1)</script></mtext></math>',
    '<script>alert(1)</script>\n\n# Heading\n\n**bold**',
    '[![a](https://example.com/x.png)](javascript:alert(1))',
    '![x](data:image/png;base64,iVBORw0KGgo= "title") \n\n<script>alert(2)</script>',
    '[text](java&#115;cript:alert(1))',
    '[text](JAVASCRIPT:alert(1))',
    '<a href="jav&#x09;ascript:alert(1)">tab</a>',
  ];

  const allowedTags = new Set([
    '!doctype',
    'html',
    'head',
    'meta',
    'title',
    'body',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'blockquote',
    'ul',
    'ol',
    'li',
    'pre',
    'code',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
    'a',
    'strong',
    'em',
    'del',
    'img',
    'input',
    'br',
  ]);

  for (const payload of corpus) {
    it(`renders inert text for ${payload.slice(0, 40)}`, () => {
      const document = parseMarkdown(payload);
      const html = renderMarkdownHtml(document);

      // Only tags this module can emit may appear. That is the real property:
      // a payload may survive as escaped text, but never as markup.
      for (const match of html.matchAll(/<(\/?)([a-z!][a-z0-9-]*)/gi)) {
        expect(allowedTags.has((match[2] ?? '').toLowerCase())).toBe(true);
      }
      // No tag may carry an event handler, and no href or src may use a scheme
      // outside the allow-list. Escaped text is allowed to mention them.
      for (const [tag] of html.matchAll(/<[^>]+>/g)) {
        expect(tag).not.toMatch(/\son[a-z]+\s*=/i);
        expect(tag).not.toMatch(/href="\s*(?:javascript|vbscript|data):/i);
        expect(tag).not.toMatch(/src="(?!data:image\/(?:png|jpeg|gif|webp))/i);
      }

      if (payload.startsWith('<')) expect(html).toContain('&lt;');
    });
  }

  it('escapes every character that matters', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('renderMarkdownHtml', () => {
  it('writes a document with headings, lists, tables and the notices', () => {
    const document = parseMarkdown(
      '# Title\n\n- one\n\n| a |\n|---|\n| 1 |\n\n![x](https://e.com/x.png)',
    );
    const html = renderMarkdownHtml(document, 'Test');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Test</title>');
    expect(html).toContain('<h1 id="title">Title</h1>');
    expect(html).toContain('<li><p>one</p></li>');
    expect(html).toContain('<thead>');
    expect(html).toContain('image was blocked');
    expect(html).not.toContain('<script');
  });

  it('renders task list checkboxes as disabled inputs', () => {
    const html = renderMarkdownHtml(parseMarkdown('- [x] done'));
    expect(html).toContain('type="checkbox" disabled checked');
  });

  it('escapes the title', () => {
    expect(renderMarkdownHtml({ blocks: [], warnings: [] }, '<script>')).toContain(
      '<title>&lt;script&gt;</title>',
    );
  });
});

describe('markdownSlug', () => {
  it('makes readable ids and never returns an empty one', () => {
    expect(markdownSlug('Hello World')).toBe('hello-world');
    expect(markdownSlug('Café — résumé')).toBe('cafe-resume');
    expect(markdownSlug('???')).toBe('section');
  });
});
