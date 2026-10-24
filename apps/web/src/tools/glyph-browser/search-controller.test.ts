import { describe, expect, it, vi } from 'vitest';
import {
  createGlyphSearch,
  type GlyphSearchBackend,
  type GlyphSearchState,
} from './search-controller';
import type { GlyphSearchData, GlyphSearchInput } from './search-worker';

function data(query: string): GlyphSearchData {
  return {
    results: [
      { codePoint: 0x41, name: `RESULT FOR ${query}`, category: 'Lu', block: 'Basic Latin' },
    ],
    total: 1,
    version: '16.0.0',
    source: 'test',
    gzipBytes: 1_160_576,
  };
}

interface Deferred {
  resolve(value: GlyphSearchData): void;
  reject(cause: unknown): void;
}

function fakeBackend(): {
  backend: GlyphSearchBackend;
  cancel: ReturnType<typeof vi.fn>;
  calls: GlyphSearchInput[];
  deferreds: Deferred[];
  progress(index: number, label?: string, phase?: string): void;
} {
  const calls: GlyphSearchInput[] = [];
  const deferreds: Deferred[] = [];
  const progressFns: ((progress: number, label?: string, phase?: string) => void)[] = [];
  const cancel = vi.fn();
  const backend: GlyphSearchBackend = {
    run(input, onProgress) {
      calls.push(input);
      progressFns.push(onProgress);
      return new Promise<GlyphSearchData>((resolve, reject) => {
        deferreds.push({ resolve, reject });
      });
    },
    cancel,
  };
  return {
    backend,
    cancel,
    calls,
    deferreds,
    progress(index, label, phase) {
      progressFns[index]?.(50, label, phase);
    },
  };
}

describe('createGlyphSearch', () => {
  it('keeps one backend and reuses it once a search is done', async () => {
    const fake = fakeBackend();
    const factory = vi.fn(() => fake.backend);
    const states: GlyphSearchState[] = [];
    const search = createGlyphSearch(factory, (state) => states.push(state));

    search.search({ query: 'grinning', limit: 200 });
    await Promise.resolve();
    fake.deferreds[0]?.resolve(data('grinning'));
    await Promise.resolve();
    await Promise.resolve();

    search.search({ query: 'face', limit: 200 });
    await Promise.resolve();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(fake.cancel).not.toHaveBeenCalled();
    expect(states.at(-1)).toMatchObject({ status: 'running' });
  });

  it('queues the latest query instead of terminating the loaded worker', async () => {
    const first = fakeBackend();
    const factory = vi.fn(() => first.backend);
    const states: GlyphSearchState[] = [];
    const search = createGlyphSearch(factory, (state) => states.push(state));

    search.search({ query: 'a', limit: 200 });
    search.search({ query: 'b', limit: 200 });
    search.search({ query: 'bc', limit: 200 });

    // Nothing is killed and no second worker is built: the index it holds is
    // what makes the queued query fast.
    expect(factory).toHaveBeenCalledTimes(1);
    expect(first.cancel).not.toHaveBeenCalled();
    expect(first.calls.map((call) => call.query)).toEqual(['a']);

    first.deferreds[0]?.resolve(data('a'));
    await Promise.resolve();
    await Promise.resolve();

    // The superseded query is skipped and only the newest one runs.
    expect(first.calls.map((call) => call.query)).toEqual(['a', 'bc']);
  });

  it('does not report the result of a query that has been superseded', async () => {
    const fake = fakeBackend();
    const states: GlyphSearchState[] = [];
    const search = createGlyphSearch(
      () => fake.backend,
      (state) => states.push(state),
    );

    search.search({ query: 'old', limit: 200 });
    search.search({ query: 'new', limit: 200 });
    fake.deferreds[0]?.resolve(data('old'));
    await Promise.resolve();
    await Promise.resolve();

    expect(JSON.stringify(states)).not.toContain('RESULT FOR old');
    expect(states.at(-1)).toMatchObject({ status: 'running', query: 'new' });

    fake.deferreds[1]?.resolve(data('new'));
    await Promise.resolve();
    await Promise.resolve();

    expect(states.at(-1)).toMatchObject({ status: 'done', query: 'new' });
  });

  it('reports the worker’s phase and label while it runs, with the last query’s wording', async () => {
    const fake = fakeBackend();
    const states: GlyphSearchState[] = [];
    const search = createGlyphSearch(
      () => fake.backend,
      (state) => states.push(state),
    );

    search.search({ query: 'grinning', limit: 200 });
    fake.progress(0, 'Downloading 1,134 kB of names', 'download');

    expect(states.at(-1)).toEqual({
      status: 'running',
      query: 'grinning',
      phase: 'download',
      label: 'Downloading 1,134 kB of names',
    });
  });

  it('ignores a phase name it does not know', async () => {
    const fake = fakeBackend();
    const states: GlyphSearchState[] = [];
    const search = createGlyphSearch(
      () => fake.backend,
      (state) => states.push(state),
    );

    search.search({ query: 'grinning', limit: 200 });
    fake.progress(0, 'Something else', 'unexpected');

    expect(states.at(-1)).toEqual({
      status: 'running',
      query: 'grinning',
      phase: undefined,
      label: 'Something else',
    });
  });

  it('reports a failure and starts a fresh backend next time', async () => {
    const fake = fakeBackend();
    const factory = vi.fn(() => fake.backend);
    const states: GlyphSearchState[] = [];
    const search = createGlyphSearch(factory, (state) => states.push(state));

    search.search({ query: 'grinning', limit: 200 });
    fake.deferreds[0]?.reject(new Error('Character names are not available (404).'));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(states.at(-1)).toEqual({
      status: 'error',
      query: 'grinning',
      message: 'Character names are not available (404).',
    });

    search.search({ query: 'face', limit: 200 });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('turns a non-Error rejection into a message', async () => {
    const fake = fakeBackend();
    const states: GlyphSearchState[] = [];
    const search = createGlyphSearch(
      () => fake.backend,
      (state) => states.push(state),
    );

    search.search({ query: 'x', limit: 200 });
    fake.deferreds[0]?.reject('gone');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(states.at(-1)).toEqual({
      status: 'error',
      query: 'x',
      message: 'The search could not run.',
    });
  });

  it('stops the backend and ignores late results on dispose', async () => {
    const fake = fakeBackend();
    const states: GlyphSearchState[] = [];
    const search = createGlyphSearch(
      () => fake.backend,
      (state) => states.push(state),
    );

    search.search({ query: 'grinning', limit: 200 });
    const before = states.length;
    search.dispose();
    fake.deferreds[0]?.resolve(data('grinning'));
    await Promise.resolve();
    await Promise.resolve();

    expect(fake.cancel).toHaveBeenCalledTimes(1);
    expect(states).toHaveLength(before);
  });
});
