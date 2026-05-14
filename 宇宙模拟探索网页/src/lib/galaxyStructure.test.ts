import { describe, expect, it } from 'vitest';
import { catalogObjects } from '../data/catalog';
import { initialGalaxyLayers } from '../data/layers';
import {
  galaxyComponentModels,
  galaxySpiralArms,
  getGalaxyComponentModel,
  majorSpiralArms,
  minorSpiralArms,
} from '../data/galaxyStructure';
import { generateGalaxyLayerPoints } from './galaxyGenerator';
import { searchCatalog } from './catalog';

function zExtent(layerId: string): number {
  const layer = initialGalaxyLayers.find((item) => item.id === layerId);
  expect(layer).toBeDefined();
  const generated = generateGalaxyLayerPoints(layer!, 1200);
  const yValues = generated.positions.filter((_, index) => index % 3 === 1);
  return Math.max(...yValues) - Math.min(...yValues);
}

function radialExtent(layerId: string): number {
  const layer = initialGalaxyLayers.find((item) => item.id === layerId);
  expect(layer).toBeDefined();
  const generated = generateGalaxyLayerPoints(layer!, 1200);
  let maxRadius = 0;

  for (let index = 0; index < generated.positions.length; index += 3) {
    const x = generated.positions[index];
    const z = generated.positions[index + 2];
    maxRadius = Math.max(maxRadius, Math.sqrt(x * x + z * z));
  }

  return maxRadius;
}

describe('complete visible Milky Way structure model', () => {
  it('defines the required visible galaxy components with sources and render styles', () => {
    const requiredComponents = [
      'thin-disk',
      'thick-disk',
      'central-bar',
      'central-bulge',
      'major-spiral-arms',
      'minor-spiral-arms',
      'orion-spur-layer',
      'dust-lanes',
      'nebulae',
      'stellar-halo',
      'globular-clusters',
    ];

    expect(galaxyComponentModels.map((component) => component.id)).toEqual(requiredComponents);

    for (const component of galaxyComponentModels) {
      expect(component.sources.length).toBeGreaterThan(0);
      expect(component.particleCount).toBeGreaterThan(0);
      expect(component.radiusRangeKly[1]).toBeGreaterThan(component.radiusRangeKly[0]);
      expect(component.density).toBeGreaterThan(0);
    }

    expect(initialGalaxyLayers.every((layer) => Boolean(layer.renderStyle))).toBe(true);
  });

  it('models named major, minor, and local spiral arms with stronger major arms', () => {
    expect(majorSpiralArms.map((arm) => arm.name)).toEqual(['Scutum-Centaurus Arm', 'Perseus Arm']);
    expect(minorSpiralArms.map((arm) => arm.name)).toEqual(['Sagittarius Arm', 'Norma Arm']);
    expect(galaxySpiralArms.find((arm) => arm.id === 'orion-spur')?.role).toBe('local');
    expect(majorSpiralArms.every((arm) => arm.sweepRad > Math.PI * 0.7 && arm.sweepRad < Math.PI * 1.2)).toBe(true);
    expect(minorSpiralArms.every((arm) => arm.sweepRad > Math.PI * 0.45 && arm.sweepRad < Math.PI)).toBe(true);
    expect(galaxySpiralArms.find((arm) => arm.id === 'orion-spur')?.sweepRad).toBeLessThan(Math.PI * 0.25);

    const averageMajorStrength =
      majorSpiralArms.reduce((sum, arm) => sum + arm.strength, 0) / majorSpiralArms.length;
    const averageMinorStrength =
      minorSpiralArms.reduce((sum, arm) => sum + arm.strength, 0) / minorSpiralArms.length;

    expect(averageMajorStrength).toBeGreaterThan(averageMinorStrength);
  });

  it('generates a thicker thick disk and a larger stellar halo than the disk', () => {
    expect(zExtent('thick-disk')).toBeGreaterThan(zExtent('thin-disk') * 1.8);
    expect(radialExtent('stellar-halo')).toBeGreaterThan(radialExtent('thin-disk'));
  });

  it('keeps globular clusters outside the main disk as sparse halo tracers', () => {
    const layer = initialGalaxyLayers.find((item) => item.id === 'globular-clusters');
    expect(layer).toBeDefined();
    const generated = generateGalaxyLayerPoints(layer!, 160);
    const haloComponent = getGalaxyComponentModel('globular-clusters');
    expect(haloComponent?.renderStyle).toBe('globular-cluster');

    const offPlaneCount = generated.positions.filter((_, index) => index % 3 === 1 && Math.abs(generated.positions[index]) > 3)
      .length;
    expect(offPlaneCount).toBeGreaterThan(generated.count * 0.3);
  });

  it('adds searchable anchors for complete structure learning', () => {
    expect(searchCatalog(catalogObjects, 'globular')[0]?.type).toBe('globular-cluster');
    expect(searchCatalog(catalogObjects, '厚盘')[0]?.id).toBe('thick-disk-component');
    expect(searchCatalog(catalogObjects, 'Scutum')[0]?.id).toBe('scutum-centaurus-arm');
  });
});
