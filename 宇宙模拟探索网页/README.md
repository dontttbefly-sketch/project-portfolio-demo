# 银河系真实 3D 探索

一个基于 Vite、React、TypeScript 和 Three.js 的沉浸式银河系学习网页。

## 运行

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/`。

## 功能

- 全屏 3D 银河场景：银河盘、中央核球、旋臂、尘埃暗带、星云提示。
- 精选真实/可信天体锚点：太阳、银心、Sagittarius A*、猎户臂、参宿四、昴星团等。
- 自由探索交互：鼠标拖拽旋转、滚轮缩放、WASD/QE 平移。
- 学习面板：中文说明、银河坐标、关键事实、来源链接。
- 真实度标签：实测、模型、艺术近似。

## 数据边界

第一版不是完整 Gaia 星表浏览器，也不是严格 N-body 物理模拟。它采用精选真实数据作为可点选学习锚点，并用程序化模型补齐银河系整体结构和沉浸视觉。

主要参考：

- [ESA Gaia DR3](https://www.cosmos.esa.int/web/gaia/dr3)
- [ESA Guide to our galaxy](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Guide_to_our_galaxy)
- [NASA Milky Way overview](https://science.nasa.gov/universe/galaxies/)

## 验证

```bash
npm test
npm run build
```
