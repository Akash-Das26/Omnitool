import { runRegex } from '@omnitool/tool-core';
import * as Comlink from 'comlink';

export interface RegexInput {
  readonly source: string;
  readonly flags: string;
  readonly text: string;
}

/**
 * One worker per test, terminated by the UI on a deadline: a catastrophic
 * backtracking pattern can block inside a single `exec`, so the only reliable
 * guard is to kill the worker rather than to check inside the loop.
 */
const api = {
  run(input: RegexInput) {
    return runRegex(input.source, input.flags, input.text);
  },
};

export type RegexWorker = typeof api;

Comlink.expose(api);
