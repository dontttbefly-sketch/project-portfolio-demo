# NEST & DEN — Static Preview

Pure HTML/CSS/JS preview. **No build step, no Shopify, no server required.**

## 怎么看

直接双击 `index.html` 在浏览器打开。或：

```bash
# 推荐：起一个本地静态服务器（避免某些浏览器对 file:// 字体的限制）
cd preview
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000
```

## 包含的页面

| 文件 | 内容 |
|---|---|
| `index.html` | 首页：hero / trust / split / featured / essay / materials / press / ugc / newsletter |
| `product.html` | PDP：gallery / variant picker / ATC / accordion / reviews / recommendations |
| `collection.html` | 集合页：banner / 5 个 filter / 11 个产品 + 中插 editorial / pagination |
| `about.html` | 品牌页：hero / story / values / materials / press |
| `cart.html` | 购物车（演示态，2 个商品） |
| `404.html` | 404 |

## 资源

- `assets/theme.css` — 与 Shopify 主题完全一致的样式
- `assets/theme.js` — 同样的交互（reveal / 手风琴 / variant picker / sticky ATC / 数量步进），ATC 提交改为本地演示
- `assets/fonts.css` — Google Fonts CDN（Cormorant Garamond + Inter）

## 与 Shopify 主题的关系

`preview/` 是 `nest-and-den/` 的视觉镜像。要做样式改动时，**修改 `preview/assets/theme.css` 验证视觉，再同步回 `nest-and-den/assets/theme.css`**（两个文件保持一致即可）。

占位图来自 Unsplash CDN，需联网才能加载。
