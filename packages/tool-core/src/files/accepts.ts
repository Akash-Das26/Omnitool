export interface FileLike {
  readonly type: string;
  readonly name: string;
}

/** Common MIME-to-extension pairs used when the browser reports an empty type (iOS). */
const MIME_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/svg+xml': ['.svg'],
  'image/bmp': ['.bmp'],
  'image/x-icon': ['.ico'],
  'image/tiff': ['.tif', '.tiff'],
  'image/heic': ['.heic'],
  'image/jxl': ['.jxl'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'audio/flac': ['.flac'],
  'audio/aac': ['.aac'],
  'audio/webm': ['.weba'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
  'video/x-matroska': ['.mkv'],
  'application/pdf': ['.pdf'],
  'application/json': ['.json'],
  'application/zip': ['.zip'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/html': ['.html'],
  'text/css': ['.css'],
  'text/vtt': ['.vtt'],
  'application/x-subrip': ['.srt'],
  'font/woff': ['.woff'],
  'font/woff2': ['.woff2'],
  'font/ttf': ['.ttf'],
  'font/otf': ['.otf'],
};

const WILDCARD_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  'image/*': [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.avif',
    '.svg',
    '.bmp',
    '.ico',
    '.tif',
    '.tiff',
    '.heic',
    '.jxl',
  ],
  'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.weba'],
  'video/*': ['.mp4', '.mov', '.webm', '.mkv', '.m4v'],
  'text/*': ['.txt', '.md', '.csv', '.json', '.html', '.css'],
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot).toLowerCase();
}

function typeMatches(type: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    return type.startsWith(pattern.slice(0, -1));
  }
  return type === pattern;
}

/**
 * True when a file matches a registry accept pattern (MIME type, wildcard MIME
 * type or extension). Falls back to the filename when the browser gives no type,
 * which is common on iOS.
 */
export function matchesFilePattern(file: FileLike, pattern: string): boolean {
  const cleanPattern = pattern.trim().toLowerCase();
  if (!cleanPattern) return false;

  const type = file.type.toLowerCase();
  const extension = extensionOf(file.name);

  if (cleanPattern.startsWith('.')) {
    if (extension === cleanPattern) return true;
    const equivalent = Object.entries(MIME_EXTENSIONS).find(([, extensions]) =>
      extensions.includes(cleanPattern),
    );
    return equivalent ? typeMatches(type, equivalent[0]) : false;
  }

  if (type && typeMatches(type, cleanPattern)) return true;

  if (!type) {
    const extensions = MIME_EXTENSIONS[cleanPattern] ?? WILDCARD_EXTENSIONS[cleanPattern] ?? [];
    return extensions.includes(extension);
  }

  return false;
}

/**
 * Build an `accept` attribute. iOS Safari needs concrete extensions alongside
 * MIME types, so wildcards are expanded from a known list.
 */
export function buildAcceptAttribute(patterns: readonly string[]): string {
  const values = new Set<string>();
  for (const raw of patterns) {
    const pattern = raw.trim().toLowerCase();
    if (!pattern) continue;
    values.add(pattern);
    for (const extension of MIME_EXTENSIONS[pattern] ?? WILDCARD_EXTENSIONS[pattern] ?? []) {
      values.add(extension);
    }
  }
  return [...values].join(',');
}
