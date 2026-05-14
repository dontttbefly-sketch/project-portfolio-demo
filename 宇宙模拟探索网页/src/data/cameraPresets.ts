import type { CameraPreset } from '../types';

export const cameraPresets: CameraPreset[] = [
  {
    id: 'solar-neighborhood',
    name: '太阳位置',
    description: '从太阳所在区域观察本地臂。',
    position: [21, 9, 12],
    target: [14, 0, 0],
  },
  {
    id: 'galactic-center',
    name: '中央棒核',
    description: '靠近银河中心和中央核球。',
    position: [6, 8, 11],
    target: [0, 0, 0],
  },
  {
    id: 'top-down',
    name: '完整俯视',
    description: '从银河北方向下看中央棒、主/次旋臂和猎户臂。',
    position: [0, 76, 0.1],
    target: [0, 0, 0],
  },
  {
    id: 'edge-on',
    name: '边缘侧视',
    description: '观察薄盘、厚盘、核球和稀疏恒星晕。',
    position: [0, 8, 64],
    target: [0, 0, 0],
  },
  {
    id: 'stellar-halo',
    name: '恒星晕',
    description: '拉远观察包围盘面的稀疏老恒星晕。',
    position: [44, 42, 58],
    target: [0, 0, 0],
  },
  {
    id: 'globular-clusters',
    name: '球状星团',
    description: '观察盘外球状星团如何示踪银河晕。',
    position: [32, 28, 48],
    target: [7, 4, 8],
  },
  {
    id: 'orion-spur',
    name: '猎户臂',
    description: '查看太阳所在的局部旋臂环境。',
    position: [17, 8, 7],
    target: [13, 0.8, 0],
  },
  {
    id: 'observable-universe',
    name: '可观测宇宙',
    description: '把银河、本星系群、宇宙网和可观测边界放进同一压缩尺度。',
    position: [0, 190, 0.1],
    target: [0, 0, 0],
  },
];
