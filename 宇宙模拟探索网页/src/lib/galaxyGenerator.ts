import { galaxySpiralArms, getGalaxyComponentModel, majorSpiralArms, minorSpiralArms } from '../data/galaxyStructure';
import type { GalaxyLayer, GalaxySpiralArmModel, RealismLevel } from '../types';
import { mapKlyToSceneUnits } from './coordinates';

export interface GeneratedGalaxyLayerPoints {
  layerId: string;
  count: number;
  positions: number[];
  colors: number[];
  sizes: number[];
  brightness: number[];
  temperature: number[];
  opacity: number[];
  realism: RealismLevel;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
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

function randomSigned(rng: () => number): number {
  return rng() * 2 - 1;
}

function randomBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function colorFromTemperature(temperature: number): RgbColor {
  const clamped = clamp01(temperature);
  const cool = { r: 0.64, g: 0.76, b: 1 };
  const neutral = { r: 1, g: 0.95, b: 0.82 };
  const warm = { r: 1, g: 0.58, b: 0.34 };

  if (clamped < 0.5) {
    const t = clamped / 0.5;
    return {
      r: warm.r + (neutral.r - warm.r) * t,
      g: warm.g + (neutral.g - warm.g) * t,
      b: warm.b + (neutral.b - warm.b) * t,
    };
  }

  const t = (clamped - 0.5) / 0.5;
  return {
    r: neutral.r + (cool.r - neutral.r) * t,
    g: neutral.g + (cool.g - neutral.g) * t,
    b: neutral.b + (cool.b - neutral.b) * t,
  };
}

function blendColor(a: RgbColor, b: RgbColor, amount: number): RgbColor {
  return {
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  };
}

function pushColor(colors: number[], base: RgbColor, jitter: number): void {
  colors.push(
    clamp01(base.r + jitter),
    clamp01(base.g + jitter),
    clamp01(base.b + jitter),
  );
}

function pushScenePosition(positions: number[], xKly: number, yKly: number, zKly: number): void {
  positions.push(mapKlyToSceneUnits(xKly), mapKlyToSceneUnits(zKly), mapKlyToSceneUnits(yKly));
}

function generateDiskPoint(rng: () => number, layerId: string): [number, number, number, number] {
  const component = getGalaxyComponentModel(layerId);
  const [minRadius, maxRadius] = component?.radiusRangeKly ?? [1.5, 52];
  const radius = minRadius + Math.pow(rng(), 0.58) * (maxRadius - minRadius);
  const theta = rng() * Math.PI * 2;
  const thickness = component?.thicknessKly ?? 0.7;
  const verticalSpread = layerId === 'thick-disk' ? thickness * (0.35 + rng() * 1.75) : thickness * (0.12 + rng() * 0.75);
  const vertical = randomSigned(rng) * verticalSpread;
  const size = layerId === 'thick-disk' ? 0.8 + rng() * 0.9 : 0.75 + rng() * 0.85;
  return [Math.cos(theta) * radius, Math.sin(theta) * radius, vertical, size];
}

function pickWeightedArm(rng: () => number, arms: GalaxySpiralArmModel[]): GalaxySpiralArmModel {
  const totalStrength = arms.reduce((sum, arm) => sum + arm.strength, 0);
  let cursor = rng() * totalStrength;

  for (const arm of arms) {
    cursor -= arm.strength;
    if (cursor <= 0) {
      return arm;
    }
  }

  return arms[arms.length - 1];
}

function armsForLayer(layerId: string): GalaxySpiralArmModel[] {
  if (layerId === 'major-spiral-arms') return majorSpiralArms;
  if (layerId === 'minor-spiral-arms') return minorSpiralArms;
  if (layerId === 'orion-spur-layer') return galaxySpiralArms.filter((arm) => arm.role === 'local');
  return galaxySpiralArms;
}

function generatePointOnArm(rng: () => number, arm: GalaxySpiralArmModel, spreadMultiplier = 1): [number, number, number, number] {
  const [minRadius, maxRadius] = arm.radiusRangeKly;
  const progress = Math.pow(rng(), 0.88);
  const radius = minRadius + progress * (maxRadius - minRadius);
  const curvature = Math.pow(progress, Math.max(0.62, 1 - arm.pitch));
  const theta = arm.startAngleRad + curvature * arm.sweepRad + randomSigned(rng) * 0.11;
  const featheredRadius = Math.max(0.1, radius + randomSigned(rng) * arm.widthKly * 0.24 * (0.3 + progress));
  const armWidth = randomSigned(rng) * arm.widthKly * spreadMultiplier * (0.45 + rng() * 0.85);
  const x = Math.cos(theta) * featheredRadius + Math.cos(theta + Math.PI / 2) * armWidth;
  const y = Math.sin(theta) * featheredRadius + Math.sin(theta + Math.PI / 2) * armWidth;
  const verticalSpread = arm.role === 'local' ? 0.32 : 0.48;
  return [x, y, randomSigned(rng) * verticalSpread, 1.15 + rng() * 1.1 * arm.strength];
}

function generateSpiralPoint(rng: () => number, layerId: string): [number, number, number, number] {
  const arm = pickWeightedArm(rng, armsForLayer(layerId));
  return generatePointOnArm(rng, arm, layerId === 'orion-spur-layer' ? 0.72 : 1);
}

function generateBulgePoint(rng: () => number, layerId: string): [number, number, number, number] {
  const theta = rng() * Math.PI * 2;
  const component = getGalaxyComponentModel(layerId);
  const maxRadius = component?.radiusRangeKly[1] ?? 10;
  const radius = Math.pow(rng(), layerId === 'central-bar' ? 1.2 : 1.8) * maxRadius;
  const barAngle = 0.48;
  const barStretch = layerId === 'central-bar' ? 2.25 : 1.2;
  const crossStretch = layerId === 'central-bar' ? 0.38 : 0.9;
  const localX = Math.cos(theta) * radius * barStretch;
  const localY = Math.sin(theta) * radius * crossStretch;
  const x = localX * Math.cos(barAngle) - localY * Math.sin(barAngle);
  const y = localX * Math.sin(barAngle) + localY * Math.cos(barAngle);
  const z = randomSigned(rng) * ((component?.thicknessKly ?? 3) * (1 - Math.min(0.92, radius / (maxRadius + 1))) + 0.25);
  return [x, y, z, 1.3 + rng() * 1.4];
}

function generateDustPoint(rng: () => number): [number, number, number, number] {
  const arm = pickWeightedArm(rng, galaxySpiralArms);
  const [x, y] = generatePointOnArm(rng, arm, 1.35);
  const z = randomSigned(rng) * 0.18;
  return [x, y, z, 1.5 + rng() * 1.8];
}

function generateNebulaPoint(rng: () => number): [number, number, number, number] {
  const arm = pickWeightedArm(rng, [...majorSpiralArms, ...minorSpiralArms, ...majorSpiralArms]);
  const [baseX, baseY] = generatePointOnArm(rng, arm, 0.85);
  const spread = 0.85 + rng() * 1.2;
  const x = baseX + randomSigned(rng) * spread;
  const y = baseY + randomSigned(rng) * spread;
  const z = randomSigned(rng) * 0.7;
  return [x, y, z, 2.2 + rng() * 2.8];
}

function generateHaloPoint(rng: () => number, layerId: string): [number, number, number, number] {
  const component = getGalaxyComponentModel(layerId);
  const [minRadius, maxRadius] = component?.radiusRangeKly ?? [18, 100];
  const radius = randomBetween(rng, minRadius, maxRadius);
  const theta = rng() * Math.PI * 2;
  const cosPhi = randomSigned(rng);
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  const flattening = layerId === 'globular-clusters' ? 0.9 : 0.72;
  const x = Math.cos(theta) * sinPhi * radius;
  const y = Math.sin(theta) * sinPhi * radius;
  const z = cosPhi * radius * flattening;
  const size = layerId === 'globular-clusters' ? 3.6 + rng() * 3.2 : 0.7 + rng() * 0.9;
  return [x, y, z, size];
}

function generateLocalGroupPoint(rng: () => number): [number, number, number, number] {
  const galaxyCenters: Array<[number, number, number, number]> = [
    [0, 0, 0, 1.8],
    [28, 6, -12, 1.6],
    [-18, -7, 10, 0.8],
    [12, -14, 18, 0.65],
    [-26, 12, -18, 0.55],
  ];
  const center = galaxyCenters[Math.floor(rng() * galaxyCenters.length)] ?? galaxyCenters[0];
  const spread = center[3] > 1 ? 2.8 : 1.2;
  return [
    center[0] + randomSigned(rng) * spread,
    center[1] + randomSigned(rng) * spread * 0.42,
    center[2] + randomSigned(rng) * spread,
    center[3] + rng() * 1.2,
  ];
}

function generateCosmicWebPoint(rng: () => number): [number, number, number, number] {
  const nodes: Array<[number, number, number]> = [
    [-82, -10, -42],
    [-52, 20, 34],
    [-18, -8, 58],
    [22, 14, 24],
    [48, -18, -28],
    [76, 6, 44],
  ];
  const nodeIndex = Math.floor(rng() * (nodes.length - 1));
  const start = nodes[nodeIndex] ?? nodes[0];
  const end = nodes[nodeIndex + 1] ?? nodes[nodes.length - 1];
  const t = rng();
  const filamentJitter = 3.4 + rng() * 8.2;
  return [
    start[0] + (end[0] - start[0]) * t + randomSigned(rng) * filamentJitter,
    start[1] + (end[1] - start[1]) * t + randomSigned(rng) * filamentJitter * 0.45,
    start[2] + (end[2] - start[2]) * t + randomSigned(rng) * filamentJitter,
    0.7 + Math.pow(rng(), 2.4) * 3.8,
  ];
}

function generateObservableHorizonPoint(rng: () => number): [number, number, number, number] {
  const theta = rng() * Math.PI * 2;
  const cosPhi = randomSigned(rng);
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  const radius = 108 + randomSigned(rng) * 2.4;
  return [
    Math.cos(theta) * sinPhi * radius,
    cosPhi * radius * 0.82,
    Math.sin(theta) * sinPhi * radius,
    1.2 + rng() * 1.8,
  ];
}

function isSceneScaleLayer(layerId: string): boolean {
  return layerId === 'local-group' || layerId === 'cosmic-web' || layerId === 'observable-universe-horizon';
}

function pointForLayer(layerId: string, rng: () => number): [number, number, number, number] {
  if (layerId === 'local-group') {
    return generateLocalGroupPoint(rng);
  }
  if (layerId === 'cosmic-web') {
    return generateCosmicWebPoint(rng);
  }
  if (layerId === 'observable-universe-horizon') {
    return generateObservableHorizonPoint(rng);
  }
  if (layerId === 'major-spiral-arms' || layerId === 'minor-spiral-arms' || layerId === 'orion-spur-layer') {
    return generateSpiralPoint(rng, layerId);
  }
  if (layerId === 'central-bulge' || layerId === 'central-bar') {
    return generateBulgePoint(rng, layerId);
  }
  if (layerId === 'dust-lanes') {
    return generateDustPoint(rng);
  }
  if (layerId === 'nebulae') {
    return generateNebulaPoint(rng);
  }
  if (layerId === 'stellar-halo' || layerId === 'globular-clusters') {
    return generateHaloPoint(rng, layerId);
  }
  return generateDiskPoint(rng, layerId);
}

function visualAttributesForLayer(
  layer: GalaxyLayer,
  rng: () => number,
  radiusKly: number,
): { brightness: number; temperature: number; opacity: number; colorBlend: number } {
  const style = layer.renderStyle ?? 'star-field';

  if (style === 'dust') {
    return {
      brightness: 0.05 + rng() * 0.1,
      temperature: 0.08 + rng() * 0.18,
      opacity: 0.05 + rng() * 0.13,
      colorBlend: 0.08,
    };
  }

  if (style === 'nebula') {
    return {
      brightness: 0.47 + rng() * 0.76,
      temperature: 0.34 + rng() * 0.48,
      opacity: 0.1 + rng() * 0.34,
      colorBlend: 0.35,
    };
  }

  if (style === 'globular-cluster') {
    return {
      brightness: 0.62 + rng() * 0.45,
      temperature: 0.18 + rng() * 0.42,
      opacity: 0.34 + rng() * 0.34,
      colorBlend: 0.42,
    };
  }

  if (style === 'stellar-halo') {
    return {
      brightness: 0.18 + rng() * 0.22,
      temperature: 0.14 + rng() * 0.38,
      opacity: 0.08 + rng() * 0.14,
      colorBlend: 0.36,
    };
  }

  if (style === 'galaxy-group') {
    return {
      brightness: 0.34 + rng() * 0.42,
      temperature: 0.34 + rng() * 0.42,
      opacity: 0.18 + rng() * 0.28,
      colorBlend: 0.52,
    };
  }

  if (style === 'cosmic-web') {
    return {
      brightness: 0.36 + rng() * 0.44,
      temperature: 0.28 + rng() * 0.48,
      opacity: 0.16 + rng() * 0.26,
      colorBlend: 0.72,
    };
  }

  if (style === 'observable-horizon') {
    return {
      brightness: 0.28 + rng() * 0.32,
      temperature: 0.42 + rng() * 0.34,
      opacity: 0.12 + rng() * 0.2,
      colorBlend: 0.8,
    };
  }

  if (style === 'bulge') {
    const centerBoost = Math.max(0, 1 - radiusKly / 16);
    return {
      brightness: 0.46 + centerBoost * 0.5 + rng() * 0.16,
      temperature: 0.18 + rng() * 0.28,
      opacity: 0.22 + centerBoost * 0.24,
      colorBlend: 0.62,
    };
  }

  if (style === 'spiral-arm') {
    return {
      brightness: 0.52 + rng() * 0.5,
      temperature: 0.48 + rng() * 0.46,
      opacity: 0.24 + rng() * 0.28,
      colorBlend: 0.72,
    };
  }

  if (style === 'thick-disk') {
    const edgeFade = Math.max(0.28, 1 - radiusKly / 62);
    return {
      brightness: 0.24 + edgeFade * 0.28 + rng() * 0.16,
      temperature: 0.14 + rng() * 0.42,
      opacity: 0.13 + edgeFade * 0.2,
      colorBlend: 0.44,
    };
  }

  const edgeFade = Math.max(0.36, 1 - radiusKly / 68);
  return {
    brightness: 0.3 + edgeFade * 0.38 + rng() * 0.2,
    temperature: 0.24 + rng() * 0.66,
    opacity: 0.22 + edgeFade * 0.27,
    colorBlend: 0.58,
  };
}

export function generateGalaxyLayerPoints(layer: GalaxyLayer, maxCount = layer.particleCount): GeneratedGalaxyLayerPoints {
  const count = Math.max(0, Math.min(layer.particleCount, maxCount));
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const brightness: number[] = [];
  const temperature: number[] = [];
  const opacity: number[] = [];
  const rng = createRng(layer.id);
  const baseColor = hexToRgb(layer.color);

  for (let index = 0; index < count; index += 1) {
    const [xKly, yKly, zKly, size] = pointForLayer(layer.id, rng);
    const radiusKly = Math.sqrt(xKly * xKly + yKly * yKly);
    const attributes = visualAttributesForLayer(layer, rng, radiusKly);
    const thermalColor = colorFromTemperature(attributes.temperature);
    const mixedColor = blendColor(baseColor, thermalColor, attributes.colorBlend);

    if (isSceneScaleLayer(layer.id)) {
      positions.push(xKly, zKly, yKly);
    } else {
      pushScenePosition(positions, xKly, yKly, zKly);
    }
    pushColor(colors, mixedColor, randomSigned(rng) * 0.055);
    sizes.push(size);
    brightness.push(attributes.brightness);
    temperature.push(attributes.temperature);
    opacity.push(attributes.opacity);
  }

  return {
    layerId: layer.id,
    count,
    positions,
    colors,
    sizes,
    brightness,
    temperature,
    opacity,
    realism: layer.realism,
  };
}
