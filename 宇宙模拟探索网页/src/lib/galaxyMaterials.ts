import * as THREE from 'three';
import type { GalaxyRenderStyle } from '../types';

interface SoftParticleMaterialOptions {
  style: GalaxyRenderStyle;
  pixelRatio: number;
  sizeScale: number;
  maxPointSize: number;
}

const softParticleVertexShader = `
  attribute float aSize;
  attribute float aBrightness;
  attribute float aOpacity;
  attribute float aTemperature;

  varying vec3 vColor;
  varying float vBrightness;
  varying float vOpacity;
  varying float vTemperature;

  uniform float uPixelRatio;
  uniform float uSizeScale;
  uniform float uMaxPointSize;

  void main() {
    vColor = color;
    vBrightness = aBrightness;
    vOpacity = aOpacity;
    vTemperature = aTemperature;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float distanceScale = 36.0 / max(12.0, -mvPosition.z);
    gl_PointSize = clamp(aSize * uSizeScale * uPixelRatio * distanceScale, 1.0, uMaxPointSize);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vOpacity;
  varying float vTemperature;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(centered);
    float softEdge = smoothstep(0.5, 0.08, distanceFromCenter);
    float core = smoothstep(0.18, 0.0, distanceFromCenter);
    float airy = smoothstep(0.48, 0.22, distanceFromCenter) * 0.28;
    float alpha = (softEdge * 0.44 + core * 0.3 + airy * 0.4) * vOpacity;

    if (alpha < 0.01) discard;

    vec3 color = vColor * (0.3 + vBrightness * 0.7 + core * 0.55);
    gl_FragColor = vec4(color, alpha);
  }
`;

const nearbyStarFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vOpacity;
  varying float vTemperature;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(centered);
    float core = smoothstep(0.16, 0.0, distanceFromCenter);
    float halo = smoothstep(0.5, 0.12, distanceFromCenter);
    float outerGlow = smoothstep(0.5, 0.26, distanceFromCenter) * 0.24;
    float alpha = (core * 0.82 + halo * 0.34 + outerGlow) * vOpacity;

    if (alpha < 0.01) discard;

    vec3 hotCore = mix(vColor, vec3(1.0, 0.96, 0.82), core * 0.36);
    vec3 color = hotCore * (0.42 + vBrightness * 1.08 + core * 0.78);
    gl_FragColor = vec4(color, alpha);
  }
`;

const nebulaFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vOpacity;
  varying float vTemperature;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(centered);
    float radial = smoothstep(0.5, 0.02, distanceFromCenter);
    float n = noise(gl_PointCoord * 7.0) * 0.55 + noise(gl_PointCoord * 15.0) * 0.25;
    float filament = smoothstep(0.18, 0.86, n + radial * 0.35);
    float alpha = radial * filament * vOpacity * 0.5;

    if (alpha < 0.012) discard;

    vec3 color = mix(vColor * 0.52, vColor * 1.18, filament) * (0.48 + vBrightness * 0.42);
    gl_FragColor = vec4(color, alpha);
  }
`;

const dustFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vOpacity;
  varying float vTemperature;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(centered);
    float softEdge = smoothstep(0.5, 0.02, distanceFromCenter);
    float mottled = 0.72 + 0.28 * sin((gl_PointCoord.x + gl_PointCoord.y) * 28.0);
    float alpha = softEdge * mottled * vOpacity * 0.52;

    if (alpha < 0.01) discard;

    vec3 color = vColor * (0.12 + vBrightness * 0.2);
    gl_FragColor = vec4(color, alpha);
  }
`;

function fragmentShaderForStyle(style: GalaxyRenderStyle): string {
  if (style === 'nebula') return nebulaFragmentShader;
  if (style === 'dust') return dustFragmentShader;
  if (style === 'nearby-star') return nearbyStarFragmentShader;
  return starFragmentShader;
}

function blendingForStyle(style: GalaxyRenderStyle): THREE.Blending {
  if (style === 'dust') return THREE.NormalBlending;
  return THREE.AdditiveBlending;
}

export function createSoftParticleMaterial(options: SoftParticleMaterialOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: softParticleVertexShader,
    fragmentShader: fragmentShaderForStyle(options.style),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: blendingForStyle(options.style),
    uniforms: {
      uPixelRatio: { value: options.pixelRatio },
      uSizeScale: { value: options.sizeScale },
      uMaxPointSize: { value: options.maxPointSize },
    },
  });
}

export function createNebulaMaterial(pixelRatio: number): THREE.ShaderMaterial {
  return createSoftParticleMaterial({
    style: 'nebula',
    pixelRatio,
    sizeScale: 8,
    maxPointSize: 42,
  });
}

export function createDustMaterial(pixelRatio: number): THREE.ShaderMaterial {
  return createSoftParticleMaterial({
    style: 'dust',
    pixelRatio,
    sizeScale: 5,
    maxPointSize: 24,
  });
}

export function createRadialTexture(kind: 'star' | 'ring'): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable for marker texture generation.');
  }

  const center = size / 2;

  if (kind === 'ring') {
    context.strokeStyle = 'rgba(180, 225, 255, 0.95)';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(center, center, 42, 0, Math.PI * 2);
    context.stroke();

    const ringGlow = context.createRadialGradient(center, center, 30, center, center, 58);
    ringGlow.addColorStop(0, 'rgba(180, 225, 255, 0)');
    ringGlow.addColorStop(0.62, 'rgba(180, 225, 255, 0.28)');
    ringGlow.addColorStop(1, 'rgba(180, 225, 255, 0)');
    context.fillStyle = ringGlow;
    context.fillRect(0, 0, size, size);
  } else {
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.08, 'rgba(255, 244, 205, 0.95)');
    gradient.addColorStop(0.24, 'rgba(255, 219, 135, 0.38)');
    gradient.addColorStop(0.55, 'rgba(120, 184, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
