import {
  ArrowRightIcon,
  BracesIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileIcon,
  FileImageIcon,
  FileJsonIcon,
  FileTextIcon,
  FileTypeIcon,
  FilmIcon,
  type LucideIcon,
  PaletteIcon,
} from 'lucide-react';

interface Glyph {
  readonly label: string;
  readonly Icon: LucideIcon;
}

const MIME_GLYPHS: Readonly<Record<string, Glyph>> = {
  'image/*': { label: 'Image', Icon: FileImageIcon },
  'image/png': { label: 'PNG', Icon: FileImageIcon },
  'image/jpeg': { label: 'JPG', Icon: FileImageIcon },
  'image/webp': { label: 'WebP', Icon: FileImageIcon },
  'image/avif': { label: 'AVIF', Icon: FileImageIcon },
  'image/gif': { label: 'GIF', Icon: FileImageIcon },
  'image/svg+xml': { label: 'SVG', Icon: FileImageIcon },
  'image/x-icon': { label: 'ICO', Icon: FileImageIcon },
  'image/bmp': { label: 'BMP', Icon: FileImageIcon },
  'image/tiff': { label: 'TIFF', Icon: FileImageIcon },
  'image/heic': { label: 'HEIC', Icon: FileImageIcon },
  'image/jxl': { label: 'JXL', Icon: FileImageIcon },
  'audio/*': { label: 'Audio', Icon: FileAudioIcon },
  'audio/mpeg': { label: 'MP3', Icon: FileAudioIcon },
  'audio/wav': { label: 'WAV', Icon: FileAudioIcon },
  'audio/webm': { label: 'WebM', Icon: FileAudioIcon },
  'video/*': { label: 'Video', Icon: FilmIcon },
  'video/mp4': { label: 'MP4', Icon: FilmIcon },
  'video/webm': { label: 'WebM', Icon: FilmIcon },
  'text/*': { label: 'Text', Icon: FileTextIcon },
  'text/plain': { label: 'Text', Icon: FileTextIcon },
  'text/css': { label: 'CSS', Icon: FileCodeIcon },
  'text/html': { label: 'HTML', Icon: FileCodeIcon },
  'text/markdown': { label: 'MD', Icon: FileTextIcon },
  'text/vtt': { label: 'VTT', Icon: FileTextIcon },
  'application/x-subrip': { label: 'SRT', Icon: FileTextIcon },
  'application/pdf': { label: 'PDF', Icon: FileTypeIcon },
  'application/json': { label: 'JSON', Icon: FileJsonIcon },
  'application/zip': { label: 'ZIP', Icon: FileIcon },
  'application/epub+zip': { label: 'EPUB', Icon: FileTextIcon },
  'font/woff': { label: 'WOFF', Icon: FileTypeIcon },
  'font/woff2': { label: 'WOFF2', Icon: FileTypeIcon },
  'font/ttf': { label: 'TTF', Icon: FileTypeIcon },
  'font/otf': { label: 'OTF', Icon: FileTypeIcon },
  '.png': { label: 'PNG', Icon: FileImageIcon },
  '.jpg': { label: 'JPG', Icon: FileImageIcon },
  '.jpeg': { label: 'JPG', Icon: FileImageIcon },
  '.svg': { label: 'SVG', Icon: FileImageIcon },
  '.pdf': { label: 'PDF', Icon: FileTypeIcon },
  '.json': { label: 'JSON', Icon: FileJsonIcon },
  '.md': { label: 'MD', Icon: FileTextIcon },
  '.txt': { label: 'Text', Icon: FileTextIcon },
  '.srt': { label: 'SRT', Icon: FileTextIcon },
  '.vtt': { label: 'VTT', Icon: FileTextIcon },
};

function glyphFor(type: string): Glyph {
  const known = MIME_GLYPHS[type.toLowerCase()];
  if (known) return known;

  if (type.startsWith('image/')) return { label: 'Image', Icon: FileImageIcon };
  if (type.startsWith('audio/')) return { label: 'Audio', Icon: FileAudioIcon };
  if (type.startsWith('video/')) return { label: 'Video', Icon: FilmIcon };
  if (type.startsWith('text/')) return { label: 'Text', Icon: FileTextIcon };
  if (type.startsWith('font/')) return { label: 'Font', Icon: FileTypeIcon };
  if (type === 'colour') return { label: 'Colour', Icon: PaletteIcon };
  if (type === 'application/json') return { label: 'JSON', Icon: BracesIcon };
  return { label: type.replace('*', '').replace('/', ' ').toUpperCase(), Icon: FileIcon };
}

function uniqueTypes(types: readonly string[], limit = 4): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const type of types) {
    const glyph = glyphFor(type).label;
    if (seen.has(glyph)) continue;
    seen.add(glyph);
    output.push(type);
    if (output.length === limit) break;
  }
  return output;
}

function GlyphChip({ type }: { readonly type: string }) {
  const { label, Icon } = glyphFor(type);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

export function ToolGlyphs({
  accepts,
  produces,
}: {
  readonly accepts: readonly string[];
  readonly produces: readonly string[];
}) {
  const inputTypes = uniqueTypes(accepts);
  const outputTypes = uniqueTypes(produces);
  if (inputTypes.length === 0 && outputTypes.length === 0) return null;

  const description = [
    inputTypes.length ? `Takes ${inputTypes.map((type) => glyphFor(type).label).join(', ')}` : '',
    outputTypes.length
      ? `produces ${outputTypes.map((type) => glyphFor(type).label).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('; ');

  return (
    <span
      role="img"
      className="flex flex-wrap items-center gap-x-2 gap-y-1"
      aria-label={description}
    >
      {inputTypes.map((type) => (
        <GlyphChip key={`in-${type}`} type={type} />
      ))}
      {inputTypes.length > 0 && outputTypes.length > 0 ? (
        <ArrowRightIcon aria-hidden="true" className="size-3.5 text-muted-foreground/70" />
      ) : null}
      {outputTypes.map((type) => (
        <GlyphChip key={`out-${type}`} type={type} />
      ))}
    </span>
  );
}
