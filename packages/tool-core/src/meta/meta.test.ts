import { describe, expect, it } from 'vitest';
import {
  buildMetaTags,
  checkAbsoluteHttpsUrl,
  escapeAttribute,
  type MetaInput,
  openGraphLocale,
  TITLE_TYPICAL_LENGTH,
} from './index';

const EMPTY: MetaInput = {
  title: '',
  description: '',
  canonical: '',
  language: '',
  robots: '',
  themeColour: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogType: '',
  twitterCard: '',
  twitterSite: '',
};

describe('escapeAttribute', () => {
  it('escapes every character that can end an attribute', () => {
    expect(escapeAttribute('a & b')).toBe('a &amp; b');
    expect(escapeAttribute('say "hi"')).toBe('say &quot;hi&quot;');
    expect(escapeAttribute('<script>')).toBe('&lt;script&gt;');
    expect(escapeAttribute("it's")).toBe('it&#39;s');
  });

  it('does not double-escape the ampersand it adds', () => {
    expect(escapeAttribute('&amp;')).toBe('&amp;amp;');
    expect(escapeAttribute('"&"')).toBe('&quot;&amp;&quot;');
  });
});

describe('checkAbsoluteHttpsUrl', () => {
  it('accepts an absolute https URL with a host', () => {
    expect(checkAbsoluteHttpsUrl('https://example.com/page?a=1')).toEqual({ ok: true });
    expect(checkAbsoluteHttpsUrl('HTTPS://EXAMPLE.COM')).toEqual({ ok: true });
  });

  it('rejects other schemes, relative paths and non-URLs', () => {
    expect(checkAbsoluteHttpsUrl('http://example.com').ok).toBe(false);
    expect(checkAbsoluteHttpsUrl('/privacy').ok).toBe(false);
    expect(checkAbsoluteHttpsUrl('example.com').ok).toBe(false);
    expect(checkAbsoluteHttpsUrl('javascript:alert(1)').ok).toBe(false);
    expect(checkAbsoluteHttpsUrl('https://localhost').ok).toBe(false);
    expect(checkAbsoluteHttpsUrl('').ok).toBe(false);
    expect(checkAbsoluteHttpsUrl(' https://example.com').ok).toBe(false);
  });

  it('explains why a URL was rejected', () => {
    expect(checkAbsoluteHttpsUrl('http://example.com').message).toContain('https');
    expect(checkAbsoluteHttpsUrl('nope').message).toContain('absolute');
  });
});

describe('openGraphLocale', () => {
  it('turns a language tag into the Open Graph form', () => {
    expect(openGraphLocale('en-GB')).toBe('en_GB');
    expect(openGraphLocale('fr')).toBe('fr');
    expect(openGraphLocale('')).toBe('');
  });
});

describe('buildMetaTags', () => {
  it('returns nothing for an empty form', () => {
    expect(buildMetaTags(EMPTY)).toEqual({ html: '', warnings: [] });
  });

  it('emits the tags in a stable order and escapes them', () => {
    const { html } = buildMetaTags({
      ...EMPTY,
      title: 'Tom & Jerry "live"',
      description: 'A <b>bold</b> claim',
      canonical: 'https://example.com/tools',
      robots: 'index, follow',
      themeColour: '#12161D',
      language: 'en-GB',
      ogType: 'website',
      twitterCard: 'summary',
    });
    expect(html.split('\n')).toEqual([
      '<title>Tom &amp; Jerry &quot;live&quot;</title>',
      '<meta name="description" content="A &lt;b&gt;bold&lt;/b&gt; claim" />',
      '<link rel="canonical" href="https://example.com/tools" />',
      '<meta property="og:url" content="https://example.com/tools" />',
      '<meta name="robots" content="index, follow" />',
      '<meta name="theme-color" content="#12161D" />',
      '<meta property="og:title" content="Tom &amp; Jerry &quot;live&quot;" />',
      '<meta property="og:description" content="A &lt;b&gt;bold&lt;/b&gt; claim" />',
      '<meta property="og:type" content="website" />',
      '<meta property="og:locale" content="en_GB" />',
      '<meta name="twitter:card" content="summary" />',
      '<meta name="twitter:title" content="Tom &amp; Jerry &quot;live&quot;" />',
      '<meta name="twitter:description" content="A &lt;b&gt;bold&lt;/b&gt; claim" />',
    ]);
  });

  it('falls back to the page title and description for social tags', () => {
    const { html } = buildMetaTags({
      ...EMPTY,
      title: 'Omnitool',
      description: 'Small tools in the browser.',
    });
    expect(html).toContain('<meta property="og:title" content="Omnitool" />');
    expect(html).toContain(
      '<meta name="twitter:description" content="Small tools in the browser." />',
    );
  });

  it('leaves out a bad canonical URL and warns instead', () => {
    const { html, warnings } = buildMetaTags({ ...EMPTY, canonical: 'http://example.com' });
    expect(html).not.toContain('rel="canonical"');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('https');
  });

  it('refuses a URL whose scheme is hidden behind entities, escapes or controls', () => {
    const tricks = [
      'javascript:alert(1)',
      '&#106;avascript:alert(1)',
      'javascript&colon;alert(1)',
      'java\tscript:alert(1)',
      'ｊａｖａｓｃｒｉｐｔ:alert(1)',
      '//evil.example/x',
      '/relative/path',
      'data:text/html,<script>alert(1)</script>',
    ];
    for (const trick of tricks) {
      const { html, warnings } = buildMetaTags({ ...EMPTY, canonical: trick, ogImage: trick });
      expect(html, trick).not.toContain('<link rel="canonical"');
      expect(html, trick).not.toContain('property="og:image"');
      expect(html, trick).not.toContain('name="twitter:image"');
      expect(warnings.length, trick).toBeGreaterThan(0);
    }
  });

  it('warns about a missing dot in the host and about a handle without @', () => {
    const { warnings } = buildMetaTags({
      ...EMPTY,
      ogImage: 'https://localhost/image.png',
      twitterSite: 'example',
    });
    expect(warnings.some((warning) => warning.includes('dot'))).toBe(true);
    expect(warnings.some((warning) => warning.includes('@'))).toBe(true);
  });

  it('treats length as guidance rather than a rule', () => {
    const longTitle = 'x'.repeat(TITLE_TYPICAL_LENGTH + 1);
    const { html, warnings } = buildMetaTags({ ...EMPTY, title: longTitle });
    expect(html).toContain('<title>');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('about 60');
  });

  it('never emits an empty attribute', () => {
    const { html } = buildMetaTags({ ...EMPTY, ogImage: 'https://example.com/a.png' });
    expect(html).toContain('<meta property="og:image" content="https://example.com/a.png" />');
    expect(html).toContain('<meta name="twitter:image" content="https://example.com/a.png" />');
    expect(html).not.toContain('content=""');
  });
});
