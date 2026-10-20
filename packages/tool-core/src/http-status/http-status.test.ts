import { describe, expect, it } from 'vitest';
import {
  findStatus,
  HTTP_STATUSES,
  STATUS_CLASSES,
  type StatusClass,
  searchStatuses,
  statusClass,
} from './index';

describe('the status table', () => {
  it('has no duplicate codes and no duplicate registered names', () => {
    const codes = HTTP_STATUSES.map((entry) => entry.code);
    const names = HTTP_STATUSES.map((entry) => entry.name);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('derives every class from the first digit', () => {
    for (const entry of HTTP_STATUSES) {
      expect(statusClass(entry.code), `${entry.code}`).toBe(`${String(entry.code)[0]}xx`);
      expect(entry.className).toBe(`${String(entry.code)[0]}xx`);
      expect(STATUS_CLASSES).toContain(entry.className as StatusClass);
    }
  });

  it('keeps every code inside a class and every sentence non-empty', () => {
    for (const entry of HTTP_STATUSES) {
      expect(entry.code).toBeGreaterThanOrEqual(100);
      expect(entry.code).toBeLessThanOrEqual(599);
      expect(entry.meaning.length).toBeGreaterThan(10);
      expect(entry.use.length).toBeGreaterThan(10);
      expect(entry.meaning.endsWith('.')).toBe(true);
      expect(entry.use.endsWith('.')).toBe(true);
    }
  });

  it('covers the codes the tool promises in its copy', () => {
    for (const code of [200, 204, 301, 304, 400, 401, 403, 404, 418, 429, 500, 502, 503, 504]) {
      expect(findStatus(code)?.name, `${code}`).toBeTruthy();
    }
  });
});

describe('statusClass', () => {
  it('maps the five classes', () => {
    expect(statusClass(103)).toBe('1xx');
    expect(statusClass(204)).toBe('2xx');
    expect(statusClass(308)).toBe('3xx');
    expect(statusClass(451)).toBe('4xx');
    expect(statusClass(511)).toBe('5xx');
  });

  it('rejects codes outside 100-599 and non-integers', () => {
    expect(statusClass(99)).toBeNull();
    expect(statusClass(600)).toBeNull();
    expect(statusClass(404.5)).toBeNull();
  });
});

describe('findStatus', () => {
  it('finds a code and nothing for an unregistered one', () => {
    expect(findStatus(404)?.name).toBe('Not Found');
    expect(findStatus(418)?.className).toBe('4xx');
    expect(findStatus(999)).toBeUndefined();
  });
});

describe('searchStatuses', () => {
  it('returns everything without a query', () => {
    expect(searchStatuses('')).toHaveLength(HTTP_STATUSES.length);
    expect(searchStatuses('   ')).toHaveLength(HTTP_STATUSES.length);
  });

  it('matches by code, name and words in the explanation', () => {
    expect(searchStatuses('429').map((entry) => entry.code)).toEqual([429]);
    expect(searchStatuses('not found').map((entry) => entry.code)).toEqual([404]);
    expect(searchStatuses('gateway').map((entry) => entry.code)).toEqual([502, 504]);
    expect(searchStatuses('rate limit').map((entry) => entry.code)).toEqual([429]);
  });

  it('requires every token to match, so a narrow query stays narrow', () => {
    expect(searchStatuses('gateway timeout').map((entry) => entry.code)).toEqual([504]);
    expect(searchStatuses('teapot coffee').map((entry) => entry.code)).toEqual([418]);
    expect(searchStatuses('gateway coffee')).toEqual([]);
  });

  it('filters by class before matching', () => {
    expect(searchStatuses('', '5xx').every((entry) => entry.className === '5xx')).toBe(true);
    expect(searchStatuses('', '2xx')).toHaveLength(
      HTTP_STATUSES.filter((entry) => entry.className === '2xx').length,
    );
    expect(searchStatuses('found', '3xx').map((entry) => entry.code)).toEqual([302]);
  });

  it('is case-insensitive and ignores punctuation', () => {
    expect(searchStatuses('Too-Many   Requests').map((entry) => entry.code)).toEqual([429]);
  });
});
