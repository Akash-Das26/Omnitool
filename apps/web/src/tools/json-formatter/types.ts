import type { JsonErrorInfo, JsonIndent } from '@omnitool/tool-core';

export interface JsonWorkerInput {
  readonly text: string;
  readonly mode: 'format' | 'minify';
  readonly indent: JsonIndent;
}

export type JsonWorkerResult =
  | { readonly ok: true; readonly output: string }
  | { readonly ok: false; readonly error: JsonErrorInfo };

export interface JsonWorkerApi {
  run(
    input: JsonWorkerInput,
    onProgress: (progress: number, label?: string) => void,
  ): Promise<JsonWorkerResult>;
}
