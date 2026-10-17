export type RandomBytes = (length: number) => Uint8Array;

export type UuidVersion = 'v4' | 'v7';

export interface UuidOptions {
  readonly version: UuidVersion;
  readonly count: number;
  readonly uppercase?: boolean;
  readonly hyphens?: boolean;
}

const defaultRandom: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

function formatBytes(bytes: Uint8Array, uppercase: boolean, hyphens: boolean): string {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const value = hyphens
    ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    : hex;
  return uppercase ? value.toUpperCase() : value;
}

export function uuidV4(
  random: RandomBytes = defaultRandom,
  uppercase = false,
  hyphens = true,
): string {
  const bytes = random(16);
  if (bytes.length !== 16) throw new Error('UUID v4 needs 16 random bytes');
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  return formatBytes(bytes, uppercase, hyphens);
}

export function uuidV7(
  now: number = Date.now(),
  random: RandomBytes = defaultRandom,
  uppercase = false,
  hyphens = true,
): string {
  if (!Number.isFinite(now) || now < 0 || now > 2 ** 48 - 1) {
    throw new Error('UUID v7 timestamp is out of range');
  }

  const timestamp = Math.floor(now);
  const bytes = random(16);
  if (bytes.length !== 16) throw new Error('UUID v7 needs 16 random bytes');

  bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff;
  bytes[5] = timestamp & 0xff;
  bytes[6] = 0x70 | ((bytes[6] ?? 0) & 0x0f);
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);

  return formatBytes(bytes, uppercase, hyphens);
}

export function generateUuids(options: UuidOptions, random: RandomBytes = defaultRandom): string[] {
  const count = options.count;
  if (!Number.isInteger(count) || count < 1 || count > 5000) {
    throw new Error('Count must be a whole number between 1 and 5000');
  }

  return Array.from({ length: count }, () =>
    options.version === 'v4'
      ? uuidV4(random, options.uppercase, options.hyphens)
      : uuidV7(Date.now(), random, options.uppercase, options.hyphens),
  );
}

export function uuidTimestamp(uuid: string): number | null {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32 || !/^[0-9a-f]+$/i.test(hex) || hex[12]?.toLowerCase() !== '7') {
    return null;
  }
  return Number.parseInt(hex.slice(0, 12), 16);
}

export const NANOID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

export function nanoid(
  size = 21,
  alphabet: string = NANOID_ALPHABET,
  random: RandomBytes = defaultRandom,
): string {
  if (!Number.isInteger(size) || size < 1 || size > 256) {
    throw new Error('Nano ID size must be between 1 and 256');
  }
  if (alphabet.length < 2 || alphabet.length > 256) {
    throw new Error('Nano ID alphabet must contain between 2 and 256 characters');
  }

  const limit = 256 - (256 % alphabet.length);
  let id = '';

  while (id.length < size) {
    const bytes = random(Math.max(16, size * 2));
    for (const byte of bytes) {
      if (byte >= limit) continue;
      id += alphabet[byte % alphabet.length];
      if (id.length === size) break;
    }
  }

  return id;
}
