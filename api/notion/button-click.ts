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

    const { buttonId } = req.body as { buttonId?: string };
    if (!buttonId || typeof buttonId !== 'string') {
      return res.status(400).json({
        error: 'buttonId is required (Notion page ID of the button in Buttons database)',
      });
    }

    const titleProp = process.env.NOTION_BUTTON_CLICKS_TITLE_PROPERTY || 'Name';
    const relationProp = process.env.NOTION_BUTTON_RELATION_PROPERTY || 'Button';

    const dbId = formatNotionId(databaseId);
    const relationPageId = formatNotionId(buttonId);
    const now = new Date();
    const entryName = `Click ${now.toISOString().slice(0, 19).replace('T', ' ')}`;

    const notion = new Client({ auth: notionApiKey });

    await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        [titleProp]: {
          title: [{ text: { content: entryName } }],
        },
        [relationProp]: {
          relation: [{ id: relationPageId }],
        },
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Button click track error:', error);
    return res.status(500).json({
      error: 'Failed to log button click',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
