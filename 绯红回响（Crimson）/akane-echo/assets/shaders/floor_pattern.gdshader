shader_type spatial;
render_mode unshaded;

// 地板棋盘格 + 微弱噪点（让玩家移动时能感知"我在动"）
// 用世界坐标算棋盘格 → 不论房间尺寸，每格都是 cell_size 米

uniform vec3 base_color  : source_color = vec3(0.42, 0.46, 0.52);
uniform vec3 grid_color  : source_color = vec3(0.36, 0.40, 0.45);
uniform float cell_size  = 2.0;
uniform float noise_amount = 0.05;

varying vec3 world_pos;

void vertex() {
    world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void fragment() {
    vec2 wp = world_pos.xz / cell_size;
    // 棋盘格：相邻格子交替
    float chess = mod(floor(wp.x) + floor(wp.y), 2.0);
    vec3 col = mix(base_color, grid_color, chess * 0.5);
    // 微弱噪点：让纯色块看起来不死板
    float n = (hash(floor(wp * 4.0)) - 0.5) * noise_amount;
    col += vec3(n);
    ALBEDO = col;
}
