import type { GalaxyComponentModel, GalaxySpiralArmModel, SourceReference } from '../types';

export const gaiaMilkyWaySource: SourceReference = {
  label: 'ESA Gaia Milky Way model',
  url: 'https://www.cosmos.esa.int/web/gaia/milky-way',
};

export const esaTopDownMilkyWaySource: SourceReference = {
  label: 'ESA Gaia top-down Milky Way',
  url: 'https://www.esa.int/ESA_Multimedia/Images/2023/12/Top-down_view_of_the_Milky_Way',
};

export const esaAnatomySource: SourceReference = {
  label: 'ESA Anatomy of the Milky Way',
  url: 'https://sci.esa.int/web/gaia/-/58206-anatomy-of-the-milky-way',
};

export const nasaMilkyWayStructureSource: SourceReference = {
  label: 'NASA Milky Way structure',
  url: 'https://science.nasa.gov/resource/the-milky-way-galaxy/',
};

export const nasaGlobularHaloSource: SourceReference = {
  label: 'NASA globular clusters around the Milky Way',
  url: 'https://science.nasa.gov/asset/hubble/globular-clusters-around-milky-way/',
};

export const solarGalactocentricRadiusKly = 26.6;

export const galaxySpiralArms: GalaxySpiralArmModel[] = [
  {
    id: 'scutum-centaurus',
    name: 'Scutum-Centaurus Arm',
    role: 'major',
    startAngleRad: 0.46,
    pitch: 0.18,
    sweepRad: 2.78,
    radiusRangeKly: [5.5, 47],
    widthKly: 1.45,
    strength: 1,
    color: '#b9d8ff',
  },
  {
    id: 'perseus',
    name: 'Perseus Arm',
    role: 'major',
    startAngleRad: Math.PI + 0.5,
    pitch: 0.17,
    sweepRad: 2.92,
    radiusRangeKly: [6, 50],
    widthKly: 1.55,
    strength: 0.94,
    color: '#a8cfff',
  },
  {
    id: 'sagittarius',
    name: 'Sagittarius Arm',
    role: 'minor',
    startAngleRad: Math.PI / 2 + 0.16,
    pitch: 0.16,
    sweepRad: 2.05,
    radiusRangeKly: [7, 39],
    widthKly: 1.1,
    strength: 0.62,
    color: '#ffe3ba',
  },
  {
    id: 'norma',
    name: 'Norma Arm',
    role: 'minor',
    startAngleRad: -Math.PI / 2 - 0.28,
    pitch: 0.16,
    sweepRad: 1.9,
    radiusRangeKly: [4.8, 35],
    widthKly: 1.05,
    strength: 0.58,
    color: '#ffd0a1',
  },
  {
    id: 'orion-spur',
    name: 'Orion Spur',
    role: 'local',
    startAngleRad: -0.16,
    pitch: 0.08,
    sweepRad: 0.54,
    radiusRangeKly: [22, 31],
    widthKly: 0.9,
    strength: 0.72,
    color: '#8ad8ff',
  },
];

export const majorSpiralArms = galaxySpiralArms.filter((arm) => arm.role === 'major');
export const minorSpiralArms = galaxySpiralArms.filter((arm) => arm.role === 'minor');

export const galaxyComponentModels: GalaxyComponentModel[] = [
  {
    id: 'thin-disk',
    name: '银河薄盘',
    renderStyle: 'thin-disk',
    realism: 'model',
    particleCount: 22000,
    radiusRangeKly: [1.5, 52],
    thicknessKly: 0.7,
    density: 1,
    colorTemperature: [0.45, 0.92],
    sources: [esaAnatomySource, esaTopDownMilkyWaySource],
  },
  {
    id: 'thick-disk',
    name: '银河厚盘',
    renderStyle: 'thick-disk',
    realism: 'model',
    particleCount: 10500,
    radiusRangeKly: [3, 48],
    thicknessKly: 3,
    density: 0.42,
    colorTemperature: [0.18, 0.55],
    sources: [esaAnatomySource],
  },
  {
    id: 'central-bar',
    name: '中央棒',
    renderStyle: 'bulge',
    realism: 'model',
    particleCount: 8200,
    radiusRangeKly: [0, 10],
    thicknessKly: 2.2,
    density: 0.9,
    colorTemperature: [0.12, 0.42],
    sources: [esaAnatomySource, nasaMilkyWayStructureSource],
  },
  {
    id: 'central-bulge',
    name: '中央核球',
    renderStyle: 'bulge',
    realism: 'model',
    particleCount: 9000,
    radiusRangeKly: [0, 13],
    thicknessKly: 4.2,
    density: 1,
    colorTemperature: [0.14, 0.48],
    sources: [esaAnatomySource],
  },
  {
    id: 'major-spiral-arms',
    name: '主旋臂',
    renderStyle: 'spiral-arm',
    realism: 'model',
    particleCount: 11000,
    radiusRangeKly: [5.5, 50],
    thicknessKly: 0.85,
    density: 1,
    colorTemperature: [0.55, 0.96],
    sources: [nasaMilkyWayStructureSource, esaTopDownMilkyWaySource],
  },
  {
    id: 'minor-spiral-arms',
    name: '次旋臂',
    renderStyle: 'spiral-arm',
    realism: 'model',
    particleCount: 6200,
    radiusRangeKly: [4.8, 39],
    thicknessKly: 0.95,
    density: 0.58,
    colorTemperature: [0.4, 0.82],
    sources: [nasaMilkyWayStructureSource, esaTopDownMilkyWaySource],
  },
  {
    id: 'orion-spur-layer',
    name: '猎户臂 / 本地臂',
    renderStyle: 'spiral-arm',
    realism: 'model',
    particleCount: 2600,
    radiusRangeKly: [22, 31],
    thicknessKly: 0.55,
    density: 0.72,
    colorTemperature: [0.55, 0.96],
    sources: [nasaMilkyWayStructureSource],
  },
  {
    id: 'dust-lanes',
    name: '尘埃与气体暗带',
    renderStyle: 'dust',
    realism: 'artistic',
    particleCount: 6200,
    radiusRangeKly: [4, 43],
    thicknessKly: 0.35,
    density: 0.7,
    colorTemperature: [0.08, 0.24],
    sources: [esaAnatomySource],
  },
  {
    id: 'nebulae',
    name: '恒星形成区',
    renderStyle: 'nebula',
    realism: 'artistic',
    particleCount: 980,
    radiusRangeKly: [8, 38],
    thicknessKly: 0.9,
    density: 0.45,
    colorTemperature: [0.35, 0.9],
    sources: [nasaMilkyWayStructureSource],
  },
  {
    id: 'stellar-halo',
    name: '恒星晕',
    renderStyle: 'stellar-halo',
    realism: 'model',
    particleCount: 3600,
    radiusRangeKly: [18, 100],
    thicknessKly: 100,
    density: 0.18,
    colorTemperature: [0.12, 0.48],
    sources: [esaAnatomySource, nasaGlobularHaloSource],
  },
  {
    id: 'globular-clusters',
    name: '球状星团',
    renderStyle: 'globular-cluster',
    realism: 'measured',
    particleCount: 220,
    radiusRangeKly: [15, 95],
    thicknessKly: 85,
    density: 0.2,
    colorTemperature: [0.16, 0.52],
    sources: [nasaGlobularHaloSource],
  },
];

export function getGalaxyComponentModel(id: string): GalaxyComponentModel | undefined {
  return galaxyComponentModels.find((component) => component.id === id);
}
