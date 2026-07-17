import { Link } from 'react-router-dom'
import { SMS_BRAND_NAME, SMS_TERMS_PATH } from '../../lib/smsConsent'
import './LegalPage.css'

const CONTACT_EMAIL = 'booking@oceanicofficial.com'

export function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <div className="legal-page__inner">
        <Link to="/" className="legal-page__back">
          &larr; Back
        </Link>
        <h1 className="legal-page__title">{SMS_BRAND_NAME} Privacy Policy</h1>
        <p className="legal-page__updated">Last updated: July 17, 2026</p>

        <h2>1. What we collect</h2>
        <p>When you sign up for updates or drop a pin on our map, we collect:</p>
        <ul>
          <li>Your first and last name</li>
          <li>Your email address</li>
          <li>Your phone number (optional)</li>
          <li>Your city (optional)</li>
          <li>
            If you opt in to texts: a consent record with the time of opt-in,
            the page and form where it happened, the disclosure text you saw,
            and your IP address
          </li>
        </ul>

        <h2>2. How we use it</h2>
        <p>
          We use your email to send you news and updates about{' '}
          {SMS_BRAND_NAME}. If — and only if — you checked the SMS opt-in box,
          we use your phone number to send the marketing text messages
          described in our <Link to={SMS_TERMS_PATH}>SMS Terms</Link>. We use
          your information only for the purposes you consented to. We do not
          sell your personal information, and we do not repurpose your phone
          number for anything you did not agree to.
        </p>

        <h2>3. Where it lives</h2>
        <p>
          Signup data is stored in our private databases (Google Firebase and
          Notion) and, for messaging, with our SMS delivery provider. Access is
          restricted to the {SMS_BRAND_NAME} team.
        </p>

        <h2>4. Withdrawing consent</h2>
        <p>
          You can withdraw SMS consent as easily as you gave it: reply{' '}
          <strong>STOP</strong> to any text, or email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. To stop
          email updates, email us the same way. Opt-outs are honored promptly
          and we maintain a suppression list so you are not contacted again.
        </p>

        <h2>5. Your rights (CCPA / GDPR)</h2>
        <p>
          Depending on where you live, you have the right to access, correct,
          or delete the personal information we hold about you, and to know
          how it is used. To exercise any of these rights, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will
          respond within the timeframe required by law.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions about this policy or your data? Reach us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>7. Changes</h2>
        <p>
          We may update this policy from time to time. Material changes will
          be reflected on this page with an updated date above.
        </p>
      </div>
    </div>
  )
}
