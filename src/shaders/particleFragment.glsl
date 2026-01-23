uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform float uBrightnessGlowMult;
uniform float uGlow213230;  // 2:13–2:30: glow reduction with 3s fades
uniform float uMainGlowOpacity311240;  // 3:11–3:39:30: fade down 75%; 3:39:30–3:40: back up

varying vec3 vColor;
varying float vLife;
varying float vSize;
varying float vFogDepth;
varying float vIsOrbit;  // 1 = orbit, 0 = non-orbit (non-orbit gets slightly lower glow/opacity)

void main() {
  // Create circular point using gl_PointCoord
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  
  // Bright core with soft halo for bloom effect
  float core = 1.0 - smoothstep(0.0, 0.2, dist);
  float halo = 1.0 - smoothstep(0.2, 0.6, dist);
  
  // Enhanced glow - brighter in center
  float innerGlow = 1.0 - smoothstep(0.0, 0.3, dist);
  float outerGlow = 1.0 - smoothstep(0.3, 0.7, dist);
  
  // Combine glows for ethereal effect (75% of original)
  float alpha = core * 0.75 + halo * 0.3;
  alpha *= vLife; // Fade based on particle life

  // Non-orbit particles: slightly lower glow and opacity at all times (0.85 for non-orbit, 1.0 for orbit)
  float nonOrbitFactor = 0.85 + 0.15 * vIsOrbit;
  alpha *= nonOrbitFactor;
  
  // Apply exponential fog for depth
  float fogFactor = 1.0 - exp(-fogNear * fogNear * vFogDepth * vFogDepth / (fogFar * fogFar));
  
  // Enhanced color with glow (75% of original)
  vec3 finalColor = vColor * (1.0 + innerGlow * 1.5 + outerGlow * 0.6);
  finalColor *= nonOrbitFactor;
  
  gl_FragColor = vec4(finalColor, alpha * (1.0 - fogFactor));
  gl_FragColor *= uBrightnessGlowMult * uGlow213230 * uMainGlowOpacity311240;  // 1:06–1:13; 2:13–2:30; 3:11–3:40
}
