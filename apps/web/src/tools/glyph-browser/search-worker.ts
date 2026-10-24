import {
  blockForCodePoint,
  type GlyphBlockRange,
  type GlyphRecord,
  type PreparedGlyphRecord,
  parseGlyphQuery,
  prepareGlyphRecords,
  searchGlyphs,
} from '@omnitool/tool-core/unicode/search';
import * as Comlink from 'comlink';

export interface GlyphSearchInput {
  readonly query: string;
  readonly limit: number;
}

export interface GlyphSearchRow {
  readonly codePoint: number;
  readonly name: string;
  readonly category: string;
  readonly block: string;
}

export interface GlyphSearchData {
  readonly results: readonly GlyphSearchRow[];
  readonly total: number;
  readonly version: string;
  readonly source: string;
  /** Total gzip of the name chunks, so the UI can state the one-time download. */
  readonly gzipBytes: number;
}

interface SearchManifest {
  readonly version: string;
  readonly source: string;
  readonly count: number;
  readonly gzipBytes: number;
  readonly chunks: readonly { readonly file: string }[];
}

interface BlockIndex {
  readonly blocks: readonly GlyphBlockRange[];
}

type EncodedEntry = readonly [codePoint: number, name: string, category: string];

interface LoadedIndex {
  readonly records: readonly PreparedGlyphRecord[];
  readonly version: string;
  readonly source: string;
  readonly gzipBytes: number;
}

let loaded: Promise<LoadedIndex> | null = null;

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Character names are not available (${response.status}).`);
  return (await response.json()) as T;
}

/**
 * Fetches the manifest, the block ranges and every name chunk once, then keeps
 * them for the life of the worker. A worker is only thrown away when a new
 * query supersedes a running one, so the usual case pays for this once.
 */
async function loadIndex(onProgress: Progress): Promise<LoadedIndex> {
  onProgress(10, 'Reading the character index', 'index');
  const [manifest, indexes] = await Promise.all([
    readJson<SearchManifest>('/unicode/search-index.json'),
    readJson<BlockIndex>('/unicode/index.json'),
  ]);
  onProgress(
    20,
    `Downloading ${Math.round(manifest.gzipBytes / 1024).toLocaleString('en-GB')} kB of names`,
    'download',
  );
  const parts = await Promise.all(
    manifest.chunks.map((chunk) => readJson<EncodedEntry[]>(`/unicode/search/${chunk.file}`)),
  );
  onProgress(80, 'Indexing names', 'build');
  // `index.json` lists blocks in name order; the lookup binary-searches by code
  // point, so it needs them in range order.
  const blocks = [...indexes.blocks].sort((left, right) => left.start - right.start);
  const records: GlyphRecord[] = [];
  for (const part of parts) {
    for (const [codePoint, name, category] of part) {
      records.push({
        codePoint,
        name,
        category,
        block: blockForCodePoint(blocks, codePoint),
      });
    }
  }
  records.sort((left, right) => left.codePoint - right.codePoint);
  return {
    records: prepareGlyphRecords(records),
    version: manifest.version,
    source: manifest.source,
    gzipBytes: manifest.gzipBytes,
  };
}

type Progress = (progress: number, label?: string, phase?: string) => void;

const api = {
  async search(input: GlyphSearchInput, onProgress: Progress): Promise<GlyphSearchData> {
    loaded ??= loadIndex(onProgress);
    const index = await loaded;
    // Awaited deliberately. The callback is a Comlink proxy, so calling it hands
    // a port back to the page; if the worker then returns in the same task, the
    // page never gets the result — Firefox drops it, Chromium does not, and the
    // search spins forever with no error. Awaiting the callback means the answer
    // leaves in a later message, which is what every engine delivers.
    await onProgress(90, 'Searching', 'search');
    const outcome = searchGlyphs(index.records, parseGlyphQuery(input.query), input.limit);
    return {
      results: outcome.results.map(({ codePoint, name, category, block }) => ({
        codePoint,
        name,
        category,
        block,
      })),
      total: outcome.total,
      version: index.version,
      source: index.source,
      gzipBytes: index.gzipBytes,
    };
  },
};

export type GlyphSearchWorker = typeof api;

Comlink.expose(api);
