import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  createDefaultState,
  isParseFailure,
  parseImportData,
  serializeExportData
} from './storage';

describe('storage import and export', () => {
  it('uses a versioned storage key', () => {
    expect(STORAGE_KEY).toBe('growth_os.v1');
  });

  it('serializes and parses a valid backup', () => {
    const state = createDefaultState();
    const serialized = serializeExportData(state);

    expect(parseImportData(serialized)).toEqual(state);
  });

  it('rejects invalid JSON', () => {
    const result = parseImportData('{bad json');

    expect(isParseFailure(result)).toBe(true);
    if (isParseFailure(result)) {
      expect(result.error).toContain('JSON');
    }
  });

  it('rejects backups with missing collections', () => {
    const result = parseImportData(JSON.stringify({ version: 1, domains: [] }));

    expect(isParseFailure(result)).toBe(true);
  });
});
