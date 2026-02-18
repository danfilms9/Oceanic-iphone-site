# Vercel Deployment Guide

This guide will help you deploy your HoldMe Visualizer to Vercel and configure Notion database connections.

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at https://vercel.com)
3. Notion API credentials (see below)

## Step 1: Push to GitHub

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name it (e.g., `holdme-visualizer`)
   - Don't initialize with README, .gitignore, or license
   - Click "Create repository"

2. **Push your code:**
   ```bash
   cd visualizer-desktop
   git add .
   git commit -m "Initial commit - Ready for Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

## Step 2: Get Notion API Credentials

1. **Create a Notion Integration:**
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Name it (e.g., "HoldMe Visualizer")
   - Select your workspace
   - Click "Submit"
   - **Copy the Internal Integration Token** (starts with `secret_`)

2. **Get Database IDs:**
   - Open each Notion database you're using
   - Look at the URL: `https://www.notion.so/[workspace]/[database-id]?v=...`
   - Copy the 32-character database ID (with or without dashes)

3. **Connect Integration to Databases:**
   - Open each database
   - Click the "..." menu (top right)
   - Click "Connections"
   - Select your integration

## Step 3: Deploy to Vercel

1. **Import your GitHub repository:**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your repository
   - Click "Import"

2. **Configure the project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `visualizer-desktop` (if your repo is at the root, leave blank)
   - **Build Command:** `npm run build` (should be auto-detected)
   - **Output Directory:** `dist` (should be auto-detected)
   - Click "Deploy"

3. **Add Environment Variables:**
   After the initial deployment, go to your project settings:
   - Click on your project → Settings → Environment Variables
   - Add the following variables:

   **Required:**
   ```
   NOTION_API_KEY=secret_your_notion_token_here
   NOTION_DATABASE_ID=your_calendar_database_id
   NOTION_NOTES_DATABASE_ID=your_notes_database_id
   NOTION_YOUTUBE_DATABASE_ID=your_youtube_database_id
   NOTION_EMAIL_DATABASE_ID=your_email_database_id
   ```

   **Optional (with defaults):**
   ```
   NOTION_CONTACT_DATABASE_ID=your_contact_database_id
   NOTION_ABOUT_DATABASE_ID=your_about_database_id
   YOUTUBE_API_KEY=your_youtube_api_key (optional, for enhanced stats)
   ```

   **Shopify (for Merch app):**
   ```
   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token_here
   ```
   See `docs/SHOPIFY_MERCH.md` for detailed setup instructions.

   - Make sure to add these for **Production**, **Preview**, and **Development** environments
   - Click "Save" after adding each variable

4. **Redeploy:**
   - Go to the Deployments tab
   - Click the "..." menu on the latest deployment
   - Click "Redeploy"

## Step 4: Verify Deployment

1. **Check your site:**
   - Visit your Vercel deployment URL
   - Test the calendar, notes, YouTube, merch app, and other features

2. **Check serverless function logs:**
   - Go to your Vercel project → Functions tab
   - Check for any errors in the API routes

## Troubleshooting

### API Routes Not Working

- **Check environment variables:** Make sure all required variables are set in Vercel
- **Check function logs:** Go to Vercel dashboard → Your project → Functions → View logs
- **Verify database IDs:** Make sure database IDs are correct (32 characters, with or without dashes)
- **Check integration connection:** Ensure your Notion integration is connected to all databases

### Merch Items Not Loading

- **Check Shopify environment variables:** Ensure `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_ACCESS_TOKEN` are set in Vercel
- **Verify Shopify token:** Use the **private** Storefront API token from the Headless channel (not a custom app token)
- **Check function logs:** Look for Shopify API errors in the Functions tab
- **Test API endpoint:** Visit `https://your-site.vercel.app/api/shopify/products` to see if products are returned
- **Verify products exist:** Ensure products are published to your store's sales channel

### CORS Errors

- The serverless functions include CORS headers, but if you see CORS errors:
  - Check that the API routes are being called correctly
  - Verify the request URLs match your Vercel deployment URL

### Build Errors

- **TypeScript errors:** Run `npm run build` locally to check for errors
- **Missing dependencies:** Make sure `@notionhq/client` and `@vercel/node` are in package.json

## Local Development

For local development, you can still use the Express server:

```bash
cd server-example
npm install
# Create .env file with your credentials
npm start
```

The Vite dev server will proxy API calls to `http://localhost:3001` in development mode.

## Database Schema Reference

### Calendar/Events Database
- `Name` (Title) - Event name
- `Date` (Date) - Event date
- `Venue` (Rich Text or Title) - Venue name
- `City` (Rich Text or Select) - City
- `State` (Rich Text or Select) - State (optional)
- `Ticket Link` (URL) - Ticket purchase link

### Notes Database
- `Name` (Title) - Note title
- `Content` (Rich Text or Title) - Note content
- `Order` (Number) - Display order

### YouTube Database
- `Aa Name` (Title) - Video name
- `URL` (URL) - YouTube video URL
- `Page` (Multi-select) - Which pages to show on (Featured, Most Viewed, etc.)
- `Priority` (Number) - Display order

### Email Database
- `First Name` (Rich Text) - First name
- `Last Name` (Title) - Last name
- `Email` (Rich Text) - Email address

## Support

If you encounter issues:
1. Check Vercel function logs
2. Verify all environment variables are set
3. Test API endpoints directly: `https://your-site.vercel.app/api/notion/events`
4. Check Notion integration permissions
