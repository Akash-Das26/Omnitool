import { matchesFilePattern } from '@omnitool/tool-core';
import * as v from 'valibot';
import seed from '../data/registry.seed.json';
import { CATEGORY_LABELS } from './category-labels';
import { CATEGORY_IDS, type Category, type CategoryId, type Tool, type ToolFlag } from './types';

export type { Category, CategoryId, Tool, ToolFlag };
export { CATEGORY_IDS, CATEGORY_LABELS };

const CATEGORY_ICONS: Readonly<Record<CategoryId, string>> = {
  colour: 'palette',
  'img-assets': 'image',
  'social-media': 'share-2',
  'audio-video': 'music',
  pdf: 'file-text',
  'print-production': 'printer',
  'typo-text': 'type',
  'dev-tools': 'code',
  'other-tools': 'wrench',
  calculators: 'calculator',
  'turbo-nerd': 'terminal',
  experiments: 'flask-conical',
};

const CATEGORY_ORDER: readonly CategoryId[] = [
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
];

const toolSchema = v.object({
  id: v.pipe(v.string(), v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Tool ids are kebab-case')),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.string(),
  category: v.picklist(CATEGORY_IDS),
  categoryName: v.string(),
  flags: v.array(v.picklist(['new', 'beta', 'wide', 'atlas', 'carryColour', 'highlight'] as const)),
  accepts: v.array(v.pipe(v.string(), v.minLength(1))),
  produces: v.array(v.pipe(v.string(), v.minLength(1))),
  tier: v.picklist([1, 2, 3] as const),
  phase: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(9)),
});

const seedTools: unknown = (seed as { tools: unknown }).tools;
const parsed = v.safeParse(v.array(toolSchema), seedTools);

if (!parsed.success) {
  const first = parsed.issues[0];
  throw new Error(`registry.seed.json is invalid: ${first?.message ?? 'unknown error'}`);
}

export const TOOLS: readonly Tool[] = parsed.output.map((tool) => ({
  ...tool,
  categoryName: CATEGORY_LABELS[tool.category],
  icon: CATEGORY_ICONS[tool.category],
  href: `/tools/${tool.id}`,
}));

export const TOOLS_BY_ID: ReadonlyMap<string, Tool> = new Map(
  TOOLS.map((tool) => [tool.id, tool] as const),
);

export const CATEGORIES: readonly Category[] = CATEGORY_ORDER.map((id) => ({
  id,
  name: CATEGORY_LABELS[id],
  tools: TOOLS.filter((tool) => tool.category === id),
})).filter((category) => category.tools.length > 0);

export const TOOL_COUNT = TOOLS.length;

export function getTool(id: string): Tool | undefined {
  return TOOLS_BY_ID.get(id);
}

export function toolsAccepting(file: { type: string; name: string }): readonly Tool[] {
  return TOOLS.filter((tool) => tool.accepts.some((pattern) => matchesFilePattern(file, pattern)));
}

export interface ToolSearchOptions {
  readonly category?: CategoryId;
  readonly accepts?: { type: string; name: string };
}

export function searchTools(query: string, options: ToolSearchOptions = {}): readonly Tool[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const accepts = options.accepts;

  return TOOLS.filter((tool) => {
    if (options.category && tool.category !== options.category) return false;
    if (accepts && !tool.accepts.some((pattern) => matchesFilePattern(accepts, pattern))) {
      return false;
    }
    if (terms.length === 0) return true;

    const haystack = [
      tool.name,
      tool.id,
      tool.categoryName,
      tool.description,
      ...tool.accepts,
      ...tool.produces,
      ...tool.flags,
    ]
      .join(' ')
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}
