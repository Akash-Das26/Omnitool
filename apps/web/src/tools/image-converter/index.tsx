import { buildOutputFilename, formatBytes } from '@omnitool/tool-core';
import { DownloadIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FileIntake } from '@/components/file-intake';
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
  TARGET_EXTENSION,
  type TargetFormat,
} from './types';

type Status = 'idle' | 'running' | 'done' | 'cancelled' | 'error';

export default function ImageConverterTool() {
  const tool = requireTool('image-converter');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [target, setTarget] = useState<TargetFormat>('png');
  const [quality, setQuality] = useState(0.85);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<Status>('idle');
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

  function start() {
    if (!file || status === 'running') return;

    jobRef.current?.cancel();
    setStatus('running');
    setError(null);
    setResult(null);
    setProgress(0);
    setLabel('Starting');

    const input: ConvertInput = { file, target, quality };
    const job = createWorkerJob<ConvertInput, ConvertOutput, ConverterApi>({
      worker: new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
      input,
      onProgress: (value, nextLabel) => {
        setProgress(value);
        if (nextLabel) setLabel(nextLabel);
      },
    });

    jobRef.current = job;
    job.promise
      .then((output) => {
        setResult(output);
        setStatus('done');
        setProgress(100);
        setLabel('Done');
      })
      .catch((cause: unknown) => {
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

  return (
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
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
                <p className="text-muted-foreground">
                  {file.type || 'Unknown type'} · {formatBytes(file.size)}
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
            {running ? (
              <Button type="button" variant="outline" onClick={cancel}>
                <XIcon aria-hidden="true" className="size-4" />
                Cancel
              </Button>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Sample pipeline: the codec download is simulated in this build and encoding uses the
            browser's native canvas codecs. The real WASM codecs arrive with the image tools phase.
          </p>
        </ToolStage>

        <ToolStage title="Output">
          {running ? (
            <div role="status" className="max-w-md">
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span>{label}</span>
                <span className="font-mono text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} aria-label="Conversion progress" />
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
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                {result.width} × {result.height} pixels · {formatBytes(result.blob.size)} ·{' '}
                {TARGET_EXTENSION[target].toUpperCase()}
              </p>
              <div>
                <Button type="button" onClick={download}>
                  <DownloadIcon aria-hidden="true" className="size-4" />
                  Download {TARGET_EXTENSION[target].toUpperCase()}
                </Button>
              </div>
            </div>
          ) : null}

          {!running && !result && !error && status !== 'cancelled' ? (
            <p className="text-sm text-muted-foreground">
              Choose an image and start a conversion to see the output here.
            </p>
          ) : null}
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
