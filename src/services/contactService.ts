/**
 * Service for fetching contact information from Notion database
 */

export type ContactInfo = {
  name: string;
  email: string;
};

interface NotionContact {
  id: string;
  properties: {
    Name?: {
      title?: Array<{ plain_text: string }>;
    };
    Email?: {
      email?: string;
      rich_text?: Array<{ plain_text: string }>;
    };
  };
}

/**
 * Fetches all contact information from Notion database via backend proxy
 */
export async function fetchContactInfoFromNotion(): Promise<ContactInfo[]> {
  try {
    const response = await fetch('/api/notion/contact-info');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contact info: ${response.statusText}`);
    }
    
    const data: NotionContact[] = await response.json();
    
    // Map all contacts from the database
    const contacts: ContactInfo[] = data
      .map((contact) => {
        const properties = contact.properties;
        
        // Extract name from Name property
        const name = properties.Name?.title?.[0]?.plain_text || '';
        
        // Extract email - could be email type or rich_text
        let email = '';
        if (properties.Email?.email) {
          email = properties.Email.email;
        } else if (properties.Email?.rich_text?.[0]?.plain_text) {
          email = properties.Email.rich_text[0].plain_text;
        }
        
        // Only include contacts that have both name and email
        if (!name || !email) {
          return null;
        }
        
        return { name, email };
      })
      .filter((contact): contact is ContactInfo => contact !== null);
    
    return contacts;
  } catch (error) {
    console.error('Error fetching contact info from Notion:', error);
    return [];
  }
}

/**
 * Splits a full name into first and last name
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  // First word is first name, rest is last name
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}
