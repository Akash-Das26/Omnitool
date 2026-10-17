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

export interface ConverterApi {
  run(
    input: ConvertInput,
    onProgress: (progress: number, label?: string) => void,
  ): Promise<ConvertOutput>;
}

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
