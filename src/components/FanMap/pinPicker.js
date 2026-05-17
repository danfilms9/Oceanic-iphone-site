import { Raycaster, Vector2 } from 'three'
import { getPinDataFromRoot } from '../../lib/spreadPins.js'
import { FANMAP_PIN_FLAG } from './pinObject.js'
import { findPinRootFromObject, setPinHoverTarget } from './pinHover.js'

/** @typedef {{ city: string, x: number, y: number } | null} FanmapPinTooltip */

/**
 * @param {import('globe.gl').GlobeInstance} globeInstance
 * @param {{ stackCenterLat: number, stackCenterLng: number, displayLat: number, displayLng: number, stackSize: number }} pinData
 * @returns {{ x: number, y: number } | null}
 */
function getPinTooltipPosition(globeInstance, pinData) {
  if (typeof globeInstance.getScreenCoords !== 'function') return null
  const lat =
    pinData.stackSize > 1 ? pinData.stackCenterLat : pinData.displayLat
  const lng =
    pinData.stackSize > 1 ? pinData.stackCenterLng : pinData.displayLng
  const sc = globeInstance.getScreenCoords(lat, lng, 0.05)
  if (!sc || !Number.isFinite(sc.x) || !Number.isFinite(sc.y)) return null
  return { x: sc.x, y: sc.y }
}

/**
 * @param {import('three').Object3D | null} root
 * @param {import('globe.gl').GlobeInstance} globeInstance
 * @returns {FanmapPinTooltip}
 */
function buildPinTooltip(root, globeInstance) {
  const data = getPinDataFromRoot(root)
  if (!data?.city) return null
  const pos = getPinTooltipPosition(globeInstance, data)
  if (!pos) return null
  return { city: String(data.city), x: pos.x, y: pos.y }
}

/**
 * Raycast pin hover on the globe canvas (globe.gl object hover is unreliable with overlays).
 * @param {import('globe.gl').GlobeInstance} globeInstance
 * @param {(tooltip: FanmapPinTooltip) => void} [onTooltipChange]
 * @returns {() => void} cleanup
 */
export function attachPinPointerHover(globeInstance, onTooltipChange) {
  const canvas = globeInstance.renderer()?.domElement
  if (!canvas) return () => {}

  const raycaster = new Raycaster()
  const mouse = new Vector2()
  /** @type {import('three').Object3D | null} */
  let hoveredRoot = null

  const notifyTooltip = () => {
    onTooltipChange?.(buildPinTooltip(hoveredRoot, globeInstance))
  }

  const collectPinRoots = () => {
    /** @type {import('three').Object3D[]} */
    const roots = []
    globeInstance.scene()?.traverse((obj) => {
      if (obj.userData?.[FANMAP_PIN_FLAG]) roots.push(obj)
    })
    return roots
  }

  const pickPinRoot = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null

    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, globeInstance.camera())

    const roots = collectPinRoots()
    if (!roots.length) return null

    const hits = raycaster.intersectObjects(roots, true)
    if (!hits.length) return null
    return findPinRootFromObject(hits[0].object)
  }

  const setHovered = (nextRoot) => {
    if (nextRoot === hoveredRoot) {
      notifyTooltip()
      return
    }

    if (hoveredRoot) setPinHoverTarget(hoveredRoot, false)
    hoveredRoot = nextRoot
    if (hoveredRoot) setPinHoverTarget(hoveredRoot, true)

    canvas.style.cursor = hoveredRoot ? 'pointer' : ''
    notifyTooltip()
  }

  const onPointerMove = (event) => {
    setHovered(pickPinRoot(event.clientX, event.clientY))
  }

  const onPointerLeave = () => {
    setHovered(null)
  }

  const controls = globeInstance.controls?.()
  const onControlsChange = () => {
    if (hoveredRoot) notifyTooltip()
  }
  controls?.addEventListener('change', onControlsChange)

  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)

  return () => {
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    controls?.removeEventListener('change', onControlsChange)
    canvas.style.cursor = ''
    if (hoveredRoot) setPinHoverTarget(hoveredRoot, false)
    hoveredRoot = null
    onTooltipChange?.(null)
  }
}
