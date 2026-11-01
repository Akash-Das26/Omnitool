/**
 * The load guard and the per-route state machine behind `scripts/lighthouse.mjs`.
 *
 * This lives apart from the sweep so its decisions can be tested with a fake
 * load source and a fake clock: whether a host is too busy, whether it has been
 * quiet long enough, and whether a route's stored result may be reused. The
 * sweep keeps the parts that need a browser; everything that decides *whether
 * to measure* is here and has no I/O of its own.
 *
 * Three rules matter more than the code:
 *  1. A run is only accepted when the host was inside the limit both before and
 *     after it.
 *  2. A route that trips the guard is measured again from run 1. Runs from
 *     different load conditions are never mixed into one median.
 *  3. A stored result is reusable only for the same commit and the same build.
 */

/** How often the waiting loop samples the load average. */
export const DEFAULT_POLL_MS = 5_000;
/** How long the host must stay inside the limit before a route is retried. */
export const DEFAULT_QUIET_MS = 30_000;
/** The longest the waiting loop will wait before giving up on the host. */
export const DEFAULT_MAX_WAIT_MS = 600_000;
/** How many times one route is retried after the guard trips. */
export const DEFAULT_MAX_RETRIES = 3;

function defaultSleep(ms) {
  return new Promise((settle) => {
    setTimeout(settle, ms);
  });
}

/**
 * A guard bound to one load source and one limit.
 *
 * `readLoad` returns `{ one, five }` (the 1- and 5-minute averages); `sleep` and
 * `now` are injected so a test can run a ten-minute wait in microseconds.
 */
export function createLoadGuard({
  readLoad,
  limit,
  sleep = defaultSleep,
  now = () => Date.now(),
  pollMs = DEFAULT_POLL_MS,
  quietMs = DEFAULT_QUIET_MS,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
}) {
  if (typeof readLoad !== 'function') throw new Error('the load guard needs a readLoad function');
  if (!(limit > 0)) throw new Error('the load guard needs a positive limit');

  function sample() {
    const { one, five } = readLoad();
    return { one, five, limit };
  }

  function isBusy(load) {
    return load.one > limit;
  }

  /**
   * Waits until the 1-minute load has been inside the limit for `quietMs`
   * continuously. Returns `{ quiet, waitedMs, samples }`; it does not throw, so
   * the caller decides what an unsettled host means for the sweep.
   */
  async function waitForQuiet() {
    const started = now();
    const samples = [];
    let quietSince = null;

    for (;;) {
      const load = sample();
      samples.push(load);

      if (isBusy(load)) {
        // Any busy sample resets the clock: "quiet for 30 s" must be continuous.
        quietSince = null;
      } else if (quietSince === null) {
        quietSince = now();
      }

      if (quietSince !== null && now() - quietSince >= quietMs) {
        return { quiet: true, waitedMs: now() - started, samples };
      }
      if (now() - started >= maxWaitMs) {
        return { quiet: false, waitedMs: now() - started, samples };
      }

      await sleep(pollMs);
    }
  }

  return { sample, isBusy, waitForQuiet, limit, quietMs, pollMs, maxWaitMs };
}

/**
 * True when a stored result may stand in for a fresh measurement: it passed,
 * it was produced for this commit and this build, and it holds the number of
 * runs the sweep asks for. Anything else is measured again.
 */
export function resultIsReusable(result, { commit, buildHash, runs }) {
  if (result?.status !== 'valid') return false;
  if (result.commit !== commit) return false;
  if (result.buildHash !== buildHash) return false;
  if (!Array.isArray(result.runs) || result.runs.length !== runs) return false;
  return true;
}

/** A short, human-readable account of which limit a sample exceeded. */
export function busyReason(stage, load, limit) {
  return `${stage}: 1-minute load ${load.one.toFixed(2)} > ${limit.toFixed(2)}`;
}

/**
 * Measures one route, retrying the whole route when the guard trips.
 *
 * `measure(route, run)` performs one Lighthouse run and returns whatever the
 * caller wants to store. `onAttempt` and `onWait` exist for logging. The result
 * is either `{ status: 'valid', runs, attempts }` or
 * `{ status: 'invalid', reason, runs: [], attempts }` — an invalid route never
 * returns a partial set of runs, because a median of runs measured under
 * different conditions is exactly the number the guard exists to prevent.
 */
export async function measureRoute({
  route,
  runs = 3,
  guard,
  measure,
  maxRetries = DEFAULT_MAX_RETRIES,
  onAttempt,
  onWait,
}) {
  const attempts = [];

  for (let attempt = 0; ; attempt += 1) {
    const measured = [];
    let trip = null;

    for (let run = 1; run <= runs; run += 1) {
      const before = guard.sample();
      if (guard.isBusy(before)) {
        trip = { stage: `before ${route.path} run ${run} of ${runs}`, load: before, run };
        break;
      }

      const value = await measure(route, run);

      const after = guard.sample();
      // The run is recorded before the guard is asked, so a run that trips the
      // after-sample is counted as discarded rather than vanishing from the
      // attempt record. It is still never returned: only a fully accepted
      // attempt produces `runs`.
      measured.push({ run, value, before, after });
      if (guard.isBusy(after)) {
        trip = { stage: `after ${route.path} run ${run} of ${runs}`, load: after, run };
        break;
      }
    }

    if (trip === null) return { status: 'valid', runs: measured, attempts };

    const attemptRecord = {
      attempt: attempt + 1,
      stage: trip.stage,
      reason: busyReason(trip.stage, trip.load, guard.limit),
      load: trip.load,
      discardedRuns: measured.length,
    };
    attempts.push(attemptRecord);
    onAttempt?.(attemptRecord);

    if (attempt >= maxRetries) {
      return {
        status: 'invalid',
        reason: `${attemptRecord.reason} after ${attempt + 1} attempt(s); nothing from this route is used`,
        runs: [],
        attempts,
      };
    }

    const wait = await guard.waitForQuiet();
    onWait?.({ attempt: attempt + 1, ...wait });

    if (!wait.quiet) {
      return {
        status: 'invalid',
        reason: `host did not stay quiet for ${Math.round(guard.quietMs / 1000)} s within ${Math.round(wait.waitedMs / 1000)} s`,
        runs: [],
        attempts,
        waitedMs: wait.waitedMs,
      };
    }
  }
}
