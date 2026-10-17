import { describe, expect, it, vi } from 'vitest';
import { createWorkerJob, WorkerCancelledError, type WorkerHandle } from './job';

function fakeWorker(): WorkerHandle {
  return { terminate: vi.fn() };
}

describe('createWorkerJob', () => {
  it('reports progress through the proxy callback and resolves the result', async () => {
    const worker = fakeWorker();
    const progress = vi.fn();
    const remoteFactory = () => ({
      async run(input: number, onProgress: (value: number, label?: string) => void) {
        onProgress(10, 'Reading');
        onProgress(120, 'Clamped');
        return input * 2;
      },
    });

    const job = createWorkerJob({
      worker,
      remoteFactory,
      input: 21,
      onProgress: progress,
    });

    await expect(job.promise).resolves.toBe(42);
    expect(progress).toHaveBeenNthCalledWith(1, 10, 'Reading');
    expect(progress).toHaveBeenNthCalledWith(2, 100, 'Clamped');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('cancels by terminating the worker and rejecting', async () => {
    const worker = fakeWorker();
    const remoteFactory = () => ({
      run: () => new Promise<never>(() => {}),
    });

    const job = createWorkerJob({ worker, remoteFactory, input: null });
    job.cancel();
    job.cancel();

    await expect(job.promise).rejects.toBeInstanceOf(WorkerCancelledError);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('terminates and rejects when the worker throws', async () => {
    const worker = fakeWorker();
    const remoteFactory = () => ({
      async run() {
        throw new Error('decode failed');
      },
    });

    const job = createWorkerJob({ worker, remoteFactory, input: null });
    await expect(job.promise).rejects.toThrow('decode failed');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
