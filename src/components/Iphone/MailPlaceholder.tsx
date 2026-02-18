import { useState } from 'react';
import { TitleBar } from './TitleBar';
import { BottomBar } from './BottomBar';
import { submitEmailEntry } from '../../services/emailService';

export function MailPlaceholder() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setSubmitStatus('error');
      setErrorMessage('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      await submitEmailEntry({ firstName, lastName, email });
      setSubmitStatus('success');
      // Clear form
      setFirstName('');
      setLastName('');
      setEmail('');
      // Reset status after 3 seconds
      setTimeout(() => {
        setSubmitStatus('idle');
        setErrorMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="iphone-mail">
      <TitleBar title="E-mail List" />
      
      {/* Content Area */}
      <div className="iphone-mail-content">
        <form onSubmit={handleSubmit} className="iphone-mail-form">
          {/* Stay Updated Text */}
          <div className="iphone-mail-stay-updated">Stay Updated</div>
          
          {/* Form Fields */}
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
              />
            </div>
            <div className="iphone-settings-option iphone-settings-option-bottom-three iphone-mail-form-field">
              <span className="iphone-mail-form-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="iphone-mail-form-input"
                placeholder="japples@gmail.com"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="iphone-mail-submit-button"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>

          {/* Status Message */}
          {submitStatus === 'success' && (
            <div className="iphone-mail-status iphone-mail-status-success">
              Success! Now go have a great day!
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="iphone-mail-status iphone-mail-status-error">
              {errorMessage || 'Please fill in all fields'}
            </div>
          )}
        </form>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomBar
        centerContent={
          <div className="iphone-calendar-segmented-control">
            <button
              className="iphone-calendar-segmented-button iphone-calendar-segmented-button-selected"
            >
              Inbox
            </button>
            <button
              className="iphone-calendar-segmented-button"
            >
              Sent
            </button>
          </div>
        }
      />
    </div>
  );
}
