import { useEffect, useLayoutEffect, useRef } from 'react'
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete'
import '@geoapify/geocoder-autocomplete/styles/minimal.css'
import { getGeoapifyKey, logGeoapifyEnvDebug } from '../../lib/geoapifyEnv.js'

/** @param {{ onSelect: (place: { city: string, country: string, lat: number, lng: number }) => void, disabled?: boolean, placeholder?: string, className?: string }} props */
export function CityAutocomplete({
  onSelect,
  disabled = false,
  placeholder = 'Search for your city…',
  className = 'fanmap-geocoder',
}) {
  const containerRef = useRef(null)
  const onSelectRef = useRef(onSelect)

  useLayoutEffect(() => {
    onSelectRef.current = onSelect
  })

  useEffect(() => {
    logGeoapifyEnvDebug()

    const GEO_KEY = getGeoapifyKey()
    const el = containerRef.current
    if (!el || !GEO_KEY) return

    el.innerHTML = ''
    const ac = new GeocoderAutocomplete(el, GEO_KEY, {
      type: 'city',
      limit: 5,
      debounceDelay: 300,
      placeholder,
    })

    ac.on('select', (feature) => {
      const p = feature.properties ?? {}
      const city = (p.city || p.name || '').trim()
      const country =
        typeof p.country === 'string'
          ? p.country.trim()
          : String(p.country ?? '').trim() || 'Unknown'
      const lat = typeof p.lat === 'number' ? p.lat : parseFloat(String(p.lat))
      const lonVal = p.lon ?? p.lng
      const lng =
        typeof lonVal === 'number' ? lonVal : parseFloat(String(lonVal ?? ''))
      if (Number.isFinite(lat) && Number.isFinite(lng) && city) {
        onSelectRef.current({
          city,
          country,
          lat,
          lng,
        })
      }
    })

    return () => {
      el.innerHTML = ''
    }
  }, [placeholder])

  useEffect(() => {
    const input = containerRef.current?.querySelector('input')
    if (input) input.disabled = disabled
  }, [disabled])

  const geoKey = getGeoapifyKey()
  if (!geoKey) {
    return (
      <p className="fanmap-geocoder-error" role="alert">
        Set VITE_GEOAPIFY_KEY in the project root .env file and restart the dev
        server (Vite loads env only at startup). See console [FanMap Geoapify] for
        details.
      </p>
    )
  }

  return (
    <div
      className={`${className} geoapify-geocoder-autocomplete-container`}
      ref={containerRef}
      style={{ position: 'relative' }}
    />
  )
}
