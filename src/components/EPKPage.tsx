import { useState, useEffect, useRef } from 'react'
import './EPKPage.css'

const HOLD_MS = 2000
const FADE_SPINNER_MS = 1000
const FADE_OVERLAY_MS = 1000
const UNMOUNT_OVERLAY_MS = HOLD_MS + FADE_SPINNER_MS + FADE_OVERLAY_MS

export function EPKPage() {
  const [embedLoaded, setEmbedLoaded] = useState(false)
  const [spinnerAndTextVisible, setSpinnerAndTextVisible] = useState(true)
  const [overlayFadingOut, setOverlayFadingOut] = useState(false)
  const [overlayUnmounted, setOverlayUnmounted] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!embedLoaded) return
    timersRef.current.push(
      setTimeout(() => setSpinnerAndTextVisible(false), HOLD_MS),
      setTimeout(() => setOverlayFadingOut(true), HOLD_MS + FADE_SPINNER_MS),
      setTimeout(() => setOverlayUnmounted(true), UNMOUNT_OVERLAY_MS)
    )
    return () => timersRef.current.forEach(clearTimeout)
  }, [embedLoaded])

  const showOverlay = !embedLoaded || !overlayUnmounted

  return (
    <div className="epk-container">
      {showOverlay && (
        <div
          className={`epk-loading ${overlayFadingOut ? 'epk-loading--fade-out' : ''}`}
          aria-hidden={overlayFadingOut}
        >
          <div
            className={`epk-loading-content ${spinnerAndTextVisible ? '' : 'epk-loading-content--fade-out'}`}
          >
            <div className="epk-loading-spinner" />
            <span className="epk-loading-text">LOADING</span>
          </div>
        </div>
      )}
      <iframe
        src="https://my.spline.design/oceanicepk-cf85e29646ce94f653e75d4c042997bd/"
        frameBorder="0"
        width="100%"
        height="100%"
        title="EPK Spline"
        onLoad={() => setEmbedLoaded(true)}
      />
    </div>
  )
}
