/**
 * Service for fetching about information from Notion database
 */

export type AboutInfo = {
  title: string;
  info: string;
  group: string;
  url?: string; // Optional URL if info is a link
};

export type GroupedAboutInfo = {
  group: string;
  entries: AboutInfo[];
};

interface NotionAbout {
  id: string;
  properties: {
    Title?: {
      title?: Array<{ plain_text: string }>;
    };
    Info?: {
      rich_text?: Array<{ plain_text: string }>;
      url?: string | null;
    };
    Group?: {
      select?: {
        name: string;
      } | null;
    };
  };
}

// Helper function to check if a string is a valid URL
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Fetches all about information from Notion database via backend proxy
 * Returns entries grouped by the Group property
 */
export async function fetchAboutInfoFromNotion(): Promise<GroupedAboutInfo[]> {
  try {
    const response = await fetch('/api/notion/about-info');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch about info: ${response.statusText}`);
    }
    
    const data: NotionAbout[] = await response.json();
    
    // Map all about entries from the database
    const aboutEntries: AboutInfo[] = data
      .map((entry) => {
        const properties = entry.properties;
        
        // Extract title from Title property
        const title = properties.Title?.title?.[0]?.plain_text || '';
        
        // Extract info - could be rich_text or url
        let info = '';
        let url: string | undefined = undefined;
        
        // Check if Info is a URL type property
        if (properties.Info?.url) {
          url = properties.Info.url;
          info = url; // Use URL as the display text
        } else if (properties.Info?.rich_text) {
          // Join all rich_text segments
          info = properties.Info.rich_text
            .map((text) => text.plain_text)
            .join('');
          
          // Check if the rich_text content is a valid URL
          if (isValidUrl(info)) {
            url = info;
          }
        }
        
        // Extract group from Group property
        const group = properties.Group?.select?.name || 'Uncategorized';
        
        // Only include entries that have both title and info
        if (!title || !info) {
          return null;
        }
        
        return { title, info, group, url };
      })
      .filter((entry): entry is AboutInfo => entry !== null);
    
    // Group entries by the Group property
    const grouped = aboutEntries.reduce((acc, entry) => {
      if (!acc[entry.group]) {
        acc[entry.group] = [];
      }
      acc[entry.group].push(entry);
      return acc;
    }, {} as Record<string, AboutInfo[]>);
    
    // Convert to array and sort by group name
    const groupedArray: GroupedAboutInfo[] = Object.entries(grouped)
      .map(([group, entries]) => ({ group, entries }))
      .sort((a, b) => a.group.localeCompare(b.group));
    
    return groupedArray;
  } catch (error) {
    console.error('Error fetching about info from Notion:', error);
    return [];
  }
}
