/**
 * Service for submitting email entries to Notion database
 */

export interface EmailEntry {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Submits an email entry to the Notion database via backend proxy
 */
export async function submitEmailEntry(entry: EmailEntry): Promise<void> {
  try {
    const response = await fetch('/api/notion/email-entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Failed to submit entry: ${response.statusText}`;
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Error submitting email entry:', error);
    throw error;
  }
}
