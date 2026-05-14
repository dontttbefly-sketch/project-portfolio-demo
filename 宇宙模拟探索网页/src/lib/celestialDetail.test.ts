import { describe, expect, it } from 'vitest';
import { catalogObjects } from '../data/catalog';
import { celestialRealityProfiles, getCelestialRealityProfile } from '../data/celestialReality';
import { calculateNakedEyeVisibilityState } from './opticalVisibility';
import {
  getCelestialDetailProfile,
  minimumCameraDistanceForProfile,
} from './celestialDetail';

function objectById(id: string) {
  const object = catalogObjects.find((item) => item.id === id);
  expect(object).toBeDefined();
  return object!;
}

describe('celestial close-up detail profiles', () => {
  it('has an explicit visible-light reality profile for every catalog object', () => {
    expect(celestialRealityProfiles.map((profile) => profile.objectId).sort()).toEqual(
      catalogObjects.map((object) => object.id).sort(),
    );

    for (const object of catalogObjects) {
      const profile = getCelestialRealityProfile(object.id);
      expect(profile.objectId).toBe(object.id);
      expect(profile.visibilityMode).toBe('visible-light');
      expect(profile.sourceRefs.length).toBeGreaterThan(0);
      expect(profile.visibleLightFeatures.length).toBeGreaterThan(0);
      expect(profile.surfaceTruth).toContain('没有固体表面');
      expect(profile.scaleProfile.objectId).toBe(object.id);
    }
  });

  it('gives every catalog object a physical reality profile', () => {
    for (const object of catalogObjects) {
      const profile = getCelestialDetailProfile(object);

      expect(profile.physical.classLabel.length).toBeGreaterThan(1);
      expect(profile.physical.scaleLabel.length).toBeGreaterThan(1);
      expect(profile.physical.realAppearance.length).toBeGreaterThan(1);
      expect(profile.physical.observationNote.length).toBeGreaterThan(1);
      expect(profile.physical.hasSolidSurface).toBe(false);
    }
  });

  it('maps selected catalog objects to physically recognizable close-up kinds', () => {
    expect(getCelestialDetailProfile(objectById('sun')).kind).toBe('sun-like-star');
    expect(getCelestialDetailProfile(objectById('betelgeuse')).kind).toBe('red-supergiant');
    expect(getCelestialDetailProfile(objectById('sagittarius-a-star')).kind).toBe('optical-black-hole-location');
    expect(getCelestialDetailProfile(objectById('carina-nebula')).kind).toBe('visible-nebula');
    expect(getCelestialDetailProfile(objectById('omega-centauri')).kind).toBe('globular-cluster');
  });

  it('gives every close-up profile a naked-eye optical profile instead of a hard reveal distance', () => {
    for (const object of catalogObjects) {
      const profile = getCelestialDetailProfile(object);

      expect(profile.opticalProfile.resolvedThresholdDeg).toBeCloseTo(0.03);
      expect(profile.opticalProfile.broadFeatureThresholdDeg).toBeCloseTo(0.3);
      expect(profile.opticalProfile.fineFeatureThresholdDeg).toBeCloseTo(1.5);
      expect('revealDistance' in profile).toBe(false);
    }
  });

  it('exposes nearby visual features without claiming photo-real surface data', () => {
    const sunProfile = getCelestialDetailProfile(objectById('sun'));
    expect(sunProfile.features).toContain('光球颗粒');
    expect(sunProfile.features).toContain('太阳黑子');
    expect(sunProfile.physical.classLabel).toContain('G 型');
    expect(sunProfile.physical.realAppearance).toContain('等离子体');
    expect(sunProfile.detailLayers).toEqual(
      expect.arrayContaining(['granulated-photosphere', 'limb-darkening', 'sunspots', 'faculae']),
    );
    expect(sunProfile.detailLayers).not.toContain('magnetic-loops');
    expect(sunProfile.note).toContain('程序化');

    const blackHoleProfile = getCelestialDetailProfile(objectById('sagittarius-a-star'));
    expect(blackHoleProfile.features).toContain('可见光不可见');
    expect(blackHoleProfile.features).toContain('银心遮挡');
    expect(blackHoleProfile.physical.realAppearance).toContain('没有可见表面');
    expect(blackHoleProfile.detailLayers).not.toContain('accretion-disk');
    expect(blackHoleProfile.detailLayers).not.toContain('photon-ring');
  });

  it('does not represent clusters, nebulae, or galaxy structures as solid planets', () => {
    expect(getCelestialDetailProfile(objectById('pleiades')).physical.classLabel).toContain('疏散星团');
    expect(getCelestialDetailProfile(objectById('carina-nebula')).physical.classLabel).toContain('发射星云');
    expect(getCelestialDetailProfile(objectById('orion-spur')).physical.classLabel).toContain('银河结构');
    expect(getCelestialDetailProfile(objectById('thin-disk-component')).physical.realAppearance).toContain('不是单个天体');
  });

  it('uses warmer larger close-up behavior for Betelgeuse than the Sun', () => {
    const sunProfile = getCelestialDetailProfile(objectById('sun'));
    const betelgeuseProfile = getCelestialDetailProfile(objectById('betelgeuse'));

    expect(betelgeuseProfile.physical.classLabel).toContain('红超巨星');
    expect(betelgeuseProfile.closeViewSceneRadius).toBeGreaterThan(sunProfile.closeViewSceneRadius);
    expect(betelgeuseProfile.motionScale).toBeLessThan(sunProfile.motionScale);
  });

  it('keeps the optical proxy continuous instead of hidden behind a distance switch', () => {
    const profile = getCelestialDetailProfile(objectById('sun'));
    const farState = calculateNakedEyeVisibilityState(profile, 96);
    const closeState = calculateNakedEyeVisibilityState(profile, 1.2);

    expect(farState.markerOpacity).toBeGreaterThan(closeState.markerOpacity);
    expect(closeState.objectOpacity).toBeGreaterThan(farState.objectOpacity);
    expect(closeState.featureStrength).toBeGreaterThanOrEqual(farState.featureStrength);
  });

  it('keeps the closest camera distance outside the visible detail model', () => {
    const sunProfile = getCelestialDetailProfile(objectById('sun'));
    const nebulaProfile = getCelestialDetailProfile(objectById('carina-nebula'));

    expect(minimumCameraDistanceForProfile(sunProfile)).toBeGreaterThan(sunProfile.closeViewSceneRadius);
    expect(minimumCameraDistanceForProfile(nebulaProfile)).toBeGreaterThan(nebulaProfile.closeViewSceneRadius);
    expect(minimumCameraDistanceForProfile(nebulaProfile)).toBeGreaterThan(minimumCameraDistanceForProfile(sunProfile));
  });

  it('keeps Sagittarius A* as a location model with no entity radius', () => {
    const blackHoleProfile = getCelestialDetailProfile(objectById('sagittarius-a-star'));

    expect(blackHoleProfile.scaleProfile.scaleKind).toBe('black-hole-location');
    expect(blackHoleProfile.closeViewSceneRadius).toBe(0);
    expect(blackHoleProfile.detailLayers).not.toContain('entity-sphere');
  });
});
