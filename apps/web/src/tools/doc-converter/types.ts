import type { MarkdownDocument } from '@omnitool/tool-core/markdown';

export interface DocxInput {
  readonly buffer: ArrayBuffer;
  readonly filename: string;
}

export interface DocxResult {
  /**
   * The converted document, not the converted text: the page renders Markdown,
   * HTML or plain text from the same model, so changing the output format does
   * not read the file again.
   */
  readonly document: MarkdownDocument;
  readonly warnings: readonly string[];
}

export interface DocxWorkerApi {
  run(
    input: DocxInput,
    /**
     * A Comlink proxy: it returns a promise, and the worker awaits its last call
     * so the answer is not dropped by Firefox (see `worker.ts`).
     */
    onProgress: (progress: number, label?: string, phase?: string) => void | Promise<void>,
  ): Promise<DocxResult>;
}
