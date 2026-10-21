import rawEntries from './entries.json';
import { GENERATED_CSS, TAILWIND_VERSION } from './generated';

export { GENERATED_CSS, TAILWIND_VERSION };

export const UTILITY_CATEGORY_IDS = [
  'layout',
  'spacing',
  'sizing',
  'typography',
  'colour',
  'borders',
  'effects',
  'flexbox-grid',
  'transitions',
  'variants',
] as const;

export type UtilityCategoryId = (typeof UTILITY_CATEGORY_IDS)[number];

export const UTILITY_CATEGORY_LABELS: Readonly<Record<UtilityCategoryId, string>> = {
  layout: 'Layout',
  spacing: 'Spacing',
  sizing: 'Sizing',
  typography: 'Typography',
  colour: 'Colour',
  borders: 'Borders',
  effects: 'Effects',
  'flexbox-grid': 'Flexbox and grid',
  transitions: 'Transitions',
  variants: 'Responsive and state',
};

export interface UtilityEntry {
  /** The class to type in markup. */
  readonly class: string;
  readonly category: UtilityCategoryId;
  /** Our own one-line explanation. */
  readonly note: string;
  /** CSS compiled from the class by the pinned Tailwind version. */
  readonly css: string;
}

interface RawEntry {
  readonly class: string;
  readonly category: string;
  readonly note: string;
}

function isCategory(value: string): value is UtilityCategoryId {
  return (UTILITY_CATEGORY_IDS as readonly string[]).includes(value);
}

export const UTILITIES: readonly UtilityEntry[] = (rawEntries.entries as RawEntry[]).map(
  (entry) => {
    if (!isCategory(entry.category)) {
      throw new Error(`Unknown Tailwind category “${entry.category}”`);
    }
    return {
      class: entry.class,
      category: entry.category,
      note: entry.note,
      css: GENERATED_CSS[entry.class] ?? '',
    };
  },
);

/** Property names in the compiled CSS, so a search for “display” or “margin” works. */
function propertyNames(css: string): string {
  return [...css.matchAll(/(?:^|[\s{;])([a-z-]+):/g)].map((match) => match[1]).join(' ');
}

interface Searchable {
  readonly entry: UtilityEntry;
  readonly haystack: string;
}

const SEARCHABLE: readonly Searchable[] = UTILITIES.map((entry) => ({
  entry,
  haystack: `${entry.class} ${entry.note} ${propertyNames(entry.css)}`.toLowerCase(),
}));

/**
 * Search by class, CSS property or plain words. Every term has to match, so
 * “display flex” narrows to the flex utilities. Exact and prefix class matches
 * come first; the rest keep their data order so the list is stable.
 */
export function searchUtilities(
  query: string,
  category?: UtilityCategoryId | 'all',
): readonly UtilityEntry[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const filtered = SEARCHABLE.filter(({ entry, haystack }) => {
    if (category && category !== 'all' && entry.category !== category) return false;
    return terms.every((term) => haystack.includes(term));
  });

  if (terms.length === 0) return filtered.map(({ entry }) => entry);

  const normalized = query.trim().toLowerCase();
  const score = ({ entry }: Searchable): number => {
    const name = entry.class.toLowerCase();
    if (name === normalized) return 0;
    if (name.startsWith(normalized)) return 1;
    if (name.includes(normalized)) return 2;
    return 3;
  };

  return [...filtered].sort((left, right) => score(left) - score(right)).map(({ entry }) => entry);
}

export function categoryLabel(id: UtilityCategoryId): string {
  return UTILITY_CATEGORY_LABELS[id];
}

/** Counts per category, in display order, for the category buttons. */
export function categoryCounts(): readonly {
  id: UtilityCategoryId;
  label: string;
  count: number;
}[] {
  return UTILITY_CATEGORY_IDS.map((id) => ({
    id,
    label: UTILITY_CATEGORY_LABELS[id],
    count: UTILITIES.filter((entry) => entry.category === id).length,
  }));
}
