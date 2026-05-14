import type { CloseViewKind } from '../types';

type StarCloseViewKind = Extract<CloseViewKind, 'sun-like-star' | 'red-supergiant'>;

export interface StarOpticalStyle {
  surfaceBaseMultiplier: number;
  textureShadowAlpha: number;
  textureCoreAlpha: number;
  textureCoreMultiplier: number;
  granuleAlpha: number;
  faculaAlpha: number;
  coreEmission: number;
  surfaceFloor: number;
  rimEmission: number;
  haloScale: number;
  haloOpacity: number;
  atmosphereScale: number;
  atmosphereOpacity: number;
}

const starStyles: Record<StarCloseViewKind, StarOpticalStyle> = {
  'sun-like-star': {
    surfaceBaseMultiplier: 1.06,
    textureShadowAlpha: 0.08,
    textureCoreAlpha: 0.48,
    textureCoreMultiplier: 1.58,
    granuleAlpha: 0.08,
    faculaAlpha: 0.34,
    coreEmission: 1.42,
    surfaceFloor: 0.82,
    rimEmission: 0.48,
    haloScale: 2.82,
    haloOpacity: 0.38,
    atmosphereScale: 1.11,
    atmosphereOpacity: 0.22,
  },
  'red-supergiant': {
    surfaceBaseMultiplier: 0.98,
    textureShadowAlpha: 0.1,
    textureCoreAlpha: 0.36,
    textureCoreMultiplier: 1.24,
    granuleAlpha: 0.14,
    faculaAlpha: 0.26,
    coreEmission: 1.2,
    surfaceFloor: 0.76,
    rimEmission: 0.44,
    haloScale: 3.05,
    haloOpacity: 0.32,
    atmosphereScale: 1.14,
    atmosphereOpacity: 0.2,
  },
};

export function getStarOpticalStyle(kind: StarCloseViewKind): StarOpticalStyle {
  return starStyles[kind];
}

export function closeStarGlowOpacity(resolvedOpacity: number, featureStrength: number): number {
  const glowFromDisc = resolvedOpacity * 0.76;
  const glowFromFeatures = featureStrength * 0.9;
  return Math.max(0, Math.min(1, Math.max(glowFromDisc, glowFromFeatures)));
}
