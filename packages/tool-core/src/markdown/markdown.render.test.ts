import { describe, expect, it } from 'vitest';
import { type MarkdownDocument, renderMarkdownHtml } from './index';

/**
 * The HTML export is a public function that takes a document, not a string, so
 * it can be handed shapes the parser would never build: a list with no state, a
 * table with no header, a node type that does not exist. Each of those is a
 * caller's mistake rather than an attacker's payload, and the export must
 * answer with markup it is happy to stand behind rather than crash or leak a
 * half-built tag.
 */

function render(blocks: readonly unknown[], warnings: readonly string[] = []): string {
  return renderMarkdownHtml({ blocks, warnings } as MarkdownDocument);
}

function bodyOf(html: string): string {
  return html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
}

describe('the HTML export', () => {
  it('writes a document with no warnings and no notices', () => {
    const html = render([{ type: 'paragraph', children: [{ type: 'text', value: 'hello' }] }]);
    expect(bodyOf(html).trim()).toBe('<p>hello</p>');
    expect(html).not.toContain('<ul>');
  });

  it('lists one warning and then several, each escaped', () => {
    const one = render([], ['One <b>link</b> was removed']);
    expect(one).toContain('<ul><li>One &lt;b&gt;link&lt;/b&gt; was removed</li></ul>');

    const many = render([], ['first', 'second']);
    expect(many).toContain('<li>first</li><li>second</li>');
  });

  it('renders a list with every state a caller may pass', () => {
    const html = render([
      {
        type: 'list',
        ordered: false,
        start: 1,
        items: [
          {
            checked: null,
            blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'plain' }] }],
          },
        ],
      },
      {
        type: 'list',
        ordered: true,
        start: 1,
        items: [
          {
            checked: true,
            blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'done' }] }],
          },
        ],
      },
      {
        type: 'list',
        ordered: true,
        start: 4,
        items: [
          {
            checked: false,
            blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'todo' }] }],
          },
        ],
      },
      { type: 'list', ordered: true, start: 1, items: [{ checked: null, blocks: [] }] },
    ]);
    expect(html).toContain('<ul><li><p>plain</p></li></ul>');
    expect(html).toContain('start="4"');
    expect(html).toContain('<input type="checkbox" disabled checked> ');
    expect(html).toContain('<input type="checkbox" disabled> ');
    // An item with no blocks is still an item, not a collapsed tag.
    expect(html).toContain('<li></li>');
  });

  it('renders a table with a header, without one, and with alignment', () => {
    const withHeader = render([
      {
        type: 'table',
        align: ['left', null],
        rows: [
          { header: true, cells: [[{ type: 'text', value: 'a' }], [{ type: 'text', value: 'b' }]] },
          {
            header: false,
            cells: [[{ type: 'text', value: '1' }], [{ type: 'text', value: '2' }]],
          },
        ],
      },
    ]);
    expect(withHeader).toContain(
      '<thead><tr><th style="text-align:left">a</th><th>b</th></tr></thead>',
    );
    expect(withHeader).toContain('<td style="text-align:left">1</td><td>2</td>');

    const noHeader = render([
      {
        type: 'table',
        align: [null],
        rows: [{ header: false, cells: [[{ type: 'text', value: 'only' }]] }],
      },
    ]);
    expect(noHeader).not.toContain('<thead>');
    expect(noHeader).toContain('<td>only</td>');
  });

  it('renders a code block with and without a language', () => {
    expect(render([{ type: 'code', language: 'ts', value: 'const a = 1;' }])).toContain(
      '<pre><code class="language-ts">const a = 1;</code></pre>',
    );
    expect(render([{ type: 'code', language: '', value: 'plain' }])).toContain(
      '<pre><code>plain</code></pre>',
    );
  });

  it('renders a heading with its id, a rule, a quote and a note', () => {
    const html = render([
      {
        type: 'heading',
        level: 3,
        id: 'a-heading',
        children: [{ type: 'text', value: 'A heading' }],
      },
      { type: 'rule' },
      {
        type: 'blockquote',
        blocks: [{ type: 'paragraph', children: [{ type: 'text', value: 'quoted' }] }],
      },
      { type: 'note', value: '<div>raw</div>' },
    ]);
    expect(html).toContain('<h3 id="a-heading">A heading</h3>');
    expect(html).toContain('<hr>');
    expect(html).toContain('<blockquote><p>quoted</p></blockquote>');
    // Raw HTML is escaped text, never a tag.
    expect(html).toContain('<pre>&lt;div&gt;raw&lt;/div&gt;</pre>');
  });

  it('renders every inline form the model has', () => {
    const html = render([
      {
        type: 'paragraph',
        children: [
          { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
          { type: 'em', children: [{ type: 'text', value: 'italic' }] },
          { type: 'del', children: [{ type: 'text', value: 'gone' }] },
          { type: 'code', value: 'code' },
          { type: 'break' },
          { type: 'image', src: 'data:image/png;base64,AAAA', alt: 'pixel' },
          { type: 'image', src: 'https://example.com/x.png', alt: 'blocked' },
          {
            type: 'link',
            href: 'https://example.com',
            title: 't',
            children: [{ type: 'text', value: 'click' }],
          },
          {
            type: 'link',
            href: 'javascript:alert(1)',
            children: [{ type: 'text', value: 'refused' }],
          },
        ],
      },
    ]);
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<del>gone</del>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<br>');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    // A remote image is not written out; only its words remain.
    expect(html).not.toContain('https://example.com/x.png');
    expect(html).toContain('blocked');
    expect(html).toContain('title="t"');
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('refused');
  });

  it('answers an unknown node type with nothing rather than a broken tag', () => {
    const html = render([
      { type: 'paragraph', children: [{ type: 'footnote', value: 'x' }] },
      { type: 'aside', blocks: [] },
    ]);
    expect(bodyOf(html).trim()).toBe('<p></p>');
    expect(html).not.toContain('<aside');
    expect(html).not.toContain('footnote');
  });
});
