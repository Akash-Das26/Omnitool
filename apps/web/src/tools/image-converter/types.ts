export type TargetFormat = 'png' | 'jpeg' | 'webp';

export interface ConvertInput {
  readonly file: Blob;
  readonly target: TargetFormat;
  readonly quality: number;
}

export interface ConvertOutput {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
}

/** Which part of the job a progress report belongs to. */
export type ConvertPhase = 'prepare' | 'convert';

export interface ConverterApi {
  run(
    input: ConvertInput,
    onProgress: (progress: number, label?: string, phase?: string) => void,
  ): Promise<ConvertOutput>;
}

/**
 * The codec this build uses. Native canvas codecs ship with the browser, so
 * there is nothing to download yet: the first-use state is simulated with the
 * size the real WASM codec is expected to need, and the UI says so.
 */
export const SAMPLE_CODEC = {
  name: 'Image codec (sample)',
  bytes: 2_097_152,
  simulated: true,
} as const;

export const TARGET_MIME: Readonly<Record<TargetFormat, string>> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export const TARGET_EXTENSION: Readonly<Record<TargetFormat, string>> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};
