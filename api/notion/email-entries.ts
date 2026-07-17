import { Client } from '@notionhq/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createEmailEntryPage,
  formatNotionDatabaseId,
} from './emailEntryProperties.js';

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

    const {
      firstName,
      lastName,
      email,
      city,
      phone,
      smsConsent,
      smsConsentAt,
      smsConsentSource,
      smsConsentText,
    } = req.body ?? {};

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'firstName, lastName, and email are required',
      });
    }

    databaseId = formatNotionDatabaseId(databaseId);

    const notion = new Client({ auth: notionApiKey });

    // Submitter IP is part of the TCPA proof-of-consent record.
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = (
      Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor ?? ''
    )
      .split(',')[0]
      .trim() || req.socket?.remoteAddress || '';

    const response = await createEmailEntryPage(
      notion,
      databaseId,
      String(firstName).trim(),
      String(lastName).trim(),
      String(email).trim(),
      city ? String(city).trim() : undefined,
      phone ? String(phone).trim() : undefined,
      {
        smsConsent: smsConsent === true,
        smsConsentAt: smsConsentAt ? String(smsConsentAt) : undefined,
        smsConsentSource: smsConsentSource ? String(smsConsentSource) : undefined,
        smsConsentText: smsConsentText ? String(smsConsentText) : undefined,
        ipAddress: ipAddress || undefined,
      },
    );

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
