import { type Transcription, transcribe } from '@omnitool/tool-core/ipa';
import * as Comlink from 'comlink';

/**
 * The pronunciation dictionary, loaded once per worker and kept for its life.
 *
 * 126,000 entries are about 924 kB gzipped across seven same-origin chunks, so
 * parsing them belongs off the page's thread. The service worker caches the
 * chunks on first use, which is what makes a second visit work offline; the
 * first visit is a disclosed one-time download.
 */
export interface PronunciationManifest {
  readonly name: string;
  readonly repository: string;
  readonly commit: string;
  readonly committed: string;
  readonly licence: string;
  readonly notice: string;
  readonly words: number;
  readonly variants: number;
  readonly gzipBytes: number;
  readonly chunks: readonly { readonly file: string; readonly count: number }[];
}

export interface LoadedDictionary {
  readonly manifestations: PronunciationManifest;
  readonly entries: ReadonlyMap<string, readonly string[]>;
}

type Progress = (progress: number, label?: string) => void;

let loaded: Promise<LoadedDictionary> | null = null;

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`The pronunciation dictionary is not available (${response.status}).`);
  return (await response.json()) as T;
}

async function load(onProgress: Progress): Promise<LoadedDictionary> {
  onProgress(5, 'Reading the dictionary manifest');
  const manifest = await readJson<PronunciationManifest>('/pron/manifest.json');
  onProgress(
    15,
    `Downloading ${Math.round(manifest.gzipBytes / 1024).toLocaleString('en-GB')} kB of pronunciations`,
  );
  const pairs = await Promise.all(
    manifest.chunks.map((chunk) => readJson<[string, string[]][]>(`/pron/${chunk.file}`)),
  );
  onProgress(85, 'Indexing the dictionary');
  const entries = new Map<string, readonly string[]>();
  for (const chunk of pairs) {
    for (const [word, pronunciations] of chunk) entries.set(word, pronunciations);
  }
  onProgress(100, 'Ready');
  return { manifestations: manifest, entries };
}

function dictionary(onProgress: Progress): Promise<LoadedDictionary> {
  loaded ??= load(onProgress);
  return loaded;
}

export interface TranscriptionPayload {
  readonly text: string;
  readonly transcription: Transcription;
  readonly manifest: PronunciationManifest;
}

const api = {
  async transcribe(text: string, onProgress: Progress): Promise<TranscriptionPayload> {
    const { entries, manifestations } = await dictionary(onProgress);
    return {
      text,
      transcription: transcribe(text, (word) => entries.get(word)),
      manifest: manifestations,
    };
  },
  async pronunciations(
    words: readonly string[],
    onProgress: Progress,
  ): Promise<Record<string, string[]>> {
    const { entries } = await dictionary(onProgress);
    const out: Record<string, string[]> = {};
    for (const word of new Set(words.map((word) => word.toLowerCase()))) {
      const found = entries.get(word);
      if (found) out[word] = [...found];
    }
    return out;
  },
};

export type PronunciationWorker = typeof api;

Comlink.expose(api);
