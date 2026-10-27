import { describe, expect, it } from 'vitest';
import {
  convertDocument,
  DOC_ACCEPTED_EXTENSIONS,
  DOC_INPUTS,
  DOC_OUTPUTS,
  describeDropped,
  documentTitle,
  FILE_INPUT_LIMIT,
  formatForFilename,
  outputFilename,
  outputLabel,
  outputMime,
  renderDocument,
  TEXT_INPUT_LIMIT,
  textToDocument,
} from './index';

describe('textToDocument', () => {
  it('makes a paragraph of each block of text separated by a blank line', () => {
    const document = textToDocument('First paragraph.\n\nSecond paragraph.');
    expect(document.blocks).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'First paragraph.' }] },
      { type: 'paragraph', children: [{ type: 'text', value: 'Second paragraph.' }] },
    ]);
  });

  it('keeps a single newline as a line break inside a paragraph', () => {
    const document = textToDocument('one\ntwo');
    expect(document.blocks).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'one' },
          { type: 'break' },
          { type: 'text', value: 'two' },
        ],
      },
    ]);
  });

  it('treats the text as text, never as markup', () => {
    const document = textToDocument(
      '<script>alert(1)</script>\n\n# not a heading\n\n[not a link](javascript:x)',
    );
    expect(document.blocks.every((block) => block.type === 'paragraph')).toBe(true);
    expect(JSON.stringify(document)).not.toContain('"href"');
    expect(JSON.stringify(document)).toContain('script');
  });

  it('normalises the line endings a Windows editor writes', () => {
    const document = textToDocument('one\r\ntwo\r\n\r\nthree');
    const values = JSON.stringify(document);
    expect(values).not.toContain('\\r');
    expect(document.blocks).toHaveLength(2);
  });

  it('ignores blank lines at the edges and gives an empty document for nothing', () => {
    expect(textToDocument('   \n\n  \n').blocks).toEqual([]);
    expect(textToDocument('').blocks).toEqual([]);
    expect(textToDocument('\n\n').blocks).toEqual([]);
  });

  it('refuses to read past the input limit and says so', () => {
    const long = `${'a'.repeat(2_000_000)}\n\nafter the limit`;
    const document = textToDocument(long);
    expect(document.warnings).toHaveLength(1);
    expect(document.warnings[0]).toMatch(/characters/i);
  });
});

describe('the formats the tool offers', () => {
  it('accepts exactly the extensions DEC-85 and DEC-86 allow', () => {
    expect(DOC_ACCEPTED_EXTENSIONS).toEqual(['.md', '.markdown', '.html', '.htm', '.txt', '.docx']);
  });

  it('offers three outputs, each with its own file and MIME type', () => {
    expect(DOC_OUTPUTS.map((output) => [output.format, output.extension, output.mime])).toEqual([
      ['markdown', 'md', 'text/markdown'],
      ['html', 'html', 'text/html'],
      ['text', 'txt', 'text/plain'],
    ]);
  });

  it('says what each input does, including that Word files lose their images', () => {
    const docx = DOC_INPUTS.find((input) => input.format === 'docx');
    expect(docx?.label).toBe('Word document');
    expect(docx?.hint).toMatch(/images are dropped/i);
  });

  it('reads the input format from a filename, whatever its case', () => {
    expect(formatForFilename('notes.md')).toBe('markdown');
    expect(formatForFilename('notes.MARKDOWN')).toBe('markdown');
    expect(formatForFilename('letter.docx')).toBe('docx');
    expect(formatForFilename('page.htm')).toBe('html');
    expect(formatForFilename('plain.txt')).toBe('text');
  });

  it('returns null for a file it cannot read, rather than guessing', () => {
    expect(formatForFilename('paper.pdf')).toBeNull();
    expect(formatForFilename('README')).toBeNull();
    expect(formatForFilename('archive.tar.gz')).toBeNull();
    expect(formatForFilename('notes.md.txt.bak')).toBeNull();
  });

  it('keeps the file input limit at the zip guard’s limit', () => {
    expect(FILE_INPUT_LIMIT).toBe(20 * 1024 * 1024);
    expect(TEXT_INPUT_LIMIT).toBe(2_000_000);
  });
});

describe('convertDocument', () => {
  it('parses Markdown into headings, lists and links', () => {
    const { document, warnings } = convertDocument({
      format: 'markdown',
      text: '# Title\n\n- one\n- two\n\n[site](https://example.com)',
    });
    expect(warnings).toEqual([]);
    expect(document.blocks.map((block) => block.type)).toEqual(['heading', 'list', 'paragraph']);
  });

  it('refuses a Markdown link to an unsupported scheme', () => {
    const { document } = convertDocument({
      format: 'markdown',
      text: '[click](javascript:alert(1))',
    });
    // The words stay, as text: a refused destination is never made into a link.
    expect(JSON.stringify(document)).not.toContain('"type":"link"');
    expect(JSON.stringify(document)).toContain('click');
  });

  it('converts HTML through the sanitiser and counts what it dropped', () => {
    const { document, warnings } = convertDocument({
      format: 'html',
      text: '<h1>Report</h1><script>alert(1)</script><p>Kept <em>words</em>.</p>',
    });
    expect(document.blocks[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(JSON.stringify(document)).not.toContain('alert(1)');
    expect(warnings).toEqual(['1 script removed.']);
  });

  it('names each kind of removed content in its own sentence', () => {
    const { warnings } = convertDocument({
      format: 'html',
      text: [
        '<style>p{color:red}</style>',
        '<script>a()</script><script>b()</script>',
        '<img src="https://example.com/x.png">',
        '<p>Text</p>',
      ].join(''),
    });
    expect(warnings).toEqual([
      '2 scripts removed.',
      '1 style element removed.',
      '1 image removed.',
    ]);
  });

  it('keeps an entity-encoded script out of the document', () => {
    const { document } = convertDocument({
      format: 'html',
      text: '<a href="&#106;avascript:alert(1)">click</a>',
    });
    expect(JSON.stringify(document)).not.toContain('javascript');
  });

  it('does not report anything for clean HTML', () => {
    const { warnings } = convertDocument({
      format: 'html',
      text: '<h2>Title</h2><p>One <strong>bold</strong> paragraph.</p>',
    });
    expect(warnings).toEqual([]);
  });

  it('keeps a text file as text even when it looks like markup', () => {
    const { document, warnings } = convertDocument({
      format: 'text',
      text: '# not a heading\n\n<script>alert(1)</script>',
    });
    expect(warnings).toEqual([]);
    expect(document.blocks.every((block) => block.type === 'paragraph')).toBe(true);
  });
});

describe('describeDropped', () => {
  it('says nothing when nothing was dropped', () => {
    expect(describeDropped({ scripts: 0, styles: 0, images: 0, links: 0, elements: 0 })).toEqual(
      [],
    );
  });

  it('counts in the singular and the plural', () => {
    expect(describeDropped({ scripts: 1, styles: 0, images: 2, links: 0, elements: 0 })).toEqual([
      '1 script removed.',
      '2 images removed.',
    ]);
  });

  it('names an unsafe link and an unknown element separately', () => {
    expect(describeDropped({ scripts: 0, styles: 0, images: 0, links: 1, elements: 3 })).toEqual([
      '1 link with an unsupported address removed.',
      '3 elements that are not converted removed.',
    ]);
  });
});

describe('renderDocument', () => {
  const { document } = convertDocument({
    format: 'markdown',
    text: '# Title\n\nOne paragraph with **bold** words.',
  });

  it('writes Markdown, escaping the characters that could become markup', () => {
    expect(renderDocument(document, 'markdown')).toBe(
      '# Title\n\nOne paragraph with **bold** words\\.',
    );
  });

  it('writes a standalone HTML document with the given title', () => {
    const html = renderDocument(document, 'html', 'My document');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>My document</title>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).not.toContain('<script');
  });

  it('writes plain text with no markup at all', () => {
    expect(renderDocument(document, 'text')).toBe('Title\n\nOne paragraph with bold words.');
  });

  it('escapes text that only looks like markup, in every format', () => {
    const attack = convertDocument({ format: 'text', text: '<script>alert(1)</script>' }).document;
    expect(renderDocument(attack, 'html')).not.toContain('<script>alert');
    expect(renderDocument(attack, 'markdown')).toContain('\\<script\\>');
    expect(renderDocument(attack, 'text')).toBe('<script>alert(1)</script>');
  });

  it('escapes the title it is given', () => {
    expect(renderDocument(document, 'html', '<b>bold</b>')).toContain(
      '<title>&lt;b&gt;bold&lt;/b&gt;</title>',
    );
  });
});

describe('documentTitle', () => {
  it('uses the first heading', () => {
    const { document } = convertDocument({ format: 'markdown', text: '# Field notes\n\nBody.' });
    expect(documentTitle(document)).toBe('Field notes');
  });

  it('reads through emphasis and links in the heading', () => {
    const { document } = convertDocument({
      format: 'markdown',
      text: '## A **bold** [link](https://example.com)',
    });
    expect(documentTitle(document)).toBe('A bold link');
  });

  it('falls back when there is no heading, or it has no words', () => {
    expect(documentTitle(convertDocument({ format: 'text', text: 'plain' }).document)).toBe(
      'Document',
    );
    expect(
      documentTitle(convertDocument({ format: 'markdown', text: '# ' }).document, 'notes.md'),
    ).toBe('notes.md');
  });
});

describe('the output file', () => {
  it('takes the name of the input and the extension of the output', () => {
    expect(outputFilename('report.docx', 'markdown')).toBe('report.md');
    expect(outputFilename('notes.md', 'html')).toBe('notes.html');
    expect(outputFilename('page.html', 'text')).toBe('page.txt');
  });

  it('falls back to a name when the input has none', () => {
    expect(outputFilename('', 'markdown')).toBe('document.md');
    expect(outputFilename('   ', 'text')).toBe('document.txt');
  });

  it('names the MIME type and the label of each output', () => {
    expect(outputMime('markdown')).toBe('text/markdown');
    expect(outputMime('html')).toBe('text/html');
    expect(outputMime('text')).toBe('text/plain');
    expect(outputLabel('html')).toBe('HTML');
  });
});
