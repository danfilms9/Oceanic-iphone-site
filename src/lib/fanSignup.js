import { addPinWithSubscriber, addSubscriberOnly } from './pins.js'
import { submitEmailEntry } from '../services/emailService'

/**
 * @typedef {{ city: string, country: string, lat: number, lng: number }} FanPlace
 */

/**
 * One signup path for map modal and email app: Firestore first, Notion best-effort.
 * When `place` has coordinates, writes a public pin + private subscriber; otherwise subscriber only.
 *
 * @param {{ firstName: string, lastName: string, email: string, place?: FanPlace | null }} payload
 */
export async function submitFanSignup({ firstName, lastName, email, place = null }) {
  const trimmedCity = place?.city?.trim() ?? ''
  const trimmedCountry = place?.country?.trim() ?? ''
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
      },
    )
  } else {
    await addSubscriberOnly({
      firstName,
      lastName,
      email,
      city: trimmedCity,
      country: trimmedCountry,
    })
  }

  try {
    await submitEmailEntry({
      firstName,
      lastName,
      email,
      ...(trimmedCity ? { city: trimmedCity } : {}),
    })
  } catch (notionErr) {
    console.warn('[fanSignup] Firestore saved; Notion email entry failed:', notionErr)
  }
}
