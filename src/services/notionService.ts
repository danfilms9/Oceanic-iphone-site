import type { CalendarEvent, NotionEvent } from '../types/event';
import type { Note, NotionNote } from '../types/note';
import type { TrackingData } from '../utils/tracking';

/**
 * Parses a date string from Notion and creates a Date object in local time.
 * This prevents timezone issues where dates appear one day earlier.
 * Handles both date-only (YYYY-MM-DD) and date-time formats.
 */
function parseNotionDate(dateStr: string): Date {
  // Check if it's a date-only string (YYYY-MM-DD) or includes time
  if (dateStr.includes('T')) {
    // Date-time format: extract just the date part and parse in local time
    const dateOnly = dateStr.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
  } else {
    // Date-only format (YYYY-MM-DD)
    // Parse and create date in local time to avoid timezone shifts
    const [year, month, day] = dateStr.split('-').map(Number);
    // month is 0-indexed in JavaScript Date constructor
    return new Date(year, month - 1, day);
  }
}

/**
 * Fetches events from Notion database via a backend proxy
 * 
 * IMPORTANT: This calls a backend API endpoint that handles the Notion API calls
 * to keep your API key secure. You'll need to set up a backend server.
 * 
 * For development, you can use a simple Node.js/Express server or Vercel serverless function.
 */
export async function fetchEventsFromNotion(): Promise<CalendarEvent[]> {
  try {
    // This endpoint should be your backend proxy that calls Notion API
    // For local development: http://localhost:3001/api/notion/events
    // For production: your deployed backend URL
    const response = await fetch('/api/notion/events');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    
    const data: NotionEvent[] = await response.json();
    
    // Transform Notion data to CalendarEvent format
    return data
      .map((notionEvent) => {
        const properties = notionEvent.properties;
        
        // Get title from Name property
        const title = properties['Name']?.title?.[0]?.plain_text || '';
        
        // Handle Venue - could be rich_text or title
        let venueName = '';
        const venue = properties['Venue'];
        if (venue && 'rich_text' in venue && venue.rich_text?.[0]?.plain_text) {
          venueName = venue.rich_text[0].plain_text;
        } else if (venue && 'title' in venue && venue.title?.[0]?.plain_text) {
          venueName = venue.title[0].plain_text;
        }
        
        const dateStr = properties['Date']?.date?.start;
        
        // Handle City - could be rich_text or select
        let city = '';
        const cityProp = properties['City'];
        if (cityProp && 'rich_text' in cityProp && cityProp.rich_text?.[0]?.plain_text) {
          city = cityProp.rich_text[0].plain_text;
        } else if (cityProp && 'select' in cityProp && cityProp.select?.name) {
          city = cityProp.select.name;
        }
        
        // Handle State - could be rich_text or select
        let state = '';
        const stateProp = properties['State'];
        if (stateProp && 'rich_text' in stateProp && stateProp.rich_text?.[0]?.plain_text) {
          state = stateProp.rich_text[0].plain_text;
        } else if (stateProp && 'select' in stateProp && stateProp.select?.name) {
          state = stateProp.select.name;
        }
        
        const ticketLink = properties['Ticket Link']?.url || '';
        
        if (!dateStr) {
          return null; // Skip events without dates
        }
        
        return {
          id: notionEvent.id,
          title,
          venueName,
          date: parseNotionDate(dateStr),
          city,
          state,
          ticketLink,
        };
      })
      .filter((event): event is CalendarEvent => event !== null);
  } catch (error) {
    console.error('Error fetching events from Notion:', error);
    // Return empty array on error so the app doesn't break
    return [];
  }
}

/**
 * Alternative: Direct Notion API call (requires API key in frontend - NOT RECOMMENDED for production)
 * Only use this for development/testing with a public database
 */
export async function fetchEventsFromNotionDirect(apiKey: string, databaseId: string): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [
          {
            property: 'Date',
            direction: 'ascending',
          },
        ],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const notionEvents: NotionEvent[] = data.results;
    
    // Transform Notion data to CalendarEvent format
    return notionEvents
      .map((notionEvent) => {
        const properties = notionEvent.properties;
        
        // Get title from Name property
        const title = properties['Name']?.title?.[0]?.plain_text || '';
        
        // Handle Venue - could be rich_text or title
        let venueName = '';
        const venue = properties['Venue'];
        if (venue && 'rich_text' in venue && venue.rich_text?.[0]?.plain_text) {
          venueName = venue.rich_text[0].plain_text;
        } else if (venue && 'title' in venue && venue.title?.[0]?.plain_text) {
          venueName = venue.title[0].plain_text;
        }
        
        const dateStr = properties['Date']?.date?.start;
        
        // Handle City - could be rich_text or select
        let city = '';
        const cityProp = properties['City'];
        if (cityProp && 'rich_text' in cityProp && cityProp.rich_text?.[0]?.plain_text) {
          city = cityProp.rich_text[0].plain_text;
        } else if (cityProp && 'select' in cityProp && cityProp.select?.name) {
          city = cityProp.select.name;
        }
        
        // Handle State - could be rich_text or select
        let state = '';
        const stateProp = properties['State'];
        if (stateProp && 'rich_text' in stateProp && stateProp.rich_text?.[0]?.plain_text) {
          state = stateProp.rich_text[0].plain_text;
        } else if (stateProp && 'select' in stateProp && stateProp.select?.name) {
          state = stateProp.select.name;
        }
        
        const ticketLink = properties['Ticket Link']?.url || '';
        
        if (!dateStr) {
          return null;
        }
        
        return {
          id: notionEvent.id,
          title,
          venueName,
          date: parseNotionDate(dateStr),
          city,
          state,
          ticketLink,
        };
      })
      .filter((event): event is CalendarEvent => event !== null);
  } catch (error) {
    console.error('Error fetching events from Notion:', error);
    return [];
  }
}

/**
 * Fetches notes from Notion database via a backend proxy
 * 
 * IMPORTANT: This calls a backend API endpoint that handles the Notion API calls
 * to keep your API key secure. You'll need to set up a backend server.
 * 
 * For development, you can use a simple Node.js/Express server or Vercel serverless function.
 */
export async function fetchNotesFromNotion(): Promise<Note[]> {
  try {
    // This endpoint should be your backend proxy that calls Notion API
    // For local development: http://localhost:3001/api/notion/notes
    // For production: your deployed backend URL
    const response = await fetch('/api/notion/notes');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch notes: ${response.statusText}`);
    }
    
    const data: NotionNote[] = await response.json();
    
    // Transform Notion data to Note format
    return data
      .map((notionNote) => {
        const properties = notionNote.properties;
        
        // Get name from Name property
        const name = properties['Name']?.title?.[0]?.plain_text || '';
        
        // Handle Content - could be rich_text or title
        let content = '';
        const contentProp = properties['Content'];
        if (contentProp && 'rich_text' in contentProp && contentProp.rich_text?.[0]?.plain_text) {
          content = contentProp.rich_text[0].plain_text;
        } else if (contentProp && 'title' in contentProp && contentProp.title?.[0]?.plain_text) {
          content = contentProp.title[0].plain_text;
        }
        
        return {
          id: notionNote.id,
          name,
          content,
        };
      })
      .filter((note) => note.name !== ''); // Only include notes with a name
  } catch (error) {
    console.error('Error fetching notes from Notion:', error);
    // Return empty array on error so the app doesn't break
    return [];
  }
}

/**
 * Tracks a page visit by sending tracking data to Notion database via backend proxy
 * 
 * This function is called automatically when the site loads to log visitor information.
 * It fails silently to ensure tracking doesn't break the user experience.
 */
export async function trackPageVisit(trackingData: TrackingData): Promise<void> {
  try {
    const response = await fetch('/api/notion/track-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackingData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to track visit: ${response.statusText}`);
    }
  } catch (error) {
    // Fail silently - we don't want tracking to break the user experience
    console.warn('Failed to track page visit:', error);
  }
}
