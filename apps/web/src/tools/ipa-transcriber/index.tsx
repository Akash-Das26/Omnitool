import { joinTranscription } from '@omnitool/tool-core/ipa';
import * as Comlink from 'comlink';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import type { PronunciationWorker, TranscriptionPayload } from '@/lib/pron/worker';
import { requireTool } from '@/lib/tool';

interface ManifestSummary {
  readonly gzipBytes: number;
  readonly words: number;
  readonly chunks: readonly { readonly file: string }[];
}

/**
 * Empty on purpose: the boxes start blank so the prerendered description stays
 * the page's LCP element. A filled default rendered a large paragraph only
 * after hydration, and that paragraph became the largest element (DEC-69).
 */
const DEFAULT_TEXT = '';
const DEBOUNCE_MS = 300;
const MAX_TEXT = 5000;

export default function IpaTranscriberTool() {
  const tool = requireTool('ipa-transcriber');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [payload, setPayload] = useState<TranscriptionPayload | null>(null);
  const [nameBytes, setNameBytes] = useState<number | null>(null);
  const [manifestFailed, setManifestFailed] = useState(false);
  const [namesReady, setNamesReady] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null);
  const remote = useRef<Comlink.Remote<PronunciationWorker> | null>(null);

  /**
   * The manifest is 1.3 kB, so its size can be stated before the dictionary is
   * fetched. If every chunk is already in the Cache API the notice becomes the
   * cached state instead of asking for a download that has already happened.
   */
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    fetch('/pron/manifest.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<ManifestSummary>;
      })
      .then(async (manifest) => {
        if (!live) return;
        setNameBytes(manifest.gzipBytes);
        if (typeof caches === 'undefined') return;
        const cached = await Promise.all(
          manifest.chunks.map((chunk) =>
            caches.match(`/pron/${chunk.file}`).then((hit) => Boolean(hit)),
          ),
        );
        if (live) setNamesReady(cached.every(Boolean));
      })
      .catch(() => {
        if (live) setManifestFailed(true);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (cancelled) return;
    const trimmed = text.trim();
    if (trimmed === '') {
      setPayload(null);
      return;
    }
    const timer = setTimeout(() => {
      // One worker for the life of the panel: it keeps the parsed dictionary,
      // so the second keystroke does not reload 924 kB.
      if (remote.current === null) {
        worker.current = new Worker(new URL('../../lib/pron/worker.ts', import.meta.url), {
          type: 'module',
        });
        remote.current = Comlink.wrap<PronunciationWorker>(worker.current);
      }
      const client = remote.current;
      setError(null);
      setLabel('Reading the dictionary');
      client
        .transcribe(
          text,
          Comlink.proxy((value: number, next?: string) => {
            setProgress(value);
            if (next !== undefined) setLabel(next);
          }),
        )
        .then((result) => {
          setPayload(result);
          setNamesReady(true);
          setProgress(null);
          setLabel(null);
        })
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : 'The dictionary could not be read.');
          setProgress(null);
          setLabel(null);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [cancelled, text]);

  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
      remote.current = null;
    },
    [],
  );

  function reset() {
    setText(DEFAULT_TEXT);
    setPayload(null);
    setCancelled(false);
    setError(null);
  }

  function cancelDownload() {
    worker.current?.terminate();
    worker.current = null;
    remote.current = null;
    setPayload(null);
    setProgress(null);
    setLabel(null);
    setCancelled(true);
  }

  const transcription = payload?.transcription ?? null;
  const output = transcription ? joinTranscription(transcription) : '';
  const sizeLabel = nameBytes === null ? null : `${(nameBytes / 1024 / 1024).toFixed(1)} MB`;
  const downloadNotice =
    sizeLabel === null
      ? 'One-time download of the pronunciation dictionary, stored on this device.'
      : `One-time download: ${sizeLabel}, stored on this device.`;
  const unavailable =
    'Transcribing needs the one-time download of the pronunciation dictionary, and it has not arrived. You may be offline.';

  const variants = useMemo(
    () =>
      (transcription?.segments ?? []).filter(
        (segment) => segment.kind === 'word' && segment.variants.length > 1,
      ),
    [transcription],
  );

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions text={output} filename="transcription.txt" disabled={output === ''} />
      }
    >
      <ToolStage title="Input">
        <Label htmlFor="ipa-text">English text</Label>
        <textarea
          id="ipa-text"
          className="mt-2 min-h-32 w-full rounded-control border border-border-strong bg-surface p-2 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          value={text}
          maxLength={MAX_TEXT}
          spellCheck={false}
          onChange={(event) => {
            setCancelled(false);
            setText(event.target.value);
          }}
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {`${text.length} of ${MAX_TEXT} characters. Numbers are left alone: the dictionary has no entry for a digit, so spell them out.`}
        </p>
      </ToolStage>

      <ToolStage title="Transcription">
        {namesReady ? (
          <p className="mb-3 text-sm text-muted-foreground">
            {`The pronunciation dictionary is stored on this device${sizeLabel === null ? '' : ` (${sizeLabel})`}. Transcribing works offline.`}
          </p>
        ) : cancelled ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Download cancelled before the dictionary arrived. Transcribing stays off until it is
            downloaded.
          </p>
        ) : manifestFailed ? (
          <p className="mb-3 text-sm text-muted-foreground">{unavailable}</p>
        ) : (
          <div className="mb-3 rounded-control border border-border bg-surface-inset px-3 py-2">
            <p className="text-sm">{downloadNotice}</p>
            {progress !== null ? (
              <div className="mt-2 flex items-center gap-3">
                <Progress
                  className="h-2 flex-1"
                  value={progress}
                  aria-label="Pronunciation dictionary download"
                />
                <span className="font-mono text-xs text-muted-foreground">{`${Math.round(progress)}%`}</span>
              </div>
            ) : null}
            <div className="mt-2">
              <Button type="button" variant="outline" size="sm" onClick={cancelDownload}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div aria-live="polite" role="status">
          {label !== null ? <p className="text-sm text-muted-foreground">{label}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        {transcription && output !== '' ? (
          <div className="space-y-4">
            <p className="break-words font-mono text-lg leading-relaxed">{output}</p>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Words</dt>
                <dd className="font-mono">{transcription.words}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Transcribed</dt>
                <dd className="font-mono">{transcription.transcribed}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Not in dictionary</dt>
                <dd className="font-mono">{transcription.unknown.length}</dd>
              </div>
            </dl>

            {transcription.unknown.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium">Not in the dictionary</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {transcription.unknown.join(', ')} — these are left as written rather than
                  guessed.
                </p>
              </div>
            ) : null}

            {variants.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium">Words with more than one pronunciation</h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {variants.map((segment) => (
                    <li key={segment.text}>
                      <span className="text-muted-foreground">{segment.text}</span>{' '}
                      <span className="font-mono">{segment.variants.join(' / ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </ToolStage>

      <ToolStage title="About this data">
        <p className="text-sm text-muted-foreground">
          {payload
            ? `${payload.manifest.name}, commit ${payload.manifest.commit.slice(0, 7)} (${payload.manifest.committed}), ${payload.manifest.licence}. ${payload.manifest.words.toLocaleString('en-GB')} words and ${payload.manifest.variants.toLocaleString('en-GB')} extra variants. ${payload.manifest.notice}`
            : 'CMU Pronouncing Dictionary (BSD-2-Clause), General American pronunciations. Nothing here is fetched from another site.'}
        </p>
        <ToolHint>
          The transcription is phonemic and General American. A word with several dictionary
          pronunciations shows all of them, separated by a slash.
        </ToolHint>
      </ToolStage>
    </ToolFrame>
  );
}
