import { useState } from 'react';
import { TitleBar } from './TitleBar';
import { BottomBar } from './BottomBar';
import { CityAutocomplete } from '../FanMap/CityAutocomplete.jsx';
import { submitFanSignup } from '../../lib/fanSignup.js';
import { SmsConsentField } from '../SmsConsentField';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';

export function MailPlaceholder() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<{
    city: string;
    country: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // SMS opt-in must start unchecked (TCPA) — never pre-check this.
  const [smsConsent, setSmsConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cityAutocompleteKey, setCityAutocompleteKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setSubmitStatus('error');
      setErrorMessage('Please fill in your name and email.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const trimmedPhone = phone.trim();
      await submitFanSignup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: trimmedPhone || null,
        place: selectedPlace,
        smsConsent: Boolean(trimmedPhone) && smsConsent,
        formId: 'email-list-app',
      });
      setSubmitStatus('success');
      setFirstName('');
      setLastName('');
      setSelectedPlace(null);
      setCityAutocompleteKey((k) => k + 1);
      setEmail('');
      setPhone('');
      setSmsConsent(false);
      setTimeout(() => {
        setSubmitStatus('idle');
        setErrorMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to submit entry. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="iphone-mail">
      <TitleBar title="E-mail List" />

      <div className="iphone-mail-content">
        <form onSubmit={handleSubmit} className="iphone-mail-form">
          <div className="iphone-mail-stay-updated">Stay Updated</div>

          <div className="iphone-settings-options iphone-mail-form-container">
            <div className="iphone-mail-form-divider"></div>
            <div className="iphone-settings-option iphone-settings-option-top iphone-mail-form-field">
              <span className="iphone-mail-form-label">First Name</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="iphone-mail-form-input"
                placeholder="Johnny"
                disabled={isSubmitting}
              />
            </div>
            <div className="iphone-settings-option iphone-settings-option-middle-three iphone-mail-form-field">
              <span className="iphone-mail-form-label">Last Name</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="iphone-mail-form-input"
                placeholder="Appleseed"
                disabled={isSubmitting}
              />
            </div>
            <div className="iphone-settings-option iphone-settings-option-middle-three iphone-mail-form-field">
              <span className="iphone-mail-form-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="iphone-mail-form-input"
                placeholder="japples@gmail.com"
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>
            <div
              className="iphone-settings-option iphone-settings-option-middle-three iphone-mail-form-field"
              aria-label="Phone (optional)"
            >
              <span className="iphone-mail-form-label">
                Phone <span className="iphone-mail-city-optional">(optional)</span>
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="iphone-mail-form-input"
                placeholder="(555) 123-4567"
                disabled={isSubmitting}
                autoComplete="tel"
                maxLength={32}
              />
            </div>
            <div className="iphone-settings-option iphone-settings-option-middle-three iphone-mail-form-field iphone-mail-sms-consent">
              <SmsConsentField
                checked={smsConsent}
                onChange={setSmsConsent}
                disabled={isSubmitting}
                theme="light"
              />
            </div>
            <div
              className="iphone-settings-option iphone-settings-option-bottom-three iphone-mail-form-field"
              aria-label="City (optional)"
            >
              <span className="iphone-mail-form-label">
                City <span className="iphone-mail-city-optional">(optional)</span>
              </span>
              <div className="iphone-mail-form-city-input">
                <CityAutocomplete
                  key={cityAutocompleteKey}
                  className="iphone-mail-geocoder"
                  placeholder="Oceanville"
                  disabled={isSubmitting}
                  onSelect={(place) => setSelectedPlace(place)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="iphone-mail-submit-button"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>

          {submitStatus === 'success' && (
            <div className="iphone-mail-status iphone-mail-status-success">
              Success! Now go have a great day!
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="iphone-mail-status iphone-mail-status-error">
              {errorMessage || 'Please fill in your name and email.'}
            </div>
          )}
        </form>
      </div>

      <BottomBar
        centerContent={
          <div className="iphone-calendar-segmented-control">
            <button
              type="button"
              className="iphone-calendar-segmented-button iphone-calendar-segmented-button-selected"
            >
              Inbox
            </button>
            <button type="button" className="iphone-calendar-segmented-button">
              Sent
            </button>
          </div>
        }
      />
    </div>
  );
}
