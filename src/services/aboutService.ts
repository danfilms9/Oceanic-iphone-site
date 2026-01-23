/**
 * Service for fetching about information from Notion database
 */

export type AboutInfo = {
  title: string;
  info: string;
  group: string;
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
    };
    Group?: {
      select?: {
        name: string;
      } | null;
    };
  };
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
        
        // Extract info - could be rich_text
        let info = '';
        if (properties.Info?.rich_text) {
          // Join all rich_text segments
          info = properties.Info.rich_text
            .map((text) => text.plain_text)
            .join('');
        }
        
        // Extract group from Group property
        const group = properties.Group?.select?.name || 'Uncategorized';
        
        // Only include entries that have both title and info
        if (!title || !info) {
          return null;
        }
        
        return { title, info, group };
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
