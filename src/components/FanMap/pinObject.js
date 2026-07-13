import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  RingGeometry,
  SphereGeometry,
} from 'three'

const PIN_RED = 0xc62828
const PIN_WHITE = 0xffffff
const PIN_SILVER = 0xc0c0c8

export const FANMAP_PIN_FLAG = 'fanmapPin'
export const FANMAP_PIN_RING_PART = 'fanmapPinRing'
export const FANMAP_PIN_HOVER_GROUP_KEY = 'fanmapPinHoverGroup'
/** Mesh used as the screen-space anchor for the city label. */
export const FANMAP_PIN_HEAD_KEY = 'fanmapPinHead'
/** Pin record from spreadPins / Firestore (stored on Three root). */
export const FANMAP_PIN_DATA_KEY = 'fanmapPinData'

/** Base size multiplier before zoom-based scaling. */
export const PIN_BASE_SCALE = 1.4

/** Zoom scale range (multiplied with PIN_BASE_SCALE). Smaller at close zoom so heads/stems thin out. */
export const PIN_SCALE_MIN = 0.18
export const PIN_SCALE_MAX = 4.2

/** City label scale at max zoom out (far camera). */
export const TOOLTIP_ZOOM_SCALE_MIN = 0.92
/** City label scale at max zoom in (close camera). */
export const TOOLTIP_ZOOM_SCALE_MAX = 1.12

/** Scale multiplier when pin hover spring reaches 1. */
export const PIN_HOVER_SCALE_MULT = 1.38

/**
 * Scale factor from orbit distance: larger when zoomed out (farther camera).
 * @param {number} cameraDistance
 * @param {number} globeRadius
 * @param {number} minDistanceGlobeR
 * @param {number} maxDistanceGlobeR
 */
export function computePinScaleFromCameraDistance(
  cameraDistance,
  globeRadius,
  minDistanceGlobeR,
  maxDistanceGlobeR,
) {
  const minD = globeRadius * minDistanceGlobeR
  const maxD = globeRadius * maxDistanceGlobeR
  const span = maxD - minD
  if (span <= 0) return PIN_BASE_SCALE * PIN_SCALE_MIN
  const t = Math.max(0, Math.min(1, (cameraDistance - minD) / span))
  const zoomScale = PIN_SCALE_MIN + t * (PIN_SCALE_MAX - PIN_SCALE_MIN)
  return PIN_BASE_SCALE * zoomScale
}

/**
 * City label scale vs camera distance (inverted vs pins: larger when zoomed in).
 * Linear across the full orbit min/max distance.
 * @param {number} cameraDistance
 * @param {number} globeRadius
 * @param {number} minDistanceGlobeR
 * @param {number} maxDistanceGlobeR
 */
export function computeTooltipZoomScaleFromCameraDistance(
  cameraDistance,
  globeRadius,
  minDistanceGlobeR,
  maxDistanceGlobeR,
) {
  const minD = globeRadius * minDistanceGlobeR
  const maxD = globeRadius * maxDistanceGlobeR
  const span = maxD - minD
  if (span <= 0) return TOOLTIP_ZOOM_SCALE_MAX
  const t = Math.max(0, Math.min(1, (cameraDistance - minD) / span))
  return (
    TOOLTIP_ZOOM_SCALE_MAX +
    t * (TOOLTIP_ZOOM_SCALE_MIN - TOOLTIP_ZOOM_SCALE_MAX)
  )
}

/**
 * @param {import('three').MeshPhongMaterial} mat
 */
export function capturePinMaterialRestState(mat) {
  if (mat.userData.fanmapRestCaptured) return
  mat.userData.fanmapRestCaptured = true
  mat.userData.fanmapRestEmissive = mat.emissive.getHex()
}

/**
 * @param {import('three').Object3D} root
 */
export function applyFanmapPinTransform(root) {
  const base = root.userData.fanmapBaseScale ?? 1
  const hoverT = root.userData.fanmapHoverT ?? 0
  const hoverMult = 1 + hoverT * (PIN_HOVER_SCALE_MULT - 1)
  root.scale.setScalar(base)
  const hoverGroup = root.userData[FANMAP_PIN_HOVER_GROUP_KEY]
  if (hoverGroup) hoverGroup.scale.setScalar(hoverMult)
}

/**
 * @param {import('three').Object3D} root
 * @param {number} baseScale zoom-based scale
 */
export function setFanmapPinBaseScale(root, baseScale) {
  root.userData.fanmapBaseScale = baseScale
  if (root.userData.fanmapHoverT === undefined) {
    root.userData.fanmapHoverT = 0
  }
  applyFanmapPinTransform(root)
}

/** @param {import('three').Object3D} scene */
export function updateFanmapPinScalesInScene(scene, scale) {
  scene.traverse((obj) => {
    if (obj.userData?.[FANMAP_PIN_FLAG]) {
      setFanmapPinBaseScale(obj, scale)
    }
  })
}

/** Base lean for stacked pins (~12°); heads fan out while tips stay clustered. */
const STACK_LEAN_RAD = 0.21

/**
 * Outward lean so stacked pin heads clear each other.
 * @param {number} [stackIndex]
 * @param {number} [stackSize]
 * @returns {{ leanAngle: number, leanDirection: number }}
 */
export function leanForStack(stackIndex = 0, stackSize = 1) {
  if (stackSize <= 1) return { leanAngle: 0, leanDirection: 0 }
  const leanDirection = (2 * Math.PI * stackIndex) / stackSize - Math.PI / 2
  const leanAngle =
    STACK_LEAN_RAD * Math.min(1.12, 0.92 + stackSize * 0.04)
  return { leanAngle, leanDirection }
}

const HEAD_RADIUS = 0.42
const STEM_HEIGHT = 2.35
const RING_Z = 0.04

/**
 * Geometries and static materials shared by every pin — allocated once.
 * Stem/head materials stay per-pin because hover mutates their emissive color.
 * @type {{ ring: RingGeometry, stem: CylinderGeometry, head: SphereGeometry, hit: SphereGeometry, ringMat: MeshPhongMaterial, hitMat: MeshBasicMaterial } | null}
 */
let sharedPinAssets = null

function getSharedPinAssets() {
  if (!sharedPinAssets) {
    sharedPinAssets = {
      ring: new RingGeometry(0.4, 0.68, 24),
      stem: new CylinderGeometry(0.095, 0.13, STEM_HEIGHT, 8),
      head: new SphereGeometry(HEAD_RADIUS, 12, 12),
      hit: new SphereGeometry(0.98, 6, 6),
      ringMat: new MeshPhongMaterial({
        color: PIN_WHITE,
        side: DoubleSide,
        shininess: 35,
      }),
      hitMat: new MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    }
  }
  return sharedPinAssets
}

/**
 * 3D map pin for globe.gl `objectsData` — white base ring, red stem, red head.
 * Local +Z is radial outward (with objectFacesSurface).
 * Stacked pins lean outward so heads don't intersect while tips stay close.
 *
 * @param {{ stackIndex?: number, stackSize?: number }} [options]
 */
export function createFanmapPinObject(options = {}) {
  const { leanAngle, leanDirection } = leanForStack(
    options.stackIndex,
    options.stackSize,
  )
  const assets = getSharedPinAssets()

  const root = new Group()
  root.userData[FANMAP_PIN_FLAG] = true

  const redMat = new MeshPhongMaterial({
    color: PIN_RED,
    shininess: 55,
  })

  const silverMat = new MeshPhongMaterial({
    color: PIN_SILVER,
    shininess: 90,
    specular: 0xffffff,
  })

  const ring = new Mesh(assets.ring, assets.ringMat)
  ring.position.z = RING_Z
  ring.userData[FANMAP_PIN_RING_PART] = true

  const stem = new Mesh(assets.stem, silverMat)
  // CylinderGeometry is Y-aligned; with objectFacesSurface, +Z is radial outward.
  stem.rotation.x = Math.PI / 2

  // Pivot at the tip so the stem/head lean while the white ring stays on the surface.
  const leanGroup = new Group()
  leanGroup.position.z = RING_Z
  if (leanAngle > 0) {
    leanGroup.rotation.x = Math.sin(leanDirection) * leanAngle
    leanGroup.rotation.y = -Math.cos(leanDirection) * leanAngle
  }

  const hoverParts = new Group()
  root.userData[FANMAP_PIN_HOVER_GROUP_KEY] = hoverParts

  stem.position.z = STEM_HEIGHT / 2

  const head = new Mesh(assets.head, redMat)
  head.position.z = STEM_HEIGHT + HEAD_RADIUS * 0.82
  root.userData[FANMAP_PIN_HEAD_KEY] = head

  hoverParts.add(stem)
  hoverParts.add(head)

  const pinLength = STEM_HEIGHT + HEAD_RADIUS * 0.82
  const hitZone = new Mesh(assets.hit, assets.hitMat)
  hitZone.position.z = pinLength * 0.5

  leanGroup.add(hoverParts)
  leanGroup.add(hitZone)

  root.add(ring)
  root.add(leanGroup)

  for (const part of [stem, head]) {
    capturePinMaterialRestState(part.material)
  }

  return root
}
