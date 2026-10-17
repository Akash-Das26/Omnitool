import { describe, expect, it } from 'vitest';
import { renderQrPngDataUrl, renderQrSvg, sanitiseQrOptions, validateQrText } from './index';

describe('validateQrText', () => {
  it('trims surrounding whitespace', () => {
    expect(validateQrText('  https://example.com  ')).toBe('https://example.com');
  });

  it('rejects empty and oversized text', () => {
    expect(() => validateQrText('   ')).toThrow('Enter some text');
    expect(() => validateQrText('a'.repeat(2001))).toThrow('under 2000');
  });
});

describe('sanitiseQrOptions', () => {
  it('fills defaults and clamps sizes', () => {
    expect(sanitiseQrOptions({ size: 99, margin: 99 })).toMatchObject({
      size: 128,
      margin: 8,
      errorCorrection: 'M',
    });
  });

  it('rejects invalid colours', () => {
    expect(sanitiseQrOptions({ dark: 'red', light: '#fff' })).toMatchObject({
      dark: '#101828',
      light: '#fff',
    });
  });
});

describe('QR rendering', () => {
  it('renders an SVG with the requested width', async () => {
    const svg = await renderQrSvg('https://example.com', { size: 256 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="256"');
    expect(svg).not.toContain('<script');
  });

  it('renders a PNG data URL', async () => {
    const dataUrl = await renderQrPngDataUrl('hello');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it('rejects empty input', async () => {
    await expect(renderQrSvg('')).rejects.toThrow('Enter some text');
  });
});
