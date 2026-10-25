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
