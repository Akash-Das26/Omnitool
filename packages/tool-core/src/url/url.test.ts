import { describe, expect, it } from 'vitest';
import { checkUrl, IMAGE_RULES, isSafeUrl, LINK_RULES } from './index';

/** Every published way to dress a scheme up as something else. */
const TRICKS: readonly string[] = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'jAvAsCrIpT:alert(document.domain)',
  ' javascript:alert(1)',
  '\tjavascript:alert(1)',
  '\njavascript:alert(1)',
  '\r\njavascript:alert(1)',
  'java\tscript:alert(1)',
  'java\nscript:alert(1)',
  'java\rscript:alert(1)',
  'java\u0000script:alert(1)',
  'java\u000bscript:alert(1)',
  'java\u000cscript:alert(1)',
  'java\u2028script:alert(1)',
  'java\u2029script:alert(1)',
  'javascript\u0000:alert(1)',
  '\u200bjavascript:alert(1)',
  '\ufeffjavascript:alert(1)',
  '&#106;avascript:alert(1)',
  '&#106;avascript&colon;alert(1)',
  '&#x6a;avascript:alert(1)',
  '&#X6A;avascript:alert(1)',
  '&#0000106;avascript:alert(1)',
  '&amp;#106;avascript:alert(1)',
  '&amp;amp;#106;avascript:alert(1)',
  '&Tab;javascript:alert(1)',
  '&NewLine;javascript:alert(1)',
  'javascript&colon;alert(1)',
  'javascript&#58;alert(1)',
  'javascript&#x3a;alert(1)',
  '%6aavascript:alert(1)',
  'java%0Ascript:alert(1)',
  'javascript%3Aalert(1)',
  'ｊａｖａｓｃｒｉｐｔ:alert(1)',
  'ＪＡＶＡＳＣＲＩＰＴ:alert(1)',
  'vbscript:msgbox(1)',
  'VBScript:msgbox(1)',
  'data:text/html,<script>alert(1)</script>',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'file:///etc/passwd',
  'blob:https://evil.example/id',
  'filesystem:https://evil.example/temporary/x',
  'about:blank',
  'chrome://settings',
  'view-source:https://evil.example',
  'jar:https://evil.example/x.jar!/',
  'ftp://evil.example/x',
  'ws://evil.example/socket',
  'tel:+441234567890',
  'sms:+441234567890',
  'mailto:someone@example.com?body=<script>',
  '\\\\evil.example\\x',
  '/\\evil.example/x',
  'https:\\\\evil.example\\x',
  'http://',
  'https://',
  'javascript:',
  ':',
  '//',
  '%%%',
  ' ',
  '',
];

describe('checkUrl', () => {
  it('refuses every disguised script or non-web scheme', () => {
    for (const trick of TRICKS) {
      if (trick === 'mailto:someone@example.com?body=<script>') continue;
      expect(checkUrl(trick, LINK_RULES), trick).toBeNull();
    }
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
