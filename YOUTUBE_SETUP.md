# YouTube App Integration Setup

## Overview
The YouTube app connects to a Notion database to fetch video information and displays them in different tabs (Featured, Most Viewed, Search, Favorites, More).

## Prerequisites

1. **Notion Database** with the following properties:
   - `Aa Name` (Title property) - Video name/title
   - `URL` (URL property) - YouTube video URL
   - `Page` (Multi-select property) - Which pages the video should appear on (Featured, Most Viewed, Search, Favorites, More)
   - `Priority` (Number property) - Sorting index (lower numbers appear first)

2. **Notion Integration** (if not already set up):
   - Go to https://www.notion.so/my-integrations
   - Create a new integration
   - Copy the Internal Integration Token (starts with `secret_`)
   - Connect the integration to your YouTube database

3. **YouTube Data API Key** (Optional - for enhanced stats):
   - **Note**: The app works without this! It uses YouTube's oEmbed API (no key needed) for basic info
   - If you want view counts, like percentages, and duration, you can optionally add:
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing
   - Enable YouTube Data API v3
   - Create credentials (API Key)
   - Copy the API key

## Server Setup

1. **Navigate to server-example folder:**
   ```bash
   cd server-example
   ```

2. **Update `.env` file:**
   ```bash
   NOTION_API_KEY=secret_your_token_here
   NOTION_YOUTUBE_DATABASE_ID=2f177e8e8c088083a68fc91176690bf2
   YOUTUBE_API_KEY=your_youtube_api_key_here  # Optional but recommended
   PORT=3001
   ```

   **Note:** The database ID `2f177e8e8c088083a68fc91176690bf2` should work as-is. If you encounter issues, try adding dashes: `2f177e8e-8c08-8083-a68f-c91176690bf2`

3. **Start the server:**
   ```bash
   npm start
   ```

## Features

- **Dynamic Video Loading**: Fetches videos from Notion database
- **Tab Filtering**: Videos are filtered by the "Page" multi-select property
- **Priority Sorting**: Videos are sorted by the "Priority" number property
- **YouTube Metadata**: Fetches video title, thumbnail, view count, like percentage, duration, and channel name
- **Responsive Design**: Video rows are styled according to specifications

## Video Row Styling

Each video row:
- **Height**: 170px
- **Thumbnail**: 220px wide, full height, touching left edge
- **Title Section**: Twice the height of other sections
- **Stats Section**: Green thumbs up with percentage, grey view count
- **Meta Section**: Bold duration, bold grey channel name
- **Chevron**: 70px × 70px on the right

## API Endpoints

- `GET /api/notion/youtube-videos` - Fetches videos from Notion
- `GET /api/youtube/metadata?videoUrl=<url>` - Fetches YouTube video metadata

## Notes

- Without a YouTube Data API key, the app will use oEmbed API which provides limited data (title and thumbnail only)
- With a YouTube Data API key, the app will fetch accurate view counts, like percentages, duration, and channel names
- The YouTube Data API has quota limits (10,000 units per day by default)

## Troubleshooting

- **No videos showing**: Check that your Notion database ID is correct and the integration is connected
- **Missing metadata**: Ensure YouTube Data API key is set in `.env` for full metadata
- **CORS errors**: Make sure the server is running on port 3001
- **Property name errors**: Ensure property names in Notion match exactly (case-sensitive): `Aa Name`, `URL`, `Page`, `Priority`
