import { Client } from '@notionhq/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function formatNotionId(id: string): string {
  const clean = id.replace(/-/g, '');
  if (clean.length !== 32) return id;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

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
    const databaseId = process.env.NOTION_BUTTON_CLICKS_DATABASE_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({
        error: 'NOTION_API_KEY or NOTION_BUTTON_CLICKS_DATABASE_ID not configured',
      });
    }

    const { eventId, title: cityTitle } = req.body as { eventId?: string; title?: string };
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({
        error: 'eventId is required (Notion page ID of the calendar event)',
      });
    }

    // Match server-example: Button Clicks DB has "Name" and "Oceanic Website Calendar" (relation)
    const titleProp = 'Name';
    const calendarRelationProp = 'Oceanic Website Calendar';

    const dbId = formatNotionId(databaseId);
    const relationPageId = formatNotionId(eventId);
    const entryName = (typeof cityTitle === 'string' && cityTitle.trim()) ? cityTitle.trim() : `Ticket click ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;

    const notion = new Client({ auth: notionApiKey });

    await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        [titleProp]: {
          title: [{ text: { content: entryName } }],
        },
        [calendarRelationProp]: {
          relation: [{ id: relationPageId }],
        },
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Ticket click track error:', error);
    return res.status(500).json({
      error: 'Failed to log ticket click',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
