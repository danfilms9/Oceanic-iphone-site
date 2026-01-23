// Fragment shader: glass with refraction of scene, Fresnel, dispersion, and reflections
uniform vec3 uColor;
uniform float uOpacity;
uniform float uGlow;
uniform float uTime;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform sampler2D uSceneTexture;
uniform mat4 uProjectionMatrix;
uniform float uCameraFar;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vFogDepth;

void main() {
  vec3 viewDir = normalize(-vViewPosition);
  vec3 N = normalize(vNormal);
  float NdotV = max(dot(N, viewDir), 0.0);
  float oneMinusNdotV = 1.0 - NdotV;
  
  // --- Schlick Fresnel (F0 ≈ 0.04 for glass); higher power = weaker/sharper edge ---
  float F0 = 0.04;
  float schlick = F0 + (1.0 - F0) * pow(oneMinusNdotV, 5.0);
  float fresnel = pow(oneMinusNdotV, 3.0);
  float fresnelSharp = pow(oneMinusNdotV, 8.0);
  float fresnelSoft = pow(oneMinusNdotV, 1.0);
  
  // --- Refraction: refract scene behind the sphere (IOR air/glass ≈ 1/1.5) ---
  vec3 I = -viewDir;
  float eta = 1.0 / 1.5;
  vec3 R = refract(I, N, eta);
  if (dot(R, R) < 0.001) {
    R = -viewDir;
  }
  float t = (-uCameraFar - vViewPosition.z) / R.z;
  t = max(t, 0.0);
  vec3 point = vViewPosition + t * R;
  vec4 clip = uProjectionMatrix * vec4(point, 1.0);
  vec2 ndc = clip.xy / clip.w;
  vec2 uv = ndc * 0.5 + 0.5;
  uv = clamp(uv, 0.01, 0.99);
  vec4 refractedTex = texture2D(uSceneTexture, uv);
  vec3 refracted = refractedTex.rgb;
  
  // --- Glass body (subtle tint when looking through) ---
  float bodyMask = 1.0 - fresnelSoft;
  vec3 bodyColor = uColor * uGlow * 0.2;
  float bodyDepth = 0.4 + 0.6 * NdotV;
  bodyColor *= bodyDepth;
  
  // --- Fresnel rim: edge reflection (reduced) ---
  vec3 rimBase = uColor * uGlow * 2.5;
  float spread = 0.05 * fresnel;
  vec3 rimChroma = vec3(rimBase.r * (1.0 + spread), rimBase.g, rimBase.b * (1.0 - spread * 0.6));
  rimChroma.r += fresnel * uGlow * 0.15;
  rimChroma.b += fresnel * uGlow * 0.08;
  
  float thinRim = fresnelSharp * smoothstep(0.1, 0.5, oneMinusNdotV);
  vec3 thinRimColor = vec3(1.02, 0.98, 1.08) * uGlow * 2.0;
  
  float backRim = pow(NdotV, 3.0) * (1.0 - smoothstep(0.5, 0.9, NdotV));
  vec3 backRimColor = uColor * uGlow * 0.45;
  
  // --- Specular ---
  vec3 lightDir = normalize(vec3(sin(uTime * 0.25) * 0.9, 0.35, cos(uTime * 0.25) * 0.9));
  vec3 H = normalize(lightDir + viewDir);
  float spec = pow(max(dot(N, H), 0.0), 64.0);
  vec3 specColor = vec3(1.0, 0.99, 1.02) * uGlow * 1.0;
  vec3 lightDir2 = normalize(vec3(cos(uTime * 0.15) * 0.5, -0.5, sin(uTime * 0.15) * 0.5));
  vec3 H2 = normalize(lightDir2 + viewDir);
  float spec2 = pow(max(dot(N, H2), 0.0), 128.0);
  
  // --- Glass color (reflections, rims, specular) — Fresnel terms scaled down ---
  vec3 glassColor = bodyColor * bodyMask * 0.4
                  + rimChroma * schlick * 0.55
                  + thinRimColor * thinRim * 0.4
                  + backRimColor * backRim * 0.2
                  + specColor * spec
                  + vec3(1.0, 0.98, 1.0) * uGlow * spec2 * 0.5;
  
  // --- Blend: refracted scene (transmission) vs glass reflections (Fresnel) ---
  float refractedWeight = 1.0 - schlick;
  vec3 color = refracted * refractedWeight + glassColor * (1.0 - refractedWeight);
  
  // --- Alpha: center shows refraction, edges show reflection ---
  float alpha = uOpacity * (0.5 + 0.5 * schlick);
  alpha = min(alpha, 0.95);
  
  float fogFactor = 1.0 - exp(-fogNear * fogNear * vFogDepth * vFogDepth / (fogFar * fogFar));
  alpha *= (1.0 - fogFactor);
  // NormalBlending with black behind: final = color * alpha. Alpha was far too low (uOpacity, fog)
  // so the refraction looked dim. Raise floor so the refraction stays bright.
  alpha = max(alpha, 0.9);

  gl_FragColor = vec4(color, alpha);
}
