shader_type canvas_item;

// 屏幕去色但保留红色 — 凝时斩招牌效果
// 策划案 §4.3：「画面去色至灰白，仅红色仍在」
//
// 实现：
//   - 计算每像素的"红度"：R 分量超过 G/B 的程度
//   - 把整张图按 effect_strength 混到灰度
//   - 在红度高的区域恢复原色
//
// effect_strength = 0  → 完全无效果（穿透原画面）
// effect_strength = 1  → 红色保留，其余去色

uniform float effect_strength : hint_range(0.0, 1.0) = 0.0;
uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_linear_mipmap;

void fragment() {
    vec4 c = texture(screen_texture, SCREEN_UV);

    // ITU-R BT.601 灰度系数
    float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec3 grayed = vec3(gray);

    // 红度：R 超过 G/B 较大值的程度（0~1，越红越大）
    float r_dom = clamp(c.r - max(c.g, c.b) * 0.7, 0.0, 1.0);
    r_dom = pow(r_dom, 0.5); // 抬高低红度区域的保留权重

    // 先按强度去色
    vec3 desat = mix(c.rgb, grayed, effect_strength);
    // 再按红度把"足够红"的像素拉回原色
    vec3 final = mix(desat, c.rgb, r_dom * effect_strength);

    COLOR = vec4(final, 1.0);
}
