import { Client } from '@notionhq/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  buildEmailEntryNotionProperties,
  formatNotionDatabaseId,
} from './emailEntryProperties';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    let databaseId = process.env.NOTION_EMAIL_DATABASE_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({
        error: 'Notion API credentials not configured',
      });
    }

    const { firstName, lastName, email, city } = req.body ?? {};

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'firstName, lastName, and email are required',
      });
    }

    databaseId = formatNotionDatabaseId(databaseId);

    const notion = new Client({ auth: notionApiKey });

    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: buildEmailEntryNotionProperties(
        String(firstName).trim(),
        String(lastName).trim(),
        String(email).trim(),
        city ? String(city).trim() : undefined,
      ),
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json({ success: true, id: response.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Notion API error:', error);
    return res.status(500).json({
      error: 'Failed to create email entry',
      message,
    });
  }
}
