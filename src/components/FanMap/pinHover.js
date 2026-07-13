import { Color } from 'three'
import {
  applyFanmapPinTransform,
  capturePinMaterialRestState,
  FANMAP_PIN_FLAG,
  FANMAP_PIN_RING_PART,
} from './pinObject.js'

const SPRING_STIFFNESS = 220
const SPRING_DAMPING = 16
const HIGHLIGHT_EMISSIVE = 0.42

/** Scratch color reused across highlight updates to avoid per-frame allocation. */
const _highlightColor = new Color()

/** @type {Map<import('three').Object3D, { value: number, velocity: number, target: number }>} */
const springs = new Map()
let rafId = 0
let lastTime = 0

function updatePinHighlight(root, hoverT) {
  root.traverse((child) => {
    if (!child.isMesh || child.userData[FANMAP_PIN_RING_PART]) return
    const mat = child.material
    if (!mat?.isMeshPhongMaterial) return
    capturePinMaterialRestState(mat)
    mat.emissive.setHex(mat.userData.fanmapRestEmissive ?? 0)
    if (hoverT > 0) {
      _highlightColor
        .copy(mat.color)
        .multiplyScalar(hoverT * HIGHLIGHT_EMISSIVE)
      mat.emissive.add(_highlightColor)
    }
  })
}

function springStep(state, dt) {
  const force = (state.target - state.value) * SPRING_STIFFNESS
  state.velocity += force * dt
  state.velocity *= Math.exp(-SPRING_DAMPING * dt)
  state.value += state.velocity * dt
  if (
    Math.abs(state.target - state.value) < 0.002 &&
    Math.abs(state.velocity) < 0.02
  ) {
    state.value = state.target
    state.velocity = 0
  }
}

function tick(now) {
  const dt = Math.min(0.05, lastTime ? (now - lastTime) / 1000 : 1 / 60)
  lastTime = now

  let stillAnimating = false
  for (const [root, state] of springs) {
    const before = state.value
    springStep(state, dt)
    root.userData.fanmapHoverT = state.value
    applyFanmapPinTransform(root)
    updatePinHighlight(root, state.value)

    if (state.value !== state.target || Math.abs(state.velocity) > 0.001) {
      stillAnimating = true
    } else {
      springs.delete(root)
      if (before !== state.value) {
        applyFanmapPinTransform(root)
        updatePinHighlight(root, state.value)
      }
    }
  }

  if (stillAnimating) {
    rafId = requestAnimationFrame(tick)
  } else {
    rafId = 0
    lastTime = 0
  }
}

function ensureSpringLoop() {
  if (rafId) return
  rafId = requestAnimationFrame(tick)
}

/**
 * @param {import('three').Object3D | null | undefined} root
 * @param {boolean} hovered
 */
/** @param {import('three').Object3D | null | undefined} obj */
export function findPinRootFromObject(obj) {
  let current = obj
  while (current) {
    if (current.userData?.[FANMAP_PIN_FLAG]) return current
    current = current.parent
  }
  return null
}

export function setPinHoverTarget(root, hovered) {
  if (!root?.userData?.[FANMAP_PIN_FLAG]) return

  const target = hovered ? 1 : 0
  let state = springs.get(root)
  if (!state) {
    state = {
      value: root.userData.fanmapHoverT ?? 0,
      velocity: 0,
      target,
    }
    springs.set(root, state)
  } else {
    state.target = target
  }

  ensureSpringLoop()
}

export function stopAllPinHoverSprings() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  lastTime = 0
  springs.clear()
}
