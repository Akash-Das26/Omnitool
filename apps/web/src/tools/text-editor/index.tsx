import { parseMarkdown } from '@omnitool/tool-core/markdown';
import { htmlToModel } from '@omnitool/tool-core/sanitize';
import { baseKeymap } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import type { Command } from 'prosemirror-state';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileIntake } from '@/components/file-intake';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadText } from '@/lib/download';
import { requireTool } from '@/lib/tool';
import { clearDraft, loadDraft, saveDraft } from './draft';
import {
  buildPastePlugin,
  buildTaskListPlugin,
  commands,
  documentFromModel,
  editorSchema,
  exportsFor,
  findMatches,
  PASTE_LIMIT,
  redoCommand,
  replaceAll,
  replaceMatch,
  selectMatch,
  undoCommand,
} from './model';

const tool = requireTool('text-editor');

function node(name: string) {
  const found = editorSchema.nodes[name];
  if (!found) throw new Error(`the schema has no node called ${name}`);
  return found;
}

interface ToolButton {
  readonly id: string;
  readonly label: string;
  readonly shortcut: string;
  readonly command: Command;
}

export default function TextEditorTool() {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  const [counts, setCounts] = useState({ words: 0, characters: 0 });
  const [pasteNote, setPasteNote] = useState('');
  const [status, setStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [openStatus, setOpenStatus] = useState('');
  const [revision, setRevision] = useState(0);

  /**
   * A file opened here replaces the document. Markdown and plain text go
   * through our parser, HTML through the sanitiser, so neither path builds a
   * page from what the file contains.
   */
  const openDocument = useCallback(async (file: File) => {
    const limit = PASTE_LIMIT.toLocaleString('en-GB');
    if (file.size > PASTE_LIMIT) {
      setOpenStatus(`That file is larger than ${limit} bytes, so it was not opened.`);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setOpenStatus(`“${file.name}” could not be read.`);
      return;
    }
    if (text.length > PASTE_LIMIT) {
      setOpenStatus(`That file is longer than ${limit} characters, so it was not opened.`);
      return;
    }
    const isHtml = file.type === 'text/html' || file.name.toLowerCase().endsWith('.html');
    const model = isHtml ? htmlToModel(text).document : parseMarkdown(text);
    const editor = view.current;
    if (!editor) return;
    editor.dispatch(
      editor.state.tr
        .replaceWith(0, editor.state.doc.content.size, documentFromModel(model))
        .scrollIntoView(),
    );
    setOpenStatus(`Opened “${file.name}”.`);
    editor.focus();
  }, []);

  const apply = useCallback((command: Command) => {
    const editor = view.current;
    if (!editor) return;
    command(editor.state, editor.dispatch, editor);
  }, []);

  useEffect(() => {
    if (!host.current) return;
    const paste = buildPastePlugin((report) => {
      if (report.truncated) {
        setPasteNote(
          `Pasted as plain text: the paste was longer than ${PASTE_LIMIT.toLocaleString('en-GB')} characters, so the rest was dropped.`,
        );
        return;
      }
      const dropped = [
        report.scripts > 0 ? `${report.scripts} script(s)` : '',
        report.images > 0 ? `${report.images} image(s)` : '',
        report.links > 0 ? `${report.links} link(s)` : '',
        report.elements > 0 ? `${report.elements} other element(s)` : '',
      ].filter((part) => part !== '');
      setPasteNote(
        dropped.length === 0
          ? 'Pasted, with nothing removed.'
          : `Pasted. Removed: ${dropped.join(', ')}.`,
      );
    }, openDocument);
    const docType = node('doc');
    const editor = new EditorView(host.current, {
      // The editable element itself is the textbox, so the name belongs on it.
      attributes: { role: 'textbox', 'aria-label': 'Document', 'aria-multiline': 'true' },
      state: EditorState.create({
        schema: editorSchema,
        doc: docType.createAndFill() ?? docType.create(),
        plugins: [
          history(),
          keymap({
            'Mod-z': undoCommand,
            'Mod-y': redoCommand,
            'Mod-Shift-z': redoCommand,
            'Mod-b': commands.bold,
            'Mod-i': commands.italic,
            'Mod-u': commands.underline,
            'Mod-Shift-x': commands.strike,
            'Mod-e': commands.code,
            Enter: commands.splitListItem,
          }),
          keymap(baseKeymap),
          paste,
          buildTaskListPlugin(),
        ],
      }),
      dispatchTransaction: (transaction) => {
        const next = editor.state.apply(transaction);
        editor.updateState(next);
        const body = next.doc.textBetween(0, next.doc.content.size, ' ');
        const trimmed = body.trim();
        setCounts({
          words: trimmed === '' ? 0 : trimmed.split(/\s+/).length,
          characters: trimmed.replace(/\s+/g, ' ').length,
        });
        setRevision((value) => value + 1);
      },
    });
    view.current = editor;
    const body = editor.state.doc.textBetween(0, editor.state.doc.content.size, ' ');
    setCounts({ words: 0, characters: body.length });
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [openDocument]);

  const buttons: readonly ToolButton[] = useMemo(
    () => [
      { id: 'bold', label: 'Bold', shortcut: 'Ctrl/Cmd + B', command: commands.bold },
      { id: 'italic', label: 'Italic', shortcut: 'Ctrl/Cmd + I', command: commands.italic },
      {
        id: 'underline',
        label: 'Underline',
        shortcut: 'Ctrl/Cmd + U',
        command: commands.underline,
      },
      {
        id: 'strike',
        label: 'Strikethrough',
        shortcut: 'Ctrl/Cmd + Shift + X',
        command: commands.strike,
      },
      { id: 'code', label: 'Inline code', shortcut: 'Ctrl/Cmd + E', command: commands.code },
      {
        id: 'bullet',
        label: 'Bullet list',
        shortcut: 'Ctrl/Cmd + Shift + 8',
        command: commands.bulletList,
      },
      {
        id: 'ordered',
        label: 'Numbered list',
        shortcut: 'Ctrl/Cmd + Shift + 7',
        command: commands.orderedList,
      },
      {
        id: 'task',
        label: 'Task list',
        shortcut: 'Ctrl/Cmd + Shift + T',
        command: commands.taskList,
      },
      {
        id: 'quote',
        label: 'Blockquote',
        shortcut: 'Ctrl/Cmd + Shift + 9',
        command: commands.blockquote,
      },
      {
        id: 'codeblock',
        label: 'Code block',
        shortcut: 'Ctrl/Cmd + Alt + C',
        command: commands.codeBlock,
      },
      {
        id: 'rule',
        label: 'Horizontal rule',
        shortcut: 'Ctrl/Cmd + Alt + H',
        command: commands.rule,
      },
      { id: 'undo', label: 'Undo', shortcut: 'Ctrl/Cmd + Z', command: undoCommand },
      { id: 'redo', label: 'Redo', shortcut: 'Ctrl/Cmd + Shift + Z', command: redoCommand },
    ],
    [],
  );

  const exportAs = useCallback((kind: 'markdown' | 'text' | 'html') => {
    const editor = view.current;
    if (!editor) return;
    const body = exportsFor[kind](editor.state.doc);
    const extension = kind === 'markdown' ? 'md' : kind === 'html' ? 'html' : 'txt';
    downloadText(body, `notes.${extension}`, kind === 'html' ? 'text/html' : 'text/plain');
    setExportStatus(`Exported as ${kind === 'text' ? 'plain text' : kind}.`);
  }, []);

  // A draft may already be on this device from an earlier visit.
  useEffect(() => {
    void loadDraft().then((draft) => setDraftSaved(draft !== null));
  }, []);

  const matches = useMemo(() => {
    // `revision` changes on every transaction, so the count follows typing even
    // when the query itself has not changed.
    void revision;
    const editor = view.current;
    return editor && query !== '' ? findMatches(editor.state, query) : [];
  }, [query, revision]);

  return (
    <ToolFrame tool={tool}>
      <ToolStage title="Write">
        <div
          ref={host}
          className="rounded-control border border-border-strong bg-surface p-3 text-sm"
          data-testid="editor"
        />
        <div
          className="mt-2 flex flex-wrap items-center gap-2"
          role="toolbar"
          aria-label="Formatting"
        >
          {buttons.map((button) => (
            <Button
              key={button.id}
              type="button"
              size="sm"
              variant="outline"
              aria-label={button.label}
              title={`${button.label} (${button.shortcut})`}
              onClick={() => apply(button.command)}
            >
              {button.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 flex gap-4 text-sm text-muted-foreground" aria-live="polite">
          <span>{counts.words} words</span>
          <span>{counts.characters} characters</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {pasteNote}
        </p>
      </ToolStage>

      <ToolStage title="Open a document">
        <FileIntake
          accept={['.md', '.markdown', '.txt', '.html']}
          label="Document file"
          hint={`Markdown, plain text or HTML, up to ${PASTE_LIMIT.toLocaleString('en-GB')} bytes. The file is read in this browser and never uploaded, and it replaces what is in the editor.`}
          buttonLabel="Choose a document"
          onFiles={(files) => {
            const file = files[0];
            if (file) void openDocument(file);
          }}
        />
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {openStatus}
        </p>
      </ToolStage>

      <ToolStage title="Find and replace">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <Label htmlFor="find">Find</Label>
            <Input id="find" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="min-w-48 flex-1">
            <Label htmlFor="replace">Replace with</Label>
            <Input
              id="replace"
              value={replacement}
              onChange={(event) => setReplacement(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const editor = view.current;
              const match = matches[0];
              if (!editor || !match) return;
              editor.dispatch(selectMatch(editor.state, match));
            }}
          >
            Find
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const editor = view.current;
              const match = matches[0];
              if (!editor || !match) return;
              editor.dispatch(replaceMatch(editor.state, match, replacement));
              setStatus('Replaced one match.');
            }}
          >
            Replace
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const editor = view.current;
              if (!editor || query === '') return;
              const count = findMatches(editor.state, query).length;
              editor.dispatch(replaceAll(editor.state, query, replacement));
              setStatus(`Replaced ${count} match${count === 1 ? '' : 'es'}.`);
            }}
          >
            Replace all
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {query === ''
            ? 'Type to search.'
            : `${matches.length} match${matches.length === 1 ? '' : 'es'}.`}
          {status === '' ? '' : ` ${status}`}
        </p>
      </ToolStage>

      <ToolStage title="Export">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => exportAs('markdown')}>
            Markdown
          </Button>
          <Button type="button" variant="outline" onClick={() => exportAs('text')}>
            Plain text
          </Button>
          <Button type="button" variant="outline" onClick={() => exportAs('html')}>
            HTML
          </Button>
        </div>
        <OutputActions
          text={view.current ? exportsFor.markdown(view.current.state.doc) : ''}
          filename="notes.md"
          mime="text/markdown"
        />
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {exportStatus}
        </p>
      </ToolStage>

      <ToolStage title="Draft on this device">
        <p className="text-sm text-muted-foreground">
          Nothing is uploaded: a draft is stored in this browser only, and only when you ask for it.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const editor = view.current;
              if (!editor) return;
              void saveDraft(exportsFor.markdown(editor.state.doc)).then(() => {
                setDraftSaved(true);
                setDraftStatus('Draft saved on this device.');
              });
            }}
          >
            Save a draft on this device
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const editor = view.current;
              if (!editor) return;
              void loadDraft().then((draft) => {
                if (!draft) {
                  setDraftStatus('There is no draft on this device.');
                  return;
                }
                const document = documentFromModel(parseMarkdown(draft.markdown));
                editor.dispatch(
                  editor.state.tr.replaceWith(0, editor.state.doc.content.size, document),
                );
                setDraftStatus(
                  `Draft restored, saved ${new Date(draft.savedAt).toLocaleString('en-GB')}.`,
                );
              });
            }}
          >
            Restore draft
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void clearDraft().then(() => {
                setDraftSaved(false);
                setDraftStatus('Draft cleared from this device.');
              });
            }}
          >
            Clear draft
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {draftSaved ? 'A draft is saved on this device.' : 'No draft saved.'}
          {draftStatus === '' ? '' : ` ${draftStatus}`}
        </p>
      </ToolStage>

      <ToolHint>
        Pasted text is read by Omnitool's own converter, which never asks the browser to build a
        page from it: scripts, styles, frames, forms and images are dropped, links must be http,
        https or mailto, and everything removed is listed above. Shortcuts: bold Ctrl/Cmd+B, italic
        Ctrl/Cmd+I, underline Ctrl/Cmd+U, strikethrough Ctrl/Cmd+Shift+X, inline code Ctrl/Cmd+E,
        undo Ctrl/Cmd+Z, redo Ctrl/Cmd+Shift+Z, new list item Enter.
      </ToolHint>
    </ToolFrame>
  );
}
