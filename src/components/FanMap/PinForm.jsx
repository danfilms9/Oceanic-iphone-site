import { useCallback, useState } from 'react'
import { CityAutocomplete } from './CityAutocomplete.jsx'

/** @param {{ disabled: boolean, onDropPin: (place: { city: string, country: string, lat: number, lng: number, state?: string, stateCode?: string, countryCode?: string, formatted?: string, locationLabel?: string }) => void }} props */
export function PinForm({ disabled, onDropPin }) {
  const [selected, setSelected] = useState(null)

  const handleSelect = useCallback((place) => {
    setSelected(place)
  }, [])

  const handleDropClick = () => {
    if (!selected || disabled) return
    onDropPin(selected)
  }

  return (
    <div className="fanmap-pin-form">
      <CityAutocomplete
        onSelect={handleSelect}
        disabled={disabled}
        placeholder="Search for your city…"
      />
      {selected && (
        <div className="fanmap-pin-form__chosen">
          <button
            type="button"
            className="fanmap-button fanmap-button--primary"
            disabled={disabled}
            onClick={handleDropClick}
          >
            Drop Pin
          </button>
        </div>
      )}
    </div>
  )
}
