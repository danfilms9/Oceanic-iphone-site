/**
 * SMS marketing consent (TCPA / CTIA / CCPA / GDPR).
 *
 * The disclosure text below is the exact copy shown next to the opt-in
 * checkbox. It is also stored verbatim with every consent record so we can
 * prove what the subscriber saw at the moment of consent. If you edit the
 * copy, past records keep the text that was actually displayed.
 */

export const SMS_BRAND_NAME = 'Oceanic'

export const SMS_TERMS_PATH = '/sms-terms'
export const PRIVACY_POLICY_PATH = '/privacy'

export const SMS_CONSENT_DISCLOSURE =
  `Yes, text me tour updates. I agree to receive recurring automated ` +
  `marketing text messages from ${SMS_BRAND_NAME} at the number provided. ` +
  `Consent is not a condition of any purchase. Msg & data rates may apply. ` +
  `Msg frequency varies. Reply STOP to opt out, HELP for help. ` +
  `See SMS Terms and Privacy Policy.`

export interface SmsConsentRecord {
  /** Whether the SMS opt-in box was actively checked (never pre-checked). */
  smsConsent: boolean
  /** Client timestamp of the opt-in, ISO 8601. Empty when not consented. */
  smsConsentAt: string
  /** Form ID + page URL where consent was (or wasn't) given. */
  smsConsentSource: string
  /** Exact disclosure text shown at the moment of consent. */
  smsConsentText: string
}

/**
 * Builds the consent record captured on submit. Always records the consent
 * state (checked or not) so SMS sending can be gated on it — a typed phone
 * number alone is never treated as permission to text.
 */
export function buildSmsConsentRecord(
  smsConsent: boolean,
  formId: string,
): SmsConsentRecord {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''
  return {
    smsConsent,
    smsConsentAt: smsConsent ? new Date().toISOString() : '',
    smsConsentSource: pageUrl ? `${formId} — ${pageUrl}` : formId,
    smsConsentText: smsConsent ? SMS_CONSENT_DISCLOSURE : '',
  }
}
