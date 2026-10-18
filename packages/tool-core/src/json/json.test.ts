import { describe, expect, it } from 'vitest';
import {
  formatJson,
  JsonSyntaxError,
  minifyJson,
  positionAt,
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
