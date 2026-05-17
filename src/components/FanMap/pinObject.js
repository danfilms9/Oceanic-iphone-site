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
/** Pin record from spreadPins / Firestore (stored on Three root). */
export const FANMAP_PIN_DATA_KEY = 'fanmapPinData'

/** Base size multiplier before zoom-based scaling. */
export const PIN_BASE_SCALE = 1.4

/** Zoom scale range (multiplied with PIN_BASE_SCALE). */
export const PIN_SCALE_MIN = 0.55
export const PIN_SCALE_MAX = 4.2

/** City label scale at max zoom out (far camera). */
export const TOOLTIP_ZOOM_SCALE_MIN = 0.92
/** City label scale at max zoom in (close camera). */
export const TOOLTIP_ZOOM_SCALE_MAX = 1.5

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

/**
 * 3D map pin for globe.gl `objectsData` — white base ring, red stem, red head.
 * Local +Z is radial outward (with objectFacesSurface).
 */
export function createFanmapPinObject() {
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

  const ringZ = 0.04

  const ring = new Mesh(
    new RingGeometry(0.4, 0.68, 40),
    new MeshPhongMaterial({
      color: PIN_WHITE,
      side: DoubleSide,
      shininess: 35,
    }),
  )
  ring.position.z = ringZ
  ring.userData[FANMAP_PIN_RING_PART] = true

  const headRadius = 0.42
  const stemHeight = 2.35
  const stem = new Mesh(
    new CylinderGeometry(0.095, 0.13, stemHeight, 14),
    silverMat,
  )
  // CylinderGeometry is Y-aligned; with objectFacesSurface, +Z is radial outward.
  stem.rotation.x = Math.PI / 2
  const hoverParts = new Group()
  hoverParts.position.z = ringZ
  root.userData[FANMAP_PIN_HOVER_GROUP_KEY] = hoverParts

  stem.position.z = stemHeight / 2

  const head = new Mesh(new SphereGeometry(headRadius, 20, 20), redMat)
  head.position.z = stemHeight + headRadius * 0.82

  hoverParts.add(stem)
  hoverParts.add(head)

  const pinTipZ = ringZ + stemHeight + headRadius * 0.82
  const hitZone = new Mesh(
    new SphereGeometry(0.98, 12, 12),
    new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )
  hitZone.position.z = pinTipZ * 0.5

  root.add(ring)
  root.add(hoverParts)
  root.add(hitZone)

  for (const part of [stem, head]) {
    capturePinMaterialRestState(part.material)
  }

  return root
}
