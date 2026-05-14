shader_type spatial;

// 角色脚下椭圆阴影
// - 永远 unshaded（独立于场景光照）
// - 不写深度（避免遮挡其他物件）
// - 双面（cull_disabled）防止某些角度看不见
// - alpha 混合，中心深、边缘软衰减
render_mode unshaded, depth_draw_never, cull_disabled, blend_mix;

uniform float center_alpha = 0.45;
uniform float edge_softness = 0.30;  // 越大越软（0=硬边，1=极软）

void fragment() {
    // UV 中心 (0.5, 0.5)，到中心的距离归一化到 [0, 1]（平面边缘=1）
    vec2 d = UV - vec2(0.5);
    float dist = length(d) * 2.0;

    // smoothstep(1.0, 1.0-softness, dist) 在边缘附近从 1 → 0
    float a = smoothstep(1.0, 1.0 - edge_softness, dist) * center_alpha;

    ALBEDO = vec3(0.0);
    ALPHA = a;
}
