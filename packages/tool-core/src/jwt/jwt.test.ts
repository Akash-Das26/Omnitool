import { describe, expect, it } from 'vitest';
import { decodeBase64Url, decodeJwt, JwtError } from './index';

function segment(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function token(payload: unknown, header: unknown = { alg: 'HS256', typ: 'JWT' }): string {
  return `${segment(header)}.${segment(payload)}.c2lnbmF0dXJl`;
}

describe('decodeJwt', () => {
  it('decodes header, payload and signature', () => {
    const decoded = decodeJwt(token({ sub: '1234567890', name: 'Ada' }));
    expect(decoded.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decoded.payload).toEqual({ sub: '1234567890', name: 'Ada' });
    expect(decoded.signature).toBe('c2lnbmF0dXJl');
  });

  it('handles unicode in payloads', () => {
    const decoded = decodeJwt(token({ name: 'Zoë 🌍' }));
    expect(decoded.payload.name).toBe('Zoë 🌍');
  });

  it('accepts a Bearer prefix and surrounding whitespace', () => {
    const decoded = decodeJwt(`  Bearer ${token({ sub: 'a' })}  `);
    expect(decoded.payload.sub).toBe('a');
  });

  it('reports registered claims with readable times', () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const issued = Math.floor(now / 1000) - 3600;
    const expires = Math.floor(now / 1000) + 3600;
    const decoded = decodeJwt(
      token({ iss: 'https://example.test', exp: expires, iat: issued, aud: ['a', 'b'] }),
      now,
    );

    expect(decoded.claims.map((claim) => claim.key)).toEqual(['iss', 'aud', 'exp', 'iat']);
    const expiresClaim = decoded.claims.find((claim) => claim.key === 'exp');
    expect(expiresClaim?.expired).toBe(false);
    expect(expiresClaim?.time).toBe(new Date(expires * 1000).toISOString());
    expect(decoded.claims.find((claim) => claim.key === 'aud')?.value).toEqual(['a', 'b']);
  });

  it('marks an expired token and a future not-before time', () => {
    const now = Date.UTC(2026, 0, 1);
    const decoded = decodeJwt(
      token({ exp: Math.floor(now / 1000) - 60, nbf: Math.floor(now / 1000) + 60 }),
      now,
    );
    expect(decoded.claims.find((claim) => claim.key === 'exp')?.expired).toBe(true);
    expect(decoded.claims.find((claim) => claim.key === 'nbf')?.expired).toBe(true);
  });

  it('ignores non-numeric date claims for the time column', () => {
    const decoded = decodeJwt(token({ exp: 'tomorrow' }));
    const claim = decoded.claims.find((entry) => entry.key === 'exp');
    expect(claim?.time).toBeNull();
    expect(claim?.expired).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(() => decodeJwt('')).toThrow('Paste a token to decode');
    expect(() => decodeJwt('a.b')).toThrow('three parts');
    expect(() => decodeJwt('a.b.c.d.e')).toThrow('JWE');
    expect(() => decodeJwt('a.b.c')).toThrow(JwtError);
  });

  it('rejects invalid Base64URL and invalid JSON', () => {
    expect(() => decodeJwt('not base64!.e30.sig')).toThrow('Base64URL');
    expect(() => decodeJwt(`${segment({})}.bm90IGpzb24.sig`)).toThrow('payload is not valid JSON');
  });

  it('rejects payloads that are not objects', () => {
    expect(() => decodeJwt(`${segment({})}.${segment([1, 2])}.sig`)).toThrow(
      'payload must be a JSON object',
    );
  });

  it('allows an empty signature for unsecured tokens', () => {
    expect(() => decodeJwt(`${segment({})}.${segment({ sub: 'a' })}.`)).not.toThrow();
  });
});

describe('decodeBase64Url', () => {
  it('decodes unpadded Base64URL', () => {
    expect(decodeBase64Url('aMOpbGxv')).toBe('héllo');
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => decodeBase64Url('abc$')).toThrow(JwtError);
  });
});

describe('invalid UTF-8', () => {
  it('rejects a header that is not UTF-8', () => {
    const header = Buffer.from([0xff, 0xfe]).toString('base64url');
    expect(() => decodeJwt(`${header}.${segment({})}.sig`)).toThrow('not valid UTF-8');
  });
});
