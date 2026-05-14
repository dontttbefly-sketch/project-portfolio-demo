import type { CelestialScaleProfile, SourceReference } from '../types';
import {
  esaAnatomySource,
  esaTopDownMilkyWaySource,
  gaiaMilkyWaySource,
  nasaGlobularHaloSource,
  nasaMilkyWayStructureSource,
} from './galaxyStructure';

const gaiaDr3Source: SourceReference = {
  label: 'ESA Gaia DR3',
  url: 'https://www.cosmos.esa.int/web/gaia/dr3',
};

const esaGalaxyGuideSource: SourceReference = {
  label: 'ESA Guide to our galaxy',
  url: 'https://www.esa.int/Science_Exploration/Space_Science/Gaia/Guide_to_our_galaxy',
};

const nasaMilkyWayOverviewSource: SourceReference = {
  label: 'NASA Milky Way overview',
  url: 'https://science.nasa.gov/universe/galaxies/',
};

const nasaSunFactsSource: SourceReference = {
  label: 'NASA Sun facts',
  url: 'https://science.nasa.gov/sun/facts/',
};

export const celestialScaleProfiles: CelestialScaleProfile[] = [
  {
    objectId: 'galactic-center',
    scaleKind: 'galaxy-structure-span',
    trueDiameterLy: 10000,
    uncertaintyLabel: '模型尺度；银心、核球和中央棒边界没有硬切线。',
    renderableAtGalaxyScale: true,
    markerOnlyAtGalaxyScale: false,
    scaleSources: [esaAnatomySource, esaGalaxyGuideSource],
  },
  {
    objectId: 'sagittarius-a-star',
    scaleKind: 'black-hole-location',
    uncertaintyLabel: '可见光模式下只记录位置；不把事件视界或吸积结构画成可见实体。',
    renderableAtGalaxyScale: false,
    markerOnlyAtGalaxyScale: true,
    scaleSources: [nasaMilkyWayOverviewSource, esaGalaxyGuideSource],
  },
  {
    objectId: 'sun',
    scaleKind: 'stellar-radius',
    trueRadiusKm: 695700,
    uncertaintyLabel: '太阳半径为常用平均值；远景光点只表示太阳位置。',
    renderableAtGalaxyScale: false,
    markerOnlyAtGalaxyScale: true,
    scaleSources: [nasaSunFactsSource, gaiaDr3Source],
  },
  {
    objectId: 'orion-spur',
    scaleKind: 'galaxy-structure-span',
    trueDiameterLy: 10000,
    uncertaintyLabel: '本地臂边界依赖观测模型，长度和宽度不是硬边。',
    renderableAtGalaxyScale: true,
    markerOnlyAtGalaxyScale: false,
    scaleSources: [nasaMilkyWayStructureSource, esaTopDownMilkyWaySource],
  },
  {
    objectId: 'scutum-centaurus-arm',
    scaleKind: 'galaxy-structure-span',
    trueDiameterLy: 60000,
    uncertaintyLabel: '主旋臂跨度来自结构模型，远端受尘埃遮挡和定义影响。',
    renderableAtGalaxyScale: true,
    markerOnlyAtGalaxyScale: false,
    scaleSources: [nasaMilkyWayStructureSource, esaTopDownMilkyWaySource],
  },
  {
    objectId: 'perseus-arm',
    scaleKind: 'galaxy-structure-span',
    trueDiameterLy: 60000,
    uncertaintyLabel: '英仙臂完整形状为观测推断模型，边界为密度增强区。',
    renderableAtGalaxyScale: true,
    markerOnlyAtGalaxyScale: false,
    scaleSources: [nasaMilkyWayStructureSource, esaTopDownMilkyWaySource],
  },
  {
    objectId: 'sagittarius-arm',
    scaleKind: 'galaxy-structure-span',
    trueDiameterLy: 50000,
    uncertaintyLabel: '人马臂尺度为近似跨度；旋臂不是实体边缘。',
    renderableAtGalaxyScale: true,
    markerOnlyAtGalaxyScale: false,
    scaleSources: [nasaMilkyWayStructureSource, esaGalaxyGuideSource],
  },
  {
    objectId: 'norma-arm',
    scaleKind: 'galaxy-structure-span',
    trueDiameterLy: 40000,
    uncertaintyLabel: '内侧次旋臂受尘埃遮挡更强，尺度为模型近似。',
    renderableAtGalaxyScale: true,
    markerOnlyAtGalaxyScale: false,
    scaleSources: [nasaMilkyWayStructureSource, esaTopDownMilkyWaySource],
  },
  {
    objectId: 'thin-disk-component',
    scaleKind: 'galaxy-structure-span',
    trueDiameterLy: 100000,
    uncertaintyLabel: '薄盘直径为十万光年量级近似；盘面没有硬边。',
    renderableAtGalaxyScale: true,
    markerOnlyAtGalaxyScale: false,
    scaleSources: [esaAnatomySource, gaiaMilkyWaySource],
  },
  {
    objectId: 'thick-disk-component',
    scaleKind: 'galaxy-structure-span',
    trueDiameterLy: 100000,
    uncertaintyLabel: '厚盘水平跨度接近薄盘，垂直厚度和边界依赖模型定义。',
    renderableAtGalaxyScale: true,
    markerOnlyAtGalaxyScale: false,
    scaleSources: [esaAnatomySource],
  },
  {
    objectId: 'stellar-halo-component',
    scaleKind: 'galaxy-structure-span',
    trueDiameterLy: 200000,
    uncertaintyLabel: '恒星晕可延伸到十万光年量级，低密度外缘没有清晰边界。',
    renderableAtGalaxyScale: true,
    markerOnlyAtGalaxyScale: false,
    scaleSources: [esaAnatomySource, nasaGlobularHaloSource],
  },
  {
    objectId: 'omega-centauri',
    scaleKind: 'cluster-diameter',
    trueDiameterLy: 150,
    uncertaintyLabel: '球状星团直径为近似可见跨度；外层成员边界逐渐变稀。',
    renderableAtGalaxyScale: false,
    markerOnlyAtGalaxyScale: true,
    scaleSources: [nasaGlobularHaloSource, gaiaDr3Source],
  },
  {
    objectId: 'm13',
    scaleKind: 'cluster-diameter',
    trueDiameterLy: 145,
    uncertaintyLabel: '球状星团跨度为近似值，成员外晕没有硬边。',
    renderableAtGalaxyScale: false,
    markerOnlyAtGalaxyScale: true,
    scaleSources: [nasaGlobularHaloSource, gaiaDr3Source],
  },
  {
    objectId: 'betelgeuse',
    scaleKind: 'stellar-radius',
    trueRadiusKm: 530000000,
    uncertaintyLabel: '红超巨星半径随观测方法和脉动变化；这里用约数百倍太阳半径的可见光近似。',
    renderableAtGalaxyScale: false,
    markerOnlyAtGalaxyScale: true,
    scaleSources: [gaiaDr3Source],
  },
  {
    objectId: 'pleiades',
    scaleKind: 'cluster-diameter',
    trueDiameterLy: 13,
    uncertaintyLabel: '亮星核心约十余光年；完整低质量成员和潮汐范围更广。',
    renderableAtGalaxyScale: false,
    markerOnlyAtGalaxyScale: true,
    scaleSources: [gaiaDr3Source],
  },
  {
    objectId: 'carina-nebula',
    scaleKind: 'nebula-diameter',
    trueDiameterLy: 230,
    uncertaintyLabel: '星云可见跨度取决于波段、曝光和暗尘埃遮挡，数值为近似尺度。',
    renderableAtGalaxyScale: false,
    markerOnlyAtGalaxyScale: true,
    scaleSources: [nasaMilkyWayOverviewSource],
  },
];
