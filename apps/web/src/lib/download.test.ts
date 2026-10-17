import { afterEach, describe, expect, it, vi } from 'vitest';
import { dataUrlToBlob, downloadBlob } from './download';

describe('downloadBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('clicks a temporary anchor and revokes the URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadBlob(new Blob(['hello']), 'hello.txt');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="hello.txt"]')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});

describe('dataUrlToBlob', () => {
  it('decodes the MIME type and payload', async () => {
    const blob = dataUrlToBlob('data:text/plain;base64,aGVsbG8=');
    expect(blob.type).toBe('text/plain');
    expect(await blob.text()).toBe('hello');
  });

  it('rejects malformed input', () => {
    expect(() => dataUrlToBlob('not-a-data-url')).toThrow('malformed');
  });
});
