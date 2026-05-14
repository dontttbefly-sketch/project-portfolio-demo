import * as THREE from 'three';

interface SoftClosePointMaterialOptions {
  texture: THREE.Texture;
  size: number;
  opacity: number;
  vertexColors?: boolean;
}

export function createSoftClosePointMaterial({
  texture,
  size,
  opacity,
  vertexColors = true,
}: SoftClosePointMaterialOptions): THREE.PointsMaterial {
  const material = new THREE.PointsMaterial({
    size,
    map: texture,
    transparent: true,
    alphaTest: 0.025,
    vertexColors,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  material.opacity = opacity;
  material.userData.baseOpacity = opacity;
  return material;
}
