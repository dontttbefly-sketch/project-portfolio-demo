import type { VisualQualityProfile } from '../types';

export type NearbyStellarType = 'M' | 'K' | 'G' | 'F' | 'A' | 'B' | 'red-giant';

export interface NearbyStarfieldOptions {
  count: number;
  radius: number;
  innerRadius: number;
  seed: string;
}

export interface NearbyStarfieldPoints {
  count: number;
  positions: number[];
  colors: number[];
  sizes: number[];
  brightness: number[];
  temperature: number[];
  opacity: number[];
  spectralTypes: NearbyStellarType[];
  massesSolar: number[];
  radiiSolar: number[];
  luminositiesSolar: number[];
  bodyRadii: number[];
}

export interface ResolvedStellarBodiesOptions {
  count: number;
  radius: number;
  innerRadius: number;
  seed: string;
}

export interface ResolvedStellarBodies {
  count: number;
  positions: number[];
  colors: number[];
  brightness: number[];
  bodyRadii: number[];
  haloRadii: number[];
  spectralTypes: NearbyStellarType[];
  massesSolar: number[];
  radiiSolar: number[];
  luminositiesSolar: number[];
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface StellarPhysicalProfile {
  spectralType: NearbyStellarType;
  temperature: number;
  massSolar: number;
  radiusSolar: number;
  luminositySolar: number;
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedText: string): () => number {
  let state = hashSeed(seedText) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function colorFromTemperature(temperature: number): RgbColor {
  if (temperature < 0.42) {
    const t = temperature / 0.42;
    return {
      r: 1,
      g: 0.42 + t * 0.42,
      b: 0.22 + t * 0.38,
    };
  }

  if (temperature < 0.72) {
    const t = (temperature - 0.42) / 0.3;
    return {
      r: 1,
      g: 0.84 + t * 0.12,
      b: 0.6 + t * 0.28,
    };
  }

  const t = (temperature - 0.72) / 0.28;
  return {
    r: 1 - t * 0.24,
    g: 0.96 - t * 0.08,
    b: 0.88 + t * 0.12,
  };
}

function pushColor(colors: number[], color: RgbColor, jitter: number): void {
  colors.push(
    clamp01(color.r + jitter),
    clamp01(color.g + jitter),
    clamp01(color.b + jitter),
  );
}

function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function massLuminosity(massSolar: number): number {
  return Math.max(0.002, massSolar ** 3.55);
}

function stellarProfileForPopulation(population: number, rng: () => number): StellarPhysicalProfile {
  if (population < 0.68) {
    const massSolar = between(rng, 0.12, 0.58);
    const radiusSolar = between(rng, 0.16, 0.62);
    return {
      spectralType: 'M',
      temperature: between(rng, 0.12, 0.34),
      massSolar,
      radiusSolar,
      luminositySolar: massLuminosity(massSolar) * between(rng, 0.42, 0.9),
    };
  }

  if (population < 0.82) {
    const massSolar = between(rng, 0.58, 0.86);
    const radiusSolar = between(rng, 0.62, 0.88);
    return {
      spectralType: 'K',
      temperature: between(rng, 0.34, 0.48),
      massSolar,
      radiusSolar,
      luminositySolar: massLuminosity(massSolar) * between(rng, 0.72, 1.1),
    };
  }

  if (population < 0.91) {
    const massSolar = between(rng, 0.86, 1.12);
    const radiusSolar = between(rng, 0.88, 1.18);
    return {
      spectralType: 'G',
      temperature: between(rng, 0.48, 0.62),
      massSolar,
      radiusSolar,
      luminositySolar: massLuminosity(massSolar) * between(rng, 0.82, 1.18),
    };
  }

  if (population < 0.96) {
    const massSolar = between(rng, 1.12, 1.46);
    const radiusSolar = between(rng, 1.18, 1.62);
    return {
      spectralType: 'F',
      temperature: between(rng, 0.62, 0.72),
      massSolar,
      radiusSolar,
      luminositySolar: massLuminosity(massSolar) * between(rng, 0.9, 1.35),
    };
  }

  if (population < 0.985) {
    const massSolar = between(rng, 1.46, 2.35);
    const radiusSolar = between(rng, 1.62, 2.7);
    return {
      spectralType: 'A',
      temperature: between(rng, 0.72, 0.88),
      massSolar,
      radiusSolar,
      luminositySolar: massLuminosity(massSolar) * between(rng, 0.95, 1.5),
    };
  }

  if (population < 0.996) {
    const massSolar = between(rng, 2.35, 7.4);
    const radiusSolar = between(rng, 2.7, 6.8);
    return {
      spectralType: 'B',
      temperature: between(rng, 0.88, 1),
      massSolar,
      radiusSolar,
      luminositySolar: massLuminosity(massSolar) * between(rng, 0.82, 1.4),
    };
  }

  const massSolar = between(rng, 0.82, 2.4);
  const radiusSolar = between(rng, 12, 54);
  return {
    spectralType: 'red-giant',
    temperature: between(rng, 0.22, 0.44),
    massSolar,
    radiusSolar,
    luminositySolar: between(rng, 65, 520),
  };
}

export function sceneRadiusForStellarBody(radiusSolar: number): number {
  const compressedRadius = 0.026 + Math.log10(1 + Math.max(0.03, radiusSolar)) * 0.13;
  return Math.max(0.024, Math.min(0.4, compressedRadius));
}

function sceneRadiusForResolvedStellarBody(radiusSolar: number): number {
  const compressedRadius = 0.12 + Math.log10(1 + Math.max(0.08, radiusSolar)) * 0.42;
  return Math.max(0.14, Math.min(1.18, compressedRadius));
}

export function nearbyStarfieldCountForQuality(baseCount: number, profile: VisualQualityProfile): number {
  if (profile.id === 'high') return baseCount;

  const multiplier = profile.id === 'low' ? 0.48 : 0.82;
  return Math.max(3000, Math.min(baseCount, Math.round(baseCount * multiplier)));
}

export function generateNearbyStarfieldPoints(options: NearbyStarfieldOptions): NearbyStarfieldPoints {
  const count = Math.max(0, Math.floor(options.count));
  const radius = Math.max(options.radius, options.innerRadius + 1);
  const innerRadius = Math.max(0, options.innerRadius);
  const rng = createRng(options.seed);
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const brightness: number[] = [];
  const temperature: number[] = [];
  const opacity: number[] = [];
  const spectralTypes: NearbyStellarType[] = [];
  const massesSolar: number[] = [];
  const radiiSolar: number[] = [];
  const luminositiesSolar: number[] = [];
  const bodyRadii: number[] = [];
  const innerCubed = innerRadius ** 3;
  const radiusCubed = radius ** 3;

  for (let index = 0; index < count; index += 1) {
    const theta = rng() * Math.PI * 2;
    const cosPhi = rng() * 2 - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const distance = Math.cbrt(innerCubed + rng() * (radiusCubed - innerCubed));
    const population = rng();
    const physical = stellarProfileForPopulation(population, rng);
    const luminosityBoost = Math.log10(1 + physical.luminositySolar);
    const isBrightStar = physical.spectralType === 'A' || physical.spectralType === 'B' || physical.spectralType === 'red-giant';
    const starTemperature = physical.temperature;
    const starBrightness = isBrightStar
      ? 1.8 + luminosityBoost * 0.72 + rng() * 0.45
      : 0.42 + luminosityBoost * 0.62 + rng() * 0.52;
    const starSize = isBrightStar
      ? 1.9 + Math.log10(1 + physical.radiusSolar) * 1.65 + rng() * 0.8
      : 0.52 + Math.sqrt(physical.radiusSolar) * 0.72 + rng() * 0.32;
    const starOpacity = isBrightStar ? 0.72 + rng() * 0.24 : 0.36 + rng() * 0.34;

    positions.push(
      Math.cos(theta) * sinPhi * distance,
      cosPhi * distance,
      Math.sin(theta) * sinPhi * distance,
    );
    pushColor(colors, colorFromTemperature(starTemperature), (rng() - 0.5) * 0.035);
    sizes.push(starSize);
    brightness.push(starBrightness);
    temperature.push(starTemperature);
    opacity.push(starOpacity);
    spectralTypes.push(physical.spectralType);
    massesSolar.push(physical.massSolar);
    radiiSolar.push(physical.radiusSolar);
    luminositiesSolar.push(physical.luminositySolar);
    bodyRadii.push(sceneRadiusForStellarBody(physical.radiusSolar) * between(rng, 0.88, 1.12));
  }

  return {
    count,
    positions,
    colors,
    sizes,
    brightness,
    temperature,
    opacity,
    spectralTypes,
    massesSolar,
    radiiSolar,
    luminositiesSolar,
    bodyRadii,
  };
}

export function generateResolvedStellarBodies(options: ResolvedStellarBodiesOptions): ResolvedStellarBodies {
  const count = Math.max(0, Math.floor(options.count));
  const radius = Math.max(options.radius, options.innerRadius + 1);
  const innerRadius = Math.max(0, options.innerRadius);
  const rng = createRng(options.seed);
  const positions: number[] = [];
  const colors: number[] = [];
  const brightness: number[] = [];
  const bodyRadii: number[] = [];
  const haloRadii: number[] = [];
  const spectralTypes: NearbyStellarType[] = [];
  const massesSolar: number[] = [];
  const radiiSolar: number[] = [];
  const luminositiesSolar: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const theta = rng() * Math.PI * 2;
    const cosPhi = rng() * 2 - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const distance = innerRadius + Math.pow(rng(), 1.85) * (radius - innerRadius);
    const population = index % 31 === 0 ? 0.997 + rng() * 0.003 : rng() * 0.994;
    const physical = stellarProfileForPopulation(population, rng);
    const luminosityBoost = Math.log10(1 + physical.luminositySolar);
    const visibleRadius = sceneRadiusForResolvedStellarBody(physical.radiusSolar);

    positions.push(
      Math.cos(theta) * sinPhi * distance,
      cosPhi * distance,
      Math.sin(theta) * sinPhi * distance,
    );
    pushColor(colors, colorFromTemperature(physical.temperature), (rng() - 0.5) * 0.024);
    brightness.push(0.92 + luminosityBoost * 0.34);
    bodyRadii.push(visibleRadius);
    haloRadii.push(visibleRadius * (2.05 + Math.min(1.2, luminosityBoost * 0.18)));
    spectralTypes.push(physical.spectralType);
    massesSolar.push(physical.massSolar);
    radiiSolar.push(physical.radiusSolar);
    luminositiesSolar.push(physical.luminositySolar);
  }

  return {
    count,
    positions,
    colors,
    brightness,
    bodyRadii,
    haloRadii,
    spectralTypes,
    massesSolar,
    radiiSolar,
    luminositiesSolar,
  };
}
