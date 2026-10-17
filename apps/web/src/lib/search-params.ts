import { CATEGORY_IDS } from '@omnitool/tools-registry';
import * as v from 'valibot';

const categorySchema = v.picklist(CATEGORY_IDS);
const colourSchema = v.pipe(v.string(), v.regex(/^#?[0-9a-f]{3,8}$/i));
const runSchema = v.pipe(
  v.string(),
  v.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
);
const querySchema = v.pipe(v.string(), v.maxLength(80));

/** Shared params only. Tool-specific params are parsed by the tool's own schema. */
export const sharedSearchSchema = v.object({
  category: v.optional(categorySchema),
  color: v.optional(colourSchema),
  run: v.optional(runSchema),
  q: v.optional(querySchema),
});

export type SharedSearch = v.InferOutput<typeof sharedSearchSchema>;

const fields = {
  category: categorySchema,
  color: colourSchema,
  run: runSchema,
  q: querySchema,
} as const;

type FieldName = keyof typeof fields;

function isFieldName(key: string): key is FieldName {
  return key in fields;
}

/**
 * TanStack Router's validateSearch. Invalid fields fall back to their default
 * (absent); unknown keys are dropped, so file data can never round-trip.
 */
export function validateSharedSearch(search: Record<string, unknown>): SharedSearch {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(search)) {
    if (!isFieldName(key) || typeof value !== 'string') continue;
    const result = v.safeParse(fields[key], value);
    if (result.success) output[key] = result.output;
  }

  return output as SharedSearch;
}

const allowedKeys = new Set<string>(Object.keys(fields));

/** Serialise validated shared params. Extra keys are deliberately ignored. */
export function toSearchParams(search: SharedSearch): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (!allowedKeys.has(key) || typeof value !== 'string' || !value) continue;
    params.set(key, value);
  }
  return params;
}

export function parseSearchParams(input: URLSearchParams): SharedSearch {
  return validateSharedSearch(Object.fromEntries(input.entries()));
}
