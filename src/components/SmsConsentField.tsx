import {
  SMS_BRAND_NAME,
  SMS_TERMS_PATH,
  PRIVACY_POLICY_PATH,
} from '../lib/smsConsent'
import './SmsConsentField.css'

interface SmsConsentFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** 'dark' for dark backgrounds, 'light' for light backgrounds. */
  theme?: 'dark' | 'light'
}

/**
 * TCPA/CTIA-compliant SMS opt-in checkbox. Must never be pre-checked and is
 * separate from any email consent. The visible copy here must stay in sync
 * with SMS_CONSENT_DISCLOSURE in src/lib/smsConsent.ts, which is what gets
 * stored as the proof-of-consent text.
 */
export function SmsConsentField({
  checked,
  onChange,
  disabled = false,
  theme = 'dark',
}: SmsConsentFieldProps) {
  return (
    <label className={`sms-consent sms-consent--${theme}`}>
      <input
        type="checkbox"
        className="sms-consent__checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-describedby="sms-consent-disclosure"
      />
      <span className="sms-consent__text" id="sms-consent-disclosure">
        Yes, text me tour updates. I agree to receive recurring automated
        marketing text messages from {SMS_BRAND_NAME} at the number provided.
        Consent is not a condition of any purchase. Msg &amp; data rates may
        apply. Msg frequency varies. Reply STOP to opt out, HELP for help. See{' '}
        <a
          href={SMS_TERMS_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="sms-consent__link"
          onClick={(e) => e.stopPropagation()}
        >
          SMS Terms
        </a>{' '}
        and{' '}
        <a
          href={PRIVACY_POLICY_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="sms-consent__link"
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </a>
        .
      </span>
    </label>
  )
}
