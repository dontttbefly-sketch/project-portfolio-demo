import { describe, expect, it } from 'vitest';
import { getVisualQualityProfile, limitLayerParticleCount, visualQualityProfiles } from './visualQuality';
import { initialGalaxyLayers } from '../data/layers';

describe('visual quality profiles', () => {
  it('selects lower caps for low core devices and higher caps for capable devices', () => {
    expect(getVisualQualityProfile(2).id).toBe('low');
    expect(getVisualQualityProfile(6).id).toBe('standard');
    expect(getVisualQualityProfile(10).id).toBe('high');
  });

  it('limits particles per render style using the selected quality profile', () => {
    const nebulaLayer = initialGalaxyLayers.find((layer) => layer.id === 'nebulae');
    const diskLayer = initialGalaxyLayers.find((layer) => layer.id === 'thin-disk');
    expect(nebulaLayer).toBeDefined();
    expect(diskLayer).toBeDefined();

    expect(limitLayerParticleCount(nebulaLayer!, visualQualityProfiles.low)).toBeLessThan(
      nebulaLayer!.particleCount,
    );
    expect(limitLayerParticleCount(diskLayer!, visualQualityProfiles.standard)).toBeLessThanOrEqual(
      diskLayer!.particleCount,
    );
    expect(limitLayerParticleCount(diskLayer!, visualQualityProfiles.high)).toBe(diskLayer!.particleCount);
  });

  it('requires every configured layer to declare a render style', () => {
    expect(initialGalaxyLayers.every((layer) => Boolean(layer.renderStyle))).toBe(true);
  });
});
