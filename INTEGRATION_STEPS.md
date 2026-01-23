# Notion Calendar Integration - Step by Step Guide

## Overview
This guide will help you integrate your Notion database with the calendar app to display real event data.

## Files Created
- ✅ `src/types/event.ts` - TypeScript types for events
- ✅ `src/services/notionService.ts` - Service to fetch events from Notion
- ✅ `src/hooks/useEvents.ts` - React hook to manage events
- ✅ `server-example/` - Example backend server
- ✅ Updated `MonthView.tsx` - Now displays event indicators

## Step-by-Step Setup

### Step 1: Set Up Notion Database

1. **Create a new database in Notion** (Table view)
2. **Add these properties** (exact names, case-sensitive):
   - `Venue Name` - **Title** property type
   - `Date` - **Date** property type
   - `City` - **Text** property type  
   - `Ticket Link` - **URL** property type

3. **Add some test events** to your database

### Step 2: Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click **"New integration"**
3. Name it: "Calendar App" (or any name)
4. Select your workspace
5. Click **"Submit"**
6. **Copy the Internal Integration Token** (starts with `secret_`)

### Step 3: Connect Integration to Database

1. Open your Notion database
2. Click the **"..."** menu (top right corner)
3. Click **"Connections"**
4. Select your integration from the list
5. **Copy your Database ID** from the URL:
   - URL looks like: `https://www.notion.so/[workspace]/[database-id]?v=...`
   - The database ID is the 32-character string (with dashes)

### Step 4: Set Up Backend Server

1. **Navigate to server-example folder:**
   ```bash
   cd server-example
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   # Create .env file with:
   NOTION_API_KEY=secret_your_token_here
   NOTION_DATABASE_ID=your_database_id_here
   PORT=3001
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

   You should see: `🚀 Notion proxy server running on http://localhost:3001`

### Step 5: Test the Integration

1. **Test the API endpoint:**
   ```bash
   curl http://localhost:3001/api/notion/events
   ```
   
   You should see JSON with your events.

2. **Start your frontend:**
   ```bash
   # In the main project directory
   npm run dev
   ```

3. **Open the calendar app** - you should see:
   - Blue dots on dates that have events
   - Events loading from your Notion database

## How It Works

1. **Frontend** (`MonthView.tsx`) uses the `useEvents()` hook
2. **Hook** (`useEvents.ts`) calls `fetchEventsFromNotion()`
3. **Service** (`notionService.ts`) makes API call to `/api/notion/events`
4. **Vite proxy** forwards the request to `http://localhost:3001`
5. **Backend server** calls Notion API with your credentials
6. **Events** are returned and displayed on the calendar

## Visual Indicators

- **Blue dot** appears on dates with events
- **White dot** appears on today's date if it has events
- Hover over a date to see event count in tooltip

## Next Steps (Future Enhancements)

- Click on a date to see event details
- Show event list below calendar
- Filter events by city
- Add event creation from the app

## Troubleshooting

### "Failed to fetch events"
- Check that backend server is running on port 3001
- Verify `.env` file has correct credentials
- Check browser console for CORS errors

### "401 Unauthorized"
- Verify your API key is correct
- Make sure integration is connected to the database
- Check that integration has access to the database

### "404 Not Found"
- Verify your database ID is correct
- Check that the database URL format is correct

### No events showing
- Check that property names match exactly (case-sensitive)
- Verify events have dates set
- Check browser console for errors
- Test the API endpoint directly with curl

### Events showing on wrong dates
- Check timezone settings
- Verify date format in Notion matches expected format

## Alternative: Direct API (Development Only)

If you want to test without a backend (⚠️ exposes API key):

1. Create `.env.local` in project root:
   ```
   VITE_NOTION_API_KEY=secret_your_key
   VITE_NOTION_DATABASE_ID=your_database_id
   ```

2. Update `notionService.ts` to use direct API call:
   ```typescript
   const apiKey = import.meta.env.VITE_NOTION_API_KEY;
   const databaseId = import.meta.env.VITE_NOTION_DATABASE_ID;
   return fetchEventsFromNotionDirect(apiKey, databaseId);
   ```

**⚠️ Warning:** Never commit `.env.local` or deploy with API keys in frontend code!
