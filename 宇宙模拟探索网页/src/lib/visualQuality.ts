import type { GalaxyLayer, VisualQualityProfile } from '../types';

export const visualQualityProfiles: Record<VisualQualityProfile['id'], VisualQualityProfile> = {
  low: {
    id: 'low',
    label: '低功耗',
    particleMultiplier: 0.52,
    nebulaMultiplier: 0.42,
    maxDevicePixelRatio: 1.25,
    postGlow: false,
  },
  standard: {
    id: 'standard',
    label: '普通电脑',
    particleMultiplier: 0.82,
    nebulaMultiplier: 0.75,
    maxDevicePixelRatio: 1.6,
    postGlow: true,
  },
  high: {
    id: 'high',
    label: '高性能',
    particleMultiplier: 1,
    nebulaMultiplier: 1,
    maxDevicePixelRatio: 2,
    postGlow: true,
  },
};

export function getVisualQualityProfile(hardwareConcurrency = 6): VisualQualityProfile {
  if (hardwareConcurrency <= 3) {
    return visualQualityProfiles.low;
  }

  if (hardwareConcurrency >= 8) {
    return visualQualityProfiles.high;
  }

  return visualQualityProfiles.standard;
}

export function limitLayerParticleCount(layer: GalaxyLayer, profile: VisualQualityProfile): number {
  if (layer.renderStyle === 'marker') {
    return layer.particleCount;
  }

  const multiplier =
    layer.renderStyle === 'nebula' || layer.renderStyle === 'globular-cluster'
      ? profile.nebulaMultiplier
      : profile.particleMultiplier;
  return Math.max(180, Math.min(layer.particleCount, Math.round(layer.particleCount * multiplier)));
}
