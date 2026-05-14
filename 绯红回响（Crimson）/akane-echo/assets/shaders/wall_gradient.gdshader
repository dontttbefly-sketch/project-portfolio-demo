shader_type spatial;
render_mode unshaded;

// 墙壁顶 / 底渐变（视觉抛光，让墙体有"光从上方打下来"的立体感）
// 不依赖场景光照（保持 Unshaded 风格统一），仅在材质内部插值

uniform vec3 top_color    : source_color = vec3(0.20, 0.20, 0.24);
uniform vec3 bottom_color : source_color = vec3(0.04, 0.04, 0.05);
uniform float wall_height = 2.0;

varying float world_y;

void vertex() {
    // 把 vertex 从 model space 变到 world space，取 Y
    world_y = (MODEL_MATRIX * vec4(VERTEX, 1.0)).y;
}

void fragment() {
    float t = clamp(world_y / wall_height, 0.0, 1.0);
    ALBEDO = mix(bottom_color, top_color, t);
}
