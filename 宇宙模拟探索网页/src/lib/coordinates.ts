import type { GalacticCoordinate } from '../types';

const ONE_KLY_SCENE_UNITS = 1.87;
const GALAXY_SCALE_EXPONENT = 0.62;

export function mapKlyToSceneUnits(kly: number): number {
  if (kly === 0) {
    return 0;
  }

  const sign = Math.sign(kly);
  const compressed = Math.pow(Math.abs(kly), GALAXY_SCALE_EXPONENT) * ONE_KLY_SCENE_UNITS;
  return sign * compressed;
}

export function galacticToScenePosition(coordinate: GalacticCoordinate): [number, number, number] {
  return [
    mapKlyToSceneUnits(coordinate.xKly),
    mapKlyToSceneUnits(coordinate.zKly),
    mapKlyToSceneUnits(coordinate.yKly),
  ];
}

export function sceneDistanceBetween(a: GalacticCoordinate, b: GalacticCoordinate): number {
  const aPosition = galacticToScenePosition(a);
  const bPosition = galacticToScenePosition(b);
  const dx = aPosition[0] - bPosition[0];
  const dy = aPosition[1] - bPosition[1];
  const dz = aPosition[2] - bPosition[2];

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
