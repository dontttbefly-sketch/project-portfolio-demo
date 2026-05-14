import { celestialScaleProfiles } from '../data/celestialScale';
import type { CelestialScaleProfile, ScaleKind, ScaleMeasurement } from '../types';

const LIGHT_YEAR_KM = 9_460_730_472_580.8;
const GALAXY_SCENE_UNITS_PER_KLY = 1.87;
const CLOSE_VIEW_SOLAR_RADIUS_SCENE_UNITS = 0.18;
const CLOSE_VIEW_LOG_SCENE_UNITS = 0.28;
const CLOSE_VIEW_MAX_SCENE_RADIUS = 4.2;

export const GALAXY_ONE_PIXEL_EQUIVALENT_SCENE_UNITS = 0.01;

export type PhysicalScaleContext = 'galaxy' | 'close-view';

export function getCelestialScaleProfile(objectId: string): CelestialScaleProfile {
  const profile = celestialScaleProfiles.find((item) => item.objectId === objectId);
  if (!profile) {
    throw new Error(`Missing true-scale profile for catalog object "${objectId}".`);
  }
  return profile;
}

export function isMarkerOnlyAtGalaxyScale(profile: CelestialScaleProfile): boolean {
  return profile.markerOnlyAtGalaxyScale;
}

export function scaleMeasurementForProfile(profile: CelestialScaleProfile): ScaleMeasurement {
  if (typeof profile.trueRadiusKm === 'number') {
    return {
      measurement: 'radius',
      value: profile.trueRadiusKm,
      unit: 'km',
    };
  }

  if (typeof profile.trueDiameterLy === 'number') {
    return {
      measurement: profile.scaleKind === 'galaxy-structure-span' ? 'span' : 'diameter',
      value: profile.trueDiameterLy,
      unit: 'ly',
    };
  }

  return {
    measurement: 'location',
    value: null,
    unit: 'none',
  };
}

export function physicalSizeToSceneUnits(profile: CelestialScaleProfile, context: PhysicalScaleContext): number {
  const radiusLy = physicalRadiusLy(profile);
  if (radiusLy <= 0) {
    return 0;
  }

  if (context === 'galaxy') {
    return (radiusLy / 1000) * GALAXY_SCENE_UNITS_PER_KLY;
  }

  const solarRadiusLy = kmToLightYears(695700);
  const radiusRatio = Math.max(radiusLy / solarRadiusLy, 1);
  const compressedRadius =
    CLOSE_VIEW_SOLAR_RADIUS_SCENE_UNITS + Math.log10(radiusRatio) * CLOSE_VIEW_LOG_SCENE_UNITS;

  return Math.min(CLOSE_VIEW_MAX_SCENE_RADIUS, compressedRadius);
}

export function minimumTrueScaleCameraDistance(profile: CelestialScaleProfile): number {
  const closeViewRadius = physicalSizeToSceneUnits(profile, 'close-view');
  if (closeViewRadius <= 0) {
    return 1.35;
  }

  const extendedObject =
    profile.scaleKind === 'cluster-diameter' ||
    profile.scaleKind === 'nebula-diameter' ||
    profile.scaleKind === 'galaxy-structure-span';
  const multiplier = extendedObject ? 1.68 : 1.42;

  return Math.max(closeViewRadius * multiplier, closeViewRadius + 0.08);
}

export function scaleKindLabel(kind: ScaleKind): string {
  const labels: Record<ScaleKind, string> = {
    'point-source': '点源',
    'stellar-radius': '恒星半径',
    'cluster-diameter': '星团直径',
    'nebula-diameter': '星云跨度',
    'galaxy-structure-span': '银河结构跨度',
    'black-hole-location': '黑洞位置',
  };
  return labels[kind];
}

export function formatScaleMeasurement(profile: CelestialScaleProfile): string {
  const measurement = scaleMeasurementForProfile(profile);

  if (measurement.unit === 'km' && measurement.value !== null) {
    return `真实半径约 ${formatNumber(measurement.value)} 公里`;
  }

  if (measurement.unit === 'ly' && measurement.value !== null) {
    const label = measurement.measurement === 'span' ? '真实跨度' : '真实直径/跨度';
    return `${label}约 ${formatNumber(measurement.value)} 光年`;
  }

  return '可见光下不显示实体半径；这里是位置标记。';
}

export function formatGalaxyScaleRenderability(profile: CelestialScaleProfile): string {
  if (profile.markerOnlyAtGalaxyScale && profile.renderableAtGalaxyScale) {
    return '远景光点为标记；真实结构由对应图层表达。';
  }

  if (profile.markerOnlyAtGalaxyScale) {
    return '远景为标记，不代表真实物理大小。';
  }

  return '远景标记只是入口；真实尺度主要由银河结构图层表达。';
}

function physicalRadiusLy(profile: CelestialScaleProfile): number {
  if (typeof profile.trueRadiusKm === 'number') {
    return kmToLightYears(profile.trueRadiusKm);
  }

  if (typeof profile.trueDiameterLy === 'number') {
    return profile.trueDiameterLy / 2;
  }

  return 0;
}

function kmToLightYears(km: number): number {
  return km / LIGHT_YEAR_KM;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);
}
