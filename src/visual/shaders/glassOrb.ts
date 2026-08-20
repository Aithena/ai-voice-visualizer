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
  float amp = 0.55;
  sum += vnoise(p) * amp;
  p = p * 2.03 + 17.2;
  amp *= 0.5;
  sum += vnoise(p) * amp;
  return sum;
}
`

export const glassOrbVertexShader = /* glsl */ `
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

void main() {
  float deform = sin(uTime * 0.5 + position.y * 2.0) * 0.015;
  vec3 pos = position + normal * deform;

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);

  vec4 mvPosition = viewMatrix * worldPosition;
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
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

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float ndotv = max(dot(N, V), 0.0);

  float rimPower = mix(3.6, 1.25, clamp((uRimWidth - 0.2) / 1.3, 0.0, 1.0));
  float fresnel = pow(1.0 - ndotv, rimPower);

  float polar = N.y + (uPitch - 0.5) * 0.18;
  float top = smoothstep(-0.05, 0.82, polar);

  vec3 whiteCore = mix(vec3(1.0, 0.98, 0.992), uCoreColor, 0.04);
  vec3 indigo = vec3(0.14, 0.16, 0.52);
  vec3 magenta = mix(uRimColor, vec3(1.0, 0.28, 0.68), 0.22 + uTreble * 0.2);
  vec3 rimHue = mix(magenta, indigo, smoothstep(0.2, 0.88, top));

  vec3 swirlPos = vWorldPosition * 1.85 + vec3(uTime * 0.12, uTime * 0.07, -uTime * 0.05);
  float cloud = fbm(swirlPos);
  float mist = (cloud - 0.42) * uRefractionIntensity;
  float speech = uSpeechActivity * uHighlightStrength;
  float flow = mist * (0.4 + speech * 0.85);

  vec3 interior = mix(whiteCore, uHighlightColor, 0.04 + max(flow, 0.0) * 0.22 + uVolume * 0.04);
  interior = mix(interior, indigo, top * 0.08 * (1.0 - fresnel));

  float band = exp(-pow(polar - 0.12, 2.0) * 7.0);
  interior += uHighlightColor * band * speech * 0.18;

  float rimMix = clamp(fresnel * (1.28 + uBass * 0.18), 0.0, 1.0);
  vec3 color = mix(interior, rimHue, rimMix);

  float innerRing = smoothstep(0.12, 0.4, 1.0 - ndotv) * (1.0 - smoothstep(0.55, 0.92, 1.0 - ndotv));
  float crescent = innerRing * smoothstep(0.28, 0.9, polar);
  color = mix(color, indigo * 0.85, crescent * 0.9);

  float alpha = uOpacity * mix(0.5, 0.97, clamp(fresnel * 1.05, 0.0, 1.0));
  gl_FragColor = vec4(color, alpha);
}
`

export const glassOrbGlowFragmentShader = /* glsl */ `
uniform vec3 uRimColor;
uniform float uOpacity;
uniform float uRimWidth;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float ndotv = max(dot(N, V), 0.0);
  float width = mix(3.4, 1.6, clamp((uRimWidth - 0.2) / 1.3, 0.0, 1.0));
  float halo = pow(1.0 - ndotv, width);
  halo = smoothstep(0.45, 0.98, halo);
  float polar = normalize(vNormal).y;
  vec3 pink = mix(uRimColor, vec3(1.0, 0.78, 0.88), 0.7);
  vec3 indigo = vec3(0.35, 0.32, 0.7);
  vec3 tint = mix(pink, indigo, smoothstep(0.15, 0.8, polar));
  gl_FragColor = vec4(tint, halo * 0.1 * uOpacity);
}
`
