import * as Comlink from 'comlink';
import type { GlyphSearchBackend, GlyphSearchProgress } from './search-controller';
import type { GlyphSearchInput, GlyphSearchWorker } from './search-worker';

/**
 * One worker for the life of the search panel, so the name index it loads after
 * the first query stays loaded. `cancel` terminates it, which is the only stop
 * that works while the worker is busy; the controller only calls it when the
 * panel goes away or a search has failed.
 */
export function createWorkerBackend(): GlyphSearchBackend {
  const worker = new Worker(new URL('./search-worker.ts', import.meta.url), { type: 'module' });
  const remote = Comlink.wrap<GlyphSearchWorker>(worker);
  return {
    run(input: GlyphSearchInput, onProgress: GlyphSearchProgress) {
      return remote.search(input, Comlink.proxy(onProgress));
    },
    cancel() {
      worker.terminate();
    },
  };
}
