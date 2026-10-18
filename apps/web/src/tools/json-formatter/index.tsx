import {
  formatJson,
  type JsonIndent,
  minifyJson,
  utf8ByteLength,
  validateJson,
} from '@omnitool/tool-core';
import { XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
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
import { createWorkerJob, WorkerCancelledError, type WorkerJob } from '@/lib/worker/job';
import type { JsonWorkerApi, JsonWorkerInput, JsonWorkerResult } from './types';

const WORKER_THRESHOLD_BYTES = 1_000_000;

type ErrorInfo = { message: string; line: number; column: number };
type Status = 'idle' | 'running' | 'cancelled';

export default function JsonFormatterTool() {
  const tool = requireTool('json-formatter');
  const [text, setText] = useState('');
  const [indent, setIndent] = useState<JsonIndent>(2);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [valid, setValid] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('');
  const jobRef = useRef<WorkerJob<JsonWorkerResult> | null>(null);

  useEffect(() => {
    return () => {
      jobRef.current?.cancel();
    };
  }, []);

  function applyResult(result: JsonWorkerResult, wasCancelled = false) {
    if (wasCancelled) return;
    if (result.ok) {
      setOutput(result.output);
      setError(null);
    } else {
      setError(result.error);
    }
  }

  function runWorker(mode: 'format' | 'minify') {
    jobRef.current?.cancel();
    setStatus('running');
    setError(null);
    setProgress(0);
    setLabel('Starting');

    const input: JsonWorkerInput = { text, mode, indent };
    const job = createWorkerJob<JsonWorkerInput, JsonWorkerResult, JsonWorkerApi>({
      worker: new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
      input,
      onProgress: (value, nextLabel) => {
        setProgress(value);
        if (nextLabel) setLabel(nextLabel);
      },
    });

    jobRef.current = job;
    job.promise
      .then((result) => {
        applyResult(result);
        setStatus('idle');
        setProgress(100);
        setLabel('Done');
      })
      .catch((cause: unknown) => {
        if (cause instanceof WorkerCancelledError) {
          setStatus('cancelled');
          setProgress(0);
          return;
        }
        setStatus('idle');
        setError({
          message: cause instanceof Error ? cause.message : 'That JSON could not be read',
          line: 1,
          column: 1,
        });
      });
  }

  function transform(mode: 'format' | 'minify') {
    setValid(false);
    if (utf8ByteLength(text) > WORKER_THRESHOLD_BYTES) {
      runWorker(mode);
      return;
    }
    try {
      setOutput(mode === 'minify' ? minifyJson(text) : formatJson(text, indent));
      setError(null);
    } catch (cause) {
      const info = cause as { message?: string; line?: number; column?: number };
      setError({
        message: info.message ?? 'That is not valid JSON',
        line: info.line ?? 1,
        column: info.column ?? 1,
      });
    }
  }

  function validate() {
    const result = validateJson(text);
    if (result.ok) {
      setValid(true);
      setError(null);
    } else {
      setValid(false);
      setError(result.error);
    }
  }

  const running = status === 'running';

  return (
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
        <ToolStage title="Input">
          <Label htmlFor="json-input">JSON input</Label>
          <TextArea
            id="json-input"
            className="mt-2"
            rows={12}
            value={text}
            spellCheck={false}
            placeholder={'{\n  "paste": "your JSON here"\n}'}
            onChange={(event) => {
              setText(event.target.value);
              setValid(false);
              setError(null);
            }}
            disabled={running}
          />
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="json-indent">Indent</Label>
              <Select
                value={String(indent)}
                onValueChange={(value) =>
                  setIndent(value === 'tab' ? 'tab' : (Number(value) as 2 | 4))
                }
              >
                <SelectTrigger id="json-indent" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 spaces</SelectItem>
                  <SelectItem value="4">4 spaces</SelectItem>
                  <SelectItem value="tab">Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => transform('format')}
              disabled={running || text === ''}
            >
              Format
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => transform('minify')}
              disabled={running || text === ''}
            >
              Minify
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={validate}
              disabled={running || text === ''}
            >
              Validate
            </Button>
            {running ? (
              <Button type="button" variant="outline" onClick={() => jobRef.current?.cancel()}>
                <XIcon aria-hidden="true" className="size-4" />
                Cancel
              </Button>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Inputs over about 1 MB are processed in a worker, so the page stays responsive.
          </p>
        </ToolStage>

        <ToolStage title="Result">
          {running ? (
            <div role="status" className="mb-4 max-w-md">
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span>{label}</span>
                <span className="font-mono text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} aria-label="JSON processing progress" />
            </div>
          ) : null}

          {status === 'cancelled' ? (
            <p role="status" className="mb-3 text-sm text-muted-foreground">
              Cancelled. The worker was stopped and the previous result is unchanged.
            </p>
          ) : null}

          {valid ? (
            <p role="status" className="mb-3 text-sm font-medium">
              Valid JSON.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mb-3 text-sm text-destructive">
              Line {error.line}, column {error.column}: {error.message}
            </p>
          ) : null}

          <Label htmlFor="json-output">Formatted JSON</Label>
          <TextArea
            id="json-output"
            className="mt-2"
            rows={14}
            readOnly
            value={output}
            spellCheck={false}
            placeholder="The formatted or minified JSON appears here."
          />
          <div className="mt-3">
            <OutputActions
              text={output}
              filename={output.includes('\n') ? 'formatted.json' : 'minified.json'}
              mime="application/json"
              disabled={output === ''}
            />
          </div>
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
