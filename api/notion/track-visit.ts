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

    // Create the page in Notion
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
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
        // Note: IP Address is available server-side but not included
        // Add "IP Address" property to your Notion database if you want to track it
      },
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
