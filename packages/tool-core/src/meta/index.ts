import { checkUrl, type UrlRules } from '../url/index';

/**
 * Meta tag composition.
 *
 * Nothing here touches the network: URLs are validated by parsing them, not by
 * fetching anything. The length guidance is deliberately described as typical
 * display limits rather than rules, because search engines and social platforms
 * truncate at their own thresholds and change them without notice.
 */

export interface MetaInput {
  readonly title: string;
  readonly description: string;
  readonly canonical: string;
  readonly language: string;
  readonly robots: string;
  readonly themeColour: string;
  readonly ogTitle: string;
  readonly ogDescription: string;
  readonly ogImage: string;
  readonly ogType: string;
  readonly twitterCard: string;
  readonly twitterSite: string;
}

/** Typical display limits, not rules. Search results vary by engine and result. */
export const TITLE_TYPICAL_LENGTH = 60;
export const DESCRIPTION_TYPICAL_LENGTH = 160;

export const ROBOTS_VALUES = [
  'index, follow',
  'index, nofollow',
  'noindex, follow',
  'noindex, nofollow',
] as const;

export const OG_TYPES = ['website', 'article', 'product', 'profile'] as const;

export const TWITTER_CARDS = ['summary', 'summary_large_image'] as const;

/** Escapes a value for use inside a double-quoted HTML attribute. */
export function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#39;');
}

export interface UrlCheck {
  readonly ok: boolean;
  readonly message?: string;
}

/** What a canonical address or a preview image may be: absolute https, nothing else. */
const ABSOLUTE_HTTPS_RULES: UrlRules = Object.freeze({
  allowRelative: false,
  allowFragment: false,
  allowMailto: false,
  allowProtocolRelative: false,
});

/**
 * Accepts an absolute https URL with a host. Relative URLs, other schemes and
 * anything that will not parse are rejected with a readable reason. No request
 * is made.
 *
 * The scheme itself is judged by `checkUrl`, which sees through the entity,
 * escape and control-character tricks a browser decodes before it follows a
 * URL. `new URL` is used afterwards only for the checks a scheme table cannot
 * express: that the host exists and looks like a domain.
 */
export function checkAbsoluteHttpsUrl(value: string): UrlCheck {
  if (value.trim() === '') return { ok: false, message: 'Enter a URL' };
  if (value.trim() !== value) return { ok: false, message: 'Remove the spaces at either end' };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, message: 'That is not an absolute URL, including https://' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, message: `Use https:// rather than ${parsed.protocol}//` };
  }
  if (checkUrl(value, ABSOLUTE_HTTPS_RULES) === null) {
    return { ok: false, message: 'That is not a plain https URL' };
  }
  if (parsed.hostname === '') return { ok: false, message: 'The URL needs a host name' };
  if (!parsed.hostname.includes('.')) {
    return { ok: false, message: 'The host name needs a dot, such as example.com' };
  }
  return { ok: true };
}

/**
 * The checked value written into `href`, `og:url`, `og:image` or
 * `twitter:image`, or null. Every URL in the generated snippet goes through
 * here, so the markup can only ever hold something this project would follow.
 */
export function absoluteHttpsHref(value: string): string | null {
  if (!checkAbsoluteHttpsUrl(value).ok) return null;
  return checkUrl(value, ABSOLUTE_HTTPS_RULES);
}

/** `en-GB` becomes `en_GB`, the form Open Graph expects. */
export function openGraphLocale(language: string): string {
  const value = language.trim();
  if (value === '') return '';
  return value.replace('-', '_');
}

export interface MetaResult {
  readonly html: string;
  readonly warnings: readonly string[];
}

export function buildMetaTags(input: MetaInput): MetaResult {
  const warnings: string[] = [];
  const lines: string[] = [];

  const title = input.title.trim();
  if (title !== '') {
    lines.push(`<title>${escapeAttribute(title)}</title>`);
    if (title.length > TITLE_TYPICAL_LENGTH) {
      warnings.push(
        `The title is ${title.length} characters; search results often show about ${TITLE_TYPICAL_LENGTH}.`,
      );
    }
  }

  const description = input.description.trim();
  if (description !== '') {
    lines.push(`<meta name="description" content="${escapeAttribute(description)}" />`);
    if (description.length > DESCRIPTION_TYPICAL_LENGTH) {
      warnings.push(
        `The description is ${description.length} characters; snippets often stop around ${DESCRIPTION_TYPICAL_LENGTH}.`,
      );
    }
  }

  const canonical = input.canonical.trim();
  if (canonical !== '') {
    const check = checkAbsoluteHttpsUrl(canonical);
    const canonicalHref = absoluteHttpsHref(canonical);
    if (!check.ok || canonicalHref === null) {
      warnings.push(`Canonical URL: ${check.message ?? 'invalid'}`);
    } else {
      lines.push(`<link rel="canonical" href="${escapeAttribute(canonicalHref)}" />`);
      lines.push(`<meta property="og:url" content="${escapeAttribute(canonicalHref)}" />`);
    }
  }

  if (input.robots.trim() !== '') {
    lines.push(`<meta name="robots" content="${escapeAttribute(input.robots.trim())}" />`);
  }
  if (input.themeColour.trim() !== '') {
    lines.push(
      `<meta name="theme-color" content="${escapeAttribute(input.themeColour.trim())}" />`,
    );
  }

  const ogTitle = input.ogTitle.trim() || title;
  if (ogTitle !== '') {
    lines.push(`<meta property="og:title" content="${escapeAttribute(ogTitle)}" />`);
  }
  const ogDescription = input.ogDescription.trim() || description;
  if (ogDescription !== '') {
    lines.push(`<meta property="og:description" content="${escapeAttribute(ogDescription)}" />`);
  }
  if (input.ogType.trim() !== '') {
    lines.push(`<meta property="og:type" content="${escapeAttribute(input.ogType.trim())}" />`);
  }
  const locale = openGraphLocale(input.language);
  if (locale !== '') {
    lines.push(`<meta property="og:locale" content="${escapeAttribute(locale)}" />`);
  }

  const ogImage = input.ogImage.trim();
  const ogImageHref = ogImage === '' ? null : absoluteHttpsHref(ogImage);
  if (ogImage !== '') {
    const check = checkAbsoluteHttpsUrl(ogImage);
    if (!check.ok || ogImageHref === null) {
      warnings.push(`Open Graph image: ${check.message ?? 'invalid'}`);
    } else {
      lines.push(`<meta property="og:image" content="${escapeAttribute(ogImageHref)}" />`);
    }
  }

  if (input.twitterCard.trim() !== '') {
    lines.push(
      `<meta name="twitter:card" content="${escapeAttribute(input.twitterCard.trim())}" />`,
    );
  }
  if (ogTitle !== '') {
    lines.push(`<meta name="twitter:title" content="${escapeAttribute(ogTitle)}" />`);
  }
  if (ogDescription !== '') {
    lines.push(`<meta name="twitter:description" content="${escapeAttribute(ogDescription)}" />`);
  }
  if (ogImageHref !== null) {
    lines.push(`<meta name="twitter:image" content="${escapeAttribute(ogImageHref)}" />`);
  }
  if (input.twitterSite.trim() !== '') {
    const handle = input.twitterSite.trim();
    lines.push(`<meta name="twitter:site" content="${escapeAttribute(handle)}" />`);
    if (!handle.startsWith('@')) {
      warnings.push('Handles usually start with @, as in @example.');
    }
  }

  return { html: lines.join('\n'), warnings };
}
