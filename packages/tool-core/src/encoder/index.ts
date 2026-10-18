export class EncodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncodingError';
  }
}

const textEncoder = new TextEncoder();

function toBinary(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return binary;
}

function fromBinary(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new EncodingError('Those bytes are not valid UTF-8 text');
  }
}

export function encodeBase64(text: string): string {
  return btoa(toBinary(textEncoder.encode(text)));
}

export function decodeBase64(value: string): string {
  const cleaned = value.replace(/\s+/g, '');
  if (cleaned === '') return '';
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    throw new EncodingError('That is not valid Base64');
  }
  if (cleaned.length % 4 !== 0) {
    throw new EncodingError('Base64 input needs padding to a multiple of four characters');
  }

  return decodeUtf8(fromBinary(atob(cleaned)));
}

export function encodeUrl(text: string): string {
  return encodeURIComponent(text);
}

export function decodeUrl(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new EncodingError('That is not valid percent-encoding');
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: '\u00a0',
  quot: '"',
  aacute: 'á',
  acirc: 'â',
  agrave: 'à',
  aelig: 'æ',
  aring: 'å',
  auml: 'ä',
  bull: '•',
  ccedil: 'ç',
  cent: '¢',
  copy: '©',
  deg: '°',
  divide: '÷',
  eacute: 'é',
  ecirc: 'ê',
  egrave: 'è',
  euml: 'ë',
  euro: '€',
  hellip: '…',
  iacute: 'í',
  icirc: 'î',
  igrave: 'ì',
  iuml: 'ï',
  laquo: '«',
  ldquo: '“',
  lsquo: '‘',
  mdash: '—',
  middot: '·',
  ndash: '–',
  ntilde: 'ñ',
  oacute: 'ó',
  ocirc: 'ô',
  oelig: 'œ',
  ograve: 'ò',
  oslash: 'ø',
  ouml: 'ö',
  para: '¶',
  plusmn: '±',
  pound: '£',
  raquo: '»',
  rdquo: '”',
  reg: '®',
  rsquo: '’',
  sect: '§',
  szlig: 'ß',
  times: '×',
  trade: '™',
  uacute: 'ú',
  ucirc: 'û',
  ugrave: 'ù',
  uuml: 'ü',
  yacute: 'ý',
  yuml: 'ÿ',
};

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function encodeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

export function decodeHtml(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    if (entity.startsWith('#')) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function encodeHex(text: string): string {
  return Array.from(textEncoder.encode(text), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function decodeHex(value: string): string {
  const cleaned = value.replace(/\s+/g, '').replace(/^0x/i, '');
  if (cleaned === '') return '';
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new EncodingError('That is not valid hexadecimal');
  }
  if (cleaned.length % 2 !== 0) {
    throw new EncodingError('Hex needs an even number of digits');
  }

  const bytes = new Uint8Array(cleaned.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(cleaned.slice(index * 2, index * 2 + 2), 16);
  }
  return decodeUtf8(bytes);
}
