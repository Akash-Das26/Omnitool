import { describe, expect, it } from 'vitest';
import { ALLOWED_LINKS, URL_TRICKS } from './corpus';
import { checkUrl, IMAGE_RULES, isSafeUrl, LINK_RULES } from './index';

describe('checkUrl', () => {
  it('refuses every disguised script or non-web scheme', () => {
    for (const trick of URL_TRICKS) {
      expect(checkUrl(trick.value, LINK_RULES), `${trick.family}: ${trick.value}`).toBeNull();
    }
  });

  it('keeps the ordinary values the corpus pairs with the tricks', () => {
    for (const allowed of ALLOWED_LINKS) {
      expect(checkUrl(allowed.value, LINK_RULES), allowed.value).toBe(allowed.value);
    }
    // A mail body is text, not markup: the scheme rule is the only rule there.
    expect(checkUrl('mailto:a@example.com?body=<script>', LINK_RULES)).toBe(
      'mailto:a@example.com?body=<script>',
    );
  });

  it('keeps the three schemes a reader may follow', () => {
    expect(checkUrl('https://example.com/a?b=1#c', LINK_RULES)).toBe('https://example.com/a?b=1#c');
    expect(checkUrl('http://example.com', LINK_RULES)).toBe('http://example.com');
    expect(checkUrl('mailto:someone@example.com', LINK_RULES)).toBe('mailto:someone@example.com');
    expect(checkUrl('HTTPS://EXAMPLE.COM/A', LINK_RULES)).toBe('HTTPS://EXAMPLE.COM/A');
  });

  it('removes the characters a browser ignores rather than passing them on', () => {
    expect(checkUrl('  https://example.com/a  ', LINK_RULES)).toBe('https://example.com/a');
    expect(checkUrl('https://exam\u0000ple.com/a', LINK_RULES)).toBe('https://example.com/a');
    expect(checkUrl('https://example.com/a\u2028b', LINK_RULES)).toBe('https://example.com/ab');
  });

  it('keeps a space inside the value instead of dropping it', () => {
    expect(checkUrl('mailto:a@example.com?subject=two words', LINK_RULES)).toBe(
      'mailto:a@example.com?subject=two words',
    );
  });

  it('allows a relative path and a fragment only where the caller asks', () => {
    expect(checkUrl('/tools/diff', LINK_RULES)).toBe('/tools/diff');
    expect(checkUrl('./notes.md', LINK_RULES)).toBe('./notes.md');
    expect(checkUrl('notes.md', LINK_RULES)).toBe('notes.md');
    expect(checkUrl('#section', LINK_RULES)).toBe('#section');
    expect(checkUrl('/tools/diff', {})).toBeNull();
    expect(checkUrl('#section', {})).toBeNull();
    expect(checkUrl('#', LINK_RULES)).toBeNull();
  });

  it('refuses a backslash even after a parser has percent-encoded it', () => {
    // markdown-it rewrites `\\\\evil.example` to `%5Cevil.example` before the
    // check runs; that must not turn into an allowed relative path.
    expect(checkUrl('%5Cevil.example%5Cx', LINK_RULES)).toBeNull();
    expect(checkUrl('%5cevil.example', { allowRelative: true })).toBeNull();
  });

  it('refuses another origin written without a scheme', () => {
    expect(checkUrl('//evil.example/x', { allowRelative: true })).toBeNull();
    expect(checkUrl('//evil.example/x', LINK_RULES)).toBe('//evil.example/x');
    expect(checkUrl('\\\\evil.example\\x', { allowRelative: true })).toBeNull();
  });

  it('refuses a scheme it half-recognises', () => {
    expect(checkUrl('httpx://example.com', LINK_RULES)).toBeNull();
    expect(checkUrl('https://example.com:bad', LINK_RULES)).toBeNull();
    // A single slash is still an http URL to a browser, so it is kept.
    expect(checkUrl('http:/example.com', LINK_RULES)).toBe('http:/example.com');
  });

  it('allows an inline raster image only for an image source', () => {
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    expect(checkUrl(png, IMAGE_RULES)).toBe(png);
    expect(checkUrl(png, LINK_RULES)).toBeNull();
    expect(checkUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', IMAGE_RULES)).toBeNull();
    expect(checkUrl('data:image/png;base64,PHN2Zz4=', { allowDataImage: false })).toBeNull();
  });

  it('does not allow mailto where the caller forbids it', () => {
    expect(
      checkUrl('mailto:a@example.com', { allowMailto: false, allowRelative: true }),
    ).toBeNull();
    expect(checkUrl('mailto:', LINK_RULES)).toBeNull();
  });

  it('answers the boolean question without returning the value', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('/relative', {})).toBe(false);
  });
});
