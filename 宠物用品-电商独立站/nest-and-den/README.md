# NEST & DEN — Shopify Theme

> Quiet Luxury 宠物品牌 Shopify Liquid 主题。面向北美市场（US/CA），覆盖猫狗全品类（粮、玩具、衣服、窝），主打**家居日常 / 舒适 / 品质**。

---

## 1. 你拿到了什么

```
nest-and-den/
├── layout/theme.liquid                  HTML 骨架，preconnect / fonts / meta
├── templates/
│   ├── index.json                       首页（hero + trust + split + featured + essay + materials + press + ugc）
│   ├── product.json                     PDP（gallery + info + essay + reviews + recommendations）
│   ├── collection.json                  集合页（banner + filterable grid）
│   ├── page.json + page.about.json     About 与通用 page
│   ├── cart.json                        购物车
│   └── 404.json                         404
├── sections/
│   ├── header.liquid + footer.liquid + header-group.json + footer-group.json
│   ├── hero-editorial / trust-strip / split-collections / featured-products
│   ├── brand-essay / materials-craft / press-logos / ugc-grid / newsletter
│   ├── main-product / product-essay / reviews / product-recommendations
│   ├── collection-banner / main-collection
│   ├── about-hero / about-story / about-values
│   └── main-cart / main-404 / main-page / breadcrumb
├── snippets/
│   ├── product-card / price / variant-picker / payment-icons / trust-badge / meta / stars
│   └── icon-* (search, account, bag, menu, close, plus, truck, leaf, shield, sparkle, paw, return, star, arrow-right)
├── assets/
│   ├── theme.css                        全部样式（设计令牌 + 组件，~1500 行）
│   ├── theme.js                         极少 JS（无框架）
│   └── fonts.css                        字体引入
├── config/
│   ├── settings_schema.json             后台设置（颜色、字体、announcement、社交）
│   └── settings_data.json               默认值
└── locales/en.default.json              英文 UI 文案
```

所有 sections 都暴露 `{% schema %}`，可在 Shopify 后台 customizer 里自由编辑、增减 blocks。

---

## 2. 本地预览（最快）

需要 [Shopify CLI](https://shopify.dev/docs/themes/tools/cli/install)（`brew tap shopify/shopify && brew install shopify-cli`）和一个 [Partner Dev Store](https://partners.shopify.com/)（免费）。

```bash
cd nest-and-den

# 第一次：登录到 dev store
shopify theme dev --store=your-dev-store.myshopify.com

# 后续直接运行
shopify theme dev
```

CLI 会启动一个 `http://127.0.0.1:9292` 的本地预览，并把改动实时同步到 dev store。

> 没有 dev store 也想看：因为模板里所有 image / 价格 / 产品都有 **占位回退**（Unsplash + 文案 fallback），首页/集合页/PDP 即使在一个完全空的 dev store 上也能显示完整页面。

---

## 3. 上线一个生产 store

```bash
# 在生产 store 推一个 unpublished 主题
shopify theme push --store=nestandden.myshopify.com --unpublished

# 之后在 Shopify 后台 → Online Store → Themes → Customize 调整内容
# 在每个 section 的右栏修改文案、上传图片、链接 collection / product
# 满意后点 "Publish"
```

最低必要后台动作：

1. **Online Store → Navigation** 创建 `main-menu`，包含 Cats / Dogs / The Daily / Journal / About。
2. **Products → Collections** 创建 `cats`、`dogs`、`the-daily`，按计划文档表格添加 12 个 SKU（也可先用 Shopify "Add sample products" 测试）。
3. **Settings → Markets** 配置 US/CA 市场，开启 USD（默认）。
4. **Settings → Payments** 启用 Shop Pay / Apple Pay / Google Pay / PayPal / Klarna。
5. **Settings → Shipping** 添加 "Free U.S. shipping over $75" 规则。
6. **Apps**（可选）：装 [Shopify Subscriptions](https://apps.shopify.com/subscriptions-app) 给粮类做 Subscribe & Save；装 Judge.me / Loox 接管真实评论。

---

## 4. 设计系统（一目了然）

| Token | Hex | 用途 |
|---|---|---|
| Bone | `#F4EFE6` | 主背景 |
| Cream | `#EDE5D6` | 次背景 |
| Linen | `#DCD2BD` | 分割线 |
| Ink | `#2A2724` | 文字、按钮 |
| Ink-Soft | `#5A554F` | 副文字 |
| Moss | `#3F4A3C` | 猫品类强调 |
| Russet | `#9C5A3C` | 狗品类强调 |
| Bark | `#6B4A38` | hover |

字体：**Cormorant Garamond**（Display）+ **Inter**（Body），通过 Google Fonts CDN 引入。上线前建议自托管 woff2 减少首屏阻塞。

色值在 `config/settings_schema.json` 暴露给 customizer，但**强烈建议保持默认** —— 这是品牌克制感的根。

---

## 5. 北美用户购买意愿的关键设计

在每条用户决策路径上重复信任元素：

| 接触点 | 信任元素 |
|---|---|
| 顶部 announcement bar | "Free U.S. shipping over $75 · 60-day returns" |
| 首页 trust strip（hero 下方） | 4 列：shipping / vet / heirloom / returns |
| PDP 价格下方 | "or 4 interest-free payments of $X with Klarna" |
| PDP ATC 上方 | "Subscribe & Save 15%" toggle |
| PDP ATC 下方 | trust mini-strip（free ship · 60-day return · cats & dogs） |
| PDP 库存少时 | "Only X left in [color]" — 仅 < 10 时出现 |
| 评论区 | "4.9 · 2,418 verified reviews"  |
| Footer | 7 个主流支付 logo + 政策链接 |

---

## 6. 验证清单

```bash
shopify theme check          # 主题代码静态检查（应该 0 error）
shopify theme dev            # 本地预览
```

手测：

- [ ] 首页桌面（≥1024px）/ 平板（768px）/ 手机（375px）都不破版
- [ ] PDP 切换 variant 时，URL、价格、库存、主图都同步（接入真实产品后）
- [ ] 移动端滚出主 ATC 后，底部 sticky ATC 出现
- [ ] 集合页用 `?type=Bed` 等链接参数过滤生效
- [ ] 任意页 Lighthouse Performance ≥ 90，Accessibility ≥ 95
- [ ] 全站无纯黑（`#000`）和纯白（`#FFF`）—— Quiet Luxury 的克制

---

## 7. 占位图归属

所有占位图来自 [Unsplash](https://unsplash.com)，遵循 Unsplash License。Production 上线前替换为品牌摄影。

---

## 8. 边界（不做的事）

- 不做多语言（北美 EN only）
- 不内置订阅 / Bundle 逻辑（用 Shopify Apps）
- 不做支付集成（Shopify 后台开通即可）
- 不引入 React / Vue / 任何前端框架
- 不做花哨动效 —— Quiet Luxury 不靠特效
