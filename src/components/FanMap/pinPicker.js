import { Raycaster, Vector2, Vector3 } from 'three'
import { getPinDataFromRoot } from '../../lib/spreadPins.js'
import { FANMAP_PIN_FLAG, FANMAP_PIN_HEAD_KEY } from './pinObject.js'
import { findPinRootFromObject, setPinHoverTarget } from './pinHover.js'

/** @typedef {{ city: string, x: number, y: number } | null} FanmapPinTooltip */

/** Pin label stays up this long after hover/click before fading out. */
const PIN_LABEL_VISIBLE_MS = 2000

const _headWorld = new Vector3()
const _headNdc = new Vector3()

/**
 * Project the pin head's world position into host/canvas pixel coords so the
 * label stays locked to the head across zoom and lean.
 * @param {import('globe.gl').GlobeInstance} globeInstance
 * @param {import('three').Object3D} root
 * @returns {{ x: number, y: number } | null}
 */
function getPinTooltipPosition(globeInstance, root) {
  const head = root?.userData?.[FANMAP_PIN_HEAD_KEY]
  const camera = globeInstance.camera?.()
  const canvas = globeInstance.renderer?.()?.domElement
  if (!head || !camera || !canvas) return null

  head.getWorldPosition(_headWorld)
  _headNdc.copy(_headWorld).project(camera)
  // Behind the camera or outside the clip volume.
  if (!Number.isFinite(_headNdc.x) || !Number.isFinite(_headNdc.y) || _headNdc.z > 1) {
    return null
  }

  const x = (_headNdc.x * 0.5 + 0.5) * canvas.clientWidth
  const y = (-_headNdc.y * 0.5 + 0.5) * canvas.clientHeight
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

/**
 * @param {import('three').Object3D | null} root
 * @param {import('globe.gl').GlobeInstance} globeInstance
 * @returns {FanmapPinTooltip}
 */
function buildPinTooltip(root, globeInstance) {
  const data = getPinDataFromRoot(root)
  if (!data?.city || !root) return null
  const pos = getPinTooltipPosition(globeInstance, root)
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

  /** Traversing the whole scene per pointer event is expensive; cache the pin list briefly. */
  const PIN_ROOTS_CACHE_MS = 1500
  /** @type {import('three').Object3D[]} */
  let cachedPinRoots = []
  let pinRootsCachedAt = 0

  const collectPinRoots = () => {
    const now = performance.now()
    if (cachedPinRoots.length && now - pinRootsCachedAt < PIN_ROOTS_CACHE_MS) {
      return cachedPinRoots
    }
    /** @type {import('three').Object3D[]} */
    const roots = []
    globeInstance.scene()?.traverse((obj) => {
      if (obj.userData?.[FANMAP_PIN_FLAG]) roots.push(obj)
    })
    cachedPinRoots = roots
    pinRootsCachedAt = now
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

  // Coalesce raycasts to at most one per frame — pointermove can fire far faster than 60/s.
  let pendingMoveRaf = 0
  let lastMoveX = 0
  let lastMoveY = 0

  const runPointerPick = () => {
    pendingMoveRaf = 0
    const root = pickPinRoot(lastMoveX, lastMoveY)
    canvas.style.cursor = root ? 'pointer' : ''
    if (root) setActivePin(root)
  }

  const onPointerMove = (event) => {
    lastMoveX = event.clientX
    lastMoveY = event.clientY
    if (!pendingMoveRaf) {
      pendingMoveRaf = requestAnimationFrame(runPointerPick)
    }
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
    if (pendingMoveRaf) cancelAnimationFrame(pendingMoveRaf)
    clearHideTimer()
    canvas.style.cursor = ''
    if (activeRoot) setPinHoverTarget(activeRoot, false)
    activeRoot = null
    onTooltipChange?.(null)
  }
}
