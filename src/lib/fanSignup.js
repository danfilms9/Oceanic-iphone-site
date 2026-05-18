import { addPinWithSubscriber, addSubscriberOnly } from './pins.js'
import { resolveNotionLocationLabel } from './formatLocation.js'
import { submitEmailEntry } from '../services/emailService'

/**
 * @typedef {{
 *   city: string,
 *   country: string,
 *   lat: number,
 *   lng: number,
 *   state?: string,
 *   stateCode?: string,
 *   countryCode?: string,
 *   formatted?: string,
 *   locationLabel?: string,
 * }} FanPlace
 */

/**
 * One signup path for map modal and email app: Firestore first, Notion best-effort.
 * When `place` has coordinates, writes a public pin + private subscriber; otherwise subscriber only.
 * Phone is optional and currently sent to Notion only (Firestore rules don't accept extra keys).
 *
 * @param {{ firstName: string, lastName: string, email: string, phone?: string | null, place?: FanPlace | null }} payload
 */
export async function submitFanSignup({ firstName, lastName, email, phone = null, place = null }) {
  const trimmedCity = place?.city?.trim() ?? ''
  const trimmedCountry = place?.country?.trim() ?? ''
  const notionLocation = (await resolveNotionLocationLabel(place)) || trimmedCity
  const trimmedPhone = typeof phone === 'string' ? phone.trim() : ''
  const hasCoords =
    place != null &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng) &&
    trimmedCity

  if (hasCoords) {
    await addPinWithSubscriber(
      {
        city: trimmedCity,
        country: trimmedCountry || 'Unknown',
        lat: place.lat,
        lng: place.lng,
      },
      {
        firstName,
        lastName,
        email,
        city: trimmedCity,
        country: trimmedCountry || 'Unknown',
        phone: trimmedPhone,
      },
    )
  } else {
    await addSubscriberOnly({
      firstName,
      lastName,
      email,
      city: trimmedCity,
      country: trimmedCountry,
      phone: trimmedPhone,
    })
  }

  await submitEmailEntry({
    firstName,
    lastName,
    email,
    ...(notionLocation ? { city: notionLocation } : {}),
    ...(trimmedPhone ? { phone: trimmedPhone } : {}),
  })
}
