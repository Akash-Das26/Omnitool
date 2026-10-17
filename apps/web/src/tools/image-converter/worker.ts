import * as Comlink from 'comlink';
import { type ConverterApi, type ConvertOutput, TARGET_MIME } from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function report(
  onProgress: (progress: number, label?: string) => void,
  from: number,
  to: number,
  label: string,
): Promise<void> {
  const steps = 6;
  for (let step = 0; step <= steps; step += 1) {
    onProgress(Math.round(from + ((to - from) * step) / steps), label);
    await delay(90);
  }
}

const api: ConverterApi = {
  async run(input, onProgress) {
    // Phase 1 has no real codec download. This stand-in keeps the first-use,
    // progress and cancel states honest and testable until the WASM codecs land.
    await report(onProgress, 2, 38, 'Downloading sample converter (2.1 MB)');
    onProgress(40, 'Reading image');
    await delay(120);

    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      throw new Error(
        'This browser cannot convert images in a worker. Try a recent Chrome, Firefox or Safari.',
      );
    }

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(input.file);
    } catch {
      throw new Error('That image could not be read. Try a PNG, JPEG or WebP file.');
    }

    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The canvas could not be created');

      if (input.target === 'jpeg') {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, bitmap.width, bitmap.height);
      }
      context.drawImage(bitmap, 0, 0);

      await report(onProgress, 55, 94, 'Converting');

      const blob = await canvas.convertToBlob({
        type: TARGET_MIME[input.target],
        quality: input.target === 'png' ? undefined : input.quality,
      });

      onProgress(100, 'Done');
      const result: ConvertOutput = { blob, width: bitmap.width, height: bitmap.height };
      return result;
    } finally {
      bitmap.close();
    }
  },
};

Comlink.expose(api);
