import { Client } from '@notionhq/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    let databaseId = process.env.NOTION_VISITS_DATABASE_ID;

    if (!notionApiKey || !databaseId) {
      console.error('Missing Notion credentials:', {
        hasApiKey: !!notionApiKey,
        hasDatabaseId: !!databaseId,
      });
      return res.status(500).json({
        error: 'Notion API credentials not configured',
        details: {
          hasApiKey: !!notionApiKey,
          hasDatabaseId: !!databaseId,
        },
      });
    }

    const {
      userAgent,
      referrer,
      pageUrl,
      screenResolution,
      viewportSize,
      language,
      timezone,
      deviceType,
      browser,
      os,
      sessionId,
      isFirstVisit,
    } = req.body;

    // Format database ID with dashes if needed
    if (databaseId.length === 32 && !databaseId.includes('-')) {
      databaseId = `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`;
    }

    const notion = new Client({ auth: notionApiKey });

    console.log('Creating Notion page with database ID:', databaseId);
    console.log('Tracking data received:', {
      deviceType,
      browser,
      os,
      sessionId,
      isFirstVisit,
    });

    // Query database to count existing visits (paginate: Notion returns max 100 per request)
    let visitCount = 0;
    try {
      let cursor: string | undefined;
      do {
        const response = await notion.databases.query({
          database_id: databaseId,
          start_cursor: cursor,
          page_size: 100,
        });
        visitCount += response.results.length;
        cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
      } while (cursor);
    } catch (error) {
      console.warn('Could not count existing visits, starting from 1:', error);
      visitCount = 0;
    }

    // Generate name: "Visit {number} | {Month} {Year}"
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const visitNumber = visitCount + 1;
    const entryName = `Visit ${visitNumber} | ${monthYear}`;

    // Extract query parameter from pageUrl and find matching Whos Account entry
    let whosAccountRelation: { id: string }[] | undefined;
    if (pageUrl) {
      try {
        const whosAccountDatabaseId = process.env.NOTION_WHOS_ACCOUNT_DATABASE_ID;
        if (whosAccountDatabaseId) {
          // Extract query parameter value (e.g., "675" from "oceanicofficial.com/merch?675")
          // Handle Instagram URL rewriting by checking multiple sources
          // Priority: Hash fragments are most reliable for Instagram (they preserve them)
          let queryValue: string | null = null;
          try {
            const urlToParse = pageUrl.startsWith('http') ? pageUrl : `https://${pageUrl}`;
            const urlObj = new URL(urlToParse);
            
            // Strategy 1: Check hash fragment FIRST (Instagram preserves these best)
            // Example: ?fbclid=...&#675 -> extracts "675"
            // Try both urlObj.hash and direct string matching for robustness
            if (urlObj.hash) {
              // urlObj.hash includes the # symbol, so #675 becomes "#675"
              const hashMatch = urlObj.hash.match(/#(\d+)/);
              if (hashMatch) {
                queryValue = hashMatch[1];
                console.log('Extracted tracking code from hash fragment (urlObj.hash):', queryValue);
              }
            }
            // Fallback: also check the raw pageUrl string in case hash wasn't parsed correctly
            if (!queryValue && pageUrl.includes('#')) {
              const directHashMatch = pageUrl.match(/#(\d+)/);
              if (directHashMatch) {
                queryValue = directHashMatch[1];
                console.log('Extracted tracking code from hash fragment (direct string match):', queryValue);
              }
            }
            
            // Strategy 2: Check for custom tracking parameters (ref, track, slug, code)
            if (!queryValue) {
              const trackingParamNames = ['ref', 'track', 'slug', 'code', 'id'];
              for (const paramName of trackingParamNames) {
                const value = urlObj.searchParams.get(paramName);
                if (value && /^\d+$/.test(value)) { // Only numeric values
                  queryValue = value;
                  break;
                }
              }
            }
            
            // Strategy 3: Look for standalone numeric query params (Instagram might preserve these)
            // Check all query parameters for numeric-only values
            if (!queryValue) {
              const searchParams = urlObj.searchParams;
              for (const [key, value] of searchParams.entries()) {
                // Skip UTM and fbclid parameters, but check others
                if (!key.startsWith('utm_') && key !== 'fbclid' && /^\d+$/.test(value)) {
                  queryValue = value;
                  break;
                }
              }
            }
            
            // Strategy 4: Check for standalone ?number pattern (before Instagram rewrites)
            if (!queryValue && urlObj.search) {
              // Look for patterns like ?675 or ?675&utm_source=...
              const match = urlObj.search.match(/(?:^|\&)(\d+)(?:&|$)/);
              if (match) {
                queryValue = match[1];
              }
            }
            
            // Strategy 5: Manual regex fallback for edge cases
            if (!queryValue) {
              const match = pageUrl.match(/(?:[?&#])(\d{3,4})(?:[&#]|$)/);
              if (match) {
                queryValue = match[1];
              }
            }
          } catch (urlError) {
            // If URL parsing fails, try to extract ?number pattern manually
            const match = pageUrl.match(/(?:[?&#])(\d{3,4})(?:[&#]|$)/);
            if (match) {
              queryValue = match[1];
            }
          }
          
          if (queryValue) {
            console.log(`🔍 Looking for tracking code "${queryValue}" in Whos Account database`);
            // Format database ID with dashes if needed
            let formattedWhosAccountId = whosAccountDatabaseId;
            if (formattedWhosAccountId.length === 32 && !formattedWhosAccountId.includes('-')) {
              formattedWhosAccountId = `${formattedWhosAccountId.slice(0, 8)}-${formattedWhosAccountId.slice(8, 12)}-${formattedWhosAccountId.slice(12, 16)}-${formattedWhosAccountId.slice(16, 20)}-${formattedWhosAccountId.slice(20)}`;
            }

            // Query Whos Account database to find matching slug
            let cursor: string | undefined;
            do {
              const whosAccountResponse = await notion.databases.query({
                database_id: formattedWhosAccountId,
                start_cursor: cursor,
                page_size: 100,
              });

              // Check each entry for matching slug
              for (const entry of whosAccountResponse.results) {
                const properties = (entry as any).properties;
                const slugProperty = properties['Slug'] || properties['slug'];
                
                if (slugProperty) {
                  // Handle different property types (rich_text, title, etc.)
                  let slugValue = '';
                  if (slugProperty.rich_text && slugProperty.rich_text.length > 0) {
                    slugValue = slugProperty.rich_text[0].plain_text || '';
                  } else if (slugProperty.title && slugProperty.title.length > 0) {
                    slugValue = slugProperty.title[0].plain_text || '';
                  } else if (slugProperty.plain_text) {
                    slugValue = slugProperty.plain_text;
                  }

                  // Match slug (with or without ? prefix, handle both ?675 and 675 formats)
                  const normalizedSlug = slugValue.replace(/^\?/, ''); // Remove leading ?
                  const normalizedQueryValue = String(queryValue).trim(); // Ensure it's a string and trimmed
                  
                  // Try multiple matching strategies
                  const matches = 
                    normalizedSlug === normalizedQueryValue ||  // "675" === "675"
                    slugValue === `?${normalizedQueryValue}` ||  // "?675" === "?675"
                    slugValue === normalizedQueryValue ||        // "675" === "675" (if slug stored without ?)
                    normalizedSlug === `?${normalizedQueryValue}` || // "675" === "?675" (edge case)
                    slugValue.replace(/^[?#]/, '') === normalizedQueryValue; // Remove both ? and # prefixes
                  
                  if (matches) {
                    console.log(`✅ Matched tracking code "${queryValue}" to slug "${slugValue}" (normalized: "${normalizedSlug}")`);
                    whosAccountRelation = [{ id: entry.id }];
                    break;
                  } else {
                    console.log(`❌ No match: queryValue="${queryValue}", slugValue="${slugValue}", normalizedSlug="${normalizedSlug}"`);
                  }
                }
              }

              if (whosAccountRelation) break; // Found match, exit loop
              
              cursor = whosAccountResponse.has_more ? whosAccountResponse.next_cursor ?? undefined : undefined;
            } while (cursor);
          }
        } else {
          console.log('⚠️ No tracking code found in pageUrl:', pageUrl);
        }
      } catch (error) {
        console.warn('Could not match Whos Account relation:', error);
        // Continue without relation if matching fails
      }
    } else {
      console.log('⚠️ No pageUrl provided for tracking');
    }

    // Build properties object
    const properties: any = {
      'Name': {
        title: [
          {
            text: {
              content: entryName,
            },
          },
        ],
      },
      'Timestamp': {
        date: {
          start: new Date().toISOString(),
        },
      },
      'User Agent': {
        rich_text: [
          {
            text: {
              content: userAgent || '',
            },
          },
        ],
      },
      'Referrer': {
        url: referrer || null,
      },
      'Page URL': {
        url: pageUrl || null,
      },
      'Screen Resolution': {
        rich_text: [
          {
            text: {
              content: screenResolution || '',
            },
          },
        ],
      },
      'Viewport Size': {
        rich_text: [
          {
            text: {
              content: viewportSize || '',
            },
          },
        ],
      },
      'Language': {
        rich_text: [
          {
            text: {
              content: language || '',
            },
          },
        ],
      },
      'Timezone': {
        rich_text: [
          {
            text: {
              content: timezone || '',
            },
          },
        ],
      },
      'Device Type': {
        select: {
          name: deviceType || 'Unknown',
        },
      },
      'Browser': {
        rich_text: [
          {
            text: {
              content: browser || '',
            },
          },
        ],
      },
      'OS': {
        rich_text: [
          {
            text: {
              content: os || '',
            },
          },
        ],
      },
      'Session ID': {
        rich_text: [
          {
            text: {
              content: sessionId || '',
            },
          },
        ],
      },
      'Is First Visit': {
        checkbox: isFirstVisit || false,
      },
    };

    // Add Whos Account relation if found
    if (whosAccountRelation) {
      properties['Whos account'] = {
        relation: whosAccountRelation,
      };
    }

    // Create the page in Notion
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties,
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    console.log('✅ Successfully created Notion page:', response.id);
    return res.status(200).json({ success: true, id: response.id });
  } catch (error: any) {
    console.error('❌ Notion API error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      body: error.body,
    });
    return res.status(500).json({
      error: 'Failed to track visit',
      message: error.message,
      code: error.code,
      details: error.body || error,
    });
  }
}
