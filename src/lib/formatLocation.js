/**
 * @typedef {{
 *   city?: string,
 *   state?: string,
 *   stateCode?: string,
 *   country?: string,
 *   countryCode?: string,
 *   formatted?: string,
 * }} LocationParts
 */

const NOTION_LOCATION_MAX = 2000

/**
 * Human-readable location for Notion / Mailchimp (e.g. "Oklahoma City, OK, United States").
 * Prefers Geoapify `formatted` when present; otherwise builds from city, region, country.
 * @param {LocationParts | null | undefined} place
 * @returns {string}
 */
export function formatLocationLabel(place) {
  if (!place) return ''

  const formatted = place.formatted?.trim()
  if (formatted) {
    return formatted.length > NOTION_LOCATION_MAX
      ? formatted.slice(0, NOTION_LOCATION_MAX)
      : formatted
  }

  const city = place.city?.trim()
  if (!city) return ''

  const stateCode = place.stateCode?.trim()
  const state = place.state?.trim()
  const country = place.country?.trim()
  const region = stateCode || state
  const isUS =
    place.countryCode?.toUpperCase() === 'US' ||
    country === 'United States' ||
    country === 'USA'

  if (region && isUS) return `${city}, ${region}`
  if (region && country && country !== 'Unknown') {
    return `${city}, ${region}, ${country}`
  }
  if (country && country !== 'Unknown') return `${city}, ${country}`
  return city
}
