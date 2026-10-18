import { buildOutputFilename, formatBytes } from '@omnitool/tool-core';
import { DownloadIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FileIntake } from '@/components/file-intake';
import { OutputList, OutputRow } from '@/components/output-row';
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
import { downloadBlob } from '@/lib/download';
import { requireTool } from '@/lib/tool';
import { createWorkerJob, WorkerCancelledError, type WorkerJob } from '@/lib/worker/job';
import {
  type ConverterApi,
  type ConvertInput,
  type ConvertOutput,
  SAMPLE_CODEC,
  TARGET_EXTENSION,
  type TargetFormat,
} from './types';

type Status = 'idle' | 'running' | 'done' | 'cancelled' | 'error';
type CodecState = 'missing' | 'fetching' | 'ready';

/**
 * A codec only needs fetching once per session, and this flag is that fact.
 * It is module scope rather than component state so navigating away and back
 * does not claim the download happened twice.
 */
let codecReadyThisSession = false;

export default function ImageConverterTool() {
  const tool = requireTool('image-converter');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [target, setTarget] = useState<TargetFormat>('png');
  const [quality, setQuality] = useState(0.85);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('');
  const [phase, setPhase] = useState<'prepare' | 'convert'>('prepare');
  const [status, setStatus] = useState<Status>('idle');
  const [codec, setCodec] = useState<CodecState>(codecReadyThisSession ? 'ready' : 'missing');
  const [result, setResult] = useState<ConvertOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const jobRef = useRef<WorkerJob<ConvertOutput> | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    return () => {
      jobRef.current?.cancel();
    };
  }, []);

  function chooseFile(files: File[]) {
    const next = files[0];
    if (!next) return;
    setFile(next);
    setResult(null);
    setError(null);
    setStatus('idle');
    setProgress(0);
  }

  function reset() {
    jobRef.current?.cancel();
    setFile(null);
    setResult(null);
    setError(null);
    setStatus('idle');
    setProgress(0);
    setLabel('');
  }

  function start() {
    if (!file || status === 'running') return;

    jobRef.current?.cancel();
    setStatus('running');
    setError(null);
    setResult(null);
    setProgress(0);
    setPhase(codecReadyThisSession ? 'convert' : 'prepare');
    setLabel(codecReadyThisSession ? 'Reading image' : `Fetching ${SAMPLE_CODEC.name}`);
    if (!codecReadyThisSession) setCodec('fetching');

    const input: ConvertInput = { file, target, quality };
    const job = createWorkerJob<ConvertInput, ConvertOutput, ConverterApi>({
      worker: new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
      input,
      onProgress: (value, nextLabel, nextPhase) => {
        setProgress(value);
        if (nextLabel) setLabel(nextLabel);
        if (nextPhase === 'prepare') setPhase('prepare');
        if (nextPhase === 'convert') setPhase('convert');
      },
    });

    jobRef.current = job;
    job.promise
      .then((output) => {
        codecReadyThisSession = true;
        setCodec('ready');
        setResult(output);
        setStatus('done');
        setProgress(100);
        setLabel('Done');
      })
      .catch((cause: unknown) => {
        if (!codecReadyThisSession) setCodec('missing');
        if (cause instanceof WorkerCancelledError) {
          setStatus('cancelled');
          setLabel('Cancelled');
          setProgress(0);
          return;
        }
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'The conversion failed');
      });
  }

  function cancel() {
    jobRef.current?.cancel();
  }

  function download() {
    if (!result || !file) return;
    downloadBlob(
      result.blob,
      buildOutputFilename(file.name, {
        suffix: '-converted',
        extension: TARGET_EXTENSION[target],
      }),
    );
  }

  const running = status === 'running';
  const change = result && file ? Math.round((1 - result.blob.size / file.size) * 100) : null;

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <Button type="button" onClick={download} disabled={!result}>
          <DownloadIcon aria-hidden="true" className="size-4" />
          Download {TARGET_EXTENSION[target].toUpperCase()}
        </Button>
      }
    >
      <ToolStage title="Input">
        <FileIntake
          accept={['image/*', '.jxl']}
          onFiles={chooseFile}
          label="Image to convert"
          buttonLabel="Choose image"
          hint="Drag and drop, paste, or choose a PNG, JPEG, WebP or JXL file."
          disabled={running}
        />
        {file ? (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {preview ? (
              <img
                src={preview}
                alt="Preview of the selected file"
                className="max-h-32 max-w-48 rounded-control border border-border object-contain"
              />
            ) : null}
            <div className="text-sm">
              <p className="font-medium">{file.name}</p>
              <p className="text-muted-foreground">{file.type || 'Unknown file type'}</p>
              <p className="font-mono tabular-nums text-muted-foreground">
                {formatBytes(file.size)}
              </p>
            </div>
          </div>
        ) : null}
      </ToolStage>

      <ToolStage title="Options">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="convert-target">Output format</Label>
            <Select value={target} onValueChange={(value) => setTarget(value as TargetFormat)}>
              <SelectTrigger id="convert-target" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {target !== 'png' ? (
            <div className="space-y-2">
              <Label htmlFor="convert-quality">Quality: {Math.round(quality * 100)}%</Label>
              <input
                id="convert-quality"
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
                className="h-10 w-full accent-[var(--primary)]"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={start} disabled={!file || running}>
            Convert
          </Button>
        </div>

        <div className="mt-4 rounded-panel border border-border bg-surface-inset p-3">
          <p className="text-sm font-medium">{SAMPLE_CODEC.name}</p>
          <p className="font-mono tabular-nums text-sm text-muted-foreground">
            {formatBytes(SAMPLE_CODEC.bytes)}
          </p>
          {codec === 'missing' ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Downloads once on the first conversion, then works offline for the rest of this
              session.
            </p>
          ) : null}
          {codec === 'fetching' ? (
            <p className="mt-1 text-sm text-muted-foreground" role="status">
              Fetching. Cancel stops it and nothing is kept.
            </p>
          ) : null}
          {codec === 'ready' ? (
            <p className="mt-1 text-sm text-success" role="status">
              Ready — cached for this session.
            </p>
          ) : null}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          This build simulates the codec download and encodes with the browser's built-in canvas
          codecs, so the states above are real but the bytes are not fetched from anywhere. The real
          WASM codecs arrive with the image tools phase.
        </p>
      </ToolStage>

      <ToolStage title="Output">
        {running ? (
          <div role="status" className="max-w-md">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>{label}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <Progress
              value={progress}
              aria-label={phase === 'prepare' ? 'Codec download progress' : 'Conversion progress'}
            />
            <Button type="button" variant="outline" className="mt-3" onClick={cancel}>
              <XIcon aria-hidden="true" className="size-4" />
              Cancel
            </Button>
          </div>
        ) : null}

        {status === 'cancelled' ? (
          <p role="status" className="text-sm text-muted-foreground">
            Conversion cancelled. The worker was stopped and nothing was downloaded.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {result && file ? (
          <OutputList className="rounded-control border border-border">
            <OutputRow label="Result" mono={false}>
              <p className="mt-1 text-sm">
                {result.width} × {result.height} pixels, {TARGET_EXTENSION[target].toUpperCase()}
              </p>
            </OutputRow>
            <OutputRow label="Size before" value={formatBytes(file.size)} copyable={false} />
            <OutputRow label="Size after" value={formatBytes(result.blob.size)} copyable={false} />
            <OutputRow
              label="Change"
              value={
                change === null
                  ? ''
                  : change >= 0
                    ? `${change}% smaller`
                    : `${Math.abs(change)}% larger`
              }
              copyable={false}
            />
          </OutputList>
        ) : null}

        {!running && !result && !error && status !== 'cancelled' ? (
          <p className="text-sm text-muted-foreground">
            Choose an image and start a conversion to see the output here.
          </p>
        ) : null}
      </ToolStage>
    </ToolFrame>
  );
}
