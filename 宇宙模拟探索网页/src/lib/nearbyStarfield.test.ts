import { describe, expect, it } from 'vitest';

import { initialGalaxyLayers } from '../data/layers';
import {
  generateResolvedStellarBodies,
  generateNearbyStarfieldPoints,
  nearbyStarfieldCountForQuality,
  sceneRadiusForStellarBody,
} from './nearbyStarfield';
import { visualQualityProfiles } from './visualQuality';

describe('nearby fly-through stellar point sources', () => {
  it('adds a visible layer for dense nearby stellar point sources', () => {
    const layer = initialGalaxyLayers.find((item) => item.id === 'nearby-stars');

    expect(layer).toMatchObject({
      visible: true,
      renderStyle: 'nearby-star',
      realism: 'model',
    });
    expect(layer?.particleCount).toBeGreaterThanOrEqual(6000);
  });

  it('generates deterministic surrounding stars with no close-range block at the camera', () => {
    const generated = generateNearbyStarfieldPoints({
      count: 512,
      radius: 76,
      innerRadius: 2.8,
      seed: 'fly-through-test',
    });

    expect(generated.count).toBe(512);
    expect(generated.positions.length).toBe(512 * 3);
    expect(generated.colors.length).toBe(512 * 3);
    expect(generated.sizes.length).toBe(512);
    expect(generated.brightness.length).toBe(512);
    expect(generated.opacity.length).toBe(512);
    expect(generated.spectralTypes.length).toBe(512);
    expect(generated.massesSolar.length).toBe(512);
    expect(generated.radiiSolar.length).toBe(512);
    expect(generated.luminositiesSolar.length).toBe(512);
    expect(generated.bodyRadii.length).toBe(512);

    const distances = generated.positions.map((_, index) => index).filter((index) => index % 3 === 0).map((index) => {
      const x = generated.positions[index];
      const y = generated.positions[index + 1];
      const z = generated.positions[index + 2];
      return Math.sqrt(x * x + y * y + z * z);
    });

    expect(Math.min(...distances)).toBeGreaterThanOrEqual(2.8);
    expect(Math.max(...distances)).toBeLessThanOrEqual(76);
  });

  it('contains many soft stars plus a small bright population for heat and glow', () => {
    const generated = generateNearbyStarfieldPoints({
      count: 1200,
      radius: 82,
      innerRadius: 2.5,
      seed: 'luminous-mix',
    });

    const luminousCount = generated.brightness.filter((value) => value >= 1.8).length;
    const tinyPointCount = generated.sizes.filter((value) => value <= 1.4).length;

    expect(luminousCount).toBeGreaterThan(30);
    expect(tinyPointCount).toBeGreaterThan(600);
    expect(Math.max(...generated.opacity)).toBeGreaterThan(0.82);
  });

  it('assigns physical stellar classes, mass, radius, and luminosity to the same nearby stars', () => {
    const generated = generateNearbyStarfieldPoints({
      count: 1800,
      radius: 82,
      innerRadius: 2.5,
      seed: 'physical-stars',
    });

    const solarLikeIndex = generated.spectralTypes.findIndex((type) => type === 'G');
    const redDwarfCount = generated.spectralTypes.filter((type) => type === 'M').length;
    const giantIndex = generated.spectralTypes.findIndex((type) => type === 'red-giant');

    expect(redDwarfCount).toBeGreaterThan(900);
    expect(solarLikeIndex).toBeGreaterThanOrEqual(0);
    expect(generated.massesSolar[solarLikeIndex]).toBeGreaterThan(0.8);
    expect(generated.radiiSolar[solarLikeIndex]).toBeGreaterThan(0.8);
    expect(giantIndex).toBeGreaterThanOrEqual(0);
    expect(generated.radiiSolar[giantIndex]).toBeGreaterThan(10);
    expect(generated.luminositiesSolar[giantIndex]).toBeGreaterThan(50);
  });

  it('maps physical stellar radius into a restrained visible body scale', () => {
    expect(sceneRadiusForStellarBody(0.25)).toBeGreaterThan(0.02);
    expect(sceneRadiusForStellarBody(1)).toBeGreaterThan(sceneRadiusForStellarBody(0.25));
    expect(sceneRadiusForStellarBody(30)).toBeLessThan(0.42);
  });

  it('generates a separate nearby body population that can read as stars, not particles', () => {
    const bodies = generateResolvedStellarBodies({
      count: 96,
      radius: 34,
      innerRadius: 3.2,
      seed: 'resolved-bodies',
    });

    const distances = bodies.positions.map((_, index) => index).filter((index) => index % 3 === 0).map((index) => {
      const x = bodies.positions[index];
      const y = bodies.positions[index + 1];
      const z = bodies.positions[index + 2];
      return Math.sqrt(x * x + y * y + z * z);
    });
    const readableBodyCount = bodies.bodyRadii.filter((radius) => radius >= 0.16).length;
    const closeBodyCount = distances.filter((distance) => distance <= 16).length;

    expect(bodies.count).toBe(96);
    expect(Math.min(...distances)).toBeGreaterThanOrEqual(3.2);
    expect(closeBodyCount).toBeGreaterThan(24);
    expect(readableBodyCount).toBeGreaterThan(80);
    expect(Math.max(...bodies.bodyRadii)).toBeGreaterThan(0.65);
    expect(Math.max(...bodies.haloRadii)).toBeGreaterThan(Math.max(...bodies.bodyRadii) * 1.8);
    expect(bodies.spectralTypes).toContain('red-giant');
  });

  it('scales density by visual quality without removing the fly-through field', () => {
    expect(nearbyStarfieldCountForQuality(7200, visualQualityProfiles.low)).toBeGreaterThanOrEqual(3000);
    expect(nearbyStarfieldCountForQuality(7200, visualQualityProfiles.standard)).toBeGreaterThan(
      nearbyStarfieldCountForQuality(7200, visualQualityProfiles.low),
    );
    expect(nearbyStarfieldCountForQuality(7200, visualQualityProfiles.high)).toBe(7200);
  });
});
