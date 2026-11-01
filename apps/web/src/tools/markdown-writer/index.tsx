import {
  type BlockNode,
  countText,
  type InlineNode,
  type MarkdownDocument,
  parseMarkdown,
  renderMarkdownHtml,
  safeHref,
  safeImageSrc,
} from '@omnitool/tool-core';
import { DownloadIcon } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { downloadText } from '@/lib/download';
import { requireTool } from '@/lib/tool';

const DEFAULT_TEXT = '';

/**
 * The preview renders at most this many blocks. A 1 MB document parses in about
 * 310 ms but has ~28,000 blocks; handing that to React would freeze the page.
 * The downloads are built from the whole tree, not this slice.
 */
const MAX_PREVIEW_BLOCKS = 400;

const DEBOUNCE_MS = 150;

function inlineToReact(nodes: readonly InlineNode[], prefix = 'i'): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${prefix}-${index}`;
    switch (node.type) {
      case 'text':
        return node.value;
      case 'strong':
        return <strong key={key}>{inlineToReact(node.children, key)}</strong>;
      case 'em':
        return <em key={key}>{inlineToReact(node.children, key)}</em>;
      case 'del':
        return <del key={key}>{inlineToReact(node.children, key)}</del>;
      case 'code':
        return (
          <code key={key} className="rounded bg-surface-inset px-1 py-0.5 font-mono text-sm">
            {node.value}
          </code>
        );
      case 'break':
        return <br key={key} />;
      case 'link':
        // The parser has already checked the destination, and it is checked
        // again here: the DOM is the boundary where a bad href would bite.
        return (
          <a
            key={key}
            href={safeHref(node.href) ?? '#'}
            title={node.title}
            rel="noopener noreferrer"
            target="_blank"
            className="underline underline-offset-4"
          >
            {inlineToReact(node.children, key)}
          </a>
        );
      case 'image': {
        // A remote image would be a third-party request; only an inline data
        // image survives the check.
        const src = safeImageSrc(node.src);
        if (src === null) return null;
        return (
          <img
            key={key}
            // url-check: checked-above — both values come from safeImageSrc above
            src={src}
            alt={node.alt}
            className="max-w-full rounded-control border border-border"
          />
        );
      }
      default:
        return null;
    }
  });
}

function blocksToReact(blocks: readonly BlockNode[], prefix = 'b'): ReactNode[] {
  return blocks.map((block, index) => {
    const key = `${prefix}-${index}`;
    switch (block.type) {
      case 'heading': {
        const Tag = `h${Math.min(6, Math.max(1, block.level))}` as 'h1';
        return (
          <Tag key={key} id={block.id} className="mt-6 mb-2 text-xl font-semibold first:mt-0">
            {inlineToReact(block.children, key)}
          </Tag>
        );
      }
      case 'paragraph':
        return (
          <p key={key} className="my-3 leading-relaxed">
            {inlineToReact(block.children, key)}
          </p>
        );
      case 'blockquote':
        return (
          <blockquote
            key={key}
            className="my-3 border-l-2 border-border-strong pl-4 text-muted-foreground"
          >
            {blocksToReact(block.blocks, key)}
          </blockquote>
        );
      case 'list': {
        const Tag = block.ordered ? 'ol' : 'ul';
        return (
          <Tag
            key={key}
            start={block.ordered ? block.start : undefined}
            className={block.ordered ? 'my-3 list-decimal pl-6' : 'my-3 list-disc pl-6'}
          >
            {block.items.map((item, itemIndex) => (
              // Order is the identity of a list item; there is no other stable key.
              // biome-ignore lint/suspicious/noArrayIndexKey: document order is the identity
              <li key={`${key}-${itemIndex}`} className="my-1">
                {item.checked === null ? null : (
                  <input
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                    className="mr-2 align-middle"
                    aria-label={item.checked ? 'Done' : 'Not done'}
                  />
                )}
                {blocksToReact(item.blocks, `${key}-${itemIndex}`)}
              </li>
            ))}
          </Tag>
        );
      }
      case 'code':
        return (
          <pre
            key={key}
            className="my-3 overflow-x-auto rounded-control border border-border bg-surface-inset p-3"
          >
            <code className="font-mono text-sm">{block.value}</code>
          </pre>
        );
      case 'table':
        return (
          <table key={key} className="my-3 w-full border-collapse text-sm">
            <tbody>
              {block.rows.map((row, rowIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: document order is the identity
                <tr key={`${key}-${rowIndex}`} className="border-b border-border">
                  {row.cells.map((cell, cellIndex) => {
                    const Cell = row.header ? 'th' : 'td';
                    return (
                      <Cell
                        // biome-ignore lint/suspicious/noArrayIndexKey: document order is the identity
                        key={`${key}-${rowIndex}-${cellIndex}`}
                        style={
                          block.align[cellIndex]
                            ? { textAlign: block.align[cellIndex] as 'left' | 'center' | 'right' }
                            : undefined
                        }
                        className="py-2 pr-4 text-left"
                      >
                        {inlineToReact(cell, `${key}-${rowIndex}-${cellIndex}`)}
                      </Cell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'rule':
        return <hr key={key} className="my-6 border-border" />;
      case 'note':
        return (
          <pre
            key={key}
            className="my-3 overflow-x-auto rounded-control border border-border bg-surface-inset p-3 font-mono text-sm text-muted-foreground"
          >
            {block.value}
          </pre>
        );
      default:
        return null;
    }
  });
}

function firstHeading(document: MarkdownDocument): string {
  for (const block of document.blocks) {
    if (block.type === 'heading') {
      const text = block.children
        .map((node) => (node.type === 'text' ? node.value : ''))
        .join('')
        .trim();
      if (text !== '') return text;
    }
  }
  return 'Untitled';
}

export default function MarkdownWriterTool() {
  const tool = requireTool('markdown-writer');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [document, setDocument] = useState<MarkdownDocument>({ blocks: [], warnings: [] });
  const [pending, setPending] = useState(false);
  const [pane, setPane] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Parsing is debounced: a 1 MB paste regroups once after typing settles, so
  // the textarea never waits for markdown-it.
  useEffect(() => {
    setPending(true);
    const timer = setTimeout(() => {
      setDocument(parseMarkdown(text));
      setPending(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const stats = useMemo(() => countText(text), [text]);

  function reset() {
    setText(DEFAULT_TEXT);
    setPane('write');
  }

  function surround(prefix: string, suffix = prefix, placeholder = 'text') {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd) || placeholder;
    const next = `${value.slice(0, selectionStart)}${prefix}${selected}${suffix}${value.slice(selectionEnd)}`;
    setText(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectionStart + prefix.length,
        selectionStart + prefix.length + selected.length,
      );
    });
  }

  function prefixLines(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const lineEnd = value.indexOf('\n', selectionEnd);
    const end = lineEnd === -1 ? value.length : lineEnd;
    const block = value.slice(lineStart, end);
    const updated = block
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');
    setText(`${value.slice(0, lineStart)}${updated}${value.slice(end)}`);
    requestAnimationFrame(() => textarea.focus());
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      surround('**');
    } else if (key === 'i') {
      event.preventDefault();
      surround('*');
    } else if (key === 'k') {
      event.preventDefault();
      surround('[', '](https://)', 'link text');
    }
  }

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => downloadText(text, 'notes.md', 'text/markdown')}
      >
        <DownloadIcon aria-hidden="true" className="size-4" />
        Download .md
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          downloadText(
            renderMarkdownHtml(document, firstHeading(document)),
            'notes.html',
            'text/html',
          )
        }
      >
        <DownloadIcon aria-hidden="true" className="size-4" />
        Download HTML
      </Button>
    </>
  );

  return (
    <ToolFrame tool={tool} onReset={reset} actions={actions}>
      <ToolStage title="Write">
        <div className="mb-3 flex flex-wrap gap-2" role="toolbar" aria-label="Formatting">
          <Button type="button" variant="outline" onClick={() => surround('**')}>
            Bold
          </Button>
          <Button type="button" variant="outline" onClick={() => surround('*')}>
            Italic
          </Button>
          <Button type="button" variant="outline" onClick={() => surround('`')}>
            Code
          </Button>
          <Button type="button" variant="outline" onClick={() => prefixLines('## ')}>
            Heading
          </Button>
          <Button type="button" variant="outline" onClick={() => prefixLines('- ')}>
            List
          </Button>
          <Button type="button" variant="outline" onClick={() => prefixLines('- [ ] ')}>
            Task
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => surround('[', '](https://)', 'link text')}
          >
            Link
          </Button>
        </div>

        <fieldset className="mb-3 flex gap-2 border-0 p-0 md:hidden">
          <legend className="sr-only">Pane</legend>
          <Button
            type="button"
            variant={pane === 'write' ? 'secondary' : 'outline'}
            aria-pressed={pane === 'write'}
            onClick={() => setPane('write')}
          >
            Write
          </Button>
          <Button
            type="button"
            variant={pane === 'preview' ? 'secondary' : 'outline'}
            aria-pressed={pane === 'preview'}
            onClick={() => setPane('preview')}
          >
            Preview
          </Button>
        </fieldset>

        <div className="grid gap-4 md:grid-cols-2">
          <div className={pane === 'preview' ? 'max-md:hidden' : undefined}>
            <Label htmlFor="markdown-input">Markdown</Label>
            <TextArea
              id="markdown-input"
              ref={textareaRef}
              className="mt-2 min-h-72 font-mono"
              rows={16}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
            />
          </div>
          <div className={pane === 'write' ? 'max-md:hidden' : undefined}>
            <p className="text-sm font-medium" id="markdown-preview-label">
              Preview
            </p>
            <section
              aria-labelledby="markdown-preview-label"
              aria-busy={pending}
              className="mt-2 min-h-72 overflow-x-auto rounded-control border border-border bg-surface p-4"
            >
              {document.blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing to preview yet. The preview updates as you type.
                </p>
              ) : (
                <>
                  {blocksToReact(document.blocks.slice(0, MAX_PREVIEW_BLOCKS))}
                  {document.blocks.length > MAX_PREVIEW_BLOCKS ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {`Showing the first ${MAX_PREVIEW_BLOCKS} of ${document.blocks.length.toLocaleString('en-GB')} blocks to keep the page responsive. The downloads include all of it.`}
                    </p>
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>

        {document.warnings.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground" aria-live="polite">
            {document.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}

        <p className="mt-3 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
          <span>{`${stats.words.toLocaleString('en-GB')} words`}</span>
          <span>{`${stats.characters.toLocaleString('en-GB')} characters`}</span>
          <span>{`about ${Math.max(1, Math.round(stats.readingMinutes))} min to read`}</span>
        </p>

        <ToolHint>
          The preview is built from a syntax tree, never from an HTML string: raw HTML in your text
          shows as characters, links keep only http, https and mailto addresses, and images must be
          local data you pasted, so nothing is fetched from another site. Headings get ids made from
          their own text. Tables, task lists and strikethrough are supported; the export uses the
          same tree, with escaped text.
        </ToolHint>
      </ToolStage>
    </ToolFrame>
  );
}
