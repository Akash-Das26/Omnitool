/**
 * Regular expression matching for the tester.
 *
 * A pattern can backtrack catastrophically, which no amount of checking inside
 * the loop can stop once it is inside one `exec` call. The caller therefore runs
 * this in a worker and terminates it on a deadline; these functions add the
 * cheap guards: a cap on matches and progress for zero-length matches.
 */

export const MAX_MATCHES = 1000;
const ALLOWED_FLAGS = new Set(['i', 'm', 's', 'u']);

export interface RegexGroup {
  readonly name: string | null;
  readonly value: string | undefined;
}

export interface RegexMatchInfo {
  readonly index: number;
  readonly length: number;
  readonly value: string;
  readonly groups: readonly RegexGroup[];
}

export interface RegexOutcome {
  readonly matches: readonly RegexMatchInfo[];
  readonly truncated: boolean;
  readonly error?: string;
}

export function validateFlags(flags: string): string | null {
  const seen = new Set<string>();
  for (const flag of flags) {
    if (!ALLOWED_FLAGS.has(flag))
      return `"${flag}" is not one of the flags this tester allows (i, m, s, u)`;
    if (seen.has(flag)) return `The flag "${flag}" appears more than once`;
    seen.add(flag);
  }
  return null;
}

export function runRegex(
  source: string,
  flags: string,
  text: string,
  options: { readonly maxMatches?: number } = {},
): RegexOutcome {
  const flagError = validateFlags(flags);
  if (flagError) return { matches: [], truncated: false, error: flagError };
  if (source === '') return { matches: [], truncated: false, error: 'Enter a pattern' };

  const maxMatches = Math.max(1, options.maxMatches ?? MAX_MATCHES);
  let regex: RegExp;
  try {
    regex = new RegExp(source, `${flags}dg`);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'That pattern is not valid';
    return { matches: [], truncated: false, error: message };
  }

  const matches: RegexMatchInfo[] = [];
  let truncated = false;
  let match = regex.exec(text);
  while (match !== null) {
    // The `d` flag gives every group's span, so a numbered group that is also
    // named is reported once, under its name, rather than twice.
    const indices = (
      match as unknown as {
        indices?: { groups?: Record<string, [number, number] | undefined> } & (
          | [number, number]
          | undefined
        )[];
      }
    ).indices;
    const namedIndices = indices?.groups ?? {};
    const groups: RegexGroup[] = [];
    for (let index = 1; index < match.length; index += 1) {
      const span = indices?.[index];
      const name =
        span === undefined
          ? undefined
          : Object.keys(namedIndices).find((key) => {
              const named = namedIndices[key];
              return named !== undefined && named[0] === span[0] && named[1] === span[1];
            });
      groups.push({ name: name ?? null, value: match[index] });
    }
    matches.push({
      index: match.index,
      length: match[0].length,
      value: match[0],
      groups,
    });

    if (matches.length >= maxMatches) {
      // Record the cap honestly: only call it truncated when another match exists.
      if (match[0] === '') regex.lastIndex += 1;
      truncated = regex.exec(text) !== null;
      break;
    }
    // A zero-length match would otherwise stay at the same index for ever.
    if (match[0] === '') regex.lastIndex += 1;
    match = regex.exec(text);
  }

  return { matches, truncated };
}
