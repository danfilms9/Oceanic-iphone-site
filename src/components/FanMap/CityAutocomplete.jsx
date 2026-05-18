import { useEffect, useLayoutEffect, useRef } from 'react'
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete'
import '@geoapify/geocoder-autocomplete/styles/minimal.css'
import { getGeoapifyKey, logGeoapifyEnvDebug } from '../../lib/geoapifyEnv.js'
import {
  fetchStateFromReverseGeocode,
  formatLocationLabel,
  placeFromGeoapifyProperties,
} from '../../lib/formatLocation.js'

/** @param {{ onSelect: (place: { city: string, country: string, state?: string, stateCode?: string, countryCode?: string, formatted?: string, lat: number, lng: number }) => void, disabled?: boolean, placeholder?: string, className?: string }} props */
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

    ac.on('select', async (feature) => {
      const p = feature.properties ?? {}
      const lat = typeof p.lat === 'number' ? p.lat : parseFloat(String(p.lat))
      const lonVal = p.lon ?? p.lng
      const lng =
        typeof lonVal === 'number' ? lonVal : parseFloat(String(lonVal ?? ''))

      let place = placeFromGeoapifyProperties(p, lat, lng)
      if (!place) return

      const needsState =
        !place.stateCode &&
        !place.state &&
        (place.countryCode?.toUpperCase() === 'US' ||
          place.country === 'United States' ||
          place.country === 'United States of America')

      if (needsState) {
        const extra = await fetchStateFromReverseGeocode(GEO_KEY, lat, lng)
        place = { ...place, ...extra }
      }

      const displayValue = typeof ac.getValue === 'function' ? ac.getValue().trim() : ''
      if (displayValue && !place.formatted) {
        place = { ...place, formatted: displayValue }
      }

      const locationLabel = formatLocationLabel(place)
      if (locationLabel) {
        place = { ...place, locationLabel }
      }

      onSelectRef.current(place)
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
    ></div>
  )
}
