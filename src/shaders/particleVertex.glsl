// position and color are automatically provided by Three.js when using vertexColors: true
attribute float size;
attribute float life;
attribute float isOrbit;

uniform float time;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

varying vec3 vColor;
varying float vLife;
varying float vSize;
varying float vFogDepth;
varying float vIsOrbit;

void main() {
  vColor = color;
  vLife = life;
  vSize = size;
  vIsOrbit = isOrbit;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vFogDepth = -mvPosition.z;
  
  // Calculate point size based on distance and life
  float distance = length(mvPosition.xyz);
  float calculatedSize = size * (300.0 / distance) * (0.5 + 0.5 * life);
  
  gl_PointSize = calculatedSize;
  gl_Position = projectionMatrix * mvPosition;
}
