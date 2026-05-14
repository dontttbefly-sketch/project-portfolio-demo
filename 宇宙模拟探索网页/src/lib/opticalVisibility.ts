import type { NakedEyeOpticalProfile, OpticalObservationState, OpticalVisibilityPhase } from '../types';
import type { CelestialDetailProfile } from './celestialDetail';

export function calculateAngularDiameter(radiusSceneUnits: number, distanceSceneUnits: number): number {
  if (radiusSceneUnits <= 0 || distanceSceneUnits <= 0) return 0;
  return THREE_RAD_TO_DEG * 2 * Math.atan(radiusSceneUnits / distanceSceneUnits);
}

export function featureStrengthForAngularSize(
  angularDiameterDeg: number,
  broadFeatureThresholdDeg: number,
  fineFeatureThresholdDeg: number,
): number {
  return smoothstep(broadFeatureThresholdDeg, fineFeatureThresholdDeg, angularDiameterDeg);
}

export function calculateNakedEyeVisibilityState(
  profile: CelestialDetailProfile,
  distanceSceneUnits: number,
): OpticalObservationState {
  const opticalProfile = profile.opticalProfile;
  const physicalRadiusSceneUnits = profile.closeViewSceneRadius;
  const opticalRadiusSceneUnits = physicalRadiusSceneUnits * opticalProfile.angularRadiusMultiplier;
  const angularDiameterDeg = calculateAngularDiameter(opticalRadiusSceneUnits, distanceSceneUnits);

  if (opticalProfile.opticalKind === 'location-only') {
    const locationOpacity = (1 - smoothstep(5, 24, distanceSceneUnits)) * opticalProfile.maxObjectOpacity;
    return {
      distanceSceneUnits,
      physicalRadiusSceneUnits,
      angularDiameterDeg: 0,
      phase: 'marker-only',
      opticalKind: opticalProfile.opticalKind,
      markerOpacity: 1,
      objectOpacity: locationOpacity,
      pointSourceOpacity: 0,
      resolvedOpacity: 0,
      featureStrength: 0,
    };
  }

  const pointSourceOpacity = smoothstep(
    opticalProfile.resolvedThresholdDeg * 0.16,
    opticalProfile.resolvedThresholdDeg,
    angularDiameterDeg,
  );
  const resolvedOpacity = smoothstep(
    opticalProfile.resolvedThresholdDeg,
    opticalProfile.broadFeatureThresholdDeg,
    angularDiameterDeg,
  );
  const featureStrength =
    opticalProfile.opticalKind === 'stellar-disc'
      ? featureStrengthForAngularSize(
          angularDiameterDeg,
          opticalProfile.broadFeatureThresholdDeg,
          opticalProfile.fineFeatureThresholdDeg,
        )
      : Math.min(
          0.55,
          featureStrengthForAngularSize(
            angularDiameterDeg,
            opticalProfile.broadFeatureThresholdDeg,
            opticalProfile.fineFeatureThresholdDeg,
          ),
        );
  const objectOpacity =
    Math.max(pointSourceOpacity * 0.32, resolvedOpacity, featureStrength) * opticalProfile.maxObjectOpacity;
  const markerOpacity = 1 - smoothstep(opticalProfile.resolvedThresholdDeg, 0.42, angularDiameterDeg);

  return {
    distanceSceneUnits,
    physicalRadiusSceneUnits,
    angularDiameterDeg,
    phase: phaseFor(opticalProfile, angularDiameterDeg),
    opticalKind: opticalProfile.opticalKind,
    markerOpacity,
    objectOpacity,
    pointSourceOpacity,
    resolvedOpacity,
    featureStrength,
  };
}

function phaseFor(profile: NakedEyeOpticalProfile, angularDiameterDeg: number): OpticalVisibilityPhase {
  if (angularDiameterDeg <= 0) return 'marker-only';
  if (angularDiameterDeg < profile.resolvedThresholdDeg * 0.16) return 'marker-only';
  if (angularDiameterDeg < profile.resolvedThresholdDeg) return 'point-source';
  if (profile.opticalKind === 'extended-structure') return 'resolved-structure';
  if (angularDiameterDeg >= profile.fineFeatureThresholdDeg) return 'feature-visible';
  return 'resolved-disc';
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const THREE_RAD_TO_DEG = 180 / Math.PI;
