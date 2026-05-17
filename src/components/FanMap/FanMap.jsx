import { useEffect, useMemo, useRef, useState } from 'react'
import { Globe } from './Globe.jsx'
import { PinForm } from './PinForm.jsx'
import { SubscriberModal } from './SubscriberModal.jsx'
import { subscribeToPins } from '../../lib/pins.js'
import { submitFanSignup } from '../../lib/fanSignup.js'
import { spreadPinsForDisplay } from '../../lib/spreadPins.js'
import './FanMap.css'

const STORAGE_KEY = 'slide_pin_count'
const LEGACY_STORAGE_KEY = 'slide_pin_dropped'
const MAX_PINS_PER_BROWSER = 3
const THANKS_VISIBLE_MS = 5000
const THANKS_FADE_MS = 600

function readPinDropCount() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw != null) {
      const n = parseInt(raw, 10)
      if (Number.isFinite(n) && n > 0) {
        return Math.min(n, MAX_PINS_PER_BROWSER)
      }
    }
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY) === '1') return 1
    return 0
  } catch {
    return 0
  }
}

function writePinDropCount(count) {
  window.localStorage.setItem(STORAGE_KEY, String(count))
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

/** @param {{ layout?: 'default' | 'music' }} props */
export function FanMap({ layout = 'default' }) {
  const globeRef = useRef(null)
  const [pins, setPins] = useState([])
  const displayPins = useMemo(() => spreadPinsForDisplay(pins), [pins])
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingPin, setPendingPin] = useState(null)
  const [thanksMessage, setThanksMessage] = useState(null)
  const [thanksFading, setThanksFading] = useState(false)
  const [pinDropCount, setPinDropCount] = useState(readPinDropCount)
  const formDisabled = pinDropCount >= MAX_PINS_PER_BROWSER

  useEffect(() => {
    const unsub = subscribeToPins(setPins)
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!thanksMessage) {
      setThanksFading(false)
      return
    }
    setThanksFading(false)
    const fadeTimer = setTimeout(() => setThanksFading(true), THANKS_VISIBLE_MS)
    const clearTimer = setTimeout(() => {
      setThanksMessage(null)
      setThanksFading(false)
    }, THANKS_VISIBLE_MS + THANKS_FADE_MS)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(clearTimer)
    }
  }, [thanksMessage])

  const handleDropPin = (place) => {
    setPendingPin(place)
    setModalOpen(true)
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    setPendingPin(null)
  }

  const handleSubscriberSubmit = async ({ firstName, lastName, email }) => {
    if (!pendingPin) throw new Error('Missing place')

    const { city, country, lat, lng } = pendingPin

    await submitFanSignup({
      firstName,
      lastName,
      email,
      place: { city, country, lat, lng },
    })

    const nextCount = Math.min(pinDropCount + 1, MAX_PINS_PER_BROWSER)
    try {
      writePinDropCount(nextCount)
    } catch {
      /* ignore */
    }

    setPinDropCount(nextCount)
    setThanksMessage(`Thanks ${firstName}, well be sure to let you know when we're headed that way :)`)
    setModalOpen(false)
    setPendingPin(null)

    globeRef.current?.pointOfView(
      { lat, lng, altitude: 1.5 },
      1500,
    )
  }

  const isMusic = layout === 'music'
  const rootClass = `fanmap-root${isMusic ? ' fanmap-root--music' : ''}`

  return (
    <section className={rootClass} aria-label="Maps">
      {isMusic ? (
        <div className="fanmap-layout fanmap-layout--music">
          <div className="fanmap-globe-stack">
            <Globe ref={globeRef} pins={displayPins} theme="light" />
            <div className="fanmap-globe-overlay">
              <div className="fanmap-ios-settings-options-align">
                <div className="fanmap-ios-settings-group" role="group">
                  <div className="fanmap-ios-settings-row fanmap-ios-settings-row--content">
                    <p className="fanmap-music-lead">Drop a pin in your city to let us know where we should play our music songs next.</p>
                    <PinForm disabled={formDisabled} onDropPin={handleDropPin} />
                  </div>
                </div>
                {thanksMessage && (
                  <p
                    className={`fanmap-thanks fanmap-thanks--overlay${thanksFading ? ' fanmap-thanks--fading' : ''}`}
                    role="status"
                  >
                    {thanksMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="fanmap-header">
            <h1 className="fanmap-title">Maps</h1>
            <p className="fanmap-lead">Drop a pin in your city to let us know where we should play our music songs next.</p>
          </div>

          <div className="fanmap-layout">
            <Globe ref={globeRef} pins={displayPins} theme="dark" />
            <PinForm disabled={formDisabled} onDropPin={handleDropPin} />
          </div>

          {thanksMessage && (
            <p
              className={`fanmap-thanks${thanksFading ? ' fanmap-thanks--fading' : ''}`}
              role="status"
            >
              {thanksMessage}
            </p>
          )}
        </>
      )}

      <SubscriberModal
        key={
          pendingPin
            ? `pin-${pendingPin.lat}-${pendingPin.lng}`
            : 'fanmap-modal'
        }
        open={modalOpen && !!pendingPin}
        onCancel={handleModalCancel}
        onSubmitPayload={handleSubscriberSubmit}
      />
    </section>
  )
}
