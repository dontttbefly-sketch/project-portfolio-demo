export type RealismLevel = 'measured' | 'model' | 'artistic';
export type GalaxyRenderStyle =
  | 'star-field'
  | 'spiral-arm'
  | 'bulge'
  | 'dust'
  | 'nebula'
  | 'marker'
  | 'thin-disk'
  | 'thick-disk'
  | 'stellar-halo'
  | 'globular-cluster'
  | 'gas-cloud'
  | 'nearby-star'
  | 'galaxy-group'
  | 'cosmic-web'
  | 'observable-horizon';

export interface SourceReference {
  label: string;
  url: string;
}

export interface GalacticCoordinate {
  xKly: number;
  yKly: number;
  zKly: number;
}

export interface CatalogObject {
  id: string;
  name: string;
  aliases: string[];
  type:
    | 'star'
    | 'black-hole'
    | 'region'
    | 'arm'
    | 'nebula'
    | 'cluster'
    | 'marker'
    | 'globular-cluster'
    | 'galaxy-component';
  galactic: GalacticCoordinate;
  color: string;
  magnitudeHint: number;
  description: string;
  facts: string[];
  sources: SourceReference[];
  realism: RealismLevel;
  relatedLayers: string[];
}

export interface GalaxyLayer {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  particleCount: number;
  realism: RealismLevel;
  color: string;
  renderStyle?: GalaxyRenderStyle;
}

export interface CameraPreset {
  id: string;
  name: string;
  description: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface LearningCard {
  id: string;
  title: string;
  summary: string;
  keyFacts: string[];
  source: SourceReference;
  relatedObjectIds: string[];
  relatedLayerIds: string[];
}

export interface VisualQualityProfile {
  id: 'low' | 'standard' | 'high';
  label: string;
  particleMultiplier: number;
  nebulaMultiplier: number;
  maxDevicePixelRatio: number;
  postGlow: boolean;
}

export interface GalaxySpiralArmModel {
  id: string;
  name: string;
  role: 'major' | 'minor' | 'local';
  startAngleRad: number;
  pitch: number;
  sweepRad: number;
  radiusRangeKly: [number, number];
  widthKly: number;
  strength: number;
  color: string;
}

export interface GalaxyComponentModel {
  id: string;
  name: string;
  renderStyle: GalaxyRenderStyle;
  realism: RealismLevel;
  particleCount: number;
  radiusRangeKly: [number, number];
  thicknessKly: number;
  density: number;
  colorTemperature: [number, number];
  sources: SourceReference[];
}

export type CloseViewKind =
  | 'sun-like-star'
  | 'red-supergiant'
  | 'optical-black-hole-location'
  | 'visible-nebula'
  | 'open-cluster'
  | 'globular-cluster'
  | 'galaxy-structure';

export type ScaleKind =
  | 'point-source'
  | 'stellar-radius'
  | 'cluster-diameter'
  | 'nebula-diameter'
  | 'galaxy-structure-span'
  | 'black-hole-location';

export interface ScaleMeasurement {
  measurement: 'radius' | 'diameter' | 'span' | 'location';
  value: number | null;
  unit: 'km' | 'ly' | 'none';
}

export interface CelestialScaleProfile {
  objectId: string;
  scaleKind: ScaleKind;
  trueRadiusKm?: number;
  trueDiameterLy?: number;
  uncertaintyLabel: string;
  renderableAtGalaxyScale: boolean;
  markerOnlyAtGalaxyScale: boolean;
  scaleSources: SourceReference[];
}

export type OpticalVisibilityPhase =
  | 'marker-only'
  | 'point-source'
  | 'resolved-disc'
  | 'resolved-structure'
  | 'feature-visible';

export interface NakedEyeOpticalProfile {
  opticalKind: 'stellar-disc' | 'extended-structure' | 'location-only';
  pointSourceColor: string;
  angularRadiusMultiplier: number;
  resolvedThresholdDeg: number;
  broadFeatureThresholdDeg: number;
  fineFeatureThresholdDeg: number;
  maxObjectOpacity: number;
  invisibleNote: string;
}

export interface OpticalObservationState {
  distanceSceneUnits: number;
  physicalRadiusSceneUnits: number;
  angularDiameterDeg: number;
  phase: OpticalVisibilityPhase;
  opticalKind: NakedEyeOpticalProfile['opticalKind'];
  markerOpacity: number;
  objectOpacity: number;
  pointSourceOpacity: number;
  resolvedOpacity: number;
  featureStrength: number;
}

export interface CelestialRealityProfile {
  objectId: string;
  visibilityMode: 'visible-light';
  physicalClass: string;
  trueScale: string;
  visibleAppearance: string;
  notVisibleInOptical: string;
  surfaceTruth: string;
  closeViewKind: CloseViewKind;
  visibleLightFeatures: string[];
  scaleProfile: CelestialScaleProfile;
  sourceRefs: SourceReference[];
}
