import QRCode from 'qrcode';

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface QrOptions {
  readonly size: number;
  readonly margin: number;
  readonly errorCorrection: QrErrorCorrection;
  readonly dark: string;
  readonly light: string;
}

export const DEFAULT_QR_OPTIONS: QrOptions = {
  size: 512,
  margin: 2,
  errorCorrection: 'M',
  dark: '#101828',
  light: '#FFFFFF',
};

const HEX_COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function validateQrText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Enter some text or a URL first');
  if (trimmed.length > 2000) throw new Error('Keep the text under 2000 characters');
  return trimmed;
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function sanitiseQrOptions(options: Partial<QrOptions> = {}): QrOptions {
  const dark =
    options.dark && HEX_COLOUR.test(options.dark) ? options.dark : DEFAULT_QR_OPTIONS.dark;
  const light =
    options.light && HEX_COLOUR.test(options.light) ? options.light : DEFAULT_QR_OPTIONS.light;

  return {
    size: clamp(options.size ?? DEFAULT_QR_OPTIONS.size, 128, 2048, DEFAULT_QR_OPTIONS.size),
    margin: clamp(options.margin ?? DEFAULT_QR_OPTIONS.margin, 0, 8, DEFAULT_QR_OPTIONS.margin),
    errorCorrection: options.errorCorrection ?? DEFAULT_QR_OPTIONS.errorCorrection,
    dark,
    light,
  };
}

export async function renderQrSvg(text: string, options: Partial<QrOptions> = {}): Promise<string> {
  const value = validateQrText(text);
  const settings = sanitiseQrOptions(options);
  return QRCode.toString(value, {
    type: 'svg',
    width: settings.size,
    margin: settings.margin,
    errorCorrectionLevel: settings.errorCorrection,
    color: { dark: settings.dark, light: settings.light },
  });
}

export async function renderQrPngDataUrl(
  text: string,
  options: Partial<QrOptions> = {},
): Promise<string> {
  const value = validateQrText(text);
  const settings = sanitiseQrOptions(options);
  return QRCode.toDataURL(value, {
    type: 'image/png',
    width: settings.size,
    margin: settings.margin,
    errorCorrectionLevel: settings.errorCorrection,
    color: { dark: settings.dark, light: settings.light },
  });
}
