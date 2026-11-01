import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  type InlineNode,
  markdownSlug,
  parseMarkdown,
  renderMarkdownHtml,
  safeHref,
} from './index';

describe('block kinds', () => {
  it('keeps a blockquote and its inner blocks', () => {
    const document = parseMarkdown('> quoted words\n>\n> - and a list');
    const quote = document.blocks[0];
    expect(quote?.type).toBe('blockquote');
    if (quote?.type !== 'blockquote') throw new Error('expected a blockquote');
    expect(quote.blocks.map((block) => block.type)).toEqual(['paragraph', 'list']);
    expect(renderMarkdownHtml(document)).toContain('<blockquote>');
  });

  it('keeps a thematic break as a rule', () => {
    const document = parseMarkdown('above\n\n---\n\nbelow');
    expect(document.blocks.map((block) => block.type)).toEqual(['paragraph', 'rule', 'paragraph']);
    expect(renderMarkdownHtml(document)).toContain('<hr>');
  });

  it('keeps an indented code block, which has no language', () => {
    const document = parseMarkdown('    const a = 1;\n    const b = 2;');
    expect(document.blocks[0]).toEqual({
      type: 'code',
      language: '',
      value: 'const a = 1;\nconst b = 2;\n',
    });
    expect(renderMarkdownHtml(document)).toContain('<pre><code>const a = 1;');
  });

  it('distinguishes bullet and ordered lists and keeps an ordered list’s start', () => {
    const bullets = parseMarkdown('- one\n- two');
    expect(bullets.blocks[0]).toMatchObject({ type: 'list', ordered: false, start: 1 });
    expect(renderMarkdownHtml(bullets)).toContain('<ul><li><p>one</p></li>');

    const numbered = parseMarkdown('3. three\n4. four');
    expect(numbered.blocks[0]).toMatchObject({ type: 'list', ordered: true, start: 3 });
    expect(renderMarkdownHtml(numbered)).toContain('<ol start="3">');
  });

  it('marks an unticked task as unchecked and a ticked one as checked', () => {
    const document = parseMarkdown('- [ ] todo\n- [x] done\n- plain');
    const list = document.blocks[0];
    if (list?.type !== 'list') throw new Error('expected a list');
    expect(list.items.map((item) => item.checked)).toEqual([false, true, null]);

    const html = renderMarkdownHtml(document);
    expect(html).toContain('<input type="checkbox" disabled>');
    expect(html).toContain('<input type="checkbox" disabled checked>');
    expect(html).toContain('<li><p>plain</p></li>');
  });

  it('treats a bare marker with no text after it as ordinary text', () => {
    // The marker only counts as a checkbox when a space and some words follow
    // it; `- [ ]` on its own is just a bracket in a sentence.
    const list = parseMarkdown('- [ ]').blocks[0];
    if (list?.type !== 'list') throw new Error('expected a list');
    expect(list.items[0]?.checked).toBeNull();
    expect(list.items[0]?.blocks[0]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: '[ ]' }],
    });
  });

  it('nests a list and a quote inside a list item', () => {
    const document = parseMarkdown('- outer\n  - inner\n  - inner two\n- second');
    const list = document.blocks[0];
    if (list?.type !== 'list') throw new Error('expected a list');
    expect(list.items).toHaveLength(2);
    const nested = list.items[0]?.blocks.find((block) => block.type === 'list');
    expect(nested?.type).toBe('list');
    if (nested?.type !== 'list') throw new Error('expected a nested list');
    expect(nested.items).toHaveLength(2);

    const quoted = parseMarkdown('- item\n\n  > quoted inside the item');
    const html = renderMarkdownHtml(quoted);
    expect(html).toContain('<blockquote>');
  });

  it('keeps a table’s alignment for each column', () => {
    const document = parseMarkdown(
      '| left | centre | right | plain |\n|:-----|:------:|------:|-------|\n| a | b | c | d |',
    );
    const table = document.blocks[0];
    if (table?.type !== 'table') throw new Error('expected a table');
    expect(table.align).toEqual(['left', 'center', 'right', null]);
    expect(table.rows[0]?.header).toBe(true);
    expect(renderMarkdownHtml(document)).toContain('<th style="text-align:center">');
    expect(renderMarkdownHtml(document)).toContain('<td>d</td>');
  });

  it('keeps a raw HTML block as text, never as a note or markup', () => {
    const document = parseMarkdown('<div class="x">hello</div>');
    expect(document.blocks.map((block) => block.type)).toEqual(['paragraph']);
    const html = renderMarkdownHtml(document);
    expect(html).toContain('&lt;div class=&quot;x&quot;&gt;hello&lt;/div&gt;');
    expect(html).not.toContain('<div class="x">');
  });

  it('gives repeated headings distinct ids', () => {
    const document = parseMarkdown('# Notes\n\n## Notes\n\n## Notes');
    expect(document.blocks.map((block) => (block.type === 'heading' ? block.id : ''))).toEqual([
      'notes',
      'notes-2',
      'notes-3',
    ]);
  });

  it('falls back to a section id when a heading has no letters or digits', () => {
    expect(markdownSlug('***')).toBe('section');
    expect(markdownSlug('  Café  ')).toBe('cafe');
  });
});

describe('inline kinds', () => {
  it('keeps a hard break as a break and a soft break as a space', () => {
    const document = parseMarkdown('one  \ntwo\nthree');
    expect(renderMarkdownHtml(document)).toContain('<br>');
    const children = document.blocks[0];
    if (children?.type !== 'paragraph') throw new Error('expected a paragraph');
    expect(children.children.some((node) => node.type === 'text' && node.value === ' ')).toBe(true);
  });

  it('keeps strikethrough as a del node', () => {
    const document = parseMarkdown('~~gone~~');
    const paragraph = document.blocks[0];
    if (paragraph?.type !== 'paragraph') throw new Error('expected a paragraph');
    expect(paragraph.children[0]).toEqual({
      type: 'del',
      children: [{ type: 'text', value: 'gone' }],
    });
    expect(renderMarkdownHtml(document)).toContain('<del>gone</del>');
  });

  it('keeps a link title and renders it escaped', () => {
    const document = parseMarkdown('[docs](https://example.com "the <title>")');
    expect(renderMarkdownHtml(document)).toContain(
      '<a href="https://example.com" rel="noopener noreferrer" title="the &lt;title&gt;">',
    );
  });

  it('keeps a protocol-relative address as it is', () => {
    expect(safeHref('//example.com/x')).toBe('//example.com/x');
    expect(safeHref('   ')).toBeNull();
    expect(safeHref('mailto:a@example.com')).toBe('mailto:a@example.com');
    expect(safeHref('javascript:alert(1)')).toBeNull();
  });

  it('drops a link whose address is not allowed, keeping its words', () => {
    // markdown-it refuses javascript: outright and leaves the source as text;
    // an address it does accept, but the tool does not, is removed here.
    const document = parseMarkdown('[click](ftp://example.com/file)');
    const paragraph = document.blocks[0];
    if (paragraph?.type !== 'paragraph') throw new Error('expected a paragraph');
    expect(paragraph.children).toEqual([{ type: 'text', value: 'click (link removed)' }]);
    expect(document.warnings).toEqual([
      'One link was removed because its address is not http, https or mailto.',
    ]);
  });
});

describe('the exported document', () => {
  it('renders an image only when it is local data', () => {
    const local: InlineNode = {
      type: 'image',
      src: 'data:image/png;base64,AAAA',
      alt: 'dot',
    };
    const remote: InlineNode = { type: 'image', src: 'https://example.com/a.png', alt: 'a <b>' };
    const html = renderMarkdownHtml({
      blocks: [{ type: 'paragraph', children: [local, remote] }],
      warnings: [],
    });
    expect(html).toContain('<img src="data:image/png;base64,AAAA" alt="dot">');
    expect(html).toContain('a &lt;b&gt;');
    expect(html).not.toContain('example.com/a.png');
  });

  it('drops a link that had to be refused at export time', () => {
    const html = renderMarkdownHtml({
      blocks: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              href: 'javascript:alert(1)',
              children: [{ type: 'text', value: 'no' }],
            },
          ],
        },
      ],
      warnings: [],
    });
    expect(html).toContain('<p>no</p>');
    expect(html).not.toContain('javascript:');
  });

  it('reports blocked images and removed links as single or plural notices', () => {
    const one = parseMarkdown('![a](https://example.com/a.png) [x](ftp://example.com)');
    expect(one.warnings).toEqual([
      'One image was blocked: only images you added as local data are shown.',
      'One link was removed because its address is not http, https or mailto.',
    ]);

    const many = parseMarkdown(
      '![a](https://example.com/a.png) ![b](https://example.com/b.png) [x](ftp://example.com/x) [y](ftp://example.com/y)',
    );
    expect(many.warnings).toEqual([
      '2 images were blocked: only images you added as local are shown.',
      '2 links were removed because their addresses are not http, https or mailto.',
    ]);
  });

  it('keeps a blocked image’s alt text, or says it had none', () => {
    const withAlt = parseMarkdown('![a picture](https://example.com/a.png)');
    expect(withAlt.blocks[0]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: '[image blocked: a picture]' }],
    });
    const withoutAlt = parseMarkdown('![](https://example.com/a.png)');
    expect(withoutAlt.blocks[0]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: '[image blocked]' }],
    });
  });

  it('escapes the five characters that matter', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
