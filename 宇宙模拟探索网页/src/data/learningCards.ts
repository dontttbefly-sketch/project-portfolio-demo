import type { LearningCard } from '../types';

export const learningCards: LearningCard[] = [
  {
    id: 'realism-legend',
    title: '如何阅读真实度标签',
    summary: '本应用把数据分为实测、模型、艺术近似，避免把漂亮画面误认为逐点观测。',
    keyFacts: [
      '实测：来自真实目录或观测对象的精选锚点。',
      '模型：银河结构、旋臂和核球的教学近似。',
      '艺术近似：为了沉浸感和可读性加入的云雾、尘埃和发光效果。',
    ],
    source: {
      label: 'ESA Gaia DR3',
      url: 'https://www.cosmos.esa.int/web/gaia/dr3',
    },
    relatedObjectIds: ['sun', 'galactic-center'],
    relatedLayerIds: ['measured-stars', 'thin-disk', 'thick-disk', 'dust-lanes'],
  },
  {
    id: 'scale-card',
    title: '尺度为什么被压缩',
    summary: '银河系直径约十万光年，太阳附近天体又相距很近；网页中必须使用非线性尺度才能同时看见两者。',
    keyFacts: [
      '场景坐标保留相对方向，但远距离会被压缩。',
      '可点选光点是标记层，不代表恒星、星团或星云的真实大小。',
      '右侧面板显示真实半径或跨度，并标出远景是否仅为标记。',
    ],
    source: {
      label: 'NASA Milky Way overview',
      url: 'https://science.nasa.gov/universe/galaxies/',
    },
    relatedObjectIds: ['sun', 'galactic-center'],
    relatedLayerIds: ['thin-disk', 'major-spiral-arms', 'minor-spiral-arms'],
  },
  {
    id: 'not-a-photo',
    title: '这不是银河系外部照片',
    summary: '没有航天器飞到银河系外给它拍全景；完整外观来自 Gaia、红外/射电巡天和计算模型。',
    keyFacts: [
      '俯视银河图是基于恒星位置、运动、尘埃和气体观测重建的模型。',
      '主/次旋臂、中央棒、薄盘/厚盘和恒星晕都应作为模型阅读。',
      '界面中的真实度标签会区分实测锚点、结构模型和艺术近似。',
    ],
    source: {
      label: 'ESA Gaia top-down Milky Way',
      url: 'https://www.esa.int/ESA_Multimedia/Images/2023/12/Top-down_view_of_the_Milky_Way',
    },
    relatedObjectIds: ['galactic-center', 'scutum-centaurus-arm', 'stellar-halo-component'],
    relatedLayerIds: ['central-bar', 'major-spiral-arms', 'stellar-halo', 'globular-clusters'],
  },
  {
    id: 'halo-card',
    title: '银河不只是一个扁盘',
    summary: '薄盘和厚盘之外还有稀疏恒星晕，球状星团是理解银河外层结构的重要可见示踪。',
    keyFacts: [
      '恒星晕大致包围盘和核球，密度远低于盘面。',
      '球状星团是古老致密的恒星系统，常分布在盘外晕中。',
      '暗物质晕更大但不可见，本应用只在说明中提及。',
    ],
    source: {
      label: 'NASA globular clusters around the Milky Way',
      url: 'https://science.nasa.gov/asset/hubble/globular-clusters-around-milky-way/',
    },
    relatedObjectIds: ['omega-centauri', 'm13', 'stellar-halo-component'],
    relatedLayerIds: ['stellar-halo', 'globular-clusters'],
  },
];
