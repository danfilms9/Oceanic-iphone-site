import { Client } from '@notionhq/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_NOTES_DATABASE_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({
        error: 'Notion API credentials not configured',
      });
    }

    const notion = new Client({ auth: notionApiKey });

    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'Order',
          direction: 'ascending',
        },
      ],
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json(response.results);
  } catch (error: any) {
    console.error('Notion API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch notes',
      message: error.message,
    });
  }
}
