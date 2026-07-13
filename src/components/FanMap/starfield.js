import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from 'three'

const STARFIELD_NAME = 'fanmap-starfield'

/** @param {number} radius Shell radius in scene units (globe.gl uses ~100 for Earth). */
export function createStarfieldPoints(radius = 620, count = 700) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const c = new Color()

  for (let i = 0; i < count; i++) {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const sinPhi = Math.sin(phi)
    const x = radius * sinPhi * Math.cos(theta)
    const y = radius * sinPhi * Math.sin(theta)
    const z = radius * Math.cos(phi)
    const j = i * 3
    positions[j] = x
    positions[j + 1] = y
    positions[j + 2] = z

    const warm = Math.random()
    c.setRGB(
      0.78 + warm * 0.22,
      0.82 + warm * 0.16,
      0.92 + warm * 0.08,
    )
    colors[j] = c.r
    colors[j + 1] = c.g
    colors[j + 2] = c.b
  }

  const geom = new BufferGeometry()
  geom.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geom.setAttribute('color', new Float32BufferAttribute(colors, 3))

  const mat = new PointsMaterial({
    size: 2.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: true,
    sizeAttenuation: true,
  })

  const pts = new Points(geom, mat)
  pts.name = STARFIELD_NAME
  return pts
}

export function removeStarfieldFromScene(scene) {
  const found = scene.getObjectByName(STARFIELD_NAME)
  if (!found) return
  scene.remove(found)
  found.geometry?.dispose()
  const m = found.material
  if (m) {
    if (Array.isArray(m)) m.forEach((x) => x.dispose())
    else m.dispose()
  }
}
