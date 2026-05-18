import { Raycaster, Vector2 } from 'three'
import { getPinDataFromRoot } from '../../lib/spreadPins.js'
import { FANMAP_PIN_FLAG } from './pinObject.js'
import { findPinRootFromObject, setPinHoverTarget } from './pinHover.js'

/** @typedef {{ city: string, x: number, y: number } | null} FanmapPinTooltip */

/** Pin label stays up this long after hover/click before fading out. */
const PIN_LABEL_VISIBLE_MS = 2000

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
 * Raycast pin hover/click on the globe canvas (globe.gl object hover is unreliable with overlays).
 * The active pin label fades out after 2s unless another pin is hovered or clicked (timer resets).
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
  let activeRoot = null
  let hideTimer = 0

  const clearHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = 0
    }
  }

  const clearActivePin = () => {
    if (activeRoot) setPinHoverTarget(activeRoot, false)
    activeRoot = null
    onTooltipChange?.(null)
  }

  const scheduleHide = () => {
    clearHideTimer()
    hideTimer = window.setTimeout(() => {
      hideTimer = 0
      clearActivePin()
    }, PIN_LABEL_VISIBLE_MS)
  }

  const notifyTooltip = () => {
    onTooltipChange?.(buildPinTooltip(activeRoot, globeInstance))
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

  const setActivePin = (nextRoot) => {
    if (!nextRoot) return

    if (nextRoot === activeRoot) {
      notifyTooltip()
      scheduleHide()
      return
    }

    if (activeRoot) setPinHoverTarget(activeRoot, false)
    activeRoot = nextRoot
    setPinHoverTarget(activeRoot, true)
    notifyTooltip()
    scheduleHide()
  }

  const onPointerMove = (event) => {
    const root = pickPinRoot(event.clientX, event.clientY)
    canvas.style.cursor = root ? 'pointer' : ''
    if (root) setActivePin(root)
  }

  const onClick = (event) => {
    const root = pickPinRoot(event.clientX, event.clientY)
    if (root) setActivePin(root)
  }

  const onPointerLeave = () => {
    canvas.style.cursor = ''
  }

  const controls = globeInstance.controls?.()
  const onControlsChange = () => {
    if (activeRoot) notifyTooltip()
  }
  controls?.addEventListener('change', onControlsChange)

  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('click', onClick)
  canvas.addEventListener('pointerleave', onPointerLeave)

  return () => {
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('click', onClick)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    controls?.removeEventListener('change', onControlsChange)
    clearHideTimer()
    canvas.style.cursor = ''
    if (activeRoot) setPinHoverTarget(activeRoot, false)
    activeRoot = null
    onTooltipChange?.(null)
  }
}
