/**
 * @typedef {{
 *   city?: string,
 *   state?: string,
 *   stateCode?: string,
 *   country?: string,
 *   countryCode?: string,
 *   formatted?: string,
 *   locationLabel?: string,
 *   lat?: number,
 *   lng?: number,
 * }} LocationParts
 */

const NOTION_LOCATION_MAX = 2000

/**
 * @param {string} value
 * @returns {string}
 */
function truncate(value) {
  return value.length > NOTION_LOCATION_MAX
    ? value.slice(0, NOTION_LOCATION_MAX)
    : value
}

/**
 * @param {string} countryCode
 * @returns {boolean}
 */
function isUnitedStates(countryCode, country) {
  return (
    countryCode?.toUpperCase() === 'US' ||
    country === 'United States' ||
    country === 'United States of America' ||
    country === 'USA'
  )
}

/**
 * Try to read a US state code from Geoapify address lines (e.g. "Tampa, FL 33602, United States").
 * @param {string} line
 * @returns {string}
 */
function parseUsStateCodeFromAddressLine(line) {
  if (!line) return ''
  const betweenCommas = line.match(/,\s*([A-Z]{2})\s*,/i)
  if (betweenCommas) return betweenCommas[1].toUpperCase()
  const segmentMatch = line.match(/,\s*([A-Z]{2})(?:\s+\d{5}|\s*,|\s*$)/i)
  if (segmentMatch) return segmentMatch[1].toUpperCase()
  return ''
}

/**
 * @param {Record<string, unknown>} p
 * @returns {{ state: string, stateCode: string }}
 */
export function readStateFromGeoapifyProperties(p) {
  const state =
    typeof p.state === 'string' ? p.state.trim() : String(p.state ?? '').trim()
  let stateCode =
    typeof p.state_code === 'string'
      ? p.state_code.trim()
      : String(p.state_code ?? '').trim()

  if (!stateCode && typeof p.iso3166_2 === 'string') {
    const isoMatch = p.iso3166_2.trim().match(/^[A-Z]{2}-(.+)$/i)
    if (isoMatch) stateCode = isoMatch[1].toUpperCase()
  }

  const countryCode =
    typeof p.country_code === 'string'
      ? p.country_code.trim()
      : String(p.country_code ?? '').trim()
  const country =
    typeof p.country === 'string'
      ? p.country.trim()
      : String(p.country ?? '').trim()

  if (!state && !stateCode && isUnitedStates(countryCode, country)) {
    const region =
      typeof p.region === 'string' ? p.region.trim() : String(p.region ?? '').trim()
    if (region) return { state: region, stateCode: '' }
  }

  if (!stateCode && isUnitedStates(countryCode, country)) {
    const line2 =
      typeof p.address_line2 === 'string'
        ? p.address_line2
        : String(p.address_line2 ?? '')
    const line1 =
      typeof p.address_line1 === 'string'
        ? p.address_line1
        : String(p.address_line1 ?? '')
    const formatted =
      typeof p.formatted === 'string'
        ? p.formatted
        : String(p.formatted ?? '')
    stateCode =
      parseUsStateCodeFromAddressLine(formatted) ||
      parseUsStateCodeFromAddressLine(line2) ||
      parseUsStateCodeFromAddressLine(line1)
  }

  return { state, stateCode }
}

/**
 * @param {Record<string, unknown>} p
 * @param {number} lat
 * @param {number} lng
 * @returns {LocationParts & { lat: number, lng: number } | null}
 */
export function placeFromGeoapifyProperties(p, lat, lng) {
  const city = (p.city || p.name || '').trim()
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !city) return null

  const country =
    typeof p.country === 'string'
      ? p.country.trim()
      : String(p.country ?? '').trim() || 'Unknown'
  const countryCode =
    typeof p.country_code === 'string'
      ? p.country_code.trim()
      : String(p.country_code ?? '').trim()
  const formatted =
    typeof p.formatted === 'string'
      ? p.formatted.trim()
      : String(p.formatted ?? '').trim()
  const { state, stateCode } = readStateFromGeoapifyProperties(p)

  return {
    city,
    country,
    ...(state ? { state } : {}),
    ...(stateCode ? { stateCode } : {}),
    ...(countryCode ? { countryCode } : {}),
    ...(formatted ? { formatted } : {}),
    lat,
    lng,
  }
}

/**
 * Reverse-geocode coordinates to fill missing US state when city autocomplete omits it.
 * @param {string} apiKey
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ state?: string, stateCode?: string }>}
 */
export async function fetchStateFromReverseGeocode(apiKey, lat, lng) {
  if (!apiKey) return {}
  try {
    const url = new URL('https://api.geoapify.com/v1/geocode/reverse')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('apiKey', apiKey)
    const res = await fetch(url.toString())
    if (!res.ok) return {}
    const data = await res.json()
    const props = data?.features?.[0]?.properties
    if (!props) return {}
    const { state, stateCode } = readStateFromGeoapifyProperties(props)
    return {
      ...(state ? { state } : {}),
      ...(stateCode ? { stateCode } : {}),
    }
  } catch {
    return {}
  }
}

/**
 * Resolves the Notion/Mailchimp location string, enriching with reverse geocode if needed.
 * @param {LocationParts | null | undefined} place
 * @returns {Promise<string>}
 */
export async function resolveNotionLocationLabel(place) {
  if (!place) return ''

  const preset = place.locationLabel?.trim()
  if (preset) return preset.length > NOTION_LOCATION_MAX ? preset.slice(0, NOTION_LOCATION_MAX) : preset

  let enriched = place
  const city = place.city?.trim()
  const hasRegion = Boolean(place.stateCode?.trim() || place.state?.trim())
  const formatted = place.formatted?.trim()
  const parsedFromFormatted =
    !hasRegion && formatted
      ? parseUsStateCodeFromAddressLine(formatted)
      : ''

  if (!hasRegion && !parsedFromFormatted && city && Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    const { getGeoapifyKey } = await import('./geoapifyEnv.js')
    const apiKey = getGeoapifyKey()
    if (
      apiKey &&
      isUnitedStates(place.countryCode, place.country?.trim())
    ) {
      const extra = await fetchStateFromReverseGeocode(
        apiKey,
        place.lat,
        place.lng,
      )
      if (extra.state || extra.stateCode) {
        enriched = { ...place, ...extra }
      }
    }
  }

  return formatLocationLabel(enriched)
}

/**
 * Human-readable location for Notion / Mailchimp (e.g. "Saint Petersburg, FL, United States").
 * @param {LocationParts | null | undefined} place
 * @returns {string}
 */
export function formatLocationLabel(place) {
  if (!place) return ''

  const city = place.city?.trim()
  const stateCode = place.stateCode?.trim()
  const state = place.state?.trim()
  const country = place.country?.trim()
  const formatted = place.formatted?.trim()
  let region = stateCode || state
  if (!region && formatted) {
    region = parseUsStateCodeFromAddressLine(formatted)
  }
  const isUS = isUnitedStates(place.countryCode, country)

  if (city) {
    if (region && isUS) {
      const countryLabel =
        country && country !== 'Unknown' ? country : 'United States'
      return truncate(`${city}, ${region}, ${countryLabel}`)
    }
    if (region && country && country !== 'Unknown') {
      return truncate(`${city}, ${region}, ${country}`)
    }
    if (country && country !== 'Unknown') {
      return truncate(`${city}, ${country}`)
    }
    return truncate(city)
  }

  return formatted ? truncate(formatted) : ''
}
