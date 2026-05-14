import { describe, expect, it } from 'vitest';
import { initialGalaxyLayers } from '../data/layers';
import { getVisibleLayerIds, toggleLayerVisibility } from './layers';

describe('galaxy layer state', () => {
  it('toggles layers immutably by id', () => {
    const next = toggleLayerVisibility(initialGalaxyLayers, 'dust-lanes');

    expect(next).not.toBe(initialGalaxyLayers);
    expect(next.find((layer) => layer.id === 'dust-lanes')?.visible).toBe(false);
    expect(initialGalaxyLayers.find((layer) => layer.id === 'dust-lanes')?.visible).toBe(true);
  });

  it('leaves unknown layer ids untouched', () => {
    expect(toggleLayerVisibility(initialGalaxyLayers, 'unknown')).toEqual(initialGalaxyLayers);
  });

  it('lists only visible layer ids in display order', () => {
    expect(getVisibleLayerIds(initialGalaxyLayers)).toEqual(
      initialGalaxyLayers.filter((layer) => layer.visible).map((layer) => layer.id),
    );
  });
});
