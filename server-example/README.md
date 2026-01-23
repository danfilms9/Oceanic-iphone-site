# Notion Calendar Proxy Server

This is a simple Express server that acts as a proxy between your frontend and the Notion API, keeping your API keys secure.

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add:
   - `NOTION_API_KEY` - Your Notion integration token (starts with `secret_`)
   - `NOTION_DATABASE_ID` - Your Notion calendar/events database ID (32-character string)
   - `NOTION_NOTES_DATABASE_ID` - Your Notion notes database ID (32-character string)

3. **Run the server:**
   ```bash
   npm start
   ```

   The server will run on `http://localhost:3001`

## Getting Your Notion Credentials

### API Key (Integration Token)
1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it (e.g., "Calendar App")
4. Copy the **Internal Integration Token**

### Database ID
1. Open your Notion database
2. Look at the URL: `https://www.notion.so/[workspace]/[database-id]?v=...`
3. The database ID is the 32-character string (with dashes)
4. Copy it to your `.env` file

### Connect Integration to Database
1. Open your Notion database
2. Click the "..." menu (top right)
3. Click "Connections"
4. Select your integration

## Database Schema

### Calendar/Events Database
Your Notion database should have these properties:
- **Venue Name** (Title property)
- **Date** (Date property)
- **City** (Text property)
- **Ticket Link** (URL property)

### Notes Database
Your Notion notes database should have these properties:
- **Name** (Title property) - The note title/name
- **Content** (Rich Text or Title property) - The note content

## Testing

Test the endpoints:
```bash
# Test events endpoint
curl http://localhost:3001/api/notion/events

# Test notes endpoint
curl http://localhost:3001/api/notion/notes
```

You should see JSON data with your events/notes.
