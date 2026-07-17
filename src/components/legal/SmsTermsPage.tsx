import { Link } from 'react-router-dom'
import { SMS_BRAND_NAME, PRIVACY_POLICY_PATH } from '../../lib/smsConsent'
import './LegalPage.css'

const CONTACT_EMAIL = 'booking@oceanicofficial.com'

export function SmsTermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-page__inner">
        <Link to="/" className="legal-page__back">
          &larr; Back
        </Link>
        <h1 className="legal-page__title">{SMS_BRAND_NAME} SMS Terms</h1>
        <p className="legal-page__updated">Last updated: July 17, 2026</p>

        <h2>1. The program</h2>
        <p>
          By opting in to text messages from {SMS_BRAND_NAME}, you agree to
          receive recurring automated marketing and promotional text messages
          (such as tour announcements, ticket on-sales, and music updates) at
          the phone number you provided. Message frequency varies. Consent is
          not a condition of any purchase.
        </p>

        <h2>2. Costs</h2>
        <p>
          Message and data rates may apply. Charges are billed by your mobile
          carrier. {SMS_BRAND_NAME} does not charge for the messages
          themselves.
        </p>

        <h2>3. Opting out</h2>
        <p>
          You can cancel at any time by replying <strong>STOP</strong> to any
          message. After you send STOP, we will confirm your opt-out and you
          will receive no further messages. You can also opt out by emailing us
          at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or by any
          other reasonable means, and we will honor the request promptly.
        </p>

        <h2>4. Help</h2>
        <p>
          Reply <strong>HELP</strong> to any message for assistance, or contact
          us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>5. Your consent record</h2>
        <p>
          When you check the SMS opt-in box, we record the time of your
          opt-in, the page and form where it happened, and the exact
          disclosure text you saw. We only send texts to people who actively
          checked the box — providing a phone number alone does not opt you in.
        </p>

        <h2>6. Carriers</h2>
        <p>
          Carriers are not liable for delayed or undelivered messages. Message
          delivery is subject to effective transmission from your carrier.
        </p>

        <h2>7. Privacy</h2>
        <p>
          Your phone number is used only for the messages you consented to and
          is never sold or repurposed. See our{' '}
          <Link to={PRIVACY_POLICY_PATH}>Privacy Policy</Link> for how we
          collect, use, and protect your information, and how to request access
          to or deletion of your data.
        </p>

        <h2>8. Changes</h2>
        <p>
          We may update these SMS Terms from time to time. Material changes
          will be reflected on this page with an updated date above.
        </p>
      </div>
    </div>
  )
}
