/**
 * The one place a URL from outside the app is turned into something the app
 * will follow.
 *
 * Every producer of a link, an `href`, a `src`, a form action or a document
 * URL calls `checkUrl`; nothing else does its own scheme test. The rules are
 * deliberately stricter than a browser's, because the point is to refuse a
 * destination a reader could be tricked into following, not to predict what
 * the browser would do with a malformed one.
 *
 * What it does, in order:
 *
 *   1. unwraps HTML character references (decimal, hexadecimal and named, with
 *      or without the semicolon), up to three layers, because `&amp;#106;` is a
 *      common way to smuggle a scheme past a single decode;
 *   2. removes ASCII control characters, Unicode separators and whitespace
 *      from the ends and from inside the value, the way a browser ignores
 *      tabs and newlines inside a URL;
 *   3. probes a percent-decoded, NFKC-folded copy of the part before the first
 *      slash, query or fragment for a scheme, so `%6aavascript:` and fullwidth
 *      letters are seen for what they are;
 *   4. allows only `http:`, `https:` and (where asked) `mailto:`; `data:` only
 *      for an inline image where asked;
 *   5. treats `//host/path` and `\\host\path` as protocol-relative and refuses
 *      them unless the caller explicitly allows it, and treats everything else
 *      without a scheme as relative, allowed only where the caller allows it.
 */

export interface UrlRules {
  /** Allow a same-origin relative path (`/a`, `./a`, `../a`, `a`). */
  readonly allowRelative?: boolean;
  /** Allow a fragment (`#section`). Defaults to the relative answer. */
  readonly allowFragment?: boolean;
  /** Allow `mailto:`. Default true. */
  readonly allowMailto?: boolean;
  /** Allow `//host/path`. Default false: it is another origin. */
  readonly allowProtocolRelative?: boolean;
  /** Allow a `data:image/...;base64,...` value (inline images only). */
  readonly allowDataImage?: boolean;
}

/** Inline raster images, base64 only: no SVG, which can carry script. */
export const DATA_IMAGE = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

const NAMED: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  colon: ':',
  sol: '/',
  period: '.',
  tab: '\t',
  newline: '\n',
  quest: '?',
  num: '#',
  percnt: '%',
};

/**
 * Decodes one layer of character references. An unknown name is left as it is:
 * decoding something we do not recognise could invent a scheme.
 */
function decodeOnce(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);?/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

/**
 * Removes the characters a browser ignores inside a URL — C0 and C1 controls,
 * zero-width characters, byte-order marks and Unicode line separators — and
 * trims whitespace at the ends. A space inside the value is left alone: a
 * browser would encode it, not drop it.
 */
function stripIgnored(text: string): string {
  let out = '';
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) continue;
    if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff) continue;
    if (character === '\u2028' || character === '\u2029') continue;
    out += character;
  }
  return out.trim();
}

/** What the cleaned value would look like to a parser that decodes more than a browser does. */
function probe(value: string): string {
  const head = value.split(/[/?#]/, 1)[0] ?? '';
  let decoded = head;
  try {
    decoded = decodeURIComponent(head);
  } catch {
    // A malformed escape is not a scheme either.
  }
  return stripIgnored(decoded).normalize('NFKC').toLowerCase();
}

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/**
 * Returns the URL if it may be followed, or null. The returned value is the
 * cleaned URL, so a caller never writes the original, ignored characters back
 * into markup.
 */
export function checkUrl(raw: string, rules: UrlRules = {}): string | null {
  if (typeof raw !== 'string') return null;

  let value = raw;
  for (let layer = 0; layer < 3; layer += 1) {
    const next = decodeOnce(value);
    if (next === value) break;
    value = next;
  }
  value = stripIgnored(value);
  if (value === '') return null;
  // A backslash is not valid in a URL. Browsers coerce it to a slash for the
  // special schemes, which turns `https:\\evil.example` into another host, so
  // refuse the whole shape rather than guess what it meant.
  if (value.includes('\\')) return null;
  // A stray percent sign is not a valid escape, and `%%%` is not a path.
  if (/%(?![0-9a-f]{2})/i.test(value)) return null;

  // A percent-encoded or compatibility-folded scheme still counts as one.
  const head = probe(value);
  const smuggled = SCHEME.exec(head);
  if (smuggled) {
    const scheme = `${smuggled[1]}:`;
    const allowed =
      scheme === 'http:' ||
      scheme === 'https:' ||
      (scheme === 'mailto:' && rules.allowMailto !== false) ||
      (scheme === 'data:' && rules.allowDataImage === true && DATA_IMAGE.test(value));
    if (!allowed) return null;
  }

  if (/^[\\/]{2}/.test(value)) {
    if (rules.allowProtocolRelative !== true) return null;
    // `//` with no host is not a URL; a browser would keep it relative.
    return /^\/{2}[^/?#]/.test(value) ? value : null;
  }

  const scheme = SCHEME.exec(value);
  if (scheme) {
    const name = `${scheme[1]?.toLowerCase() ?? ''}:`;
    if (name === 'mailto:') {
      return rules.allowMailto !== false && value.length > 'mailto:'.length ? value : null;
    }
    if (name === 'data:') {
      return rules.allowDataImage === true && DATA_IMAGE.test(value) ? value : null;
    }
    if (name !== 'http:' && name !== 'https:') return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === name ? value : null;
    } catch {
      return null;
    }
  }

  // A colon in the first segment would have been read as a scheme above; one
  // left here means the value is not a path either (`:`, `:foo`).
  if ((value.split('/', 1)[0] ?? '').includes(':')) return null;

  if (value.startsWith('#')) {
    const allowFragment = rules.allowFragment ?? rules.allowRelative === true;
    return allowFragment && value.length > 1 ? value : null;
  }

  return rules.allowRelative === true ? value : null;
}

/** Rules for a link a reader may choose to follow. */
export const LINK_RULES: UrlRules = Object.freeze({
  allowRelative: true,
  allowFragment: true,
  allowMailto: true,
  // `//host/path` is a third-party link, exactly like `https://host/path`,
  // which the rules already allow. It is only a problem where an absolute
  // address is required, such as an image source.
  allowProtocolRelative: true,
});

/** Rules for an image source: absolute http(s), an inline data image, or same-origin relative. */
export const IMAGE_RULES: UrlRules = Object.freeze({
  allowRelative: true,
  allowFragment: false,
  allowMailto: false,
  allowDataImage: true,
});

/** True when the value is a URL this project would follow. */
export function isSafeUrl(raw: string, rules: UrlRules = LINK_RULES): boolean {
  return checkUrl(raw, rules) !== null;
}
