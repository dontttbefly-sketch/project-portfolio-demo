import { getCelestialRealityProfile } from '../data/celestialReality';
import {
  minimumTrueScaleCameraDistance,
  physicalSizeToSceneUnits,
} from './celestialScale';
import type {
  CatalogObject,
  CelestialRealityProfile,
  CelestialScaleProfile,
  CloseViewKind,
  NakedEyeOpticalProfile,
  RealismLevel,
} from '../types';

export type CelestialDetailKind = CloseViewKind;

export interface CelestialDetailProfile {
  kind: CelestialDetailKind;
  label: string;
  closeViewSceneRadius: number;
  motionScale: number;
  detailLayers: string[];
  features: string[];
  physical: CelestialPhysicalProfile;
  reality: CelestialRealityProfile;
  scaleProfile: CelestialScaleProfile;
  opticalProfile: NakedEyeOpticalProfile;
  visibilityMode: 'visible-light';
  realism: RealismLevel;
  note: string;
}

export interface CelestialPhysicalProfile {
  classLabel: string;
  scaleLabel: string;
  realAppearance: string;
  observationNote: string;
  hasSolidSurface: boolean;
}

const profileByKind: Record<
  CelestialDetailKind,
  Omit<
    CelestialDetailProfile,
    | 'kind'
    | 'realism'
    | 'physical'
    | 'reality'
    | 'scaleProfile'
    | 'visibilityMode'
    | 'features'
    | 'closeViewSceneRadius'
  >
> = {
  'sun-like-star': {
    label: '恒星肉眼光学视图',
    motionScale: 1,
    opticalProfile: {
      opticalKind: 'stellar-disc',
      pointSourceColor: '#fff4d0',
      angularRadiusMultiplier: 0.07,
      resolvedThresholdDeg: 0.03,
      broadFeatureThresholdDeg: 0.3,
      fineFeatureThresholdDeg: 1.5,
      maxObjectOpacity: 0.82,
      invisibleNote: '远距离时太阳只应像一个黄白点源，不能直接显示表面细节。',
    },
    detailLayers: ['granulated-photosphere', 'limb-darkening', 'sunspots', 'faculae'],
    note: '肉眼可见光学视图为程序化光球模型，半径由真实太阳半径换算；细节只随角直径逐步出现。',
  },
  'red-supergiant': {
    label: '红超巨星肉眼光学视图',
    motionScale: 0.52,
    opticalProfile: {
      opticalKind: 'stellar-disc',
      pointSourceColor: '#ff8a5c',
      angularRadiusMultiplier: 0.065,
      resolvedThresholdDeg: 0.03,
      broadFeatureThresholdDeg: 0.3,
      fineFeatureThresholdDeg: 1.5,
      maxObjectOpacity: 0.76,
      invisibleNote: '远距离时参宿四应保持为橙红点源，只有极近时才解析为柔边圆盘。',
    },
    detailLayers: ['large-convection-cells', 'limb-darkening', 'extended-envelope', 'slow-hotspots'],
    note: '肉眼可见光学视图按近似红超巨星半径换算，橙红光球和亮度不均会随角直径逐步增强。',
  },
  'optical-black-hole-location': {
    label: '黑洞位置肉眼光学视图',
    motionScale: 0.32,
    opticalProfile: {
      opticalKind: 'location-only',
      pointSourceColor: '#ffe7ad',
      angularRadiusMultiplier: 0,
      resolvedThresholdDeg: 0.03,
      broadFeatureThresholdDeg: 0.3,
      fineFeatureThresholdDeg: 1.5,
      maxObjectOpacity: 0.58,
      invisibleNote: 'Sagittarius A* 在可见光下没有可解析实体，只有银心遮挡星场和位置提示。',
    },
    detailLayers: ['optical-obscuration', 'dense-star-field', 'position-marker'],
    note: '可见光下 Sagittarius A* 本体不可见；视图只表现银心遮挡、密集星场和位置标记。',
  },
  'visible-nebula': {
    label: '星云肉眼光学视图',
    motionScale: 0.28,
    opticalProfile: {
      opticalKind: 'extended-structure',
      pointSourceColor: '#ff9fc6',
      angularRadiusMultiplier: 0.16,
      resolvedThresholdDeg: 0.03,
      broadFeatureThresholdDeg: 0.3,
      fineFeatureThresholdDeg: 1.5,
      maxObjectOpacity: 0.42,
      invisibleNote: '星云只在角尺度足够大时呈现低对比发射云和尘埃，不应突然变成发光墙。',
    },
    detailLayers: ['h-alpha-emission', 'dust-pillars', 'illuminating-stars', 'optical-filaments'],
    note: '肉眼可见光学视图按星云跨度换算，低对比 H-alpha 发射云、暗尘埃柱和亮星照明会连续显现。',
  },
  'open-cluster': {
    label: '疏散星团肉眼光学视图',
    motionScale: 0.18,
    opticalProfile: {
      opticalKind: 'extended-structure',
      pointSourceColor: '#9cc8ff',
      angularRadiusMultiplier: 0.14,
      resolvedThresholdDeg: 0.03,
      broadFeatureThresholdDeg: 0.3,
      fineFeatureThresholdDeg: 1.5,
      maxObjectOpacity: 0.68,
      invisibleNote: '疏散星团应从几颗亮星逐步解析出更多成员，不显示为实体球。',
    },
    detailLayers: ['seven-bright-stars', 'blue-young-stars', 'reflection-nebulosity', 'faint-members'],
    note: '肉眼可见光学视图按星团跨度换算，蓝白主亮星、暗成员和淡蓝反射星云会逐步解析。',
  },
  'globular-cluster': {
    label: '球状星团肉眼光学视图',
    motionScale: 0.12,
    opticalProfile: {
      opticalKind: 'extended-structure',
      pointSourceColor: '#ffe7ad',
      angularRadiusMultiplier: 0.13,
      resolvedThresholdDeg: 0.03,
      broadFeatureThresholdDeg: 0.3,
      fineFeatureThresholdDeg: 1.5,
      maxObjectOpacity: 0.72,
      invisibleNote: '球状星团应逐步解析为致密核心和外层恒星，不显示实体表面。',
    },
    detailLayers: ['dense-core', 'warm-old-stars', 'outer-halo-stars'],
    note: '肉眼可见光学视图按球状星团跨度换算，暖白致密核心和外层成员星会连续显现。',
  },
  'galaxy-structure': {
    label: '银河结构肉眼光学视图',
    motionScale: 0.2,
    opticalProfile: {
      opticalKind: 'extended-structure',
      pointSourceColor: '#d8e6ff',
      angularRadiusMultiplier: 0.1,
      resolvedThresholdDeg: 0.03,
      broadFeatureThresholdDeg: 0.3,
      fineFeatureThresholdDeg: 1.5,
      maxObjectOpacity: 0.52,
      invisibleNote: '银河结构应表现为密度和尘埃变化，不是可接触的表面。',
    },
    detailLayers: ['local-density-band', 'dust-streaks', 'model-boundary'],
    note: '肉眼可见光学视图表达局部恒星密度、颜色年龄差异和尘埃暗纹，不把银河结构当作可接触表面。',
  },
};

export function getCelestialDetailProfile(object: CatalogObject): CelestialDetailProfile {
  const reality = getCelestialRealityProfile(object.id);
  const kind = reality.closeViewKind;
  return {
    kind,
    realism: object.realism,
    ...profileByKind[kind],
    closeViewSceneRadius: physicalSizeToSceneUnits(reality.scaleProfile, 'close-view'),
    features: reality.visibleLightFeatures,
    physical: physicalProfileForReality(reality),
    reality,
    scaleProfile: reality.scaleProfile,
    visibilityMode: reality.visibilityMode,
  };
}

export function minimumCameraDistanceForProfile(profile: CelestialDetailProfile): number {
  return minimumTrueScaleCameraDistance(profile.scaleProfile);
}

function physicalProfileForReality(reality: CelestialRealityProfile): CelestialPhysicalProfile {
  return {
    classLabel: reality.physicalClass,
    scaleLabel: reality.trueScale,
    realAppearance: reality.visibleAppearance,
    observationNote: `${reality.notVisibleInOptical} ${reality.surfaceTruth}`,
    hasSolidSurface: false,
  };
}
