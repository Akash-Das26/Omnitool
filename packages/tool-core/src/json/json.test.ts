import { describe, expect, it } from 'vitest';
import {
  formatJson,
  JsonSyntaxError,
  minifyJson,
  positionAt,
  scanJsonSyntax,
  utf8ByteLength,
  validateJson,
} from './index';

describe('formatJson', () => {
  it('indents with two spaces by default', () => {
    expect(formatJson('{"a":1,"b":[true,null]}')).toBe(
      '{\n  "a": 1,\n  "b": [\n    true,\n    null\n  ]\n}\n',
    );
  });

  it('supports four spaces and tabs', () => {
    expect(formatJson('{"a":1}', 4)).toBe('{\n    "a": 1\n}\n');
    expect(formatJson('{"a":1}', 'tab')).toBe('{\n\t"a": 1\n}\n');
  });

  it('keeps top-level primitives and unicode intact', () => {
    expect(formatJson('"café"')).toBe('"café"\n');
    expect(formatJson('42')).toBe('42\n');
  });
});

describe('minifyJson', () => {
  it('removes insignificant whitespace', () => {
    expect(minifyJson('{\n  "a": [1, 2]\n}')).toBe('{"a":[1,2]}');
  });
});

describe('validateJson', () => {
  it('returns the parsed value when valid', () => {
    expect(validateJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
  });

  it('reports a line and column for a syntax error', () => {
    const result = validateJson('{\n  "a": 1,\n  "b": }\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(3);
    expect(result.error.column).toBeGreaterThan(6);
    expect(result.error.message.length).toBeGreaterThan(0);
  });

  it('rejects empty input with a helpful message', () => {
    expect(validateJson('   ')).toEqual({
      ok: false,
      error: { message: 'Paste some JSON first', line: 1, column: 1 },
    });
  });

  it('throws a typed error from formatJson', () => {
    expect(() => formatJson('{')).toThrow(JsonSyntaxError);
    try {
      formatJson('{');
    } catch (cause) {
      expect(cause).toBeInstanceOf(JsonSyntaxError);
      expect((cause as JsonSyntaxError).line).toBe(1);
    }
  });
});

describe('positionAt', () => {
  it('counts lines and columns from one', () => {
    expect(positionAt('abc\ndef', 0)).toEqual({ line: 1, column: 1 });
    expect(positionAt('abc\ndef', 5)).toEqual({ line: 2, column: 2 });
    expect(positionAt('abc\ndef', 999)).toEqual({ line: 2, column: 4 });
  });
});

describe('utf8ByteLength', () => {
  it('counts bytes rather than code units', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('🌍')).toBe(4);
  });
});

describe('scanJsonSyntax', () => {
  const cases: Array<[string, string]> = [
    ['{"a": "unterminated}', 'Unterminated string'],
    ['{"a": "bad\\q"}', 'Invalid escape sequence'],
    ['{"a": "\\u12"}', 'Invalid unicode escape'],
    ['{"a": "line\nbreak"}', 'Control characters'],
    ['{"a": -}', 'Invalid number'],
    ['{a: 1}', 'double-quoted property name'],
    ['{"a" 1}', "Expected ':'"],
    ['{"a": 1 "b": 2}', "Expected ',' or '}'"],
    ['[1 2]', "Expected ',' or ']'"],
    ['{"a": @}', 'Unexpected character'],
    ['{"a":', 'Unexpected end'],
    ['{} {}', 'after the end'],
    ['{"a": 1,}', 'double-quoted property name'],
    ['[1,]', 'Unexpected character'],
  ];

  it.each(cases)('explains %s', (input, fragment) => {
    const error = scanJsonSyntax(input);
    expect(error?.message).toContain(fragment);
    expect(error?.line).toBeGreaterThanOrEqual(1);
    expect(error?.column).toBeGreaterThanOrEqual(1);
  });

  it('returns null for valid JSON', () => {
    expect(scanJsonSyntax('{"a": [1, true, null, "x"]}')).toBeNull();
  });

  it('points at the line with the problem', () => {
    expect(scanJsonSyntax('{\n  "a": 1\n  "b": 2\n}')).toMatchObject({ line: 3 });
  });

  it('stops at a sensible nesting depth', () => {
    const deep = `${'['.repeat(1001)}${']'.repeat(1001)}`;
    expect(scanJsonSyntax(deep)?.message).toBe('JSON is nested too deeply');
  });

  it('is used when the engine message has no location', () => {
    const result = validateJson('{"a": 1,}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(1);
    expect(result.error.column).toBe(9);
  });
});
