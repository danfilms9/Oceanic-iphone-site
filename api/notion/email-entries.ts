import { Client } from '@notionhq/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    let databaseId = process.env.NOTION_EMAIL_DATABASE_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({
        error: 'Notion API credentials not configured',
      });
    }

    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'firstName, lastName, and email are required',
      });
    }

    // Format database ID with dashes if needed
    if (databaseId.length === 32 && !databaseId.includes('-')) {
      databaseId = `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`;
    }

    const notion = new Client({ auth: notionApiKey });

    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        'First Name': {
          rich_text: [
            {
              text: {
                content: firstName,
              },
            },
          ],
        },
        'Last Name': {
          title: [
            {
              text: {
                content: lastName,
              },
            },
          ],
        },
        'Email': {
          rich_text: [
            {
              text: {
                content: email,
              },
            },
          ],
        },
      },
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json({ success: true, id: response.id });
  } catch (error: any) {
    console.error('Notion API error:', error);
    return res.status(500).json({
      error: 'Failed to create email entry',
      message: error.message,
    });
  }
}
