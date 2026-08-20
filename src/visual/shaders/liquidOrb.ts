/**
 * Simplex 3D noise — Ashima Arts / Ian McEwan (webgl-noise), public domain.
 * https://github.com/ashima/webgl-noise
 */
const SIMPLEX_NOISE_3D = /* glsl */ `
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`

export const liquidOrbVertexShader = /* glsl */ `
${SIMPLEX_NOISE_3D}

uniform float uTime;
uniform float uDistortion;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying float vNoise;

void main() {
  float n = snoise(position * 1.65 + vec3(0.0, uTime * 0.32, uTime * 0.18));
  vNoise = n;
  vec3 displaced = position + normal * n * uDistortion * 0.42;

  vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

export const liquidOrbFragmentShader = /* glsl */ `
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform float uOpacity;
uniform float uGlowIntensity;
uniform float uTime;
uniform float uPitch;
uniform float uVolume;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying float vNoise;

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.35);

  float drift = sin(uTime * 0.45) * 0.12;
  float mixFactor = clamp(0.5 + (uPitch - 0.5) * 0.55 + drift + vNoise * 0.12, 0.0, 1.0);
  vec3 base = mix(uPrimaryColor, uSecondaryColor, mixFactor);

  float glow = fresnel * uGlowIntensity * (0.65 + uVolume * 0.25);
  vec3 color = base + base * glow * 0.85 + vec3(0.55, 0.62, 1.0) * glow * 0.18;

  float alpha = uOpacity * (0.42 + fresnel * 0.48 + uVolume * 0.08);
  gl_FragColor = vec4(color, clamp(alpha, 0.08, 1.0));
}
`
