import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CatalogObject, GalaxyLayer } from '../types';
import { cameraPresets } from '../data/cameraPresets';
import { catalogObjects } from '../data/catalog';
import { galacticToScenePosition } from '../lib/coordinates';
import {
  getCelestialDetailProfile,
  minimumCameraDistanceForProfile,
  type CelestialDetailKind,
  type CelestialDetailProfile,
} from '../lib/celestialDetail';
import { calculateNakedEyeVisibilityState } from '../lib/opticalVisibility';
import { generateGalaxyLayerPoints } from '../lib/galaxyGenerator';
import {
  createDustMaterial,
  createNebulaMaterial,
  createRadialTexture,
  createSoftParticleMaterial,
} from '../lib/galaxyMaterials';
import { createSoftClosePointMaterial } from '../lib/closeDetailMaterials';
import {
  generateNearbyStarfieldPoints,
  generateResolvedStellarBodies,
  nearbyStarfieldCountForQuality,
} from '../lib/nearbyStarfield';
import { closeStarGlowOpacity, getStarOpticalStyle } from '../lib/starOptics';
import { getVisualQualityProfile, limitLayerParticleCount } from '../lib/visualQuality';
import type { OpticalObservationState, VisualQualityProfile } from '../types';

interface GalaxySceneProps {
  layers: GalaxyLayer[];
  selectedObjectId: string;
  activePresetId: string;
  onSelectObject: (id: string) => void;
}

type MarkerSprite = THREE.Sprite;

interface RgbParts {
  r: number;
  g: number;
  b: number;
}

function materialForLayer(layer: GalaxyLayer, pixelRatio: number): THREE.ShaderMaterial {
  const style = layer.renderStyle ?? 'star-field';

  if (style === 'nebula') {
    return createNebulaMaterial(pixelRatio);
  }

  if (style === 'dust') {
    return createDustMaterial(pixelRatio);
  }

  const sizeScaleByStyle = {
    'star-field': 0.5,
    'thin-disk': 0.5,
    'thick-disk': 0.46,
    'spiral-arm': 0.72,
    bulge: 0.78,
    'stellar-halo': 0.36,
    'globular-cluster': 1.18,
    'gas-cloud': 0.62,
    'nearby-star': 1.35,
    'galaxy-group': 1.1,
    'cosmic-web': 3.2,
    'observable-horizon': 2.4,
    marker: 1,
  };
  const maxPointSizeByStyle = {
    'star-field': 4,
    'thin-disk': 4,
    'thick-disk': 4,
    'spiral-arm': 7,
    bulge: 7,
    'stellar-halo': 3,
    'globular-cluster': 12,
    'gas-cloud': 7,
    'nearby-star': 16,
    'galaxy-group': 10,
    'cosmic-web': 18,
    'observable-horizon': 14,
    marker: 8,
  };

  return createSoftParticleMaterial({
    style,
    pixelRatio,
    sizeScale: sizeScaleByStyle[style],
    maxPointSize: maxPointSizeByStyle[style],
  });
}

function createPointsForLayer(layer: GalaxyLayer, profile: VisualQualityProfile, pixelRatio: number): THREE.Points {
  const generated = generateGalaxyLayerPoints(layer, limitLayerParticleCount(layer, profile));
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(generated.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(generated.colors, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(generated.sizes, 1));
  geometry.setAttribute('aBrightness', new THREE.Float32BufferAttribute(generated.brightness, 1));
  geometry.setAttribute('aOpacity', new THREE.Float32BufferAttribute(generated.opacity, 1));
  geometry.setAttribute('aTemperature', new THREE.Float32BufferAttribute(generated.temperature, 1));

  const material = materialForLayer(layer, pixelRatio);
  const points = new THREE.Points(geometry, material);
  points.name = layer.id;
  return points;
}

const nearbyStarBodyVertexShader = `
  attribute vec3 instanceColor;
  attribute float instanceBrightness;

  varying vec3 vColor;
  varying float vBrightness;
  varying vec3 vViewNormal;
  varying vec3 vLocalPosition;

  void main() {
    vColor = instanceColor;
    vBrightness = instanceBrightness;
    vViewNormal = normalize(normalMatrix * normal);
    vLocalPosition = position;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const nearbyStarBodyFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying vec3 vViewNormal;
  varying vec3 vLocalPosition;

  void main() {
    float facing = clamp(abs(vViewNormal.z), 0.0, 1.0);
    float disc = smoothstep(0.02, 0.96, facing);
    float mottle =
      sin(vLocalPosition.x * 21.0 + vLocalPosition.y * 8.0) * 0.035 +
      sin(vLocalPosition.z * 17.0 - vLocalPosition.x * 6.0) * 0.025;
    vec3 photosphere = vColor * (0.46 + vBrightness * 0.24 + disc * 1.12 + mottle);
    vec3 hotCore = vec3(1.0, 0.96, 0.82) * pow(disc, 2.6) * 0.2;
    gl_FragColor = vec4(photosphere + hotCore, 1.0);
  }
`;

const nearbyStarHaloFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying vec3 vViewNormal;

  void main() {
    float facing = clamp(abs(vViewNormal.z), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.4);
    float bodyGlow = smoothstep(0.15, 1.0, facing) * 0.035;
    float alpha = rim * 0.2 + bodyGlow;
    vec3 color = vColor * (0.62 + vBrightness * 0.18);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createNearbyStarBodyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: nearbyStarBodyVertexShader,
    fragmentShader: nearbyStarBodyFragmentShader,
    depthWrite: true,
    blending: THREE.NormalBlending,
  });
}

function createNearbyStarHaloMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: nearbyStarBodyVertexShader,
    fragmentShader: nearbyStarHaloFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
}

function createNearbyStarfieldLayer(layer: GalaxyLayer, profile: VisualQualityProfile, pixelRatio: number): THREE.Group {
  const generated = generateNearbyStarfieldPoints({
    count: nearbyStarfieldCountForQuality(layer.particleCount, profile),
    radius: 82,
    innerRadius: 2.6,
    seed: `${layer.id}-${profile.id}`,
  });
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(generated.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(generated.colors, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(generated.sizes, 1));
  geometry.setAttribute('aBrightness', new THREE.Float32BufferAttribute(generated.brightness, 1));
  geometry.setAttribute('aOpacity', new THREE.Float32BufferAttribute(generated.opacity, 1));
  geometry.setAttribute('aTemperature', new THREE.Float32BufferAttribute(generated.temperature, 1));

  const material = createSoftParticleMaterial({
    style: 'nearby-star',
    pixelRatio,
    sizeScale: 1.35,
    maxPointSize: 16,
  });
  material.depthTest = false;

  const points = new THREE.Points(geometry, material);
  points.name = layer.id;
  points.frustumCulled = false;
  points.renderOrder = 3;

  const resolved = generateResolvedStellarBodies({
    count: profile.id === 'low' ? 48 : profile.id === 'standard' ? 78 : 108,
    radius: 34,
    innerRadius: 3.2,
    seed: `${layer.id}-resolved-${profile.id}`,
  });
  const bodyGeometry = new THREE.SphereGeometry(1, 30, 18);
  bodyGeometry.setAttribute(
    'instanceBrightness',
    new THREE.InstancedBufferAttribute(new Float32Array(resolved.brightness), 1),
  );
  const haloGeometry = bodyGeometry.clone();
  haloGeometry.setAttribute(
    'instanceBrightness',
    new THREE.InstancedBufferAttribute(new Float32Array(resolved.brightness), 1),
  );
  const bodies = new THREE.InstancedMesh(bodyGeometry, createNearbyStarBodyMaterial(), resolved.count);
  const halos = new THREE.InstancedMesh(haloGeometry, createNearbyStarHaloMaterial(), resolved.count);
  bodies.name = 'resolved-nearby-star-bodies';
  halos.name = 'resolved-nearby-star-halos';
  bodies.frustumCulled = false;
  halos.frustumCulled = false;
  bodies.renderOrder = 4;
  halos.renderOrder = 5;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const haloScale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const color = new THREE.Color();

  for (let index = 0; index < resolved.count; index += 1) {
    const positionIndex = index * 3;
    position.set(
      resolved.positions[positionIndex],
      resolved.positions[positionIndex + 1],
      resolved.positions[positionIndex + 2],
    );
    const bodyScale = resolved.bodyRadii[index];
    scale.setScalar(bodyScale);
    matrix.compose(position, rotation, scale);
    bodies.setMatrixAt(index, matrix);
    color.setRGB(
      resolved.colors[positionIndex],
      resolved.colors[positionIndex + 1],
      resolved.colors[positionIndex + 2],
    );
    bodies.setColorAt(index, color);
    haloScale.setScalar(resolved.haloRadii[index]);
    matrix.compose(position, rotation, haloScale);
    halos.setMatrixAt(index, matrix);
    halos.setColorAt(index, color);
  }

  bodies.instanceMatrix.needsUpdate = true;
  halos.instanceMatrix.needsUpdate = true;
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  if (halos.instanceColor) halos.instanceColor.needsUpdate = true;

  const group = new THREE.Group();
  group.name = layer.id;
  group.userData.generatedStars = {
    count: generated.count,
    spectralTypes: generated.spectralTypes,
    massesSolar: generated.massesSolar,
    radiiSolar: generated.radiiSolar,
    luminositiesSolar: generated.luminositiesSolar,
  };
  group.userData.resolvedStars = {
    count: resolved.count,
    spectralTypes: resolved.spectralTypes,
    massesSolar: resolved.massesSolar,
    radiiSolar: resolved.radiiSolar,
    luminositiesSolar: resolved.luminositiesSolar,
  };
  group.add(points);
  group.add(halos);
  group.add(bodies);
  return group;
}

function createDiskGuides(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'galaxy-guides';

  for (const radius of [6, 12, 18, 24]) {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
    const points = curve.getPoints(160).map((point) => new THREE.Vector3(point.x, 0, point.y));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: radius === 18 ? '#8ad8ff' : '#6f705f',
      transparent: true,
      opacity: radius === 18 ? 0.16 : 0.08,
    });
    group.add(new THREE.LineLoop(geometry, material));
  }

  return group;
}

function createUniverseScaleGuides(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'observable-universe-guides';

  for (const [radius, color, opacity] of [
    [54, '#7f9cff', 0.12],
    [82, '#a78bff', 0.1],
    [108, '#8ad8ff', 0.16],
  ] as const) {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
    const points = curve.getPoints(220).map((point) => new THREE.Vector3(point.x, 0, point.y));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.LineLoop(geometry, material));
  }

  const filamentNodes = [
    new THREE.Vector3(-82, -10, -42),
    new THREE.Vector3(-52, 20, 34),
    new THREE.Vector3(-18, -8, 58),
    new THREE.Vector3(22, 14, 24),
    new THREE.Vector3(48, -18, -28),
    new THREE.Vector3(76, 6, 44),
  ];
  const filament = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(filamentNodes),
    new THREE.LineBasicMaterial({
      color: '#9eb6ff',
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(filament);

  return group;
}

function createCatalogMarkers(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'catalog-markers';
  const starTexture = createRadialTexture('star');
  const ringTexture = createRadialTexture('ring');

  for (const object of catalogObjects) {
    const baseScale = 0.24 + object.magnitudeHint * 0.07;
    const material = new THREE.SpriteMaterial({
      map: starTexture,
      color: object.color,
      transparent: true,
      opacity: object.realism === 'artistic' ? 0.82 : 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const marker: MarkerSprite = new THREE.Sprite(material);
    const [x, y, z] = galacticToScenePosition(object.galactic);
    marker.position.set(x, y, z);
    marker.scale.setScalar(baseScale);
    marker.userData.catalogObjectId = object.id;
    marker.userData.baseScale = baseScale;
    marker.userData.baseOpacity = object.realism === 'artistic' ? 0.74 : 0.92;
    marker.userData.markerOnlyAtGalaxyScale = true;
    marker.userData.selectionRing = false;
    marker.name = `scale-marker-${object.id}`;
    group.add(marker);

    const ringMaterial = new THREE.SpriteMaterial({
      map: ringTexture,
      color: '#bde8ff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring: MarkerSprite = new THREE.Sprite(ringMaterial);
    ring.position.copy(marker.position);
    ring.scale.setScalar(baseScale * 2.28);
    ring.userData.catalogObjectId = object.id;
    ring.userData.baseScale = baseScale * 2.28;
    ring.userData.baseOpacity = 0.82;
    ring.userData.markerOnlyAtGalaxyScale = true;
    ring.userData.selectionRing = true;
    ring.name = `selection-ring-${object.id}`;
    group.add(ring);
  }

  return group;
}

function setCameraToPreset(camera: THREE.PerspectiveCamera, target: THREE.Vector3, presetId: string): void {
  const preset = cameraPresets.find((item) => item.id === presetId) ?? cameraPresets[0];
  camera.position.set(...preset.position);
  target.set(...preset.target);
  camera.lookAt(target);
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh | THREE.Points | THREE.Line;
    const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;

    geometry?.dispose();
    if (Array.isArray(material)) {
      material.forEach((item) => {
        const mapped = item as THREE.Material & { map?: THREE.Texture };
        mapped.map?.dispose();
        item.dispose();
      });
    } else {
      const mapped = material as (THREE.Material & { map?: THREE.Texture }) | undefined;
      mapped?.map?.dispose();
      material?.dispose();
    }
  });
}

function seededRandom(seedText: string): () => number {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed = Math.imul(1664525, seed) + 1013904223;
    return (seed >>> 0) / 4294967296;
  };
}

function parseHexColor(hex: string): RgbParts {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(parts: RgbParts, alpha: number, multiplier = 1): string {
  const r = Math.max(0, Math.min(255, Math.round(parts.r * multiplier)));
  const g = Math.max(0, Math.min(255, Math.round(parts.g * multiplier)));
  const b = Math.max(0, Math.min(255, Math.round(parts.b * multiplier)));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rememberOpacity<T extends THREE.Material>(material: T, opacity: number): T {
  material.transparent = true;
  material.opacity = opacity;
  material.userData.baseOpacity = opacity;
  return material;
}

function starOpticalStyleForKind(kind: CelestialDetailKind) {
  if (kind === 'sun-like-star' || kind === 'red-supergiant') {
    return getStarOpticalStyle(kind);
  }

  return null;
}

function createSurfaceTexture(kind: CelestialDetailKind, object: CatalogObject): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable for close-up texture generation.');
  }

  const rng = seededRandom(`detail-${object.id}`);
  const base = parseHexColor(object.color);
  const starStyle = starOpticalStyleForKind(kind);
  context.fillStyle = rgba(base, 1, starStyle?.surfaceBaseMultiplier ?? (kind === 'visible-nebula' ? 0.78 : 0.86));
  context.fillRect(0, 0, size, size);

  const horizontalGlow = context.createLinearGradient(0, 0, size, 0);
  horizontalGlow.addColorStop(0, `rgba(0, 0, 0, ${starStyle?.textureShadowAlpha ?? 0.2})`);
  horizontalGlow.addColorStop(
    0.5,
    rgba(base, starStyle?.textureCoreAlpha ?? 0.3, starStyle?.textureCoreMultiplier ?? 1.28),
  );
  horizontalGlow.addColorStop(1, `rgba(0, 0, 0, ${starStyle?.textureShadowAlpha ?? 0.18})`);
  context.fillStyle = horizontalGlow;
  context.fillRect(0, 0, size, size);

  if (starStyle) {
    const core = context.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.68);
    core.addColorStop(
      0,
      kind === 'red-supergiant' ? 'rgba(255, 174, 104, 0.36)' : 'rgba(255, 250, 218, 0.48)',
    );
    core.addColorStop(0.55, rgba(base, 0.18, starStyle.textureCoreMultiplier));
    core.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = core;
    context.fillRect(0, 0, size, size);
  }

  const count = kind === 'red-supergiant' ? 190 : kind === 'visible-nebula' ? 420 : 820;
  for (let index = 0; index < count; index += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const radius =
      kind === 'red-supergiant'
        ? 12 + rng() * 48
        : kind === 'visible-nebula'
          ? 8 + rng() * 34
          : 1.2 + rng() * 7;
    const warmth = 0.72 + rng() * 0.68;
    const alpha = starStyle
      ? 0.025 + rng() * starStyle.granuleAlpha
      : kind === 'visible-nebula'
        ? 0.04 + rng() * 0.12
        : 0.04 + rng() * 0.12;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(base, alpha, warmth));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  if (kind === 'sun-like-star' || kind === 'red-supergiant') {
    for (let index = 0; index < 14; index += 1) {
      const x = rng() * size;
      const y = rng() * size;
      const radius = kind === 'red-supergiant' ? 28 + rng() * 56 : 10 + rng() * 28;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(
        0,
        kind === 'red-supergiant'
          ? `rgba(255, 134, 72, ${starStyle?.faculaAlpha ?? 0.26})`
          : `rgba(255, 248, 190, ${starStyle?.faculaAlpha ?? 0.34})`,
      );
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

const closeStarVertexShader = `
  varying vec2 vUv;
  varying vec3 vViewNormal;

  void main() {
    vUv = uv;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const closeStarFragmentShader = `
  uniform sampler2D uMap;
  uniform vec3 uGlowColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uMotionScale;
  uniform float uCoreEmission;
  uniform float uSurfaceFloor;
  uniform float uRimEmission;

  varying vec2 vUv;
  varying vec3 vViewNormal;

  void main() {
    vec2 flowUv = vUv;
    flowUv.x += sin((vUv.y + uTime * 0.012 * uMotionScale) * 24.0) * 0.0035;
    flowUv.y += cos((vUv.x - uTime * 0.009 * uMotionScale) * 19.0) * 0.0025;
    vec4 surface = texture2D(uMap, flowUv);
    float facing = clamp(abs(vViewNormal.z), 0.0, 1.0);
    float limb = smoothstep(0.02, 0.92, facing);
    float rim = pow(1.0 - facing, 2.4);
    float convection = sin((flowUv.x * 41.0 + flowUv.y * 19.0) + uTime * 0.24 * uMotionScale) * 0.035;
    float core = smoothstep(0.18, 1.0, limb);
    vec3 photosphere = surface.rgb * (uSurfaceFloor + limb * uCoreEmission + convection);
    vec3 selfEmission = uGlowColor * (rim * uRimEmission + core * 0.18);
    vec3 color = photosphere + selfEmission;
    gl_FragColor = vec4(color, uOpacity);
  }
`;

function createStarSurfaceMaterial(texture: THREE.Texture, color: string, profile: CelestialDetailProfile): THREE.ShaderMaterial {
  const style = getStarOpticalStyle(profile.kind === 'red-supergiant' ? 'red-supergiant' : 'sun-like-star');

  return rememberOpacity(
    new THREE.ShaderMaterial({
      vertexShader: closeStarVertexShader,
      fragmentShader: closeStarFragmentShader,
      transparent: true,
      uniforms: {
        uMap: { value: texture },
        uGlowColor: { value: new THREE.Color(color) },
        uOpacity: { value: 1 },
        uTime: { value: 0 },
        uMotionScale: { value: profile.motionScale },
        uCoreEmission: { value: style.coreEmission },
        uSurfaceFloor: { value: style.surfaceFloor },
        uRimEmission: { value: style.rimEmission },
      },
    }),
    1,
  );
}

function createDetailGlow(color: string, scale: number, opacity: number): THREE.Sprite {
  const sprite = new THREE.Sprite(
    rememberOpacity(
      new THREE.SpriteMaterial({
        map: createRadialTexture('star'),
        color,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      opacity,
    ),
  );
  sprite.scale.setScalar(scale);
  return sprite;
}

function createOpticalPointSource(object: CatalogObject, profile: CelestialDetailProfile): THREE.Sprite {
  const point = createDetailGlow(profile.opticalProfile.pointSourceColor || object.color, 0.72, 0.92);
  point.userData.detailRole = 'optical-point-source';
  return point;
}

function createStarDetail(object: CatalogObject, profile: CelestialDetailProfile): THREE.Group {
  const group = new THREE.Group();
  const style = getStarOpticalStyle(profile.kind === 'red-supergiant' ? 'red-supergiant' : 'sun-like-star');
  group.add(createOpticalPointSource(object, profile));
  const texture = createSurfaceTexture(profile.kind, object);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    createStarSurfaceMaterial(texture, object.color, profile),
  );
  sphere.userData.detailRole = 'photosphere';
  group.add(sphere);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(style.atmosphereScale, 96, 64),
    rememberOpacity(
      new THREE.MeshBasicMaterial({
        color: object.color,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      }),
      style.atmosphereOpacity,
    ),
  );
  atmosphere.userData.detailRole = 'optical-limb-glow';
  group.add(atmosphere);
  const stellarGlow = createDetailGlow(object.color, style.haloScale, style.haloOpacity);
  stellarGlow.userData.detailRole = 'optical-limb-glow';
  group.add(stellarGlow);

  for (let index = 0; index < 4; index += 1) {
    const flare = createDetailGlow(profile.kind === 'red-supergiant' ? '#ff8a5c' : '#ffd98a', 0.72, 0.18);
    const angle = index * Math.PI * 0.5 + 0.4;
    flare.position.set(Math.cos(angle) * 0.98, Math.sin(angle * 0.7) * 0.32, Math.sin(angle) * 0.98);
    flare.userData.detailRole = profile.kind === 'red-supergiant' ? 'slow-hotspot' : 'facula';
    flare.userData.pulseRate = 0.7 + index * 0.18;
    group.add(flare);
  }

  return group;
}

function createOpticalBlackHoleLocationDetail(object: CatalogObject): THREE.Group {
  const group = new THREE.Group();
  const rng = seededRandom(`optical-black-hole-${object.id}`);
  const positions: number[] = [];
  const colors: number[] = [];

  for (let index = 0; index < 180; index += 1) {
    const theta = rng() * Math.PI * 2;
    const radius = Math.pow(rng(), 0.55);
    const vertical = (rng() - 0.5) * 0.42;
    positions.push(Math.cos(theta) * radius, vertical, Math.sin(theta) * radius);
    const color = new THREE.Color('#ffe0a8').lerp(new THREE.Color('#ff9f70'), rng() * 0.42);
    colors.push(color.r, color.g, color.b);
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const denseStars = new THREE.Points(
    starGeometry,
    createSoftClosePointMaterial({
      texture: createRadialTexture('star'),
      size: 0.022,
      opacity: 0.82,
      vertexColors: true,
    }),
  );
  denseStars.userData.detailRole = 'dense-star-field';
  denseStars.userData.spinRate = 0.04;
  group.add(denseStars);

  const centralDust = new THREE.Sprite(
    rememberOpacity(
      new THREE.SpriteMaterial({
        map: createRadialTexture('star'),
        color: '#080504',
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
      }),
      0.46,
    ),
  );
  centralDust.scale.setScalar(0.68);
  centralDust.userData.detailRole = 'optical-obscuration';
  group.add(centralDust);

  for (let index = 0; index < 7; index += 1) {
    const sprite = new THREE.Sprite(
      rememberOpacity(
        new THREE.SpriteMaterial({
          map: createRadialTexture('star'),
          color: '#2a1712',
          transparent: true,
          blending: THREE.NormalBlending,
          depthWrite: false,
        }),
        0.34 + rng() * 0.24,
      ),
    );
    sprite.position.set((rng() - 0.5) * 1.3, (rng() - 0.5) * 0.3, (rng() - 0.5) * 1.3);
    sprite.scale.setScalar(0.7 + rng() * 0.9);
    sprite.userData.detailRole = 'optical-obscuration';
    group.add(sprite);
  }

  const marker = new THREE.Sprite(
    rememberOpacity(
      new THREE.SpriteMaterial({
        map: createRadialTexture('ring'),
        color: '#ffe7ad',
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      0.22,
    ),
  );
  marker.scale.setScalar(0.34);
  marker.userData.detailRole = 'position-marker';
  group.add(marker);
  return group;
}

function createNebulaDetail(object: CatalogObject, profile: CelestialDetailProfile): THREE.Group {
  const group = new THREE.Group();
  group.add(createOpticalPointSource(object, profile));
  const rng = seededRandom(`nebula-${object.id}`);
  const cloudTexture = createRadialTexture('star');

  for (let index = 0; index < 36; index += 1) {
    const sprite = new THREE.Sprite(
      rememberOpacity(
        new THREE.SpriteMaterial({
          map: cloudTexture,
          color: index % 5 === 0 ? '#fff3df' : index % 2 === 0 ? '#ff6f8f' : object.color,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
        0.16 + rng() * 0.18,
      ),
    );
    sprite.position.set((rng() - 0.5) * 1.85, (rng() - 0.5) * 0.82, (rng() - 0.5) * 1.85);
    sprite.scale.setScalar(0.7 + rng() * 1.2);
    sprite.userData.detailRole = 'emission-cloud';
    sprite.userData.driftRate = 0.01 + rng() * 0.025;
    group.add(sprite);
  }

  for (let index = 0; index < 9; index += 1) {
    const points: THREE.Vector3[] = [];
    const startX = (rng() - 0.5) * 1.6;
    const startZ = (rng() - 0.5) * 1.6;
    for (let segment = 0; segment < 7; segment += 1) {
      points.push(
        new THREE.Vector3(
          startX + (segment - 3) * 0.18 + (rng() - 0.5) * 0.12,
          (rng() - 0.5) * 0.52,
          startZ + Math.sin(segment * 0.8 + index) * 0.18,
        ),
      );
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(42));
    const line = new THREE.Line(
      geometry,
      rememberOpacity(
        new THREE.LineBasicMaterial({
          color: '#1c1118',
          transparent: true,
          blending: THREE.NormalBlending,
          depthWrite: false,
        }),
        0.36,
      ),
    );
    line.userData.detailRole = 'dust-filament';
    line.userData.spinRate = (rng() - 0.5) * 0.025;
    group.add(line);
  }

  const nebulaGlow = createDetailGlow('#ffffff', 1.35, 0.16);
  nebulaGlow.userData.detailRole = 'emission-cloud';
  group.add(nebulaGlow);
  return group;
}

function createClusterDetail(object: CatalogObject, profile: CelestialDetailProfile): THREE.Group {
  const group = new THREE.Group();
  group.add(createOpticalPointSource(object, profile));
  const rng = seededRandom(`cluster-${object.id}`);
  const count = profile.kind === 'globular-cluster' ? 210 : 82;
  const positions: number[] = [];
  const colors: number[] = [];
  const base = new THREE.Color(object.color);
  const cool = new THREE.Color('#a8d7ff');

  for (let index = 0; index < count; index += 1) {
    const theta = rng() * Math.PI * 2;
    const cosPhi = rng() * 2 - 1;
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
    const radius = Math.pow(rng(), profile.kind === 'globular-cluster' ? 1.9 : 0.75);
    positions.push(Math.cos(theta) * sinPhi * radius, cosPhi * radius, Math.sin(theta) * sinPhi * radius);
    const coreWarmth = profile.kind === 'globular-cluster' ? Math.max(0, 1 - radius) * 0.34 : 0;
    const color = base.clone().lerp(cool, profile.kind === 'open-cluster' ? rng() * 0.8 : rng() * 0.18);
    color.lerp(new THREE.Color('#fff2c8'), coreWarmth);
    colors.push(color.r, color.g, color.b);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geometry,
    createSoftClosePointMaterial({
      texture: createRadialTexture('star'),
      size: profile.kind === 'globular-cluster' ? 0.026 : 0.038,
      opacity: 0.92,
      vertexColors: true,
    }),
  );
  points.userData.detailRole = profile.kind === 'globular-cluster' ? 'dense-core' : 'loose-member-stars';
  points.userData.spinRate = profile.kind === 'globular-cluster' ? 0.018 : 0.032;
  group.add(points);
  const clusterGlow = createDetailGlow(object.color, 1.55, profile.kind === 'globular-cluster' ? 0.42 : 0.26);
  clusterGlow.userData.detailRole = profile.kind === 'globular-cluster' ? 'dense-core' : 'reflection-nebulosity';
  group.add(clusterGlow);

  if (profile.kind === 'open-cluster') {
    const mainStarTexture = createRadialTexture('star');
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2 + (index % 2) * 0.22;
      const radius = 0.18 + (index % 3) * 0.16;
      const star = new THREE.Sprite(
        rememberOpacity(
          new THREE.SpriteMaterial({
            map: mainStarTexture,
            color: index === 0 ? '#f5fbff' : '#9cc8ff',
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
          index === 0 ? 0.96 : 0.78,
        ),
      );
      star.position.set(Math.cos(angle) * radius, (index - 3) * 0.035, Math.sin(angle) * radius);
      star.scale.setScalar(index === 0 ? 0.42 : 0.28);
      star.userData.detailRole = 'seven-bright-stars';
      group.add(star);
    }

    const reflection = createDetailGlow('#9cc8ff', 2.35, 0.16);
    reflection.userData.detailRole = 'reflection-nebulosity';
    group.add(reflection);
  }
  return group;
}

function createStructureDetail(object: CatalogObject, profile: CelestialDetailProfile): THREE.Group {
  const group = new THREE.Group();
  group.add(createOpticalPointSource(object, profile));
  const rng = seededRandom(`structure-${object.id}`);
  const positions: number[] = [];
  const colors: number[] = [];
  const base = new THREE.Color(object.color);

  for (let index = 0; index < 220; index += 1) {
    let x = 0;
    let y = 0;
    let z = 0;

    if (object.id === 'galactic-center') {
      const angle = rng() * Math.PI * 2;
      const radius = Math.pow(rng(), 1.55);
      x = Math.cos(angle) * radius * 1.1;
      y = (rng() - 0.5) * (1 - radius) * 0.9;
      z = Math.sin(angle) * radius * 0.58;
    } else if (object.id === 'thin-disk-component' || object.id === 'thick-disk-component') {
      const angle = rng() * Math.PI * 2;
      const radius = Math.pow(rng(), 0.72);
      x = Math.cos(angle) * radius * 1.15;
      y = (rng() - 0.5) * (object.id === 'thick-disk-component' ? 0.5 : 0.16);
      z = Math.sin(angle) * radius * 1.15;
    } else if (object.id === 'stellar-halo-component') {
      const angle = rng() * Math.PI * 2;
      const cosPhi = rng() * 2 - 1;
      const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
      const radius = Math.pow(rng(), 0.42);
      x = Math.cos(angle) * sinPhi * radius;
      y = cosPhi * radius * 0.82;
      z = Math.sin(angle) * sinPhi * radius;
    } else {
      const angle = (rng() * 1.4 - 0.7) + index * 0.015;
      const radius = 0.15 + rng() * 0.92;
      x = Math.cos(angle) * radius;
      y = (rng() - 0.5) * 0.14;
      z = Math.sin(angle) * radius;
    }

    positions.push(x, y, z);
    const color = base.clone().lerp(new THREE.Color('#ffe7ad'), rng() * 0.4);
    colors.push(color.r, color.g, color.b);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  group.add(
    new THREE.Points(
      geometry,
      createSoftClosePointMaterial({
        texture: createRadialTexture('star'),
        size: 0.045,
        opacity: 0.68,
        vertexColors: true,
      }),
    ),
  );

  if (object.type === 'arm') {
    const dustGeometry = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 64 }, (_, index) => {
        const t = index / 63;
        const angle = -0.75 + t * 1.5;
        return new THREE.Vector3(Math.cos(angle) * (0.22 + t * 0.88), -0.02, Math.sin(angle) * (0.22 + t * 0.88));
      }),
    );
    const dustLine = new THREE.Line(
      dustGeometry,
      rememberOpacity(
        new THREE.LineBasicMaterial({
          color: '#1f1511',
          transparent: true,
          depthWrite: false,
        }),
        0.46,
      ),
    );
    dustLine.userData.detailRole = 'dust-streak';
    group.add(dustLine);
  }

  return group;
}

function createCloseDetailObject(object: CatalogObject, profile: CelestialDetailProfile): THREE.Group {
  if (profile.kind === 'sun-like-star' || profile.kind === 'red-supergiant') {
    return createStarDetail(object, profile);
  }
  if (profile.kind === 'optical-black-hole-location') {
    return createOpticalBlackHoleLocationDetail(object);
  }
  if (profile.kind === 'visible-nebula') {
    return createNebulaDetail(object, profile);
  }
  if (profile.kind === 'open-cluster' || profile.kind === 'globular-cluster') {
    return createClusterDetail(object, profile);
  }
  return createStructureDetail(object, profile);
}

function rebuildCloseDetailGroup(root: THREE.Group, object: CatalogObject): void {
  while (root.children.length > 0) {
    const child = root.children.pop();
    if (child) disposeObject(child);
  }

  const profile = getCelestialDetailProfile(object);
  const detailObject = createCloseDetailObject(object, profile);
  const [x, y, z] = galacticToScenePosition(object.galactic);
  const renderScale = profile.closeViewSceneRadius > 0 ? profile.closeViewSceneRadius : 1.15;
  root.position.set(x, y, z);
  root.scale.setScalar(renderScale);
  root.userData.profile = profile;
  root.userData.trueScaleRadius = profile.closeViewSceneRadius;
  root.userData.catalogObjectId = object.id;
  root.visible = true;
  root.add(detailObject);
}

function setOpticalDetailState(
  root: THREE.Group,
  state: OpticalObservationState,
  profile: CelestialDetailProfile,
): void {
  root.traverse((child) => {
    const object = child as THREE.Object3D & { material?: THREE.Material | THREE.Material[] };
    const material = object.material as
      | THREE.Material
      | THREE.Material[]
      | undefined;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    const roleOpacity = opacityForDetailRole(object.userData.detailRole as string | undefined, state, profile);
    for (const item of materials) {
      const baseOpacity = typeof item.userData.baseOpacity === 'number' ? item.userData.baseOpacity : 1;
      item.opacity = baseOpacity * roleOpacity;
      const shader = item as THREE.ShaderMaterial;
      if (shader.uniforms?.uOpacity) {
        shader.uniforms.uOpacity.value = baseOpacity * roleOpacity;
      }
      item.needsUpdate = true;
    }
  });
}

function opacityForDetailRole(
  role: string | undefined,
  state: OpticalObservationState,
  profile: CelestialDetailProfile,
): number {
  const maxOpacity = profile.opticalProfile.maxObjectOpacity;
  const point = state.pointSourceOpacity * maxOpacity * (1 - state.resolvedOpacity * 0.82);
  const resolved = state.resolvedOpacity * maxOpacity;
  const feature = state.featureStrength * maxOpacity;
  const object = state.objectOpacity;

  if (role === 'optical-point-source') return point;
  if (role === 'photosphere') return resolved;
  if (role === 'optical-limb-glow') return closeStarGlowOpacity(resolved, state.featureStrength);
  if (role === 'facula' || role === 'slow-hotspot') return feature * 0.72;
  if (role === 'emission-cloud') return object * (0.28 + state.featureStrength * 0.44);
  if (role === 'dust-filament' || role === 'dust-streak') return feature * 0.82;
  if (role === 'reflection-nebulosity') return feature * 0.5;
  if (role === 'seven-bright-stars') return Math.max(point * 0.72, object);
  if (role === 'dense-core' || role === 'loose-member-stars') return Math.max(point * 0.24, object);
  if (role === 'dense-star-field' || role === 'optical-obscuration') return object;
  if (role === 'position-marker') return Math.max(state.markerOpacity * 0.2, object * 0.38);

  return object;
}

function updateCloseDetailAnimation(root: THREE.Group, elapsedTime: number, delta: number, profile: CelestialDetailProfile): void {
  root.traverse((child) => {
    const object = child as THREE.Object3D & {
      material?: THREE.Material | THREE.Material[];
    };
    const material = object.material as THREE.ShaderMaterial | THREE.Material[] | undefined;
    const materials = Array.isArray(material) ? material : material ? [material] : [];

    for (const item of materials) {
      const shader = item as THREE.ShaderMaterial;
      if (shader.uniforms?.uTime) {
        shader.uniforms.uTime.value = elapsedTime;
      }
    }

    const spinRate = typeof object.userData.spinRate === 'number' ? object.userData.spinRate : 0;
    if (spinRate) {
      object.rotation.z += delta * spinRate * profile.motionScale;
    }

    if (object.userData.detailRole === 'facula' || object.userData.detailRole === 'slow-hotspot') {
      const baseScale = object.userData.baseCloseScale as number | undefined;
      if (!baseScale) {
        object.userData.baseCloseScale = object.scale.x;
      }
      const rememberedScale = (object.userData.baseCloseScale as number) || object.scale.x;
      const pulseRate = typeof object.userData.pulseRate === 'number' ? object.userData.pulseRate : 1;
      const pulse = 1 + Math.sin(elapsedTime * pulseRate) * 0.18;
      object.scale.setScalar(rememberedScale * pulse);
    }

    if (object.userData.detailRole === 'emission-cloud') {
      const driftRate = typeof object.userData.driftRate === 'number' ? object.userData.driftRate : 0.012;
      object.position.y += Math.sin(elapsedTime * driftRate + object.position.x) * delta * 0.025;
    }
  });
}

export function GalaxyScene({ layers, selectedObjectId, activePresetId, onSelectObject }: GalaxySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerGroupsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const markerGroupRef = useRef<THREE.Group | null>(null);
  const closeDetailGroupRef = useRef<THREE.Group | null>(null);
  const selectedObjectIdRef = useRef(selectedObjectId);
  const onSelectObjectRef = useRef(onSelectObject);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetRef = useRef(new THREE.Vector3());
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const pressedKeysRef = useRef(new Set<string>());

  useEffect(() => {
    selectedObjectIdRef.current = selectedObjectId;
  }, [selectedObjectId]);

  useEffect(() => {
    onSelectObjectRef.current = onSelectObject;
  }, [onSelectObject]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const mountedContainer = container;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030306');
    scene.fog = new THREE.FogExp2('#030306', 0.022);
    const qualityProfile = getVisualQualityProfile(navigator.hardwareConcurrency || 6);
    const pixelRatio = Math.min(window.devicePixelRatio, qualityProfile.maxDevicePixelRatio);

    const camera = new THREE.PerspectiveCamera(
      58,
      mountedContainer.clientWidth / mountedContainer.clientHeight,
      0.05,
      520,
    );
    cameraRef.current = camera;
    setCameraToPreset(camera, targetRef.current, activePresetId);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(mountedContainer.clientWidth, mountedContainer.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    mountedContainer.appendChild(renderer.domElement);

    scene.add(createDiskGuides());
    scene.add(createUniverseScaleGuides());

    const layerGroups = layerGroupsRef.current;
    for (const layer of layers) {
      if (layer.id === 'measured-stars' || layer.id === 'nearby-stars') continue;
      const points = createPointsForLayer(layer, qualityProfile, pixelRatio);
      points.visible = layer.visible;
      layerGroups.set(layer.id, points);
      scene.add(points);
    }

    const nearbyStarLayer = layers.find((layer) => layer.id === 'nearby-stars');
    if (nearbyStarLayer) {
      const nearbyStars = createNearbyStarfieldLayer(nearbyStarLayer, qualityProfile, pixelRatio);
      nearbyStars.visible = nearbyStarLayer.visible;
      nearbyStars.position.copy(camera.position);
      layerGroups.set(nearbyStarLayer.id, nearbyStars);
      scene.add(nearbyStars);
    }

    const markerGroup = createCatalogMarkers();
    markerGroup.visible = layers.find((layer) => layer.id === 'measured-stars')?.visible ?? true;
    markerGroupRef.current = markerGroup;
    scene.add(markerGroup);

    const closeDetailGroup = new THREE.Group();
    closeDetailGroup.name = 'close-detail-object';
    closeDetailGroupRef.current = closeDetailGroup;
    const initialObject = catalogObjects.find((object) => object.id === selectedObjectIdRef.current) ?? catalogObjects[0];
    rebuildCloseDetailGroup(closeDetailGroup, initialObject);
    scene.add(closeDetailGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    let animationFrameId = 0;
    let disposed = false;

    function updateSelectedMarker(elapsedTime: number) {
      const detailRoot = closeDetailGroupRef.current;
      const detailProfile = detailRoot?.userData.profile as CelestialDetailProfile | undefined;
      const opticalState =
        detailRoot && detailProfile
          ? calculateNakedEyeVisibilityState(detailProfile, camera.position.distanceTo(detailRoot.position))
          : undefined;

      markerGroup.children.forEach((child) => {
        const marker = child as MarkerSprite;
        const isSelected = marker.userData.catalogObjectId === selectedObjectIdRef.current;
        const baseScale = marker.userData.baseScale as number;
        const baseOpacity = marker.userData.baseOpacity as number;
        const isRing = Boolean(marker.userData.selectionRing);
        const pulse = isSelected ? 1 + Math.sin(elapsedTime * 2.5) * 0.035 : 1;
        const targetScale = isSelected ? baseScale * (isRing ? pulse : 1.3) : baseScale;
        marker.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.16);
        const objectFade = opticalState?.opticalKind === 'location-only' ? 0 : (opticalState?.objectOpacity ?? 0);
        const markerFade = opticalState ? Math.max(0, opticalState.markerOpacity * (1 - objectFade * 1.45)) : 1;
        const ringFade = opticalState
          ? Math.max(0, opticalState.markerOpacity * (1 - Math.max(opticalState.resolvedOpacity, objectFade) * 1.8))
          : 1;
        marker.material.opacity = isRing
          ? isSelected
            ? baseOpacity * ringFade
            : 0
          : isSelected
            ? markerFade
            : baseOpacity;
      });
    }

    function updateCloseDetail(delta: number) {
      const root = closeDetailGroupRef.current;
      const profile = root?.userData.profile as CelestialDetailProfile | undefined;
      if (!root || !profile) return;

      const distance = camera.position.distanceTo(root.position);
      const opticalState = calculateNakedEyeVisibilityState(profile, distance);
      root.visible = opticalState.objectOpacity > 0.002 || opticalState.pointSourceOpacity > 0.002;
      root.rotation.y += delta * 0.08 * profile.motionScale;
      root.rotation.x = Math.sin(clock.elapsedTime * 0.22) * 0.035;
      updateCloseDetailAnimation(root, clock.elapsedTime, delta, profile);
      setOpticalDetailState(root, opticalState, profile);
    }

    function moveCamera(delta: number) {
      const keys = pressedKeysRef.current;
      if (keys.size === 0) return;

      const speed = (keys.has('shift') ? 18 : 7) * delta;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const movement = new THREE.Vector3();

      if (keys.has('w')) movement.add(forward);
      if (keys.has('s')) movement.sub(forward);
      if (keys.has('d')) movement.add(right);
      if (keys.has('a')) movement.sub(right);
      if (keys.has('e')) movement.add(up);
      if (keys.has('q')) movement.sub(up);

      if (movement.lengthSq() > 0) {
        movement.normalize().multiplyScalar(speed);
        camera.position.add(movement);
        targetRef.current.add(movement);
      }
    }

    function updateNearbyStarfield(delta: number) {
      const nearbyStars = layerGroups.get('nearby-stars');
      if (!nearbyStars) return;

      const lagDistance = nearbyStars.position.distanceTo(camera.position);
      if (lagDistance > 42) {
        nearbyStars.position.copy(camera.position);
        return;
      }

      const followAmount = 1 - Math.pow(0.018, Math.max(0.001, delta));
      nearbyStars.position.lerp(camera.position, followAmount);
    }

    function animate() {
      if (disposed) return;

      const delta = clock.getDelta();
      moveCamera(delta);
      updateNearbyStarfield(delta);
      updateSelectedMarker(clock.elapsedTime);
      updateCloseDetail(delta);

      const disk = layerGroups.get('thin-disk');
      const thickDisk = layerGroups.get('thick-disk');
      const majorArms = layerGroups.get('major-spiral-arms');
      const minorArms = layerGroups.get('minor-spiral-arms');
      const orionSpur = layerGroups.get('orion-spur-layer');
      if (disk) disk.rotation.y += delta * 0.003;
      if (thickDisk) thickDisk.rotation.y += delta * 0.002;
      if (majorArms) majorArms.rotation.y += delta * 0.004;
      if (minorArms) minorArms.rotation.y += delta * 0.0035;
      if (orionSpur) orionSpur.rotation.y += delta * 0.004;

      camera.lookAt(targetRef.current);
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    }

    function resize() {
      if (!mountedContainer.clientWidth || !mountedContainer.clientHeight) return;
      camera.aspect = mountedContainer.clientWidth / mountedContainer.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountedContainer.clientWidth, mountedContainer.clientHeight);
    }

    function handlePointerDown(event: PointerEvent) {
      isDraggingRef.current = true;
      dragDistanceRef.current = 0;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!isDraggingRef.current) return;
      const dx = event.clientX - lastPointerRef.current.x;
      const dy = event.clientY - lastPointerRef.current.y;
      dragDistanceRef.current += Math.abs(dx) + Math.abs(dy);
      lastPointerRef.current = { x: event.clientX, y: event.clientY };

      const offset = camera.position.clone().sub(targetRef.current);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta -= dx * 0.005;
      spherical.phi = Math.max(0.12, Math.min(Math.PI - 0.12, spherical.phi - dy * 0.005));
      camera.position.copy(targetRef.current.clone().add(new THREE.Vector3().setFromSpherical(spherical)));
    }

    function handlePointerUp(event: PointerEvent) {
      isDraggingRef.current = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      if (dragDistanceRef.current > 6) return;

      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(markerGroup.children, false);
      const hit = hits[0]?.object;

      if (hit?.userData.catalogObjectId) {
        onSelectObjectRef.current(hit.userData.catalogObjectId);
      }
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const offset = camera.position.clone().sub(targetRef.current);
      const scale = event.deltaY > 0 ? 1.1 : 0.9;
      const detailProfile = closeDetailGroupRef.current?.userData.profile as CelestialDetailProfile | undefined;
      const minimumDistance = detailProfile ? minimumCameraDistanceForProfile(detailProfile) : 2.5;
      offset.multiplyScalar(scale);
      offset.clampLength(minimumDistance, 96);
      camera.position.copy(targetRef.current.clone().add(offset));
    }

    function handleKeyDown(event: KeyboardEvent) {
      pressedKeysRef.current.add(event.key.toLowerCase());
    }

    function handleKeyUp(event: KeyboardEvent) {
      pressedKeysRef.current.delete(event.key.toLowerCase());
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      layerGroupsRef.current.clear();
      markerGroupRef.current = null;
      closeDetailGroupRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    for (const layer of layers) {
      if (layer.id === 'measured-stars') {
        if (markerGroupRef.current) markerGroupRef.current.visible = layer.visible;
      } else {
        const object = layerGroupsRef.current.get(layer.id);
        if (object) object.visible = layer.visible;
      }
    }
  }, [layers]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (camera) {
      setCameraToPreset(camera, targetRef.current, activePresetId);
    }
  }, [activePresetId]);

  useEffect(() => {
    const selectedObject = catalogObjects.find((object) => object.id === selectedObjectId);
    if (!selectedObject) return;

    const [x, y, z] = galacticToScenePosition(selectedObject.galactic);
    const nextTarget = new THREE.Vector3(x, y, z);
    const camera = cameraRef.current;
    if (camera) {
      const shift = nextTarget.clone().sub(targetRef.current);
      camera.position.add(shift);
      targetRef.current.copy(nextTarget);
    }

    if (closeDetailGroupRef.current) {
      rebuildCloseDetailGroup(closeDetailGroupRef.current, selectedObject);
    }
  }, [selectedObjectId]);

  return <div ref={containerRef} className="galaxy-canvas" aria-label="银河系 3D 场景" />;
}
