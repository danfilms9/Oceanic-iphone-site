/**
 * Scale factor for the ocean base sphere only (country polygons use full globe radius).
 * Values below 1 shrink the blue sphere while land size stays the same.
 */
export const OCEAN_SPHERE_SCALE = 0.995

/**
 * @param {import('globe.gl').GlobeInstance | undefined} inst
 * @returns {boolean} true if the ocean mesh was found and scaled
 */
export function applyOceanSphereScale(inst) {
  const scene = inst?.scene?.()
  if (!scene) return false

  let applied = false
  scene.traverse((obj) => {
    if (obj.__globeObjType !== 'globe') return
    for (const child of obj.children) {
      if (child.isMesh && child.geometry?.type === 'SphereGeometry') {
        child.scale.setScalar(OCEAN_SPHERE_SCALE)
        applied = true
      }
    }
  })
  return applied
}
