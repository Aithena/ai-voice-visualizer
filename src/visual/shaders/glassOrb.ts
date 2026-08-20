const VALUE_NOISE = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  sum += vnoise(p) * amp;
  p = p * 2.07 + 13.7;
  amp *= 0.5;
  sum += vnoise(p) * amp;
  return sum;
}
`

export const glassOrbVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const glassOrbFragmentShader = /* glsl */ `
${VALUE_NOISE}

uniform float uTime;
uniform float uVolume;
uniform float uBass;
uniform float uTreble;
uniform float uPitch;
uniform float uSpeechActivity;
uniform vec3 uRimColor;
uniform vec3 uCoreColor;
uniform vec3 uHighlightColor;
uniform float uRimWidth;
uniform float uHighlightStrength;
uniform float uRefractionIntensity;
uniform float uOpacity;

varying vec2 vUv;

vec4 overlay(vec4 src, vec4 dst) {
  float a = src.a + dst.a * (1.0 - src.a);
  vec3 rgb = src.rgb * src.a + dst.rgb * dst.a * (1.0 - src.a);
  rgb /= max(a, 1e-4);
  return vec4(rgb, a);
}

vec3 ringGradient(vec2 p, float spin) {
  vec3 purple = mix(vec3(0.659, 0.333, 0.969), uCoreColor, 0.08);
  vec3 violet = vec3(0.545, 0.361, 0.965);
  vec3 magenta = mix(vec3(1.00, 0.22, 0.82), uRimColor, 0.55);
  vec3 pink = mix(vec3(1.00, 0.45, 0.73), uRimColor, 0.28);

  float split = dot(normalize(p + 1e-5), vec2(-0.52, 0.68));
  vec3 base = mix(magenta, mix(purple, violet, 0.35), smoothstep(-0.72, 0.72, split));
  base = mix(base, pink, smoothstep(0.15, 0.95, -split) * 0.35);

  float t = fract(atan(p.y, p.x) / 6.2831853 + spin);
  vec3 flow = mix(purple, magenta, 0.5 + 0.5 * sin(t * 6.2831853));
  flow = mix(flow, pink, smoothstep(0.55, 0.95, t));
  return mix(base, flow, 0.22);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float dist = length(p);
  float speech = clamp(uSpeechActivity, 0.0, 2.0);

  float deform = (fbm(vec3(p * 3.2, uTime * 0.12)) - 0.5) * (0.012 + uRefractionIntensity * 0.02 + speech * 0.015);
  float R = 0.58 * (1.0 + deform + uBass * 0.02);
  float ringWidth = mix(0.105, 0.20, clamp((uRimWidth - 0.2) / 1.3, 0.0, 1.0));
  float ringInner = R - ringWidth;
  float glassR = ringInner * 0.985;

  float spin = uTime * (0.055 + speech * 0.08) + (uPitch - 0.5) * 0.12;
  vec3 ringCol = ringGradient(p, spin);
  ringCol = mix(ringCol, vec3(1.0), uTreble * 0.12);

  vec2 shadowP = p + vec2(0.0, 0.36);
  float shadowA = smoothstep(0.70, 0.08, length(shadowP * vec2(0.80, 1.75))) * 0.28 * uOpacity;
  vec4 acc = vec4(vec3(0.62, 0.42, 0.80), shadowA);

  float halo = exp(-pow(max(dist - R, 0.0) * 6.4, 2.0));
  halo *= 1.0 - smoothstep(R + 0.10, R + 0.24, dist);
  halo *= 0.62 + uBass * 0.10;
  acc = overlay(vec4(ringCol, halo * 0.70 * uOpacity), acc);

  float ring = smoothstep(ringInner - 0.004, ringInner + 0.010, dist);
  ring *= 1.0 - smoothstep(R - 0.012, R + 0.018, dist);
  acc = overlay(vec4(ringCol * 1.08, ring * 0.98 * uOpacity), acc);

  float glass = 1.0 - smoothstep(glassR * 0.988, glassR * 1.008, dist);
  float nd = dist / max(glassR, 1e-4);
  float z = sqrt(max(1.0 - nd * nd, 0.0));
  vec3 N = normalize(vec3(p / max(glassR, 1e-4), z));

  vec3 glassCol = mix(vec3(0.97, 0.96, 1.0), uCoreColor, 0.16);
  glassCol = mix(glassCol, vec3(0.94, 0.92, 0.99), smoothstep(0.35, 1.0, nd) * 0.35);

  float shade = smoothstep(0.0, 0.95, dot(p / max(glassR, 1e-4), vec2(0.42, -0.50)));
  glassCol = mix(glassCol, mix(uCoreColor, vec3(0.80, 0.74, 0.90), 0.45), shade * 0.38);

  float edgeBleed = pow(clamp(nd, 0.0, 1.0), 4.2);
  glassCol = mix(glassCol, ringCol, edgeBleed * mix(0.22, 0.48, uRefractionIntensity));

  vec2 hl = p - vec2(-0.30, 0.34) * glassR;
  hl.x *= 1.18;
  float highlight = exp(-dot(hl, hl) * (26.0 / max(glassR * glassR, 1e-4)));
  highlight *= glass * uHighlightStrength;
  glassCol = mix(glassCol, mix(vec3(1.0), uHighlightColor, 0.12), highlight * 0.92);

  float fill = pow(max(dot(N, normalize(vec3(-0.35, 0.48, 0.80))), 0.0), 1.6);
  glassCol = mix(glassCol, vec3(1.0), fill * 0.10 * uHighlightStrength);

  float glassA = glass * mix(0.90, 0.98, uOpacity);
  acc = overlay(vec4(glassCol, glassA), acc);

  float spec = pow(max(dot(N, normalize(vec3(-0.28, 0.42, 0.86))), 0.0), 56.0);
  acc.rgb += vec3(1.0) * spec * glass * 0.22 * uHighlightStrength;

  if (acc.a < 0.004) {
    discard;
  }

  gl_FragColor = vec4(acc.rgb, clamp(acc.a, 0.0, 1.0));
}
`
