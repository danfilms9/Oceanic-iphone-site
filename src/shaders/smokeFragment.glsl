uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform float smokeOpacity;
uniform float uOpacityMultiplier;

varying vec3 vColor;
varying float vLife;
varying float vSize;
varying float vFogDepth;

void main() {
  // Radial gradient: soft center fading to transparent at edges (gradient sprite)
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  
  // Smooth radial falloff: 1 at center, 0 at edge
  float gradient = 1.0 - smoothstep(0.0, 0.55, dist);
  // Slightly softer inner for a more diffuse, smokey look
  float inner = 1.0 - smoothstep(0.0, 0.25, dist);
  float alpha = mix(gradient * 0.7, inner, 0.4);
  alpha *= vLife * smokeOpacity * uOpacityMultiplier;
  
  // Apply exponential fog for depth
  float fogFactor = 1.0 - exp(-fogNear * fogNear * vFogDepth * vFogDepth / (fogFar * fogFar));
  alpha *= (1.0 - fogFactor);
  
  vec3 finalColor = vColor;
  gl_FragColor = vec4(finalColor, alpha);
}
