/**
 * Scheme tricks, grouped by the family of trick they use.
 *
 * Every entry here has been published as a way to get a browser to follow a
 * `javascript:`, `vbscript:` or `data:` address while a naive check sees a
 * relative path, an entity or nothing at all. Keeping them in one module means
 * every producer is tested against the same list rather than its own memory of
 * what a trick looks like.
 *
 * `url.test.ts` proves `checkUrl` refuses each one; `url/producers.test.ts`
 * proves the markdown parser, the HTML sanitiser and the meta tag builder never
 * write one into markup. A new producer belongs in that second file.
 */

export interface UrlTrick {
  /** What the trick relies on, so a failure names the class and not only the string. */
  readonly family: string;
  readonly value: string;
}

/** Values a reader may follow, with the rule that allows them. */
export interface AllowedValue {
  readonly family: string;
  readonly value: string;
}

export const URL_TRICKS: readonly UrlTrick[] = Object.freeze([
  { family: 'scheme', value: 'javascript:alert(1)' },
  { family: 'scheme', value: 'vbscript:msgbox(1)' },
  { family: 'scheme', value: 'data:text/html,<script>alert(1)</script>' },
  { family: 'scheme', value: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' },
  { family: 'scheme', value: 'file:///etc/passwd' },
  { family: 'scheme', value: 'blob:https://evil.example/id' },
  { family: 'scheme', value: 'filesystem:https://evil.example/temporary/x' },
  { family: 'scheme', value: 'about:blank' },
  { family: 'scheme', value: 'chrome://settings' },
  { family: 'scheme', value: 'view-source:https://evil.example' },
  { family: 'scheme', value: 'jar:https://evil.example/x.jar!/' },
  { family: 'scheme', value: 'ftp://evil.example/x' },
  { family: 'scheme', value: 'ws://evil.example/socket' },
  { family: 'scheme', value: 'tel:+441234567890' },
  { family: 'scheme', value: 'sms:+441234567890' },
  { family: 'case', value: 'JaVaScRiPt:alert(1)' },
  { family: 'case', value: 'jAvAsCrIpT:alert(document.domain)' },
  { family: 'case', value: 'VBScript:msgbox(1)' },
  { family: 'whitespace', value: ' javascript:alert(1)' },
  { family: 'whitespace', value: '\tjavascript:alert(1)' },
  { family: 'whitespace', value: '\njavascript:alert(1)' },
  { family: 'whitespace', value: '\r\njavascript:alert(1)' },
  { family: 'control', value: 'java\tscript:alert(1)' },
  { family: 'control', value: 'java\nscript:alert(1)' },
  { family: 'control', value: 'java\rscript:alert(1)' },
  { family: 'control', value: 'java\u0000script:alert(1)' },
  { family: 'control', value: 'java\u000bscript:alert(1)' },
  { family: 'control', value: 'java\u000cscript:alert(1)' },
  { family: 'control', value: 'java\u2028script:alert(1)' },
  { family: 'control', value: 'java\u2029script:alert(1)' },
  { family: 'control', value: 'javascript\u0000:alert(1)' },
  { family: 'control', value: '\u200bjavascript:alert(1)' },
  { family: 'control', value: '\ufeffjavascript:alert(1)' },
  { family: 'entity-decimal', value: '&#106;avascript:alert(1)' },
  { family: 'entity-decimal', value: '&#106;avascript&colon;alert(1)' },
  { family: 'entity-decimal', value: '&#0000106;avascript:alert(1)' },
  { family: 'entity-hex', value: '&#x6a;avascript:alert(1)' },
  { family: 'entity-hex', value: '&#X6A;avascript:alert(1)' },
  { family: 'entity-named', value: '&Tab;javascript:alert(1)' },
  { family: 'entity-named', value: '&NewLine;javascript:alert(1)' },
  { family: 'entity-named', value: 'javascript&colon;alert(1)' },
  { family: 'entity-named', value: 'javascript&#58;alert(1)' },
  { family: 'entity-named', value: 'javascript&#x3a;alert(1)' },
  { family: 'entity-double', value: '&amp;#106;avascript:alert(1)' },
  { family: 'entity-double', value: '&amp;amp;#106;avascript:alert(1)' },
  { family: 'percent', value: '%6aavascript:alert(1)' },
  { family: 'percent', value: 'java%0Ascript:alert(1)' },
  { family: 'percent', value: 'javascript%3Aalert(1)' },
  { family: 'fullwidth', value: 'ｊａｖａｓｃｒｉｐｔ:alert(1)' },
  { family: 'fullwidth', value: 'ＪＡＶＡＳＣＲＩＰＴ:alert(1)' },
  { family: 'windows-path', value: '\\\\evil.example\\x' },
  { family: 'windows-path', value: '/\\evil.example/x' },
  { family: 'windows-path', value: 'https:\\\\evil.example\\x' },
  { family: 'malformed', value: 'http://' },
  { family: 'malformed', value: 'https://' },
  { family: 'malformed', value: 'javascript:' },
  { family: 'malformed', value: ':' },
  { family: 'malformed', value: '%%%' },
  { family: 'empty', value: '' },
  { family: 'empty', value: ' ' },
]);

/** The same corpus as plain strings, for callers that do not need the family. */
export const URL_TRICK_VALUES: readonly string[] = Object.freeze(
  URL_TRICKS.map((trick) => trick.value),
);

/**
 * Values that must survive where the caller allows them, so a producer cannot
 * pass its tests by refusing everything.
 */
export const ALLOWED_LINKS: readonly AllowedValue[] = Object.freeze([
  { family: 'https', value: 'https://example.com/a?b=1#c' },
  { family: 'http', value: 'http://example.com/a' },
  { family: 'mailto', value: 'mailto:someone@example.com' },
  { family: 'relative', value: '/tools/text-diff' },
  { family: 'relative', value: './notes.md' },
  { family: 'fragment', value: '#section' },
]);

/** A base64 PNG, one pixel: the only `data:` value a producer may keep. */
export const INLINE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
