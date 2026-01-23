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

const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
require('dotenv').config();

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
});
