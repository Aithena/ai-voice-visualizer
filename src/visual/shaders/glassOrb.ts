export const glassOrbVertexShader = /* glsl */ `
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

void main() {
  float deform = sin(uTime * 0.5 + position.y * 3.0) * 0.015;
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

  float rimPower = mix(4.2, 1.15, clamp((uRimWidth - 0.2) / 1.3, 0.0, 1.0));
  float fresnel = pow(1.0 - ndotv, rimPower);
  float innerGlow = pow(1.0 - ndotv, rimPower * 0.42) * 0.4;

  vec3 rimTint = mix(uRimColor, vec3(1.0), uTreble * 0.3);
  float bassBoost = 1.0 + uBass * 0.28;
  vec3 rim = rimTint * (fresnel * 1.7 + innerGlow) * bassBoost;

  vec3 worldN = normalize(vWorldPosition);
  float bandY = worldN.y + (uPitch - 0.5) * 0.35;
  float band = sin(bandY * 6.0 + uTime * 0.4) * 0.5 + 0.5;
  band = smoothstep(0.42, 0.82, band);
  vec3 highlight = uHighlightColor * band * uHighlightStrength * uSpeechActivity;

  vec3 refractShift = mix(uCoreColor, uRimColor, 0.35 + 0.25 * sin(uTime * 0.22 + worldN.x * 2.8));
  vec3 core = mix(uCoreColor, refractShift, uRefractionIntensity * (0.28 + fresnel * 0.55));
  core = mix(core, uHighlightColor, 0.14 + uVolume * 0.08);

  vec3 color = core + rim + highlight;
  float alpha = uOpacity * mix(0.38, 0.94, clamp(fresnel + innerGlow * 0.5, 0.0, 1.0));
  gl_FragColor = vec4(color, alpha);
}
`
