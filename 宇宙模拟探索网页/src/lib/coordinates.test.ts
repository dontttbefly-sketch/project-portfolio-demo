import { describe, expect, it } from 'vitest';
import {
  galacticToScenePosition,
  mapKlyToSceneUnits,
  sceneDistanceBetween,
} from './coordinates';

describe('galactic coordinate scaling', () => {
  it('keeps nearby distances readable while compressing galaxy-scale distances', () => {
    expect(mapKlyToSceneUnits(0)).toBe(0);
    expect(mapKlyToSceneUnits(1)).toBeCloseTo(1.87, 2);
    expect(mapKlyToSceneUnits(-1)).toBeCloseTo(-1.87, 2);
    expect(mapKlyToSceneUnits(50)).toBeLessThan(50);
    expect(mapKlyToSceneUnits(50)).toBeGreaterThan(mapKlyToSceneUnits(25));
  });

  it('keeps the outer disk visually separated enough for readable spiral structure', () => {
    expect(mapKlyToSceneUnits(50) - mapKlyToSceneUnits(8)).toBeGreaterThan(11);
  });

  it('maps galactocentric kilolight-year coordinates into Three.js scene axes', () => {
    const sun = galacticToScenePosition({ xKly: 26.7, yKly: 0, zKly: 0 });
    const center = galacticToScenePosition({ xKly: 0, yKly: 0, zKly: 0 });

    expect(center).toEqual([0, 0, 0]);
    expect(sun[0]).toBeGreaterThan(0);
    expect(sun[1]).toBe(0);
    expect(sun[2]).toBe(0);
  });

  it('computes scene-space distance after the same nonlinear scale is applied', () => {
    const distance = sceneDistanceBetween(
      { xKly: 26.7, yKly: 0, zKly: 0 },
      { xKly: 0, yKly: 0, zKly: 0 },
    );

    expect(distance).toBeCloseTo(mapKlyToSceneUnits(26.7), 5);
  });
});
