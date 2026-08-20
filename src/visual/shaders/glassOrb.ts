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
  p = p * 2.11 + 8.3;
  amp *= 0.5;
  sum += vnoise(p) * amp;
  return sum;
}
`

export const glassOrbVertexShader = /* glsl */ `
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  float deform = sin(uTime * 0.5 + position.y * 2.0) * 0.015;
  vec3 pos = position + normal * deform;

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
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

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float ndotv = max(dot(N, V), 0.0);
  float fresnel = pow(1.0 - ndotv, mix(2.4, 1.1, clamp((uRimWidth - 0.2) / 1.3, 0.0, 1.0)));

  float polar = N.y + (uPitch - 0.5) * 0.16;
  float top = smoothstep(-0.2, 0.75, polar);

  vec3 magenta = mix(uRimColor, vec3(1.0, 0.22, 0.62), 0.22 + uTreble * 0.2);
  vec3 indigo = mix(vec3(0.32, 0.24, 0.72), uCoreColor, 0.18);
  vec3 rimHue = mix(magenta, indigo, top);

  vec3 p = N * 2.0 + vec3(uTime * 0.12);
  float cloud = fbm(p + fbm(p * 1.6) * uRefractionIntensity);
  float mist = smoothstep(0.28, 0.78, cloud);

  vec3 core = mix(vec3(0.99, 0.95, 0.98), uCoreColor, 0.08);
  core = mix(core, uHighlightColor, 0.1 + uVolume * 0.06);

  vec3 L = normalize(vec3(-0.35, 0.45, 0.82));
  float fill = pow(max(dot(N, L), 0.0), 1.4);
  core = mix(core, vec3(1.0), fill * 0.16 * uHighlightStrength);

  float shell = clamp(fresnel * (1.05 + uBass * 0.15) + mist * fresnel * 0.35, 0.0, 1.0);
  vec3 color = mix(core, rimHue, shell);
  color += rimHue * fresnel * 0.28;
  color += uHighlightColor * uSpeechActivity * fresnel * 0.2;

  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 48.0) * uHighlightStrength * 0.28;
  color += vec3(1.0) * spec;

  float alpha = uOpacity * mix(0.72, 0.96, clamp(fresnel + 0.2, 0.0, 1.0));
  gl_FragColor = vec4(color, alpha);
}
`
