# Notion Calendar Integration Setup Guide

This guide walks you through setting up Notion database integration for the calendar app.

## Step 1: Create Notion Database

1. Go to your Notion workspace
2. Create a new database (Table view)
3. Add the following properties:
   - **Venue Name** (Title property) - The name of the venue
   - **Date** (Date property) - The event date
   - **City** (Text property) - The city where the event is
   - **Ticket Link** (URL property) - Link to purchase tickets

## Step 2: Get Notion API Credentials

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it (e.g., "Calendar App")
4. Select your workspace
5. Click "Submit"
6. Copy the **Internal Integration Token** (starts with `secret_`)
7. Go back to your database
8. Click the "..." menu in the top right
9. Click "Connections" → Select your integration
10. Copy your **Database ID** from the database URL:
    - URL format: `https://www.notion.so/[workspace]/[database-id]?v=...`
    - The database ID is the 32-character string (with dashes)

## Step 3: Choose Your Integration Method

### Option A: Backend Proxy (Recommended for Production)

Create a backend server that proxies Notion API calls to keep your API key secure.

#### Using Node.js/Express:

1. Create a `server` folder in your project root
2. Install dependencies:
   ```bash
   cd server
   npm init -y
   npm install express cors dotenv @notionhq/client
   ```

3. Create `server/index.js`:
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const { Client } = require('@notionhq/client');
   require('dotenv').config();

   const app = express();
   app.use(cors());
   app.use(express.json());

   const notion = new Client({
     auth: process.env.NOTION_API_KEY,
   });

   app.get('/api/notion/events', async (req, res) => {
     try {
       const response = await notion.databases.query({
         database_id: process.env.NOTION_DATABASE_ID,
         sorts: [
           {
             property: 'Date',
             direction: 'ascending',
           },
         ],
       });
       res.json(response.results);
     } catch (error) {
       console.error('Notion API error:', error);
       res.status(500).json({ error: 'Failed to fetch events' });
     }
   });

   const PORT = process.env.PORT || 3001;
   app.listen(PORT, () => {
     console.log(`Server running on http://localhost:${PORT}`);
   });
   ```

4. Create `server/.env`:
   ```
   NOTION_API_KEY=secret_your_api_key_here
   NOTION_DATABASE_ID=your_database_id_here
   PORT=3001
   ```

5. Update `vite.config.ts` to proxy API calls:
   ```typescript
   export default defineConfig({
     // ... existing config
     server: {
       proxy: {
         '/api': {
           target: 'http://localhost:3001',
           changeOrigin: true,
         },
       },
     },
   });
   ```

6. Run both servers:
   ```bash
   # Terminal 1: Backend
   cd server && node index.js
   
   # Terminal 2: Frontend
   npm run dev
   ```

### Option B: Vercel Serverless Function (Alternative)

1. Create `api/notion/events.ts`:
   ```typescript
   import { Client } from '@notionhq/client';

   export default async function handler(req, res) {
     const notion = new Client({
       auth: process.env.NOTION_API_KEY,
     });

     try {
       const response = await notion.databases.query({
         database_id: process.env.NOTION_DATABASE_ID,
         sorts: [{ property: 'Date', direction: 'ascending' }],
       });
       res.json(response.results);
     } catch (error) {
       res.status(500).json({ error: 'Failed to fetch events' });
     }
   }
   ```

2. Add environment variables in Vercel dashboard

### Option C: Direct API Call (Development Only - NOT for Production)

⚠️ **Warning**: This exposes your API key in the frontend. Only use for development.

1. Create `.env.local`:
   ```
   VITE_NOTION_API_KEY=secret_your_api_key_here
   VITE_NOTION_DATABASE_ID=your_database_id_here
   ```

2. Update `notionService.ts` to use environment variables directly

## Step 4: Update Calendar Component

The `MonthView` component will be updated to:
1. Fetch events on mount
2. Display event indicators on calendar dates
3. Show event details when a date is clicked

## Step 5: Test the Integration

1. Add a test event to your Notion database
2. Verify the event appears in the calendar
3. Check browser console for any errors

## Troubleshooting

- **CORS errors**: Make sure your backend has CORS enabled
- **401 Unauthorized**: Check that your API key is correct and the integration is connected to the database
- **404 Not Found**: Verify your database ID is correct
- **Empty results**: Check that your property names match exactly (case-sensitive)
