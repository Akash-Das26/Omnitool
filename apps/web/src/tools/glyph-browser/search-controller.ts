import type { GlyphSearchData, GlyphSearchInput } from './search-worker';

export type GlyphSearchPhase = 'index' | 'download' | 'build' | 'search';

export type GlyphSearchProgress = (progress: number, label?: string, phase?: string) => void;

export interface GlyphSearchBackend {
  run(input: GlyphSearchInput, onProgress: GlyphSearchProgress): Promise<GlyphSearchData>;
  /** Stops the work outright: the worker client terminates its worker here. */
  cancel(): void;
}

export type GlyphSearchState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'running';
      readonly query: string;
      readonly phase?: GlyphSearchPhase;
      readonly label?: string;
      /** 0 to 100, straight from the worker, for the determinate bar. */
      readonly progress: number;
    }
  | { readonly status: 'done'; readonly query: string; readonly data: GlyphSearchData }
  | { readonly status: 'error'; readonly query: string; readonly message: string };

export interface GlyphSearch {
  search(input: GlyphSearchInput): void;
  dispose(): void;
}

const PHASES: readonly GlyphSearchPhase[] = ['index', 'download', 'build', 'search'];

function phaseOf(phase: string | undefined): GlyphSearchPhase | undefined {
  return PHASES.find((candidate) => candidate === phase);
}

/**
 * One search at a time, last query wins.
 *
 * A query that arrives while a search is running replaces the queued one and
 * waits its turn; the running search is not terminated. Terminating was the
 * first design and it cost a full reload of the 12 MB name table each time,
 * because the index lives in the worker that was being thrown away — typing a
 * code point character by character restarted the download, and on a slower
 * engine the answer arrived seconds later or not at all. The worker can only be
 * inside a bounded scan here, so waiting is cheap and keeping the index is what
 * makes the second search instant.
 *
 * A finished search whose query is already out of date is not reported at all:
 * its results would replace the ones the user is waiting for with older ones.
 * The worker is only terminated on `dispose`, or when a search fails, so the
 * next attempt starts from a clean worker.
 */
export function createGlyphSearch(
  createBackend: () => GlyphSearchBackend,
  onChange: (state: GlyphSearchState) => void,
): GlyphSearch {
  let backend: GlyphSearchBackend | null = null;
  let busy = false;
  let token = 0;
  let queued: GlyphSearchInput | null = null;

  function run(input: GlyphSearchInput): void {
    token += 1;
    const mine = token;
    busy = true;
    onChange({ status: 'running', query: input.query, progress: 0 });
    const worker = backend ?? createBackend();
    backend = worker;
    const finish = (state: GlyphSearchState) => {
      if (mine !== token) return;
      const next = queued;
      queued = null;
      if (next) {
        run(next);
        return;
      }
      busy = false;
      onChange(state);
    };
    worker
      .run(input, (progress, label, phase) => {
        if (mine !== token) return;
        onChange({
          status: 'running',
          query: input.query,
          phase: phaseOf(phase),
          label: label ?? undefined,
          progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
        });
      })
      .then((data) => finish({ status: 'done', query: input.query, data }))
      .catch((cause: unknown) => {
        if (mine !== token) return;
        backend = null;
        finish({
          status: 'error',
          query: input.query,
          message: cause instanceof Error ? cause.message : 'The search could not run.',
        });
      });
  }

  return {
    search(input) {
      if (busy) {
        queued = input;
        return;
      }
      run(input);
    },
    dispose() {
      token += 1;
      busy = false;
      queued = null;
      backend?.cancel();
      backend = null;
    },
  };
}
