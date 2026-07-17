import { useState } from 'react'
import { SmsConsentField } from '../SmsConsentField'

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** @param {{ open: boolean, onCancel: () => void, onSubmitPayload: (payload: { firstName: string, lastName: string, email: string, phone?: string, smsConsent: boolean }) => Promise<void> }} props */
export function SubscriberModal({ open, onCancel, onSubmitPayload }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  // SMS opt-in must start unchecked (TCPA) — never pre-check this.
  const [smsConsent, setSmsConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  const handleSubmit = async () => {
    setError(null)
    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPhone = phone.trim()
    if (!trimmedFirst) {
      setError('Please enter your first name.')
      return
    }
    if (!trimmedLast) {
      setError('Please enter your last name.')
      return
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      await onSubmitPayload({
        firstName: trimmedFirst,
        lastName: trimmedLast,
        email: trimmedEmail,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        smsConsent: Boolean(trimmedPhone) && smsConsent,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong, try again'
      setError(message || 'Something went wrong, try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fanmap-modal-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="fanmap-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Mailing list"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fanmap-modal__fields">
          <label className="fanmap-modal__label">
            <span className="fanmap-modal__label-text">First name</span>
            <input
              type="text"
              className="fanmap-input"
              maxLength={100}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              disabled={submitting}
            />
          </label>
          <label className="fanmap-modal__label">
            <span className="fanmap-modal__label-text">Last name</span>
            <input
              type="text"
              className="fanmap-input"
              maxLength={100}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              disabled={submitting}
            />
          </label>
          <label className="fanmap-modal__label">
            <span className="fanmap-modal__label-text">Email</span>
            <input
              type="email"
              className="fanmap-input"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={submitting}
            />
          </label>
          <label className="fanmap-modal__label">
            <span className="fanmap-modal__label-text">
              Phone <span className="fanmap-modal__label-optional">(optional)</span>
            </span>
            <input
              type="tel"
              className="fanmap-input"
              maxLength={32}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              disabled={submitting}
            />
          </label>
          <SmsConsentField
            checked={smsConsent}
            onChange={setSmsConsent}
            disabled={submitting}
            theme="dark"
          />
        </div>
        {error && (
          <p className="fanmap-modal__error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="fanmap-button fanmap-button--primary fanmap-modal__submit"
          disabled={submitting}
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  )
}
