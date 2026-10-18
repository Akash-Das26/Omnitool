export class PasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordError';
  }
}

export type RandomByteSource = (count: number) => Uint8Array;

export interface PasswordOptions {
  readonly length: number;
  readonly lowercase: boolean;
  readonly uppercase: boolean;
  readonly digits: boolean;
  readonly symbols: boolean;
  readonly excludeAmbiguous: boolean;
}

export interface PassphraseOptions {
  readonly words: number;
  readonly separator: string;
  readonly capitalise: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: true,
};

const CHARACTER_SETS: Record<'lowercase' | 'uppercase' | 'digits' | 'symbols', string> = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
};

const AMBIGUOUS = new Set(Array.from('Il1O0o|`\'"'));

/** Short, concrete words. Kept local so no request is made for a word list. */
export const PASSPHRASE_WORDS: readonly string[] = [
  'able',
  'amber',
  'anchor',
  'apple',
  'arrow',
  'ascent',
  'attic',
  'autumn',
  'baker',
  'ballad',
  'bamboo',
  'barrel',
  'basin',
  'beacon',
  'birch',
  'biscuit',
  'bison',
  'blanket',
  'blossom',
  'border',
  'bottle',
  'bramble',
  'breeze',
  'brick',
  'bridge',
  'bronze',
  'brook',
  'button',
  'cabin',
  'cactus',
  'candle',
  'canvas',
  'canyon',
  'carbon',
  'carpet',
  'cedar',
  'chalk',
  'cherry',
  'chimney',
  'cider',
  'cinder',
  'citrus',
  'clover',
  'cobalt',
  'comet',
  'compass',
  'copper',
  'coral',
  'cotton',
  'crane',
  'crater',
  'crimson',
  'crystal',
  'daisy',
  'dawn',
  'delta',
  'denim',
  'desert',
  'drift',
  'ember',
  'engine',
  'falcon',
  'feather',
  'fern',
  'fiddle',
  'field',
  'flint',
  'forest',
  'fossil',
  'fountain',
  'galaxy',
  'garden',
  'garnet',
  'ginger',
  'glacier',
  'granite',
  'grape',
  'gravel',
  'grove',
  'hammer',
  'harbour',
  'harvest',
  'hazel',
  'heather',
  'heron',
  'hickory',
  'honey',
  'horizon',
  'island',
  'ivory',
  'jacket',
  'jasmine',
  'juniper',
  'kettle',
  'lantern',
  'lemon',
  'lilac',
  'linen',
  'lobster',
  'locket',
  'magnet',
  'marble',
  'meadow',
  'melon',
  'meteor',
  'mint',
  'mirror',
  'monsoon',
  'moss',
  'mountain',
  'mustard',
  'nectar',
  'nickel',
  'ocean',
  'olive',
  'onyx',
  'orchid',
  'otter',
  'oyster',
  'paddle',
  'paper',
  'pebble',
  'pepper',
  'petal',
  'pigeon',
  'pine',
  'piston',
  'planet',
  'plaster',
  'plum',
  'pocket',
  'pond',
  'poppy',
  'prairie',
  'prism',
  'pumpkin',
  'quartz',
  'quill',
  'rabbit',
  'radish',
  'raven',
  'reed',
  'ribbon',
  'river',
  'robin',
  'rocket',
  'rose',
  'ruby',
  'saddle',
  'salmon',
  'sapphire',
  'satin',
  'scarlet',
  'shadow',
  'shell',
  'silver',
  'slate',
  'sparrow',
  'spice',
  'spring',
  'spruce',
  'star',
  'steel',
  'stone',
  'storm',
  'sugar',
  'summit',
  'sunset',
  'sycamore',
  'teal',
  'thistle',
  'thunder',
  'tide',
  'timber',
  'topaz',
  'tulip',
  'tunnel',
  'turtle',
  'valley',
  'velvet',
  'violet',
  'walnut',
  'willow',
  'window',
  'winter',
  'wolf',
  'wren',
  'yarrow',
  'zephyr',
  'zinc',
];

/** `crypto.getRandomValues` with a clear error when it is unavailable. */
export function cryptoRandomBytes(count: number): Uint8Array {
  const source = globalThis.crypto;
  if (!source || typeof source.getRandomValues !== 'function') {
    throw new PasswordError('This browser cannot generate secure random numbers');
  }
  return source.getRandomValues(new Uint8Array(count));
}

/**
 * Uniform integer in [0, max). Bytes at or above the largest multiple of max
 * are rejected, so there is no modulo bias.
 */
export function randomIndex(
  max: number,
  randomBytes: RandomByteSource = cryptoRandomBytes,
): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new PasswordError('The random range must be a positive whole number');
  }
  const limit = 256 - (256 % max);
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const [byte] = randomBytes(1);
    if (byte !== undefined && byte < limit) return byte % max;
  }
  throw new PasswordError('The browser did not provide enough random data');
}

function alphabetFor(options: PasswordOptions): string[] {
  const sets: string[] = [];
  for (const key of ['lowercase', 'uppercase', 'digits', 'symbols'] as const) {
    if (!options[key]) continue;
    const characters = Array.from(CHARACTER_SETS[key]).filter(
      (character) => !options.excludeAmbiguous || !AMBIGUOUS.has(character),
    );
    if (characters.length > 0) sets.push(characters.join(''));
  }
  return sets;
}

function shuffle(characters: string[], randomBytes: RandomByteSource): string {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1, randomBytes);
    const current = characters[index] as string;
    characters[index] = characters[swap] as string;
    characters[swap] = current;
  }
  return characters.join('');
}

/** Generate a password with at least one character from every selected set. */
export function generatePassword(
  options: PasswordOptions = DEFAULT_PASSWORD_OPTIONS,
  randomBytes: RandomByteSource = cryptoRandomBytes,
): string {
  if (!Number.isInteger(options.length) || options.length < 4 || options.length > 256) {
    throw new PasswordError('Choose a length between 4 and 256 characters');
  }

  const sets = alphabetFor(options);
  if (sets.length === 0) {
    throw new PasswordError('Choose at least one character set');
  }

  const characters = sets.map((set) => set.charAt(randomIndex(set.length, randomBytes)));
  const combined = sets.join('');
  while (characters.length < options.length) {
    characters.push(combined.charAt(randomIndex(combined.length, randomBytes)));
  }
  return shuffle(characters, randomBytes);
}

/** Shannon entropy of the pool, in bits (a strength estimate, not a guarantee). */
export function passwordEntropyBits(options: PasswordOptions = DEFAULT_PASSWORD_OPTIONS): number {
  const size = alphabetFor(options).join('').length;
  return size === 0 ? 0 : Math.round(options.length * Math.log2(size) * 10) / 10;
}

export function generatePassphrase(
  options: PassphraseOptions = { words: 4, separator: '-', capitalise: false },
  randomBytes: RandomByteSource = cryptoRandomBytes,
): string {
  if (!Number.isInteger(options.words) || options.words < 2 || options.words > 12) {
    throw new PasswordError('Choose between 2 and 12 words');
  }
  const chosen: string[] = [];
  for (let index = 0; index < options.words; index += 1) {
    const word = PASSPHRASE_WORDS[randomIndex(PASSPHRASE_WORDS.length, randomBytes)] ?? '';
    chosen.push(options.capitalise ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word);
  }
  return chosen.join(options.separator);
}

export function passphraseEntropyBits(words = 4): number {
  return Math.round(words * Math.log2(PASSPHRASE_WORDS.length) * 10) / 10;
}
