import * as Comlink from 'comlink';

export interface WorkerHandle {
  terminate(): void;
}

/**
 * `phase` lets a heavy tool tell the UI which part of the job is running, so
 * first-use codec downloads can show their own state without a mock switch.
 */
export type WorkerProgress = (progress: number, label?: string, phase?: string) => void;

export interface WorkerRemote<TInput, TOutput> {
  run(input: TInput, onProgress: WorkerProgress): Promise<TOutput>;
}

export interface WorkerJobOptions<TInput, TOutput, TRemote extends WorkerRemote<TInput, TOutput>> {
  readonly worker: WorkerHandle;
  readonly remoteFactory?: (worker: WorkerHandle) => TRemote;
  readonly input: TInput;
  readonly onProgress?: WorkerProgress;
}

export class WorkerCancelledError extends Error {
  constructor() {
    super('Job cancelled');
    this.name = 'WorkerCancelledError';
  }
}

export interface WorkerJob<TOutput> {
  readonly promise: Promise<TOutput>;
  cancel(): void;
}

function defaultRemoteFactory<TInput, TOutput>(
  worker: WorkerHandle,
): WorkerRemote<TInput, TOutput> {
  return Comlink.wrap(worker as Worker) as unknown as WorkerRemote<TInput, TOutput>;
}

/**
 * One worker per job. Progress arrives through a Comlink proxy callback; cancel
 * terminates the worker, which always works even if it is inside a tight loop.
 */
export function createWorkerJob<TInput, TOutput, TRemote extends WorkerRemote<TInput, TOutput>>(
  options: WorkerJobOptions<TInput, TOutput, TRemote>,
): WorkerJob<TOutput> {
  const { worker, input, onProgress } = options;
  const remote = (options.remoteFactory ?? defaultRemoteFactory)(worker);

  let settled = false;
  let terminated = false;
  const terminate = () => {
    if (terminated) return;
    terminated = true;
    worker.terminate();
  };
  let rejectCancelled: (reason: Error) => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    rejectCancelled = reject;
  });

  const run = remote.run(
    input,
    Comlink.proxy((progress: number, label?: string, phase?: string) => {
      if (settled) return;
      onProgress?.(Math.max(0, Math.min(100, progress)), label, phase);
    }),
  );

  const promise = Promise.race([run as Promise<TOutput>, cancelled])
    .then((result) => {
      settled = true;
      return result;
    })
    .catch((error: unknown) => {
      settled = true;
      throw error;
    })
    .finally(() => {
      terminate();
    });

  return {
    promise,
    cancel() {
      if (settled) return;
      settled = true;
      terminate();
      rejectCancelled(new WorkerCancelledError());
    },
  };
}
