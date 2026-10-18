import { formatJson, JsonSyntaxError, minifyJson } from '@omnitool/tool-core';
import * as Comlink from 'comlink';
import type { JsonWorkerApi, JsonWorkerResult } from './types';

function pause(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 40));
}

const api: JsonWorkerApi = {
  async run(input, onProgress): Promise<JsonWorkerResult> {
    onProgress(15, 'Reading the JSON');
    await pause();

    try {
      const output =
        input.mode === 'minify' ? minifyJson(input.text) : formatJson(input.text, input.indent);
      onProgress(85, 'Writing the result');
      await pause();
      onProgress(100, 'Done');
      return { ok: true, output };
    } catch (cause) {
      if (cause instanceof JsonSyntaxError) {
        return {
          ok: false,
          error: { message: cause.message, line: cause.line, column: cause.column },
        };
      }
      return {
        ok: false,
        error: {
          message: cause instanceof Error ? cause.message : 'That JSON could not be read',
          line: 1,
          column: 1,
        },
      };
    }
  },
};

Comlink.expose(api);
