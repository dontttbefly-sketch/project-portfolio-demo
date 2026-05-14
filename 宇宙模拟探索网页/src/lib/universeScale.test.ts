import { describe, expect, it } from 'vitest';
import { cameraPresets } from '../data/cameraPresets';
import { initialGalaxyLayers } from '../data/layers';
import { generateGalaxyLayerPoints } from './galaxyGenerator';

describe('observable-universe scale model', () => {
  it('adds real-scale universe layers beyond the Milky Way', () => {
    expect(initialGalaxyLayers.map((layer) => layer.id)).toEqual(
      expect.arrayContaining(['local-group', 'cosmic-web', 'observable-universe-horizon']),
    );

    expect(initialGalaxyLayers.find((layer) => layer.id === 'observable-universe-horizon')?.description).toContain(
      '930 亿光年',
    );
  });

  it('has a camera preset for the observable-universe scale', () => {
    const preset = cameraPresets.find((item) => item.id === 'observable-universe');

    expect(preset?.name).toBe('可观测宇宙');
    expect(preset?.position[1]).toBeGreaterThan(100);
  });

  it('generates cosmic structures as soft round point layers inside the visible scene', () => {
    const layer = initialGalaxyLayers.find((item) => item.id === 'cosmic-web');
    expect(layer).toBeDefined();

    const generated = generateGalaxyLayerPoints(layer!, 64);
    const xs = generated.positions.filter((_, index) => index % 3 === 0);
    const maxAbsX = Math.max(...xs.map((value) => Math.abs(value)));

    expect(generated.count).toBe(64);
    expect(maxAbsX).toBeLessThan(120);
    expect(generated.sizes.every((size) => size > 0)).toBe(true);
  });
});
