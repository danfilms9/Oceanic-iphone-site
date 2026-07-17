import { addPinWithSubscriber, addSubscriberOnly } from './pins.js'
import { resolveNotionLocationLabel } from './formatLocation.js'
import { submitEmailEntry } from '../services/emailService'
import { buildSmsConsentRecord } from './smsConsent'

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
 * Phone is optional. SMS consent (TCPA) is recorded with every submission —
 * a typed phone number alone is never treated as permission to text.
 *
 * @param {{ firstName: string, lastName: string, email: string, phone?: string | null, place?: FanPlace | null, smsConsent?: boolean, formId?: string }} payload
 * @returns {Promise<{ pinId: string | null }>}
 */
export async function submitFanSignup({
  firstName,
  lastName,
  email,
  phone = null,
  place = null,
  smsConsent = false,
  formId = 'fan-signup',
}) {
  const trimmedCity = place?.city?.trim() ?? ''
  const trimmedCountry = place?.country?.trim() ?? ''
  const notionLocation = (await resolveNotionLocationLabel(place)) || trimmedCity
  const trimmedPhone = typeof phone === 'string' ? phone.trim() : ''
  // Consent only counts when a phone number was actually provided.
  const consent = buildSmsConsentRecord(smsConsent === true && Boolean(trimmedPhone), formId)
  const hasCoords =
    place != null &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng) &&
    trimmedCity

  /** @type {string | null} */
  let pinId = null

  if (hasCoords) {
    const result = await addPinWithSubscriber(
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
        consent,
      },
    )
    pinId = result.pinId
  } else {
    await addSubscriberOnly({
      firstName,
      lastName,
      email,
      city: trimmedCity,
      country: trimmedCountry,
      phone: trimmedPhone,
      consent,
    })
  }

  await submitEmailEntry({
    firstName,
    lastName,
    email,
    ...(notionLocation ? { city: notionLocation } : {}),
    ...(trimmedPhone ? { phone: trimmedPhone } : {}),
    smsConsent: consent.smsConsent,
    smsConsentAt: consent.smsConsentAt,
    smsConsentSource: consent.smsConsentSource,
    smsConsentText: consent.smsConsentText,
  })

  return { pinId }
}
