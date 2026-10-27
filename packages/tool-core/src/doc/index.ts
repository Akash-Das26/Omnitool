/**
 * Text in, one document model, three formats out.
 *
 * The converter accepts Markdown, HTML and plain text, and it accepts them as
 * three different things. Markdown is parsed by the Markdown parser, HTML by the
 * sanitiser, and plain text by this module — deliberately not by either of the
 * others. A line that begins with `#` in a text file is a line beginning with
 * `#`, not a heading, and `[words](https://example.com)` is the text a reader
 * typed rather than a link they meant to make. Word documents arrive as HTML
 * from `mammoth` in a worker, so from here on they are HTML like any other.
 *
 * Everything ends in `markdown/index.ts`'s document model, which is what makes
 * three outputs possible from three inputs without six converters: the model is
 * plain data, and each writer escapes its own character set. Nothing here
 * builds a DOM, and no output is produced by string-concatenating the input.
 */

import {
  escapeHtml,
  type InlineNode,
  type MarkdownDocument,
  parseMarkdown,
} from '../markdown/index';
import {
  type DropCounts,
  htmlToModel,
  modelToHtml,
  modelToMarkdown,
  modelToText,
} from '../sanitize/index';
import { ZIP_LIMITS } from '../zip/index';

/** The three formats that arrive as text. Word arrives as HTML from a worker. */
export type DocInputFormat = 'markdown' | 'html' | 'text';

/** What a document can be written back out as. */
export type DocOutputFormat = 'markdown' | 'html' | 'text';

export interface DocInput {
  readonly format: DocInputFormat;
  readonly text: string;
}

export interface DocConversion {
  readonly document: MarkdownDocument;
  /** Things the reader should know about, in the order they were found. */
  readonly warnings: readonly string[];
}

/** How each input is labelled and which files it accepts. */
export const DOC_INPUTS: readonly {
  readonly format: DocInputFormat | 'docx';
  readonly label: string;
  readonly extensions: readonly string[];
  readonly hint: string;
}[] = Object.freeze([
  {
    format: 'markdown',
    label: 'Markdown',
    extensions: ['.md', '.markdown'],
    hint: 'Headings, lists, links and emphasis are read as Markdown.',
  },
  {
    format: 'html',
    label: 'HTML',
    extensions: ['.html', '.htm'],
    hint: 'Scripts, styles, images and unknown elements are removed and counted.',
  },
  {
    format: 'text',
    label: 'Plain text',
    extensions: ['.txt'],
    hint: 'Every character is kept as text: nothing in a text file becomes markup.',
  },
  {
    format: 'docx',
    label: 'Word document',
    extensions: ['.docx'],
    hint: 'Read in your browser and converted to HTML first. Images are dropped.',
  },
]);

/** How each output is labelled, and the file it downloads as. */
export const DOC_OUTPUTS: readonly {
  readonly format: DocOutputFormat;
  readonly label: string;
  readonly extension: string;
  readonly mime: string;
}[] = Object.freeze([
  { format: 'markdown', label: 'Markdown', extension: 'md', mime: 'text/markdown' },
  { format: 'html', label: 'HTML', extension: 'html', mime: 'text/html' },
  { format: 'text', label: 'Plain text', extension: 'txt', mime: 'text/plain' },
]);

/** Every extension the tool accepts, for the file picker. */
export const DOC_ACCEPTED_EXTENSIONS: readonly string[] = Object.freeze(
  DOC_INPUTS.flatMap((input) => input.extensions),
);

/** Characters of text read in one go; the rest is refused, not cut silently. */
export const TEXT_INPUT_LIMIT = 2_000_000;

/**
 * Bytes of any document file read in one go. This is the zip guard's input
 * limit (DEC-86), applied to every format so a text file cannot be larger than
 * the archive the same tool will unpack.
 */
export const FILE_INPUT_LIMIT = ZIP_LIMITS.maxInputBytes;

/** The input format a filename names, or null when it names none we read. */
export function formatForFilename(filename: string): DocInputFormat | 'docx' | null {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return null;
  const extension = filename.slice(dot).toLowerCase();
  const input = DOC_INPUTS.find((entry) => entry.extensions.includes(extension));
  return input ? input.format : null;
}

/** One paragraph: its lines, joined by the line-break node the model keeps. */
function paragraphBlock(paragraph: string): { type: 'paragraph'; children: InlineNode[] } {
  const children: InlineNode[] = [];
  paragraph.split('\n').forEach((line, index) => {
    if (index > 0) children.push({ type: 'break' });
    if (line !== '') children.push({ type: 'text', value: line });
  });
  return { type: 'paragraph', children };
}

/** Turns plain text into a document of paragraphs, keeping every character as text. */
export function textToDocument(text: string): MarkdownDocument {
  const warnings: string[] = [];
  let source = text;
  if (source.length > TEXT_INPUT_LIMIT) {
    source = source.slice(0, TEXT_INPUT_LIMIT);
    warnings.push(
      `Only the first ${TEXT_INPUT_LIMIT.toLocaleString('en-GB')} characters of that text were read.`,
    );
  }

  const blocks = source
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim() !== '')
    .map(paragraphBlock);

  return { blocks, warnings };
}

/**
 * What an HTML conversion removed, in sentences.
 *
 * The sanitiser counts what it dropped and says nothing about it, because a
 * count on its own means nothing to a reader. These are the sentences: they say
 * what went, in words a reader can check against the document they supplied.
 */
export function describeDropped(dropped: DropCounts): string[] {
  const sentences: string[] = [];
  const count = (value: number, one: string, many: string): void => {
    if (value > 0) {
      sentences.push(`${value.toLocaleString('en-GB')} ${value === 1 ? one : many} removed.`);
    }
  };
  count(dropped.scripts, 'script', 'scripts');
  count(dropped.styles, 'style element', 'style elements');
  count(dropped.images, 'image', 'images');
  count(dropped.links, 'link with an unsupported address', 'links with unsupported addresses');
  count(dropped.elements, 'element that is not converted', 'elements that are not converted');
  return sentences;
}

/**
 * Converts any of the three text formats into the shared model, with the
 * warnings the reader needs in order to trust the output: what the converter
 * dropped, and what was too long to read.
 */
export function convertDocument(input: DocInput): DocConversion {
  switch (input.format) {
    case 'markdown': {
      const document = parseMarkdown(input.text);
      return { document, warnings: [...document.warnings] };
    }
    case 'html': {
      const { document, dropped } = htmlToModel(input.text);
      return { document, warnings: [...describeDropped(dropped), ...document.warnings] };
    }
    case 'text':
      return { document: textToDocument(input.text), warnings: [] };
  }
}

/** Writes the document out in one of the three formats. */
export function renderDocument(
  document: MarkdownDocument,
  format: DocOutputFormat,
  title = 'Document',
): string {
  switch (format) {
    case 'markdown':
      return modelToMarkdown(document);
    case 'html':
      return modelToHtml(document, title);
    case 'text':
      return modelToText(document);
  }
}

/**
 * A title for the exported HTML: the document's own first heading, or the name
 * of the file it came from. Plain text — `modelToHtml` escapes it when it
 * writes it.
 */
export function documentTitle(document: MarkdownDocument, fallback = 'Document'): string {
  const heading = document.blocks.find((block) => block.type === 'heading');
  if (heading?.type !== 'heading') return fallback;
  const words = heading.children
    .map((child) => {
      if (child.type === 'text' || child.type === 'code') return child.value;
      if (child.type === 'strong' || child.type === 'em' || child.type === 'link') {
        return child.children.map((inner) => (inner.type === 'text' ? inner.value : '')).join('');
      }
      return '';
    })
    .join('')
    .trim();
  return words === '' ? fallback : words;
}

/** The file a download of this output takes. */
export function outputFilename(name: string, format: DocOutputFormat): string {
  const base = name.replace(/\.[^./\\]+$/, '').trim() || 'document';
  const output = DOC_OUTPUTS.find((entry) => entry.format === format);
  return `${base}.${output?.extension ?? 'txt'}`;
}

/** The MIME type a copied or downloaded output is given. */
export function outputMime(format: DocOutputFormat): string {
  return DOC_OUTPUTS.find((entry) => entry.format === format)?.mime ?? 'text/plain';
}

/** The label shown for an output format. */
export function outputLabel(format: DocOutputFormat): string {
  return DOC_OUTPUTS.find((entry) => entry.format === format)?.label ?? 'Plain text';
}

/**
 * Exported so callers that only need the escape do not import the parser; the
 * HTML writer escapes every text node with this same function.
 */
export { escapeHtml };
