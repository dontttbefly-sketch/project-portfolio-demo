import { describe, expect, it } from 'vitest';
import { catalogObjects } from '../data/catalog';
import { celestialScaleProfiles } from '../data/celestialScale';
import {
  GALAXY_ONE_PIXEL_EQUIVALENT_SCENE_UNITS,
  getCelestialScaleProfile,
  isMarkerOnlyAtGalaxyScale,
  minimumTrueScaleCameraDistance,
  physicalSizeToSceneUnits,
  scaleMeasurementForProfile,
} from './celestialScale';

function scaleById(id: string) {
  return getCelestialScaleProfile(id);
}

describe('celestial true-scale profiles', () => {
  it('has an explicit scale profile for every catalog object', () => {
    expect(celestialScaleProfiles.map((profile) => profile.objectId).sort()).toEqual(
      catalogObjects.map((object) => object.id).sort(),
    );

    for (const object of catalogObjects) {
      const profile = scaleById(object.id);
      expect(profile.objectId).toBe(object.id);
      expect(profile.uncertaintyLabel.length).toBeGreaterThan(4);
      expect(profile.scaleSources.length).toBeGreaterThan(0);
    }
  });

  it('keeps the Sun physically invisible at galaxy scale and labels the far view as a marker', () => {
    const sun = scaleById('sun');

    expect(sun.scaleKind).toBe('stellar-radius');
    expect(sun.trueRadiusKm).toBe(695700);
    expect(isMarkerOnlyAtGalaxyScale(sun)).toBe(true);
    expect(physicalSizeToSceneUnits(sun, 'galaxy')).toBeLessThan(GALAXY_ONE_PIXEL_EQUIVALENT_SCENE_UNITS);
  });

  it('does not use far-view marker size as the physical radius calculation', () => {
    const sun = scaleById('sun');
    const visualMarkerScale = 0.58 + 2 * 0.18;

    expect(physicalSizeToSceneUnits(sun, 'galaxy')).toBeLessThan(visualMarkerScale / 1000);
    expect(physicalSizeToSceneUnits(sun, 'close-view')).toBeLessThan(visualMarkerScale);
  });

  it('keeps true-scale camera distance outside the visible close model', () => {
    const sun = scaleById('sun');
    const renderedRadius = physicalSizeToSceneUnits(sun, 'close-view');

    expect(minimumTrueScaleCameraDistance(sun)).toBeGreaterThan(renderedRadius);
  });

  it('uses diameters and spans for clusters, nebulae, and galaxy structures', () => {
    const pleiades = scaleById('pleiades');
    const omega = scaleById('omega-centauri');
    const carina = scaleById('carina-nebula');
    const thinDisk = scaleById('thin-disk-component');

    expect(pleiades.scaleKind).toBe('cluster-diameter');
    expect(omega.scaleKind).toBe('cluster-diameter');
    expect(carina.scaleKind).toBe('nebula-diameter');
    expect(thinDisk.scaleKind).toBe('galaxy-structure-span');

    for (const profile of [pleiades, omega, carina, thinDisk]) {
      expect(profile.trueRadiusKm).toBeUndefined();
      expect(profile.trueDiameterLy).toBeGreaterThan(0);
      expect(scaleMeasurementForProfile(profile).unit).toBe('ly');
    }
  });

  it('leaves Sagittarius A* as a visible-light location, not an entity sphere', () => {
    const sagittariusA = scaleById('sagittarius-a-star');

    expect(sagittariusA.scaleKind).toBe('black-hole-location');
    expect(sagittariusA.trueRadiusKm).toBeUndefined();
    expect(sagittariusA.trueDiameterLy).toBeUndefined();
    expect(physicalSizeToSceneUnits(sagittariusA, 'close-view')).toBe(0);
  });
});
