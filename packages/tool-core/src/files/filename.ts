const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'application/pdf': 'pdf',
  'application/json': 'json',
  'application/zip': 'zip',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/html': 'html',
  'text/css': 'css',
  'text/vtt': 'vtt',
  'application/x-subrip': 'srt',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*]/g;

function removeControlCharacters(value: string): string {
  return [...value].map((character) => (character.charCodeAt(0) < 32 ? '-' : character)).join('');
}

export function extensionForMime(mime: string): string {
  return EXTENSION_BY_MIME[mime.toLowerCase()] ?? 'bin';
}

export function stripExtension(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

export function sanitiseFilename(name: string, fallback = 'download'): string {
  const base = name.split(/[/\\]/).pop() ?? '';
  const cleaned = removeControlCharacters(base)
    .replace(INVALID_FILENAME_CHARACTERS, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 120)
    .trim();

  return cleaned || fallback;
}

export interface OutputFilenameOptions {
  readonly suffix?: string;
  readonly extension?: string;
}

export function buildOutputFilename(
  inputName: string,
  { suffix = '', extension }: OutputFilenameOptions = {},
): string {
  const base = sanitiseFilename(stripExtension(inputName), 'output');
  const withSuffix = sanitiseFilename(`${base}${suffix}`, 'output');
  return extension ? `${withSuffix}.${extension.replace(/^\./, '')}` : withSuffix;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;

  const units = ['kB', 'MB', 'GB', 'TB'] as const;
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}
