import { joinShavian, SHAVIAN_LETTERS } from '@omnitool/tool-core/shavian';
import * as Comlink from 'comlink';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import type { PronunciationWorker, ShavianPayload } from '@/lib/pron/worker';
import { requireTool } from '@/lib/tool';

/**
 * Empty on purpose: the boxes start blank so the prerendered description stays
 * the page's LCP element. A filled default rendered a large paragraph only
 * after hydration, and that paragraph became the largest element (DEC-69).
 */
const DEFAULT_TEXT = '';
const DEBOUNCE_MS = 300;
const MAX_TEXT = 5000;

interface ManifestSummary {
  readonly gzipBytes: number;
  readonly words: number;
  readonly chunks: readonly { readonly file: string }[];
}

export default function ShavianTransliteratorTool() {
  const tool = requireTool('shavian-transliterator');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [payload, setPayload] = useState<ShavianPayload | null>(null);
  const [sizeBytes, setSizeBytes] = useState<number | null>(null);
  const [dictionaryReady, setDictionaryReady] = useState(false);
  const [manifestFailed, setManifestFailed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null);
  const remote = useRef<Comlink.Remote<PronunciationWorker> | null>(null);

  /** Reads the 1.3 kB manifest so the notice can name the download's size. */
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
        setSizeBytes(manifest.gzipBytes);
        if (typeof caches === 'undefined') return;
        const cached = await Promise.all(
          manifest.chunks.map((chunk) =>
            caches.match(`/pron/${chunk.file}`).then((hit) => Boolean(hit)),
          ),
        );
        if (live) setDictionaryReady(cached.every(Boolean));
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
    if (text.trim() === '') {
      setPayload(null);
      return;
    }
    const timer = setTimeout(() => {
      // One worker for the life of the panel: it keeps the parsed dictionary,
      // so the second keystroke does not reload 0.9 MB.
      if (remote.current === null) {
        worker.current = new Worker(new URL('../../lib/pron/worker.ts', import.meta.url), {
          type: 'module',
        });
        remote.current = Comlink.wrap<PronunciationWorker>(worker.current);
      }
      setError(null);
      setLabel('Reading the dictionary');
      remote.current
        .shavian(
          text,
          Comlink.proxy((value: number, next?: string) => {
            setProgress(value);
            if (next !== undefined) setLabel(next);
          }),
        )
        .then((result) => {
          setPayload(result);
          setDictionaryReady(true);
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

  const result = payload?.shavian ?? null;
  const output = result ? joinShavian(result) : '';
  const sizeLabel = sizeBytes === null ? null : `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  const downloadNotice =
    sizeLabel === null
      ? 'One-time download of the pronunciation dictionary, stored on this device.'
      : `One-time download: ${sizeLabel}, stored on this device.`;
  const unavailable =
    'Transliterating needs the one-time download of the pronunciation dictionary, and it has not arrived. You may be offline.';

  const unusedLetters = useMemo(
    () => SHAVIAN_LETTERS.filter((letter) => letter.arpabet === undefined).length,
    [],
  );

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={<OutputActions text={output} filename="shavian.txt" disabled={output === ''} />}
    >
      <ToolStage title="Input">
        <Label htmlFor="shavian-text">Latin text</Label>
        <textarea
          id="shavian-text"
          className="mt-2 min-h-32 w-full rounded-control border border-border-strong bg-surface p-2 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          value={text}
          maxLength={MAX_TEXT}
          spellCheck={false}
          onChange={(event) => {
            setCancelled(false);
            setText(event.target.value);
          }}
        />
        {/* One short line on purpose (P2-59): as a two-sentence paragraph it
            became this page's LCP element at 2,495 ms, painted only after
            hydration. The explanation lives in the hint under the result. */}
        <p className="mt-2 text-sm text-muted-foreground">
          {`${text.length} of ${MAX_TEXT} characters`}
        </p>
      </ToolStage>

      <ToolStage title="Shavian">
        {dictionaryReady ? (
          <p className="mb-3 text-sm text-muted-foreground">
            {`The pronunciation dictionary is stored on this device${sizeLabel === null ? '' : ` (${sizeLabel})`}. Transliterating works offline.`}
          </p>
        ) : cancelled ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Download cancelled before the dictionary arrived. Transliterating stays off until it is
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

        {result && output !== '' ? (
          <div className="space-y-4">
            <p className="break-words text-lg leading-relaxed">{output}</p>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Words</dt>
                <dd className="font-mono">{result.words}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Transliterated</dt>
                <dd className="font-mono">{result.transliterated}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Not in dictionary</dt>
                <dd className="font-mono">{result.unknown.length}</dd>
              </div>
            </dl>

            {result.unknown.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium">Left as written</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.unknown.join(', ')} — no dictionary entry, so these pass through unchanged
                  rather than being guessed.
                </p>
              </div>
            ) : null}

            {result.properNouns.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium">Names</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {`${result.properNouns.join(', ')} — capitalised words that do not start a sentence take the namer dot (·) before them.`}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </ToolStage>

      <ToolStage title="About this data">
        <p className="text-sm text-muted-foreground">
          {payload
            ? `${payload.manifest.name}, commit ${payload.manifest.commit.slice(0, 7)} (${payload.manifest.committed}), ${payload.manifest.licence}. ${payload.manifest.words.toLocaleString('en-GB')} words. ${payload.manifest.notice}`
            : 'CMU Pronouncing Dictionary (BSD-2-Clause), General American pronunciations, rewritten with a mapping written for Omnitool.'}
        </p>
        <ToolHint>
          {`Words are looked up in the dictionary; a word that is not there is left exactly as you typed it. Letter values follow the Unicode Shavian block, U+10450 to U+1047F: ${SHAVIAN_LETTERS.length} letters, of which ${unusedLetters} need a sound General American does not keep apart and so are never produced. Shavian spelling conventions vary between writers, and this output is phonemic rather than a standard orthography. It is one-way: the phonemes cannot be turned back into English spelling.`}
        </ToolHint>
      </ToolStage>
    </ToolFrame>
  );
}
