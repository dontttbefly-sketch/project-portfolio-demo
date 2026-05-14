import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createSoftClosePointMaterial } from './closeDetailMaterials';

describe('close detail point materials', () => {
  it('uses a radial texture and transparency so nearby stars do not render as square blocks', () => {
    const texture = new THREE.Texture();
    const material = createSoftClosePointMaterial({
      texture,
      size: 0.04,
      opacity: 0.7,
      vertexColors: true,
    });

    expect(material.map).toBe(texture);
    expect(material.transparent).toBe(true);
    expect(material.alphaTest).toBeGreaterThan(0);
    expect(material.depthWrite).toBe(false);
    expect(material.sizeAttenuation).toBe(true);
    expect(material.userData.baseOpacity).toBe(0.7);
  });
});
