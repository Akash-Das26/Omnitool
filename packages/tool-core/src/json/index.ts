export interface JsonErrorInfo {
  readonly message: string;
  readonly line: number;
  readonly column: number;
}

export class JsonSyntaxError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(info: JsonErrorInfo) {
    super(info.message);
    this.name = 'JsonSyntaxError';
    this.line = info.line;
    this.column = info.column;
  }
}

export type JsonValidation =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: JsonErrorInfo };

const LINE_COLUMN = /line (\d+) column (\d+)/i;
const POSITION = /position (\d+)/i;

/** Turn an offset into a 1-based line and column. */
export function positionAt(text: string, offset: number): { line: number; column: number } {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, safeOffset);
  const line = before.split('\n').length;
  const lastBreak = before.lastIndexOf('\n');
  const column = safeOffset - lastBreak;
  return { line, column };
}

type ScanFailure = { readonly ok: false; readonly offset: number; readonly message: string };
type ScanResult = { readonly ok: true } | ScanFailure;

const MAX_DEPTH = 1000;

function isWhitespace(character: string): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}

/**
 * Some engines omit the offset from a parse error ("Unexpected token '}' … is
 * not valid JSON"). This small scanner finds the offset so the UI can always
 * point at a line and column. It only checks syntax; JSON.parse still produces
 * the value.
 */
function scan(text: string): ScanResult {
  let index = 0;
  let depth = 0;

  const fail = (message: string, at = index): ScanFailure => ({ ok: false, offset: at, message });
  const current = () => text.charAt(index);

  function skipSpace(): void {
    while (index < text.length && isWhitespace(text.charAt(index))) index += 1;
  }

  function scanString(): ScanFailure | null {
    index += 1;
    while (index < text.length) {
      const character = current();
      if (character === '"') {
        index += 1;
        return null;
      }
      if (character === '\\') {
        const escaped = text.charAt(index + 1);
        if (escaped === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(index + 2, index + 6))) {
            return fail('Invalid unicode escape in a string');
          }
          index += 6;
          continue;
        }
        if (escaped !== '' && '"\\/bfnrt'.includes(escaped)) {
          index += 2;
          continue;
        }
        return fail('Invalid escape sequence in a string');
      }
      if (character.charCodeAt(0) < 0x20) {
        return fail('Control characters must be escaped in a string');
      }
      index += 1;
    }
    return fail('Unterminated string');
  }

  function scanNumber(): ScanFailure | null {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(index));
    if (!match) return fail('Invalid number');
    index += match[0].length;
    return null;
  }

  function scanObject(): ScanFailure | null {
    index += 1;
    if (++depth > MAX_DEPTH) return fail('JSON is nested too deeply');
    skipSpace();
    if (current() === '}') {
      index += 1;
      depth -= 1;
      return null;
    }
    for (;;) {
      skipSpace();
      if (current() !== '"') return fail('Expected a double-quoted property name');
      const keyError = scanString();
      if (keyError) return keyError;
      skipSpace();
      if (current() !== ':') return fail("Expected ':' after a property name");
      index += 1;
      const valueError = scanValue();
      if (valueError) return valueError;
      skipSpace();
      if (current() === ',') {
        index += 1;
        continue;
      }
      if (current() === '}') {
        index += 1;
        depth -= 1;
        return null;
      }
      return fail("Expected ',' or '}' after a property value");
    }
  }

  function scanArray(): ScanFailure | null {
    index += 1;
    if (++depth > MAX_DEPTH) return fail('JSON is nested too deeply');
    skipSpace();
    if (current() === ']') {
      index += 1;
      depth -= 1;
      return null;
    }
    for (;;) {
      const valueError = scanValue();
      if (valueError) return valueError;
      skipSpace();
      if (current() === ',') {
        index += 1;
        continue;
      }
      if (current() === ']') {
        index += 1;
        depth -= 1;
        return null;
      }
      return fail("Expected ',' or ']' after an array value");
    }
  }

  function scanValue(): ScanFailure | null {
    skipSpace();
    if (index >= text.length) return fail('Unexpected end of JSON input');
    const character = current();
    if (character === '{') return scanObject();
    if (character === '[') return scanArray();
    if (character === '"') return scanString();
    if (character === '-' || (character >= '0' && character <= '9')) return scanNumber();
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        return null;
      }
    }
    return fail(`Unexpected character ${JSON.stringify(character)}`);
  }

  const valueError = scanValue();
  if (valueError) return valueError;
  skipSpace();
  if (index < text.length) return fail('Unexpected content after the end of the JSON value');
  return { ok: true };
}

/** Locate the first syntax error without relying on engine error messages. */
export function scanJsonSyntax(text: string): JsonErrorInfo | null {
  const result = scan(text);
  if (result.ok) return null;
  const { line, column } = positionAt(text, result.offset);
  return { message: result.message, line, column };
}

/**
 * Engines word their parse errors differently: V8 and Firefox often include
 * "line N column M", older messages only a character position, and some omit
 * both. Fall back to the scanner so every error gets a location.
 */
function locateError(text: string, message: string): { line: number; column: number } {
  const explicit = LINE_COLUMN.exec(message);
  if (explicit) {
    return { line: Number(explicit[1]), column: Number(explicit[2]) };
  }
  const position = POSITION.exec(message);
  if (position) {
    return positionAt(text, Number(position[1]));
  }
  const scanned = scan(text);
  if (!scanned.ok) {
    return positionAt(text, scanned.offset);
  }
  return { line: 1, column: 1 };
}

function parse(text: string): unknown {
  if (text.trim() === '') {
    throw new JsonSyntaxError({ message: 'Paste some JSON first', line: 1, column: 1 });
  }
  try {
    return JSON.parse(text);
  } catch (cause) {
    const raw = cause instanceof Error ? cause.message : 'That is not valid JSON';
    const { line, column } = locateError(text, raw);
    throw new JsonSyntaxError({ message: raw, line, column });
  }
}

export function validateJson(text: string): JsonValidation {
  try {
    return { ok: true, value: parse(text) };
  } catch (cause) {
    if (cause instanceof JsonSyntaxError) {
      return {
        ok: false,
        error: { message: cause.message, line: cause.line, column: cause.column },
      };
    }
    throw cause;
  }
}

export type JsonIndent = 2 | 4 | 'tab';

const INDENT: Record<JsonIndent, string | number> = { 2: 2, 4: 4, tab: '\t' };

export function formatJson(text: string, indent: JsonIndent = 2): string {
  const value = parse(text);
  return `${JSON.stringify(value, null, INDENT[indent])}\n`;
}

export function minifyJson(text: string): string {
  return JSON.stringify(parse(text));
}

/** Byte length of the UTF-8 encoding, used to decide whether to use a worker. */
export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
