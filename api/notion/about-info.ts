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
    let databaseId = process.env.NOTION_ABOUT_DATABASE_ID || '2f177e8e8c088005954fc4434d81aa21';

    if (!notionApiKey) {
      return res.status(500).json({
        error: 'Notion API key not configured',
      });
    }

    // Format database ID with dashes if needed
    if (databaseId.length === 32 && !databaseId.includes('-')) {
      databaseId = `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`;
    }

    const notion = new Client({ auth: notionApiKey });

    const response = await notion.databases.query({
      database_id: databaseId,
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json(response.results);
  } catch (error: any) {
    console.error('Notion API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch about info',
      message: error.message,
    });
  }
}
