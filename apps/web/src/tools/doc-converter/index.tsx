import {
  convertDocument,
  DOC_ACCEPTED_EXTENSIONS,
  DOC_INPUTS,
  DOC_OUTPUTS,
  type DocInputFormat,
  type DocOutputFormat,
  documentTitle,
  FILE_INPUT_LIMIT,
  formatForFilename,
  outputFilename,
  outputMime,
  renderDocument,
  TEXT_INPUT_LIMIT,
} from '@omnitool/tool-core/doc';
import * as Comlink from 'comlink';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { FileIntake } from '@/components/file-intake';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requireTool } from '@/lib/tool';
import type { DocxResult, DocxWorkerApi } from './types';

const TEXT_INPUTS = DOC_INPUTS.filter(
  (input): input is (typeof DOC_INPUTS)[number] & { format: DocInputFormat } =>
    input.format !== 'docx',
);

/**
 * Everything starts empty. The prerendered name and description are then the
 * largest painted elements, which is what keeps this route inside NFR-013 (the
 * DEC-45 and DEC-69 precedent).
 */
const DEFAULT_TEXT = '';

interface DocxState {
  readonly busy: boolean;
  readonly progress: number | null;
  readonly label: string | null;
  readonly error: string | null;
}

const IDLE: DocxState = { busy: false, progress: null, label: null, error: null };

export default function DocumentConverterTool() {
  const tool = requireTool('doc-converter');
  const [inputFormat, setInputFormat] = useState<DocInputFormat>('markdown');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [sourceName, setSourceName] = useState('');
  const [docx, setDocx] = useState<DocxResult | null>(null);
  const [docxName, setDocxName] = useState('');
  const [docxState, setDocxState] = useState<DocxState>(IDLE);
  const [target, setTarget] = useState<DocOutputFormat>('markdown');
  const [fileError, setFileError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const remoteRef = useRef<Comlink.Remote<DocxWorkerApi> | null>(null);
  const runId = useRef(0);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      remoteRef.current = null;
    },
    [],
  );

  const deferredText = useDeferredValue(text);

  const conversion = useMemo(() => {
    if (docx !== null) return { document: docx.document, warnings: docx.warnings };
    if (deferredText.trim() === '') return null;
    return convertDocument({ format: inputFormat, text: deferredText });
  }, [deferredText, docx, inputFormat]);

  const name = docxName || sourceName || 'document';
  const document = conversion?.document ?? null;
  const warnings = conversion?.warnings ?? [];
  const output = useMemo(
    () => (document ? renderDocument(document, target, documentTitle(document, name)) : ''),
    [document, target, name],
  );

  function resetWorker() {
    runId.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
    remoteRef.current = null;
  }

  function reset() {
    resetWorker();
    setInputFormat('markdown');
    setText(DEFAULT_TEXT);
    setSourceName('');
    setDocx(null);
    setDocxName('');
    setDocxState(IDLE);
    setTarget('markdown');
    setFileError(null);
  }

  function readTextFile(file: File) {
    if (file.size > FILE_INPUT_LIMIT) {
      setFileError(
        `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Documents are read up to ${(
          FILE_INPUT_LIMIT / (1024 * 1024)
        ).toFixed(0)} MB.`,
      );
      return;
    }
    const format = formatForFilename(file.name);
    if (format === null || format === 'docx') return;
    resetWorker();
    setDocx(null);
    setDocxName('');
    setDocxState(IDLE);
    setFileError(null);
    file
      .text()
      .then((contents) => {
        setInputFormat(format);
        setText(contents);
        setSourceName(file.name);
      })
      .catch(() => setFileError(`${file.name} could not be read. Try opening it again.`));
  }

  function readDocx(file: File) {
    if (file.size > FILE_INPUT_LIMIT) {
      setFileError(
        `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Word documents are read up to ${(
          FILE_INPUT_LIMIT / (1024 * 1024)
        ).toFixed(0)} MB.`,
      );
      return;
    }
    resetWorker();
    const id = runId.current;
    setText(DEFAULT_TEXT);
    setSourceName('');
    setFileError(null);
    setDocx(null);
    setDocxName(file.name);
    setDocxState({ busy: true, progress: 0, label: 'Opening the document', error: null });

    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const remote = Comlink.wrap<DocxWorkerApi>(worker);
    remoteRef.current = remote;

    file
      .arrayBuffer()
      .then((buffer) =>
        remote.run(
          { buffer, filename: file.name },
          Comlink.proxy((progress: number, label?: string) => {
            if (id !== runId.current) return;
            setDocxState({ busy: true, progress, label: label ?? null, error: null });
          }),
        ),
      )
      .then((result) => {
        if (id !== runId.current) return;
        setDocx(result);
        setDocxState({ busy: false, progress: null, label: null, error: null });
      })
      .catch((cause: unknown) => {
        if (id !== runId.current) return;
        setDocxState({
          busy: false,
          progress: null,
          label: null,
          error: cause instanceof Error ? cause.message : 'That document could not be read.',
        });
      })
      .finally(() => {
        // The document is in the page now; the worker and mammoth's parsed copy
        // of it do not need to stay resident.
        if (id !== runId.current) return;
        worker.terminate();
        if (workerRef.current === worker) {
          workerRef.current = null;
          remoteRef.current = null;
        }
      });
  }

  function openFile(file: File) {
    const format = formatForFilename(file.name);
    if (format === 'docx') {
      readDocx(file);
      return;
    }
    if (format === null) {
      setFileError(
        `That file type is not supported here. Accepted: ${DOC_ACCEPTED_EXTENSIONS.join(', ')}`,
      );
      return;
    }
    readTextFile(file);
  }

  const hasDocument = document !== null && output !== '';
  const progressLabel =
    docxState.busy && docxState.label !== null
      ? `${docxState.label}${docxState.progress === null ? '' : ` — ${Math.round(docxState.progress)}%`}`
      : null;

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions
          text={output}
          filename={outputFilename(name, target)}
          mime={outputMime(target)}
          disabled={!hasDocument}
        />
      }
    >
      <ToolStage title="Your document">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Label htmlFor="doc-format">The text is</Label>
            <Select
              value={inputFormat}
              onValueChange={(value) => {
                setInputFormat(value as DocInputFormat);
                setSourceName('');
              }}
            >
              <SelectTrigger id="doc-format" className="mt-2 min-w-44" aria-label="Input format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_INPUTS.map((input) => (
                  <SelectItem key={input.format} value={input.format}>
                    {input.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            {TEXT_INPUTS.find((input) => input.format === inputFormat)?.hint}
          </p>
        </div>

        <Label htmlFor="doc-input" className="mt-4 block">
          Document text
        </Label>
        <TextArea
          id="doc-input"
          className="mt-2 min-h-48"
          value={text}
          spellCheck={false}
          placeholder="Paste a document here, or open a file below."
          onChange={(event) => {
            setText(event.target.value);
            setSourceName('');
            setDocx(null);
            setDocxName('');
            setDocxState(IDLE);
            setFileError(null);
          }}
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {`${text.length.toLocaleString('en-GB')} characters. Text is read up to ${TEXT_INPUT_LIMIT.toLocaleString('en-GB')}.`}
        </p>

        <FileIntake
          className="mt-4"
          accept={DOC_ACCEPTED_EXTENSIONS}
          onFiles={(files) => {
            const file = files[0];
            if (file) openFile(file);
          }}
          label="Or open a document"
          hint="Markdown, HTML, plain text or Word (.docx). It is read in your browser and never uploaded."
          buttonLabel="Choose document"
        />

        <div aria-live="polite" role="status" className="mt-3 space-y-2">
          {progressLabel !== null ? (
            <div className="flex items-center gap-3">
              <Progress className="h-2 max-w-72 flex-1" value={docxState.progress ?? 0} />
              <span className="font-mono text-xs text-muted-foreground">{progressLabel}</span>
            </div>
          ) : null}
          {docxName !== '' && docxState.error === null ? (
            <p className="text-sm text-muted-foreground">{`Word document: ${docxName}`}</p>
          ) : null}
          {fileError !== null ? <p className="text-sm text-destructive">{fileError}</p> : null}
          {docxState.error !== null ? (
            <p className="text-sm text-destructive">{docxState.error}</p>
          ) : null}
        </div>

        <ToolHint>
          <p>
            Markdown is read as Markdown, HTML is read through the same sanitiser this site uses for
            pasted markup, and plain text is kept as text: a line beginning with # in a .txt file
            stays a line beginning with #. A Word document is unpacked in a worker, refused if it is
            over 20 MB, has more than 1,000 parts, expands past 100 MB, or any part claims a
            compression ratio above 100:1, and then read with mammoth 1.13.0 (BSD-2-Clause).
          </p>
          <p>
            Scripts, styles, images and unknown elements are removed, and the output says how many
            of each. Images are dropped rather than inlined, so nothing here points at another site.
            Nothing is uploaded and nothing is stored.
          </p>
        </ToolHint>
      </ToolStage>

      <ToolStage title="Converted document">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="doc-target">Convert to</Label>
            <Select value={target} onValueChange={(value) => setTarget(value as DocOutputFormat)}>
              <SelectTrigger id="doc-target" className="mt-2 min-w-44" aria-label="Output format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_OUTPUTS.map((entry) => (
                  <SelectItem key={entry.format} value={entry.format}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">{outputFilename(name, target)}</p>
        </div>

        <Label htmlFor="doc-output" className="mt-4 block">
          Converted document
        </Label>
        <TextArea
          id="doc-output"
          className="mt-2 min-h-64"
          value={output}
          readOnly
          spellCheck={false}
          placeholder="The converted document appears here."
        />

        <div aria-live="polite" className="mt-3 space-y-2">
          {warnings.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium">What changed</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {docxState.busy && docx === null ? (
            <p className="text-sm text-muted-foreground">Reading the document.</p>
          ) : null}
        </div>

        <ToolHint className="mt-4">
          <p>
            Markdown output escapes every character that could open markup in another Markdown
            reader. HTML output is a complete page with no script, no stylesheet and no reference to
            another site. Plain-text output keeps the words and the structure, not the formatting.
          </p>
        </ToolHint>
      </ToolStage>

      <ToolStage title="About the Word reader">
        <p className="text-sm text-muted-foreground">
          Word documents are read with mammoth 1.13.0 (BSD-2-Clause) in a worker on this device.
          Only .docx is read; the older .doc format is not supported, because reading it needs a
          different converter. Nothing is uploaded and no file is stored.
        </p>
      </ToolStage>
    </ToolFrame>
  );
}
