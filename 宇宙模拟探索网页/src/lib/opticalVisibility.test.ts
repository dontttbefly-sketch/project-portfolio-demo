import { describe, expect, it } from 'vitest';
import { catalogObjects } from '../data/catalog';
import { getCelestialDetailProfile } from './celestialDetail';
import {
  calculateAngularDiameter,
  calculateNakedEyeVisibilityState,
  featureStrengthForAngularSize,
} from './opticalVisibility';

function profileFor(id: string) {
  const object = catalogObjects.find((item) => item.id === id);
  expect(object).toBeDefined();
  return getCelestialDetailProfile(object!);
}

describe('naked-eye optical visibility', () => {
  it('calculates angular diameter as a continuous value that grows when distance shrinks', () => {
    const far = calculateAngularDiameter(1, 60);
    const mid = calculateAngularDiameter(1, 20);
    const near = calculateAngularDiameter(1, 5);

    expect(far).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(far);
    expect(near).toBeGreaterThan(mid);
  });

  it('keeps the Sun as a marker or point source at far distance instead of showing details', () => {
    const sun = profileFor('sun');
    const state = calculateNakedEyeVisibilityState(sun, 96);

    expect(['marker-only', 'point-source']).toContain(state.phase);
    expect(state.featureStrength).toBe(0);
    expect(state.markerOpacity).toBeGreaterThan(state.objectOpacity);
  });

  it('moves the Sun through point, resolved disc, and feature-visible phases continuously', () => {
    const sun = profileFor('sun');
    const pointState = calculateNakedEyeVisibilityState(sun, 96);
    const discState = calculateNakedEyeVisibilityState(sun, 7);
    const featureState = calculateNakedEyeVisibilityState(sun, 0.9);

    expect(pointState.angularDiameterDeg).toBeLessThan(discState.angularDiameterDeg);
    expect(discState.phase).toBe('resolved-disc');
    expect(featureState.phase).toBe('feature-visible');
    expect(discState.featureStrength).toBeLessThan(featureState.featureStrength);
  });

  it('keeps feature strength continuous around naked-eye thresholds', () => {
    const before = featureStrengthForAngularSize(0.29, 0.3, 1.5);
    const at = featureStrengthForAngularSize(0.3, 0.3, 1.5);
    const after = featureStrengthForAngularSize(0.31, 0.3, 1.5);

    expect(before).toBe(0);
    expect(at).toBe(0);
    expect(after).toBeGreaterThanOrEqual(at);
    expect(after).toBeLessThan(0.01);
  });

  it('never turns Sagittarius A* into a resolved disc or visible entity sphere', () => {
    const sagittariusA = profileFor('sagittarius-a-star');
    const closeState = calculateNakedEyeVisibilityState(sagittariusA, 0.6);

    expect(closeState.phase).toBe('marker-only');
    expect(closeState.angularDiameterDeg).toBe(0);
    expect(closeState.featureStrength).toBe(0);
  });

  it('resolves star clusters and nebulae as structures, not stellar discs', () => {
    const pleiades = calculateNakedEyeVisibilityState(profileFor('pleiades'), 5);
    const carina = calculateNakedEyeVisibilityState(profileFor('carina-nebula'), 5);

    expect(pleiades.phase).toBe('resolved-structure');
    expect(carina.phase).toBe('resolved-structure');
    expect(pleiades.opticalKind).toBe('extended-structure');
    expect(carina.opticalKind).toBe('extended-structure');
  });
});
