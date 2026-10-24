import { type AlgebraRequest, runAlgebra } from '@omnitool/tool-core/algebra';
import * as Comlink from 'comlink';

/**
 * One worker per calculation, terminated by the UI on a deadline. The engine is
 * pure and bounded, but a large input can still spend a while searching for
 * rational roots, so the page never waits on it in the main thread.
 */
const api = {
  run(request: AlgebraRequest) {
    return runAlgebra(request);
  },
};

export type AlgebraWorker = typeof api;

Comlink.expose(api);
