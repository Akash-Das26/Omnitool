import { describe, expect, it } from 'vitest';
import {
  createLoadGuard,
  DEFAULT_MAX_RETRIES,
  measureRoute,
  resultIsReusable,
} from './lighthouse-guard.mjs';

/**
 * A fake host: `readLoad` pops the next 1-minute load from a script, and the
 * clock only moves when `sleep` is called, so a ten-minute wait costs nothing
 * and every assertion is about the logic rather than the machine.
 */
function fakeHost(loads) {
  let time = 0;
  let index = 0;
  const sleeps = [];
  return {
    reads: 0,
    sleeps,
    now: () => time,
    readLoad: () => {
      const one = loads[Math.min(index, loads.length - 1)];
      index += 1;
      return { one, five: one };
    },
    sleep: async (ms) => {
      sleeps.push(ms);
      time += ms;
    },
    guard: null,
  };
}

function guardFor(host, options = {}) {
  return createLoadGuard({
    readLoad: host.readLoad,
    limit: 4,
    now: host.now,
    sleep: host.sleep,
    ...options,
  });
}

describe('the load guard', () => {
  it('trips when the sampled load is above the limit, and not at it', () => {
    const host = fakeHost([3.99, 4.01]);
    const guard = guardFor(host);

    expect(guard.isBusy(guard.sample())).toBe(false);
    expect(guard.isBusy(guard.sample())).toBe(true);
  });

  it('waits until the load has stayed inside the limit for 30 seconds', async () => {
    // Busy for two samples, then quiet; the 30 s window starts at the first
    // quiet sample, so it returns after 30 s of quiet, not after 30 s total.
    const host = fakeHost([9, 8, 3, 3, 3, 3, 3, 3, 3]);
    const guard = guardFor(host);

    const wait = await guard.waitForQuiet();

    expect(wait.quiet).toBe(true);
    expect(wait.waitedMs).toBe(40_000);
    expect(wait.samples.length).toBe(9);
    expect(host.sleeps.every((ms) => ms === 5_000)).toBe(true);
  });

  it('starts the quiet window again when a busy sample interrupts it', async () => {
    // Quiet at t=5, busy again at t=10, quiet from t=15: 30 s of quiet completes
    // at t=45, not at t=35.
    const host = fakeHost([3, 3, 9, 3, 3, 3, 3, 3, 3, 3]);
    const guard = guardFor(host);

    const wait = await guard.waitForQuiet();

    expect(wait.quiet).toBe(true);
    expect(wait.waitedMs).toBe(45_000);
  });

  it('gives up after the maximum wait instead of waiting forever', async () => {
    const host = fakeHost([9]);
    const guard = guardFor(host);

    const wait = await guard.waitForQuiet();

    expect(wait.quiet).toBe(false);
    expect(wait.waitedMs).toBe(600_000);
    expect(host.sleeps.length).toBe(120);
  });

  it('refuses a guard with no load source or a nonsense limit', () => {
    expect(() => createLoadGuard({ limit: 4 })).toThrow(/readLoad/);
    expect(() => createLoadGuard({ readLoad: () => ({ one: 1, five: 1 }), limit: 0 })).toThrow(
      /positive limit/,
    );
  });
});

describe('measuring one route', () => {
  /** A host that is quiet until `busyAt` reads, then quiet again. */
  function scriptedGuard(script) {
    const host = fakeHost(script);
    return { host, guard: guardFor(host) };
  }

  it('accepts three runs when every sample is inside the limit', async () => {
    const { guard } = scriptedGuard([2, 2, 2, 2, 2, 2]);
    const calls = [];

    const result = await measureRoute({
      route: { path: '/tools/x/', name: 'tool-x' },
      runs: 3,
      guard,
      measure: async (_route, run) => {
        calls.push(run);
        return { score: 100 };
      },
    });

    expect(result.status).toBe('valid');
    expect(calls).toEqual([1, 2, 3]);
    expect(result.runs.map((run) => run.run)).toEqual([1, 2, 3]);
    expect(result.attempts).toEqual([]);
  });

  it('trips on a busy sample after a run, waits, and retries the route from run 1', async () => {
    // Run 1 is quiet before and busy after; the wait then sees 30 s of quiet,
    // and the retry's runs 1-3 are all accepted.
    const { host, guard } = scriptedGuard([2, 9, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2]);
    const calls = [];

    const result = await measureRoute({
      route: { path: '/tools/x/', name: 'tool-x' },
      runs: 3,
      guard,
      measure: async (_route, run) => {
        calls.push(run);
        return { score: 100 };
      },
    });

    expect(result.status).toBe('valid');
    // The tripped attempt's run 1 is discarded; the accepted runs restart at 1.
    expect(calls).toEqual([1, 1, 2, 3]);
    expect(result.runs.map((run) => run.run)).toEqual([1, 2, 3]);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].discardedRuns).toBe(1);
    expect(result.attempts[0].reason).toMatch(/after \/tools\/x\/ run 1 of 3/);
    expect(host.sleeps.length).toBeGreaterThan(0);
  });

  it('never mixes runs from two attempts into one result', async () => {
    // Runs 1 and 2 are accepted, then the guard trips before run 3.
    const { guard } = scriptedGuard([2, 2, 2, 2, 9, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2]);
    const seen = [];

    const result = await measureRoute({
      route: { path: '/tools/y/', name: 'tool-y' },
      runs: 3,
      guard,
      measure: async (_route, run) => {
        seen.push(run);
        return { run };
      },
    });

    expect(result.status).toBe('valid');
    // Two runs were accepted, then the third tripped: all three are discarded.
    expect(seen).toEqual([1, 2, 1, 2, 3]);
    expect(result.runs).toHaveLength(3);
    expect(result.attempts[0].discardedRuns).toBe(2);
    expect(result.runs.map((run) => run.value.run)).toEqual([1, 2, 3]);
  });

  it('gives up on a route after the retry limit and keeps its reasons', async () => {
    // Trips immediately, but the host always claims to be quiet: only the
    // retry limit stops it.
    const guard = {
      sample: () => ({ one: 9, five: 9, limit: 4 }),
      isBusy: () => true,
      limit: 4,
      quietMs: 30_000,
      waitForQuiet: async () => ({ quiet: true, waitedMs: 30_000, samples: [] }),
    };

    const result = await measureRoute({
      route: { path: '/tools/z/', name: 'tool-z' },
      runs: 3,
      guard,
      maxRetries: DEFAULT_MAX_RETRIES,
      measure: async () => ({ score: 1 }),
    });

    expect(result.status).toBe('invalid');
    expect(result.runs).toEqual([]);
    expect(result.attempts).toHaveLength(DEFAULT_MAX_RETRIES + 1);
    expect(result.reason).toMatch(/nothing from this route is used/);
  });

  it('stops retrying when the host refuses to settle', async () => {
    const guard = {
      sample: () => ({ one: 9, five: 9, limit: 4 }),
      isBusy: () => true,
      limit: 4,
      quietMs: 30_000,
      waitForQuiet: async () => ({ quiet: false, waitedMs: 600_000, samples: [] }),
    };

    const result = await measureRoute({
      route: { path: '/tools/w/', name: 'tool-w' },
      runs: 3,
      guard,
      measure: async () => ({ score: 1 }),
    });

    expect(result.status).toBe('invalid');
    expect(result.runs).toEqual([]);
    expect(result.reason).toMatch(/host did not stay quiet/);
    expect(result.waitedMs).toBeGreaterThanOrEqual(600_000);
  });
});

describe('reusing a stored result', () => {
  const stored = {
    status: 'valid',
    commit: 'abc123',
    buildHash: 'deadbeef',
    runs: [{}, {}, {}],
  };

  it('reuses a valid result for the same commit, build and run count', () => {
    expect(resultIsReusable(stored, { commit: 'abc123', buildHash: 'deadbeef', runs: 3 })).toBe(
      true,
    );
  });

  it('measures again when the commit changed', () => {
    expect(resultIsReusable(stored, { commit: 'abc124', buildHash: 'deadbeef', runs: 3 })).toBe(
      false,
    );
  });

  it('measures again when the build changed, even at the same commit', () => {
    expect(resultIsReusable(stored, { commit: 'abc123', buildHash: 'feedface', runs: 3 })).toBe(
      false,
    );
  });

  it('does not reuse an invalid result, a short result or nothing at all', () => {
    expect(
      resultIsReusable(
        { ...stored, status: 'invalid' },
        {
          commit: 'abc123',
          buildHash: 'deadbeef',
          runs: 3,
        },
      ),
    ).toBe(false);
    expect(
      resultIsReusable(
        { ...stored, runs: [{}, {}] },
        {
          commit: 'abc123',
          buildHash: 'deadbeef',
          runs: 3,
        },
      ),
    ).toBe(false);
    expect(resultIsReusable(null, { commit: 'abc123', buildHash: 'deadbeef', runs: 3 })).toBe(
      false,
    );
  });
});
