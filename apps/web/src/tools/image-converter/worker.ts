import * as Comlink from 'comlink';
import {
  type ConverterApi,
  type ConvertInput,
  type ConvertOutput,
  SAMPLE_CODEC,
  TARGET_MIME,
} from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Phase 1 has no WASM codec yet. The prepare step stands in for the first-use
 * download so the download, cancel and cached states are real state transitions
 * rather than a mock switch; the UI discloses the simulation.
 */
async function prepare(
  onProgress: (progress: number, label?: string, phase?: string) => void,
): Promise<void> {
  const steps = 12;
  for (let step = 1; step <= steps; step += 1) {
    const loaded = Math.round((SAMPLE_CODEC.bytes * step) / steps);
    onProgress(
      Math.round(2 + (36 * step) / steps),
      `Fetching ${SAMPLE_CODEC.name} — ${(loaded / 1024 / 1024).toFixed(1)} of ${(
        SAMPLE_CODEC.bytes / 1024 / 1024
      ).toFixed(1)} MB`,
      'prepare',
    );
    await delay(70);
  }
}

async function convert(
  input: ConvertInput,
  onProgress: (progress: number, label?: string, phase?: string) => void,
): Promise<ConvertOutput> {
  onProgress(40, 'Reading image', 'convert');
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

    for (let step = 1; step <= 4; step += 1) {
      onProgress(Math.round(55 + (39 * step) / 4), 'Converting', 'convert');
      await delay(80);
    }

    const blob = await canvas.convertToBlob({
      type: TARGET_MIME[input.target],
      quality: input.target === 'png' ? undefined : input.quality,
    });

    onProgress(100, 'Done', 'convert');
    return { blob, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

const api: ConverterApi = {
  async run(input, onProgress) {
    await prepare(onProgress);
    return convert(input, onProgress);
  },
};

Comlink.expose(api);
