export class JwtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwtError';
  }
}

export interface JwtClaim {
  readonly key: string;
  readonly label: string;
  readonly value: unknown;
  /** ISO timestamp for date claims, otherwise null. */
  readonly time: string | null;
  /** True when an `exp` has passed or an `nbf` is in the future. */
  readonly expired: boolean | null;
}

export interface DecodedJwt {
  readonly header: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
  readonly signature: string;
  readonly claims: readonly JwtClaim[];
}

const CLAIM_LABELS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires',
  nbf: 'Not before',
  iat: 'Issued at',
  jti: 'Token ID',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Decode one Base64URL segment as UTF-8 text. */
export function decodeBase64Url(segment: string): string {
  if (!/^[A-Za-z0-9_-]*$/.test(segment)) {
    throw new JwtError('That token contains characters that are not valid Base64URL');
  }
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '=');

  let binary: string;
  try {
    binary = atob(withPadding);
  } catch {
    throw new JwtError('That token is not valid Base64URL');
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new JwtError('That token is not valid UTF-8');
  }
}

function decodeSegment(segment: string, name: string): Record<string, unknown> {
  const text = decodeBase64Url(segment);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new JwtError(`The ${name} is not valid JSON`);
  }
  if (!isObject(parsed)) {
    throw new JwtError(`The ${name} must be a JSON object`);
  }
  return parsed;
}

function numericDate(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

/**
 * Decode a signed JWT. The signature is reported but never checked: this tool
 * has no keys and makes no network requests.
 */
export function decodeJwt(token: string, now: number = Date.now()): DecodedJwt {
  const cleaned = token.trim().replace(/^Bearer\s+/i, '');
  if (cleaned === '') {
    throw new JwtError('Paste a token to decode');
  }

  const parts = cleaned.split('.');
  if (parts.length === 5) {
    throw new JwtError('That is an encrypted token (JWE); this tool reads signed JWTs only');
  }
  if (parts.length !== 3) {
    throw new JwtError('A JWT needs three parts separated by dots');
  }

  const [encodedHeader = '', encodedPayload = '', signature = ''] = parts;
  const header = decodeSegment(encodedHeader, 'header');
  const payload = decodeSegment(encodedPayload, 'payload');

  const claims: JwtClaim[] = [];
  for (const [key, label] of Object.entries(CLAIM_LABELS)) {
    if (!(key in payload)) continue;
    const value = payload[key];
    let time: string | null = null;
    let expired: boolean | null = null;

    if (key === 'exp' || key === 'nbf' || key === 'iat') {
      const seconds = numericDate(value);
      if (seconds !== null) {
        time = new Date(seconds * 1000).toISOString();
        if (key === 'exp') expired = now >= seconds * 1000;
        if (key === 'nbf') expired = now < seconds * 1000;
      }
    }

    claims.push({ key, label, value, time, expired });
  }

  return { header, payload, signature, claims };
}
