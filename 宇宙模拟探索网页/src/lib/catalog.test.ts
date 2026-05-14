import { describe, expect, it } from 'vitest';
import { catalogObjects } from '../data/catalog';
import { findObjectById, searchCatalog } from './catalog';

describe('catalog search and lookup', () => {
  it('finds learning anchors with Chinese names, English aliases, and source hints', () => {
    expect(searchCatalog(catalogObjects, '银心')[0]?.id).toBe('galactic-center');
    expect(searchCatalog(catalogObjects, 'orion')[0]?.id).toBe('orion-spur');
    expect(searchCatalog(catalogObjects, 'gaia').map((item) => item.id)).toContain('sun');
  });

  it('returns undefined for unknown catalog ids instead of throwing', () => {
    expect(findObjectById(catalogObjects, 'missing-star')).toBeUndefined();
  });

  it('keeps every object labeled with a realism level and at least one source', () => {
    for (const object of catalogObjects) {
      expect(['measured', 'model', 'artistic']).toContain(object.realism);
      expect(object.sources.length).toBeGreaterThan(0);
    }
  });
});
