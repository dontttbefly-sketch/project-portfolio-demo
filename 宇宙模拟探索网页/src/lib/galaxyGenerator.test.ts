import { describe, expect, it } from 'vitest';
import { initialGalaxyLayers } from '../data/layers';
import { generateGalaxyLayerPoints } from './galaxyGenerator';

describe('galaxy procedural layer generator', () => {
  it('generates deterministic point clouds for the same layer seed', () => {
    const layer = initialGalaxyLayers.find((item) => item.id === 'major-spiral-arms');
    expect(layer).toBeDefined();

    const first = generateGalaxyLayerPoints(layer!, 16);
    const second = generateGalaxyLayerPoints(layer!, 16);

    expect(first.positions).toEqual(second.positions);
    expect(first.colors).toEqual(second.colors);
    expect(first.realism).toBe('model');
  });

  it('honors an explicit performance particle count cap', () => {
    const layer = initialGalaxyLayers.find((item) => item.id === 'thin-disk');
    expect(layer).toBeDefined();

    const generated = generateGalaxyLayerPoints(layer!, 32);

    expect(generated.count).toBe(32);
    expect(generated.positions.length).toBe(32 * 3);
    expect(generated.colors.length).toBe(32 * 3);
  });

  it('emits shader attributes for soft circular particles', () => {
    const layer = initialGalaxyLayers.find((item) => item.id === 'nebulae');
    expect(layer).toBeDefined();

    const generated = generateGalaxyLayerPoints(layer!, 24);

    expect(generated.sizes.length).toBe(24);
    expect(generated.brightness.length).toBe(24);
    expect(generated.temperature.length).toBe(24);
    expect(generated.opacity.length).toBe(24);
    expect(Math.max(...generated.brightness)).toBeLessThanOrEqual(1.8);
    expect(Math.min(...generated.opacity)).toBeGreaterThanOrEqual(0.04);
  });

  it('keeps disk, arm, and bulge layers bright enough for readable astronomical structure', () => {
    const averages = Object.fromEntries(
      ['thin-disk', 'major-spiral-arms', 'central-bulge'].map((id) => {
        const layer = initialGalaxyLayers.find((item) => item.id === id);
        expect(layer).toBeDefined();
        const generated = generateGalaxyLayerPoints(layer!, 512);
        return [
          id,
          {
            brightness: average(generated.brightness),
            opacity: average(generated.opacity),
          },
        ];
      }),
    );

    expect(averages['thin-disk'].brightness).toBeGreaterThan(0.52);
    expect(averages['thin-disk'].opacity).toBeGreaterThan(0.32);
    expect(averages['major-spiral-arms'].brightness).toBeGreaterThan(0.66);
    expect(averages['major-spiral-arms'].opacity).toBeGreaterThan(0.34);
    expect(averages['central-bulge'].brightness).toBeGreaterThan(0.63);
    expect(averages['central-bulge'].opacity).toBeGreaterThan(0.3);
  });
});

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
