export type ToolTier = 1 | 2 | 3;

export type ToolFlag = 'new' | 'beta' | 'wide' | 'atlas' | 'carryColour' | 'highlight';

export const CATEGORY_IDS = [
  'colour',
  'img-assets',
  'social-media',
  'audio-video',
  'pdf',
  'print-production',
  'typo-text',
  'dev-tools',
  'other-tools',
  'calculators',
  'turbo-nerd',
  'experiments',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Tool {
  readonly id: string;
  readonly name: string;
  /** Human-written copy. Empty until the owner supplies it. */
  readonly description: string;
  readonly category: CategoryId;
  readonly categoryName: string;
  /** Lucide icon name, derived from the category in the registry. */
  readonly icon: string;
  /** Canonical in-app route, derived from the id. */
  readonly href: string;
  readonly flags: readonly ToolFlag[];
  /** MIME types and file extensions this tool takes. */
  readonly accepts: readonly string[];
  /** MIME types this tool gives back. */
  readonly produces: readonly string[];
  readonly tier: ToolTier;
  readonly phase: number;
}

export interface Category {
  readonly id: CategoryId;
  readonly name: string;
  readonly tools: readonly Tool[];
}
