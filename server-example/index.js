/**
 * Example Backend Server for Notion Integration
 * 
 * This is a simple Express server that proxies Notion API calls.
 * 
 * Setup:
 * 1. Install dependencies: npm install express cors dotenv @notionhq/client
 * 2. Create .env file with your Notion credentials
 * 3. Run: node index.js
 * 
 * The server will run on http://localhost:3001
 */

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');

// Load .env from multiple locations so it works no matter where you run from
const dotenv = require('dotenv');
const envCandidates = [
  path.resolve(__dirname, '.env'),                              // next to this file (server-example)
  path.resolve(__dirname, '..', '.env'),                        // visualizer-desktop root
  path.resolve(process.cwd(), '.env'),                          // current working directory
  path.resolve(process.cwd(), 'server-example', '.env'),        // cwd = visualizer-desktop
  path.resolve(process.cwd(), 'visualizer-desktop', 'server-example', '.env'), // cwd = repo root
];
let loadedPath = null;
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    loadedPath = p;
    break;
  }
}
if (!loadedPath) dotenv.config();

// Fallback: if Shopify vars missing, parse .env file directly (handles encoding/quirks)
if ((!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) && loadedPath) {
  try {
    let raw = fs.readFileSync(loadedPath, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    for (const line of raw.split(/\r?\n/)) {
      const trimVal = (s) => (s || '').replace(/\s*#.*$/, '').replace(/^["']|["']$/g, '').trim();
      if (line.startsWith('SHOPIFY_STORE_DOMAIN=')) {
        process.env.SHOPIFY_STORE_DOMAIN = trimVal(line.slice(line.indexOf('=') + 1));
      }
      if (line.startsWith('SHOPIFY_STOREFRONT_ACCESS_TOKEN=')) {
        process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = trimVal(line.slice(line.indexOf('=') + 1));
      }
    }
  } catch (e) {
    console.warn('Could not fallback-parse .env for Shopify:', e.message);
  }
}

const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
const shopifyToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
console.log('Env loaded from:', loadedPath || '(default search)', loadedPath ? '(file exists)' : '');
console.log('Shopify SHOPIFY_STORE_DOMAIN:', shopifyDomain ? `${shopifyDomain.slice(0, 20)}...` : 'NOT SET');
console.log('Shopify SHOPIFY_STOREFRONT_ACCESS_TOKEN:', shopifyToken ? 'SET (hidden)' : 'NOT SET');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get events from Notion database
app.get('/api/notion/events', async (req, res) => {
  try {
    if (!process.env.NOTION_DATABASE_ID) {
      return res.status(500).json({ error: 'NOTION_DATABASE_ID not configured' });
    }

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
    res.status(500).json({ 
      error: 'Failed to fetch events',
      message: error.message 
    });
  }
});

// Get notes from Notion database
app.get('/api/notion/notes', async (req, res) => {
  try {
    if (!process.env.NOTION_NOTES_DATABASE_ID) {
      return res.status(500).json({ error: 'NOTION_NOTES_DATABASE_ID not configured' });
    }

    const response = await notion.databases.query({
      database_id: process.env.NOTION_NOTES_DATABASE_ID,
      sorts: [
        {
          property: 'Order',
          direction: 'ascending',
        },
      ],
    });

    res.json(response.results);
  } catch (error) {
    console.error('Notion API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notes',
      message: error.message 
    });
  }
});

// Get YouTube videos from Notion database
app.get('/api/notion/youtube-videos', async (req, res) => {
  try {
    if (!process.env.NOTION_YOUTUBE_DATABASE_ID) {
      return res.status(500).json({ error: 'NOTION_YOUTUBE_DATABASE_ID not configured' });
    }

    const response = await notion.databases.query({
      database_id: process.env.NOTION_YOUTUBE_DATABASE_ID,
      sorts: [
        {
          property: 'Priority',
          direction: 'ascending',
        },
      ],
    });

    res.json(response.results);
  } catch (error) {
    console.error('Notion API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch YouTube videos',
      message: error.message 
    });
  }
});

// Get contact info from Notion database
app.get('/api/notion/contact-info', async (req, res) => {
  try {
    // Use the contact database ID from the Notion URL
    // Can also be set via NOTION_CONTACT_DATABASE_ID environment variable
    let databaseId = process.env.NOTION_CONTACT_DATABASE_ID || '2f177e8e8c0880ddb89ee26660263f3a';
    
    // Format database ID with dashes if needed (Notion accepts both formats)
    // If it doesn't already have dashes and is 32 chars, add them
    if (databaseId.length === 32 && !databaseId.includes('-')) {
      // Add dashes: 2f177e8e8c0880ddb89ee26660263f3a -> 2f177e8e-8c08-80dd-b89e-e26660263f3a
      databaseId = `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`;
    }

    const response = await notion.databases.query({
      database_id: databaseId,
    });

    res.json(response.results);
  } catch (error) {
    console.error('Notion API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contact info',
      message: error.message 
    });
  }
});

// Get about info from Notion database
app.get('/api/notion/about-info', async (req, res) => {
  try {
    // Use the about database ID from the Notion URL
    // Can also be set via NOTION_ABOUT_DATABASE_ID environment variable
    let databaseId = process.env.NOTION_ABOUT_DATABASE_ID || '2f177e8e8c088005954fc4434d81aa21';
    
    // Format database ID with dashes if needed (Notion accepts both formats)
    // If it doesn't already have dashes and is 32 chars, add them
    if (databaseId.length === 32 && !databaseId.includes('-')) {
      // Add dashes: 2f177e8e8c088005954fc4434d81aa21 -> 2f177e8e-8c08-8005-954f-c4434d81aa21
      databaseId = `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`;
    }

    const response = await notion.databases.query({
      database_id: databaseId,
    });

    res.json(response.results);
  } catch (error) {
    console.error('Notion API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch about info',
      message: error.message 
    });
  }
});

// Create email entry in Notion database
app.post('/api/notion/email-entries', async (req, res) => {
  try {
    if (!process.env.NOTION_EMAIL_DATABASE_ID) {
      return res.status(500).json({ error: 'NOTION_EMAIL_DATABASE_ID not configured' });
    }

    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'firstName, lastName, and email are required' 
      });
    }

    // Format database ID with dashes if needed
    let databaseId = process.env.NOTION_EMAIL_DATABASE_ID;
    if (databaseId.length === 32) {
      // Add dashes: 2f177e8e8c0880f59d01cff0235966b5 -> 2f177e8e-8c08-80f5-9d01-cff0235966b5
      databaseId = `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`;
    }

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

    res.json({ success: true, id: response.id });
  } catch (error) {
    console.error('Notion API error:', error);
    res.status(500).json({ 
      error: 'Failed to create email entry',
      message: error.message 
    });
  }
});

// Track page visit (Notion visits database)
app.post('/api/notion/track-visit', async (req, res) => {
  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    let databaseId = process.env.NOTION_VISITS_DATABASE_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(200).json({ success: false, skipped: true });
    }

    if (databaseId.length === 32 && !databaseId.includes('-')) {
      databaseId = `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`;
    }

    const body = req.body || {};
    // Count all visits with pagination (Notion returns max 100 per request)
    let visitCount = 0;
    let cursor;
    do {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100,
      });
      visitCount += response.results.length;
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const entryName = `Visit ${visitCount + 1} | ${monthYear}`;

    // Extract query parameter from pageUrl and find matching Whos Account entry
    let whosAccountRelation = null;
    if (body.pageUrl) {
      try {
        const whosAccountDatabaseId = process.env.NOTION_WHOS_ACCOUNT_DATABASE_ID;
        if (whosAccountDatabaseId) {
          // Extract query parameter value (e.g., "675" from "oceanicofficial.com/merch?675")
          // Handle Instagram URL rewriting by checking multiple sources
          // Priority: Hash fragments are most reliable for Instagram (they preserve them)
          let queryValue = null;
          try {
            const urlToParse = body.pageUrl.startsWith('http') ? body.pageUrl : `https://${body.pageUrl}`;
            const urlObj = new URL(urlToParse);
            
            // Strategy 1: Check hash fragment FIRST (Instagram preserves these best)
            // Example: ?fbclid=...&#675 -> extracts "675"
            if (urlObj.hash) {
              const hashMatch = urlObj.hash.match(/#(\d+)/);
              if (hashMatch) {
                queryValue = hashMatch[1];
              }
            }
            
            // Strategy 2: Check for custom tracking parameters (ref, track, slug, code)
            if (!queryValue) {
              const trackingParamNames = ['ref', 'track', 'slug', 'code', 'id'];
              for (const paramName of trackingParamNames) {
                const value = urlObj.searchParams.get(paramName);
                if (value && /^\d+$/.test(value)) { // Only numeric values
                  queryValue = value;
                  break;
                }
              }
            }
            
            // Strategy 3: Look for standalone numeric query params (Instagram might preserve these)
            // Check all query parameters for numeric-only values
            if (!queryValue) {
              const searchParams = urlObj.searchParams;
              for (const [key, value] of searchParams.entries()) {
                // Skip UTM and fbclid parameters, but check others
                if (!key.startsWith('utm_') && key !== 'fbclid' && /^\d+$/.test(value)) {
                  queryValue = value;
                  break;
                }
              }
            }
            
            // Strategy 4: Check for standalone ?number pattern (before Instagram rewrites)
            if (!queryValue && urlObj.search) {
              // Look for patterns like ?675 or ?675&utm_source=...
              const match = urlObj.search.match(/(?:^|\&)(\d+)(?:&|$)/);
              if (match) {
                queryValue = match[1];
              }
            }
            
            // Strategy 5: Manual regex fallback for edge cases
            if (!queryValue) {
              const match = body.pageUrl.match(/(?:[?&#])(\d{3,4})(?:[&#]|$)/);
              if (match) {
                queryValue = match[1];
              }
            }
          } catch (urlError) {
            // If URL parsing fails, try to extract ?number pattern manually
            const match = body.pageUrl.match(/(?:[?&#])(\d{3,4})(?:[&#]|$)/);
            if (match) {
              queryValue = match[1];
            }
          }
          
          if (queryValue) {
            // Format database ID with dashes if needed
            let formattedWhosAccountId = whosAccountDatabaseId;
            if (formattedWhosAccountId.length === 32 && !formattedWhosAccountId.includes('-')) {
              formattedWhosAccountId = `${formattedWhosAccountId.slice(0, 8)}-${formattedWhosAccountId.slice(8, 12)}-${formattedWhosAccountId.slice(12, 16)}-${formattedWhosAccountId.slice(16, 20)}-${formattedWhosAccountId.slice(20)}`;
            }

            // Query Whos Account database to find matching slug
            let cursor;
            do {
              const whosAccountResponse = await notion.databases.query({
                database_id: formattedWhosAccountId,
                start_cursor: cursor,
                page_size: 100,
              });

              // Check each entry for matching slug
              for (const entry of whosAccountResponse.results) {
                const properties = entry.properties;
                const slugProperty = properties['Slug'] || properties['slug'];
                
                if (slugProperty) {
                  // Handle different property types (rich_text, title, etc.)
                  let slugValue = '';
                  if (slugProperty.rich_text && slugProperty.rich_text.length > 0) {
                    slugValue = slugProperty.rich_text[0].plain_text || '';
                  } else if (slugProperty.title && slugProperty.title.length > 0) {
                    slugValue = slugProperty.title[0].plain_text || '';
                  } else if (slugProperty.plain_text) {
                    slugValue = slugProperty.plain_text;
                  }

                  // Match slug (with or without ? prefix)
                  const normalizedSlug = slugValue.replace(/^\?/, ''); // Remove leading ?
                  if (normalizedSlug === queryValue || slugValue === `?${queryValue}` || slugValue === queryValue) {
                    whosAccountRelation = [{ id: entry.id }];
                    break;
                  }
                }
              }

              if (whosAccountRelation) break; // Found match, exit loop
              
              cursor = whosAccountResponse.has_more ? whosAccountResponse.next_cursor : undefined;
            } while (cursor);
          }
        }
      } catch (error) {
        console.warn('Could not match Whos Account relation:', error);
        // Continue without relation if matching fails
      }
    }

    // Build properties object
    const properties = {
      'Name': { title: [{ text: { content: entryName } }] },
      'Timestamp': { date: { start: now.toISOString() } },
      'User Agent': { rich_text: [{ text: { content: body.userAgent || '' } }] },
      'Referrer': { url: body.referrer || null },
      'Page URL': { url: body.pageUrl || null },
      'Screen Resolution': { rich_text: [{ text: { content: body.screenResolution || '' } }] },
      'Viewport Size': { rich_text: [{ text: { content: body.viewportSize || '' } }] },
      'Language': { rich_text: [{ text: { content: body.language || '' } }] },
      'Timezone': { rich_text: [{ text: { content: body.timezone || '' } }] },
      'Device Type': { select: { name: body.deviceType || 'Unknown' } },
      'Browser': { rich_text: [{ text: { content: body.browser || '' } }] },
      'OS': { rich_text: [{ text: { content: body.os || '' } }] },
      'Session ID': { rich_text: [{ text: { content: body.sessionId || '' } }] },
      'Is First Visit': { checkbox: !!body.isFirstVisit },
    };

    // Add Whos Account relation if found
    if (whosAccountRelation) {
      properties['Whos account'] = { relation: whosAccountRelation };
    }

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track visit error:', error);
    res.status(500).json({ error: 'Failed to track visit', message: error.message });
  }
});

// Get YouTube video metadata (title, views, likes, etc.)
// Uses oEmbed API (no key required) for basic info
// Optionally uses YouTube Data API v3 (with key) for detailed stats
app.get('/api/youtube/metadata', async (req, res) => {
  try {
    const { videoUrl } = req.query;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl query parameter is required' });
    }

    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    const videoId = videoIdMatch[1];
    
    // Use oEmbed API (no key required) for basic info
    const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
    if (!oembedResponse.ok) {
      throw new Error('Failed to fetch oEmbed data');
    }
    const oembedData = await oembedResponse.json();
    
    // Get thumbnail (use oEmbed thumbnail or construct from video ID)
    const thumbnail = oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    // Base response with oEmbed data (works without API key)
    const baseResponse = {
      videoId,
      title: oembedData.title || 'Untitled',
      thumbnail: thumbnail,
      channelName: oembedData.author_name || 'Unknown Channel',
      viewCount: 0,
      likePercentage: 0,
      duration: '0:00',
    };
    
    // If YouTube Data API key is available, enhance with detailed stats
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const youtubeResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.YOUTUBE_API_KEY}&part=snippet,statistics,contentDetails`
        );
        
        if (youtubeResponse.ok) {
          const youtubeData = await youtubeResponse.json();
          
          if (youtubeData.items && youtubeData.items.length > 0) {
            const item = youtubeData.items[0];
            const statistics = item.statistics;
            const contentDetails = item.contentDetails;
            
            // Parse duration (ISO 8601 format: PT1H2M10S)
            const durationMatch = contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            let durationSeconds = 0;
            if (durationMatch) {
              durationSeconds += (parseInt(durationMatch[1] || 0)) * 3600;
              durationSeconds += (parseInt(durationMatch[2] || 0)) * 60;
              durationSeconds += parseInt(durationMatch[3] || 0);
            }
            
            const hours = Math.floor(durationSeconds / 3600);
            const minutes = Math.floor((durationSeconds % 3600) / 60);
            const seconds = durationSeconds % 60;
            const duration = hours > 0 
              ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
              : `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Calculate like percentage
            const likeCount = parseInt(statistics.likeCount || 0);
            const viewCount = parseInt(statistics.viewCount || 0);
            const likePercentage = viewCount > 0 ? Math.round((likeCount / viewCount) * 100) : 0;
            
            // Enhance base response with detailed stats
            return res.json({
              ...baseResponse,
              viewCount: viewCount,
              likePercentage: likePercentage,
              duration: duration,
            });
          }
        }
      } catch (youtubeError) {
        console.warn('YouTube Data API error, using oEmbed data only:', youtubeError);
      }
    }
    
    // Return oEmbed data (works without API key, but stats will be 0)
    res.json(baseResponse);
  } catch (error) {
    console.error('YouTube metadata error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch YouTube metadata',
      message: error.message 
    });
  }
});

// Shopify Storefront API: fetch products for Merch app
app.get('/api/shopify/products', async (req, res) => {
  console.log('[API] GET /api/shopify/products requested');
  try {
    const storeDomain = (process.env.SHOPIFY_STORE_DOMAIN || '').trim();
    const accessToken = (process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '').trim();
    console.log('[API] storeDomain:', storeDomain || '(empty)', 'token set:', !!accessToken);

    if (!storeDomain || !accessToken) {
      console.log('[API] missing config, returning empty products');
      return res.status(200).json({ products: [] });
    }

    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              description
              featuredImage { url }
              media(first: 20) {
                edges {
                  node {
                    mediaContentType
                    ... on MediaImage {
                      image { url }
                    }
                    ... on Video {
                      sources {
                        url
                        mimeType
                      }
                    }
                    ... on ExternalVideo {
                      embedUrl
                    }
                  }
                }
              }
              variants(first: 25) {
                edges {
                  node {
                    id
                    price {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const apiVersions = ['2024-01', '2023-10'];
    let response;
    let json = {};
    let shopifyUrl;
    let lastStatus;
    for (const version of apiVersions) {
      shopifyUrl = `https://${storeDomain}/api/${version}/graphql.json`;
      console.log('[API] calling Shopify:', shopifyUrl);
      const headers = {
        'Content-Type': 'application/json',
        'Shopify-Storefront-Private-Token': accessToken,
      };
      const buyerIp = req.ip || req.get('x-forwarded-for') || req.get('x-real-ip') || '';
      if (buyerIp) headers['Shopify-Storefront-Buyer-IP'] = buyerIp.split(',')[0].trim();
      response = await fetch(shopifyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables: { first: 50 } }),
      });
      json = await response.json().catch(() => ({}));
      lastStatus = response.status;
      console.log('[API] Shopify response status:', response.status, 'data present:', !!json.data, 'errors:', json.errors?.length ?? 0, json.errors ? json.errors.map((e) => e.message) : '');
      if (response.ok && (!json.errors || json.errors.length === 0)) break;
      if (response.status !== 404 && response.status !== 422) break;
    }

    if (!response.ok) {
      const msg = json.errors ? json.errors.map((e) => e.message).join('; ') : response.statusText;
      console.error('[API] Shopify products error:', lastStatus, msg);
      if (lastStatus === 401) {
        console.error('[API] 401 = Unauthorized. Use the Storefront API *private* token from: Settings > Apps and sales channels > Develop apps > [Your app] > API credentials > Storefront API. Ensure the app is installed on the store.');
      }
      console.log('[API] returning 0 products (reason: Shopify responded', lastStatus, ')');
      return res.status(200).json({ products: [] });
    }

    if (json.errors && json.errors.length) {
      console.error('[API] Shopify GraphQL errors:', json.errors);
      console.log('[API] returning 0 products (reason: GraphQL errors)');
      return res.status(200).json({ products: [] });
    }

    const edges = json.data?.products?.edges ?? [];
    console.log('[API] Shopify edges count:', edges.length);
    if (edges.length === 0) {
      console.log('[API] returning 0 products (reason: store has no products or none published to the sales channel)');
    }
    const products = edges.map(({ node }) => {
      const variantEdges = node.variants?.edges ?? [];
      const variants = variantEdges.map(({ node: v }) => ({
        id: v.id,
        price: v.price
          ? `${v.price.currencyCode} ${Number(v.price.amount).toFixed(2)}`
          : '',
        selectedOptions: (v.selectedOptions || []).map((o) => ({ name: o.name, value: o.value })),
      }));
      const firstVariant = variantEdges[0]?.node;
      const price = firstVariant?.price
        ? `${firstVariant.price.currencyCode} ${Number(firstVariant.price.amount).toFixed(2)}`
        : '';
      const mediaEdges = node.media?.edges ?? [];
      const productMedia = [];
      let imageUrl = node.featuredImage?.url ?? null;
      for (const { node: m } of mediaEdges) {
        if (m.mediaContentType === 'VIDEO' && m.sources?.length) {
          productMedia.push({ type: 'video', url: m.sources[0].url, videoIsEmbed: false });
        } else if (m.mediaContentType === 'EXTERNAL_VIDEO' && m.embedUrl) {
          productMedia.push({ type: 'video', url: m.embedUrl, videoIsEmbed: true });
        } else if (m.mediaContentType === 'IMAGE' && m.image?.url) {
          productMedia.push({ type: 'image', url: m.image.url });
          if (!imageUrl) imageUrl = m.image.url;
        }
      }
      if (!imageUrl && node.featuredImage?.url) imageUrl = node.featuredImage.url;
      const firstVideo = productMedia.find((s) => s.type === 'video');
      return {
        id: node.id,
        name: node.title,
        description: node.description ?? null,
        price,
        imageUrl,
        videoUrl: firstVideo ? firstVideo.url : null,
        videoIsEmbed: firstVideo ? !!firstVideo.videoIsEmbed : undefined,
        productMedia: productMedia.length > 0 ? productMedia : undefined,
        variantId: firstVariant?.id ?? null,
        variants: variants.length > 0 ? variants : undefined,
      };
    });

    console.log('Shopify products:', products.length, 'loaded for', storeDomain);
    res.json({ products });
  } catch (error) {
    console.error('[API] Shopify products error:', error.message);
    console.log('[API] returning 0 products (reason: exception)', error.message);
    res.status(200).json({ products: [] });
  }
});

// Helper: run Shopify Storefront GraphQL (mutation or query)
async function shopifyGraphQL(req, query, variables = {}) {
  const storeDomain = (process.env.SHOPIFY_STORE_DOMAIN || '').trim();
  const accessToken = (process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '').trim();
  if (!storeDomain || !accessToken) return { ok: false, json: {} };
  const shopifyUrl = `https://${storeDomain}/api/2024-01/graphql.json`;
  const headers = {
    'Content-Type': 'application/json',
    'Shopify-Storefront-Private-Token': accessToken,
  };
  const buyerIp = req.ip || req.get('x-forwarded-for') || req.get('x-real-ip') || '';
  if (buyerIp) headers['Shopify-Storefront-Buyer-IP'] = buyerIp.split(',')[0].trim();
  const response = await fetch(shopifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

// POST /api/shopify/cart – create cart or add line. Body: { cartId?, variantId, quantity }
app.post('/api/shopify/cart', async (req, res) => {
  try {
    const { cartId, variantId, quantity = 1 } = req.body || {};
    if (!variantId || typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ error: 'variantId and quantity (>= 1) required' });
    }
    const lines = [{ merchandiseId: variantId, quantity }];

    if (cartId) {
      const mutation = `
        mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { id checkoutUrl }
            userErrors { message field }
          }
        }
      `;
      const { ok, json } = await shopifyGraphQL(req, mutation, { cartId, lines });
      if (!ok) return res.status(502).json({ error: 'Shopify request failed', details: json.errors });
      const payload = json.data?.cartLinesAdd;
      const userErrors = payload?.userErrors || [];
      if (userErrors.length) return res.status(400).json({ error: userErrors.map((e) => e.message).join('; ') });
      const cart = payload?.cart;
      if (!cart) return res.status(502).json({ error: 'No cart returned' });
      return res.json({ cartId: cart.id, checkoutUrl: cart.checkoutUrl });
    }

    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart { id checkoutUrl }
          userErrors { message field }
        }
      }
    `;
    const { ok, json } = await shopifyGraphQL(req, mutation, { input: { lines } });
    if (!ok) return res.status(502).json({ error: 'Shopify request failed', details: json.errors });
    const payload = json.data?.cartCreate;
    const userErrors = payload?.userErrors || [];
    if (userErrors.length) return res.status(400).json({ error: userErrors.map((e) => e.message).join('; ') });
    const cart = payload?.cart;
    if (!cart) return res.status(502).json({ error: 'No cart returned' });
    return res.json({ cartId: cart.id, checkoutUrl: cart.checkoutUrl });
  } catch (error) {
    console.error('[API] Shopify cart error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/shopify/cart/remove – remove line(s) from cart. Body: { cartId, lineIds: [id, ...] }
app.post('/api/shopify/cart/remove', async (req, res) => {
  try {
    const { cartId, lineIds } = req.body || {};
    if (!cartId || !Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({ error: 'cartId and lineIds (non-empty array) required' });
    }
    const mutation = `
      mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart { id checkoutUrl }
          userErrors { message field }
        }
      }
    `;
    const { ok, json } = await shopifyGraphQL(req, mutation, { cartId, lineIds });
    if (!ok) return res.status(502).json({ error: 'Shopify request failed', details: json.errors });
    const payload = json.data?.cartLinesRemove;
    const userErrors = payload?.userErrors || [];
    if (userErrors.length) return res.status(400).json({ error: userErrors.map((e) => e.message).join('; ') });
    const cart = payload?.cart;
    if (!cart) return res.status(502).json({ error: 'No cart returned' });
    return res.json({ cartId: cart.id, checkoutUrl: cart.checkoutUrl });
  } catch (error) {
    console.error('[API] Shopify cart remove error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/shopify/cart/update – update line quantity. Body: { cartId, lines: [{ id, quantity }] }
app.post('/api/shopify/cart/update', async (req, res) => {
  try {
    const { cartId, lines } = req.body || {};
    if (!cartId || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'cartId and lines (non-empty array of { id, quantity }) required' });
    }
    const mutation = `
      mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart { id checkoutUrl }
          userErrors { message field }
        }
      }
    `;
    const { ok, json } = await shopifyGraphQL(req, mutation, { cartId, lines });
    if (!ok) return res.status(502).json({ error: 'Shopify request failed', details: json.errors });
    const payload = json.data?.cartLinesUpdate;
    const userErrors = payload?.userErrors || [];
    if (userErrors.length) return res.status(400).json({ error: userErrors.map((e) => e.message).join('; ') });
    const cart = payload?.cart;
    if (!cart) return res.status(502).json({ error: 'No cart returned' });
    return res.json({ cartId: cart.id, checkoutUrl: cart.checkoutUrl });
  } catch (error) {
    console.error('[API] Shopify cart update error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/shopify/cart?cartId=... – get cart for display
app.get('/api/shopify/cart', async (req, res) => {
  try {
    const cartId = (req.query.cartId || '').trim();
    if (!cartId) return res.status(400).json({ error: 'cartId required' });
    const query = `
      query getCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    image { url }
                    product { id title }
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
          cost { subtotalAmount { amount currencyCode } }
        }
      }
    `;
    const { ok, json } = await shopifyGraphQL(req, query, { cartId });
    if (!ok) return res.status(502).json({ error: 'Shopify request failed', details: json.errors });
    const cart = json.data?.cart;
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    const lines = (cart.lines?.edges || []).map(({ node }) => ({
      id: node.id,
      quantity: node.quantity,
      title: node.merchandise?.product?.title ?? node.merchandise?.title ?? 'Item',
      variantTitle: node.merchandise?.title,
      imageUrl: node.merchandise?.image?.url ?? null,
      price: node.merchandise?.price
        ? `${node.merchandise.price.currencyCode} ${Number(node.merchandise.price.amount).toFixed(2)}`
        : '',
      productId: node.merchandise?.product?.id ?? null,
    }));
    return res.json({
      cartId: cart.id,
      checkoutUrl: cart.checkoutUrl,
      lines,
      subtotal: cart.cost?.subtotalAmount
        ? `${cart.cost.subtotalAmount.currencyCode} ${Number(cart.cost.subtotalAmount.amount).toFixed(2)}`
        : '',
    });
  } catch (error) {
    console.error('[API] Shopify cart get error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Notion proxy server running on http://localhost:${PORT}`);
  console.log(`📊 Events Database ID: ${process.env.NOTION_DATABASE_ID ? 'Configured' : 'NOT SET'}`);
  console.log(`📝 Notes Database ID: ${process.env.NOTION_NOTES_DATABASE_ID ? 'Configured' : 'NOT SET'}`);
  console.log(`📺 YouTube Database ID: ${process.env.NOTION_YOUTUBE_DATABASE_ID ? 'Configured' : 'NOT SET'}`);
  console.log(`📧 Email Database ID: ${process.env.NOTION_EMAIL_DATABASE_ID ? 'Configured' : 'NOT SET'}`);
  console.log(`📇 Contact Database ID: ${process.env.NOTION_CONTACT_DATABASE_ID || '2f177e8e8c0880ddb89ee26660263f3a (hardcoded)'}`);
  console.log(`📄 About Database ID: ${process.env.NOTION_ABOUT_DATABASE_ID || '2f177e8e8c088005954fc4434d81aa21 (hardcoded)'}`);
  console.log(`🎬 YouTube API Key: ${process.env.YOUTUBE_API_KEY ? 'Configured (enhanced stats enabled)' : 'NOT SET (using oEmbed - basic info only)'}`);
  console.log(`🛒 Shopify: ${process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ? 'Configured (Merch products from Shopify)' : 'NOT SET (Merch uses test data)'}`);
});
