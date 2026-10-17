import type { CategoryId } from './types';

/**
 * Display labels. The seed carries the original catalogue's category names;
 * two of them reference the original project's branding ("Alien Delphi's
 * Experiments") or use its tone ("Turbo-nerd Shit"). Omnitool uses its own
 * neutral labels instead.
 */
export const CATEGORY_LABELS: Record<CategoryId, string> = {
  colour: 'Colour',
  'img-assets': 'Images & assets',
  'social-media': 'Social media',
  'audio-video': 'Audio & video',
  pdf: 'PDF',
  'print-production': 'Print & production',
  'typo-text': 'Typography & text',
  'dev-tools': 'Dev tools',
  'other-tools': 'Other tools',
  calculators: 'Calculators',
  'turbo-nerd': 'Turbo-nerd',
  experiments: 'Experiments',
};
