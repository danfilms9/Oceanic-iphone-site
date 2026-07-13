import {
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
  useEffect,
  useCallback,
} from 'react'
import GlobeGL from 'react-globe.gl'
import { MeshPhongMaterial } from 'three'
import { getCountriesPolygonsData } from '../../data/countries.js'
import {
  createStarfieldPoints,
  removeStarfieldFromScene,
} from './starfield.js'
import { attachPinPointerHover } from './pinPicker.js'
import { stopAllPinHoverSprings } from './pinHover.js'
import {
  computePinScaleFromCameraDistance,
  computeTooltipZoomScaleFromCameraDistance,
  createFanmapPinObject,
  FANMAP_PIN_DATA_KEY,
  setFanmapPinBaseScale,
  updateFanmapPinScalesInScene,
} from './pinObject.js'
import { applyOceanSphereScale } from './globeOceanScale.js'

/** Gap between pin head and tooltip (px at zoom multiplier 1). */
const TOOLTIP_OFFSET_PX = 14
const TOOLTIP_FADE_MS = 220
const TOOLTIP_HIDE_DELAY_MS = 100

const POLYGONS = getCountriesPolygonsData()

/** Shift globe in canvas (globe.gl px offset from center). Positive Y lowers framing when panel is top-aligned. */
const LIGHT_THEME_GLOBE_OFFSET = Object.freeze([0, 68])

/** Default POV is (0, 0) — Africa. Rotate 50° west so South America faces the camera on load. */
const INITIAL_POINT_OF_VIEW = Object.freeze({ lng: -50 })

/** Orbit zoom limits vs globe radius R (three-globe uses R ≈ 100). Tighter than globe.gl defaults (min ~R, max 100R). */
const ZOOM_MIN_DISTANCE_GLOBE_R = 1.06
const ZOOM_MAX_DISTANCE_GLOBE_R = 6

const AUTO_ROTATE_SPEED = 0.4
/** Auto-rotate speed at closest zoom — slow so close-up views don't whip past. */
const AUTO_ROTATE_SPEED_CLOSE = 0.05
/** Resume auto-rotate this long after the user stops dragging or zooming. */
const AUTO_ROTATE_RESUME_MS = 3000
/** How long the rotate speed eases from 0 → full after resume. */
const AUTO_ROTATE_EASE_MS = 2800

/**
 * Map camera distance to auto-rotate speed: slower when zoomed in, full speed when zoomed out.
 * @param {number} cameraDistance
 * @param {number} globeRadius
 */
function computeAutoRotateSpeedFromDistance(cameraDistance, globeRadius) {
  const minD = globeRadius * ZOOM_MIN_DISTANCE_GLOBE_R
  const maxD = globeRadius * ZOOM_MAX_DISTANCE_GLOBE_R
  const span = maxD - minD
  if (span <= 0) return AUTO_ROTATE_SPEED_CLOSE
  const t = Math.max(0, Math.min(1, (cameraDistance - minD) / span))
  // Square so mid/close zooms stay noticeably slower than far orbit.
  const zoomT = t * t
  return (
    AUTO_ROTATE_SPEED_CLOSE +
    zoomT * (AUTO_ROTATE_SPEED - AUTO_ROTATE_SPEED_CLOSE)
  )
}

/** Without a texture, three-globe defaults to black for the sphere — we set ocean color here. */
const GLOBE_BASE_MATERIAL = {
  light: new MeshPhongMaterial({
    color: 0x1b9af9,
    shininess: 18,
    specular: 0x61c6ff,
  }),
  dark: new MeshPhongMaterial({
    color: 0x0a0a0a,
    shininess: 4,
  }),
}

const GLOBE_THEMES = {
  dark: {
    backgroundColor: '#030303',
    atmosphereColor: 'rgba(88, 120, 180, 0.28)',
    polygonCap: '#2a2a2a',
    polygonSide: '#1f1f1f',
    polygonStroke: '#444444',
  },
  light: {
    backgroundColor: '#040814',
    atmosphereColor: 'rgba(120, 190, 255, 0.22)',
    polygonCap: '#b6e57c',
    polygonSide: '#92c45e',
    polygonStroke: '#5fa838',
  },
}

/** @param {{ pins: Array<{ id: string, city: string, country: string, lat: number, lng: number }>, theme?: 'dark' | 'light' }} props */
export const Globe = forwardRef(function Globe({ pins, theme = 'dark' }, ref) {
  const hostRef = useRef(null)
  const controlsReady = useRef(false)
  const controlsCleanupRef = useRef(null)
  const pinPointerCleanupRef = useRef(null)
  const pinScaleRef = useRef(1)
  const globeRadiusRef = useRef(100)
  /** 0–1 ease factor for auto-rotate resume; multiplied with zoom-based speed. */
  const autoRotateEaseFactorRef = useRef(1)
  const applyAutoRotateSpeedRef = useRef(() => {})
  const [dims, setDims] = useState({ width: 640, height: 480 })
  const [pinTooltip, setPinTooltip] = useState(
    /** @type {{ city: string, x: number, y: number } | null} */ (null),
  )
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipZoomScale, setTooltipZoomScale] = useState(1)
  const tooltipHideDelayRef = useRef(0)
  const tooltipFadeOutRef = useRef(0)

  const clearTooltipTimers = useCallback(() => {
    if (tooltipHideDelayRef.current) {
      clearTimeout(tooltipHideDelayRef.current)
      tooltipHideDelayRef.current = 0
    }
    if (tooltipFadeOutRef.current) {
      clearTimeout(tooltipFadeOutRef.current)
      tooltipFadeOutRef.current = 0
    }
  }, [])

  const handlePinTooltipChange = useCallback(
    /** @param {{ city: string, x: number, y: number } | null} info */ (info) => {
      clearTooltipTimers()
      if (info) {
        setPinTooltip(info)
        requestAnimationFrame(() => setTooltipVisible(true))
        return
      }
      tooltipHideDelayRef.current = window.setTimeout(() => {
        tooltipHideDelayRef.current = 0
        setTooltipVisible(false)
        tooltipFadeOutRef.current = window.setTimeout(() => {
          tooltipFadeOutRef.current = 0
          setPinTooltip(null)
        }, TOOLTIP_FADE_MS)
      }, TOOLTIP_HIDE_DELAY_MS)
    },
    [clearTooltipTimers],
  )

  const syncPinScalesFromCamera = () => {
    const inst = ref?.current
    const scene = inst?.scene?.()
    const controls = inst?.controls?.()
    if (!scene || !controls) return
    const globeR =
      typeof inst.getGlobeRadius === 'function'
        ? inst.getGlobeRadius()
        : globeRadiusRef.current
    globeRadiusRef.current = globeR
    const distance = controls.getDistance()
    const scale = computePinScaleFromCameraDistance(
      distance,
      globeR,
      ZOOM_MIN_DISTANCE_GLOBE_R,
      ZOOM_MAX_DISTANCE_GLOBE_R,
    )
    // Controls fire 'change' every frame during auto-rotate; distance only moves
    // on zoom, so skip the scene traverse and React update when nothing changed.
    if (Math.abs(scale - pinScaleRef.current) < 0.001) {
      applyAutoRotateSpeedRef.current()
      return
    }
    pinScaleRef.current = scale
    updateFanmapPinScalesInScene(scene, scale)
    applyAutoRotateSpeedRef.current()
    // Round so identical values bail out of setState instead of re-rendering.
    const zoomScale =
      Math.round(
        computeTooltipZoomScaleFromCameraDistance(
          distance,
          globeR,
          ZOOM_MIN_DISTANCE_GLOBE_R,
          ZOOM_MAX_DISTANCE_GLOBE_R,
        ) * 100,
      ) / 100
    setTooltipZoomScale(zoomScale)
  }

  const objectThreeObject = useCallback(
    /** @param {{ city: string, country: string, lat: number, lng: number, stackIndex?: number, stackSize?: number }} pinData */ (
      pinData,
    ) => {
      const pin = createFanmapPinObject({
        stackIndex: pinData.stackIndex,
        stackSize: pinData.stackSize,
      })
      pin.userData[FANMAP_PIN_DATA_KEY] = pinData
      setFanmapPinBaseScale(pin, pinScaleRef.current)
      return pin
    },
    [],
  )

  useEffect(() => {
    const raf = requestAnimationFrame(syncPinScalesFromCamera)
    return () => cancelAnimationFrame(raf)
  }, [pins])

  useEffect(
    () => () => {
      controlsCleanupRef.current?.()
      controlsCleanupRef.current = null
      pinPointerCleanupRef.current?.()
      pinPointerCleanupRef.current = null
      stopAllPinHoverSprings()
      clearTooltipTimers()
      setPinTooltip(null)
      setTooltipVisible(false)
    },
    [clearTooltipTimers],
  )

  /** World-space starfield (fixed shell); orbit + autoRotate move the camera so stars drift with the globe. */
  useEffect(() => {
    let cancelled = false
    let raf = 0
    let attempts = 0
    const maxAttempts = 150

    const syncStarfield = () => {
      if (cancelled) return
      const inst = ref?.current
      const scene = inst?.scene?.()
      if (!scene) {
        if (++attempts < maxAttempts) {
          raf = requestAnimationFrame(syncStarfield)
        }
        return
      }

      removeStarfieldFromScene(scene)
      if (theme === 'light') {
        scene.add(createStarfieldPoints())
      }
    }

    raf = requestAnimationFrame(syncStarfield)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      const inst = ref?.current
      const scene = inst?.scene?.()
      if (scene) removeStarfieldFromScene(scene)
    }
  }, [theme, ref])

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight || 400
      if (w > 0) setDims({ width: w, height: Math.max(h, 320) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={hostRef}
      className={`fanmap-globe-host fanmap-globe-host--${theme}`}
    >
      <GlobeGL
        ref={ref}
        width={dims.width}
        height={dims.height}
        globeOffset={theme === 'light' ? LIGHT_THEME_GLOBE_OFFSET : [0, 0]}
        animateIn={false}
        backgroundColor={GLOBE_THEMES[theme].backgroundColor}
        globeMaterial={GLOBE_BASE_MATERIAL[theme]}
        globeImageUrl={null}
        bumpImageUrl={null}
        showGlobe={true}
        showAtmosphere={true}
        atmosphereColor={GLOBE_THEMES[theme].atmosphereColor}
        atmosphereAltitude={0.18}
        polygonsData={POLYGONS}
        polygonGeoJsonGeometry="geometry"
        polygonCapColor={() => GLOBE_THEMES[theme].polygonCap}
        polygonSideColor={() => GLOBE_THEMES[theme].polygonSide}
        polygonStrokeColor={() => GLOBE_THEMES[theme].polygonStroke}
        polygonAltitude={() => 0.005}
        objectsData={pins}
        objectLat="displayLat"
        objectLng="displayLng"
        objectAltitude={0.012}
        objectFacesSurface={true}
        objectThreeObject={objectThreeObject}
        onZoom={syncPinScalesFromCamera}
        onGlobeReady={() => {
          let attempts = 0
          const setup = () => {
            if (controlsReady.current) return
            const inst = ref?.current
            if (!inst?.controls) {
              if (attempts++ < 40) requestAnimationFrame(setup)
              return
            }
            controlsReady.current = true
            inst.pointOfView(INITIAL_POINT_OF_VIEW, 0)
            const c = inst.controls()
            const globeR =
              typeof inst.getGlobeRadius === 'function'
                ? inst.getGlobeRadius()
                : 100
            globeRadiusRef.current = globeR
            c.minDistance = globeR * ZOOM_MIN_DISTANCE_GLOBE_R
            c.maxDistance = globeR * ZOOM_MAX_DISTANCE_GLOBE_R
            c.autoRotate = true
            autoRotateEaseFactorRef.current = 1

            const applyAutoRotateSpeed = () => {
              if (!c.autoRotate) return
              const zoomSpeed = computeAutoRotateSpeedFromDistance(
                c.getDistance(),
                globeRadiusRef.current,
              )
              c.autoRotateSpeed = zoomSpeed * autoRotateEaseFactorRef.current
            }
            applyAutoRotateSpeedRef.current = applyAutoRotateSpeed
            applyAutoRotateSpeed()

            let autoRotateResumeTimer = 0
            let autoRotateEaseRaf = 0

            const clearAutoRotateEase = () => {
              if (autoRotateEaseRaf) {
                cancelAnimationFrame(autoRotateEaseRaf)
                autoRotateEaseRaf = 0
              }
            }

            const clearAutoRotateResumeTimer = () => {
              if (autoRotateResumeTimer) {
                clearTimeout(autoRotateResumeTimer)
                autoRotateResumeTimer = 0
              }
            }

            const easeInAutoRotate = () => {
              clearAutoRotateEase()
              c.autoRotate = true
              autoRotateEaseFactorRef.current = 0
              applyAutoRotateSpeed()
              const start = performance.now()

              const tick = (now) => {
                const t = Math.min(1, (now - start) / AUTO_ROTATE_EASE_MS)
                // Smooth ease-in (cubic): starts slow, then settles at full speed.
                autoRotateEaseFactorRef.current = t * t * t
                applyAutoRotateSpeed()
                if (t < 1) {
                  autoRotateEaseRaf = requestAnimationFrame(tick)
                } else {
                  autoRotateEaseRaf = 0
                  autoRotateEaseFactorRef.current = 1
                  applyAutoRotateSpeed()
                }
              }

              autoRotateEaseRaf = requestAnimationFrame(tick)
            }

            const pauseRotate = () => {
              clearAutoRotateEase()
              clearAutoRotateResumeTimer()
              c.autoRotate = false
              autoRotateEaseFactorRef.current = 1
            }

            const scheduleResumeRotate = () => {
              clearAutoRotateResumeTimer()
              clearAutoRotateEase()
              autoRotateResumeTimer = window.setTimeout(() => {
                autoRotateResumeTimer = 0
                easeInAutoRotate()
              }, AUTO_ROTATE_RESUME_MS)
            }

            c.addEventListener('start', pauseRotate)
            c.addEventListener('end', scheduleResumeRotate)
            c.addEventListener('change', syncPinScalesFromCamera)
            controlsCleanupRef.current = () => {
              clearAutoRotateResumeTimer()
              clearAutoRotateEase()
              applyAutoRotateSpeedRef.current = () => {}
              c.removeEventListener('start', pauseRotate)
              c.removeEventListener('end', scheduleResumeRotate)
              c.removeEventListener('change', syncPinScalesFromCamera)
            }
            syncPinScalesFromCamera()

            let oceanScaleAttempts = 0
            const ensureOceanScale = () => {
              if (applyOceanSphereScale(inst)) return
              if (oceanScaleAttempts++ < 40) requestAnimationFrame(ensureOceanScale)
            }
            ensureOceanScale()

            pinPointerCleanupRef.current?.()
            pinPointerCleanupRef.current = attachPinPointerHover(
              inst,
              handlePinTooltipChange,
            )
          }
          requestAnimationFrame(setup)
        }}
      />
      {pinTooltip && (
        <div
          className={`fanmap-pin-tooltip${tooltipVisible ? ' fanmap-pin-tooltip--visible' : ''}`}
          role="tooltip"
          style={{
            left: pinTooltip.x,
            top: pinTooltip.y,
            transform: `translate(-50%, calc(-100% - ${TOOLTIP_OFFSET_PX}px)) scale(${tooltipZoomScale})`,
          }}
        >
          {pinTooltip.city}
        </div>
      )}
    </div>
  )
})
