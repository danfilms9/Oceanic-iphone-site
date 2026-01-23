// Vertex shader for the main vocal sphere - passes data for Fresnel and layered effects
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vFogDepth;

void main() {
  // Transform normal to view space for Fresnel (normals stay in view space for view-dependent effects)
  vNormal = normalize(normalMatrix * normal);
  
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPos.xyz;
  vFogDepth = -mvPos.z;
  
  gl_Position = projectionMatrix * mvPos;
}
