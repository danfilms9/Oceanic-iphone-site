import {
  collection,
  onSnapshot,
  writeBatch,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase.js'

/**
 * @param {(pins: Array<{ id: string, city: string, country: string, lat: number, lng: number, createdAt: number | null }>) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToPins(callback) {
  const pinsRef = collection(db, 'pins')
  return onSnapshot(pinsRef, (snapshot) => {
    const pins = snapshot.docs.map((d) => {
      const data = d.data()
      const createdAt =
        data.createdAt && typeof data.createdAt.toMillis === 'function'
          ? data.createdAt.toMillis()
          : null
      return {
        id: d.id,
        city: data.city,
        country: data.country,
        lat: data.lat,
        lng: data.lng,
        createdAt,
      }
    })
    callback(pins)
  })
}

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * @typedef {{ smsConsent: boolean, smsConsentAt: string, smsConsentSource: string, smsConsentText: string }} SmsConsentRecord
 */

/**
 * SMS consent fields stored on every subscriber (TCPA proof-of-consent).
 * @param {SmsConsentRecord | undefined} consent
 */
function consentFields(consent) {
  return {
    smsConsent: consent?.smsConsent === true,
    smsConsentAt: consent?.smsConsentAt ?? '',
    smsConsentSource: consent?.smsConsentSource ?? '',
    smsConsentText: consent?.smsConsentText ?? '',
  }
}

/**
 * Atomic create: pin (public map) + subscriber (private PII) succeed or neither is written.
 * City/country live on the pin for the globe; duplicated on subscriber for admin/export.
 *
 * @param {{ city: string, country: string, lat: number, lng: number }} pinData
 * @param {{ firstName: string, lastName: string, email: string, city: string, country: string, phone?: string | null, consent?: SmsConsentRecord }} subscriberData
 * @returns {Promise<{ pinId: string }>}
 */
export async function addPinWithSubscriber(pinData, subscriberData) {
  const email = String(subscriberData.email).trim().toLowerCase()
  const firstName = String(subscriberData.firstName).trim()
  const lastName = String(subscriberData.lastName).trim()
  const phone =
    typeof subscriberData.phone === 'string' ? subscriberData.phone.trim() : ''
  if (!firstName || !lastName || !EMAIL_REGEX.test(email)) {
    throw new Error('Invalid subscriber data')
  }

  const batch = writeBatch(db)
  const pinRef = doc(collection(db, 'pins'))
  const subRef = doc(collection(db, 'subscribers'))

  batch.set(pinRef, {
    city: pinData.city,
    country: pinData.country,
    lat: pinData.lat,
    lng: pinData.lng,
    createdAt: serverTimestamp(),
  })
  batch.set(subRef, {
    firstName,
    lastName,
    email,
    city: subscriberData.city,
    country: subscriberData.country,
    createdAt: serverTimestamp(),
    ...(phone ? { phone } : {}),
    ...consentFields(subscriberData.consent),
  })

  await batch.commit()
  return { pinId: pinRef.id }
}

/**
 * Mailing-list signup without a map pin (no city / coordinates).
 *
 * @param {{ firstName: string, lastName: string, email: string, city?: string, country?: string, phone?: string | null, consent?: SmsConsentRecord }} subscriberData
 */
export async function addSubscriberOnly(subscriberData) {
  const email = String(subscriberData.email).trim().toLowerCase()
  const firstName = String(subscriberData.firstName).trim()
  const lastName = String(subscriberData.lastName).trim()
  const phone =
    typeof subscriberData.phone === 'string' ? subscriberData.phone.trim() : ''
  if (!firstName || !lastName || !EMAIL_REGEX.test(email)) {
    throw new Error('Invalid subscriber data')
  }

  const batch = writeBatch(db)
  const subRef = doc(collection(db, 'subscribers'))
  batch.set(subRef, {
    firstName,
    lastName,
    email,
    city: String(subscriberData.city ?? '').trim(),
    country: String(subscriberData.country ?? '').trim(),
    createdAt: serverTimestamp(),
    ...(phone ? { phone } : {}),
    ...consentFields(subscriberData.consent),
  })
  await batch.commit()
}
