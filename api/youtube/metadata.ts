import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl } = req.query;

    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({
        error: 'videoUrl query parameter is required',
      });
    }

    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    if (!videoIdMatch) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const videoId = videoIdMatch[1];

    // Use oEmbed API (no key required) for basic info
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
    );
    if (!oembedResponse.ok) {
      throw new Error('Failed to fetch oEmbed data');
    }
    const oembedData = await oembedResponse.json();

    // Get thumbnail
    const thumbnail =
      oembedData.thumbnail_url ||
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

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

    // YouTube Data API v3 is required for view counts, likes, and duration.
    // Set YOUTUBE_API_KEY in your Vercel project (Environment Variables) for the deployed site.
    const youtubeApiKey =
      process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    if (youtubeApiKey) {
      try {
        const youtubeResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=snippet,statistics,contentDetails`
        );

        const youtubeData = await youtubeResponse.json();

        if (youtubeResponse.ok && youtubeData.items?.length > 0) {
          const item = youtubeData.items[0];
          const statistics = item.statistics || {};
          const contentDetails = item.contentDetails || {};
          const viewCount = parseInt(
            String(statistics.viewCount ?? 0),
            10
          );
          const likeCount = parseInt(
            String(statistics.likeCount ?? 0),
            10
          );
          const likePercentage =
            viewCount > 0 ? Math.round((likeCount / viewCount) * 100) : 0;

          let duration = '0:00';
          const durationRaw = contentDetails.duration;
          if (durationRaw && typeof durationRaw === 'string') {
            const durationMatch = durationRaw.match(
              /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
            );
            let durationSeconds = 0;
            if (durationMatch) {
              durationSeconds += parseInt(durationMatch[1] || '0', 10) * 3600;
              durationSeconds += parseInt(durationMatch[2] || '0', 10) * 60;
              durationSeconds += parseInt(durationMatch[3] || '0', 10);
            }
            const hours = Math.floor(durationSeconds / 3600);
            const minutes = Math.floor((durationSeconds % 3600) / 60);
            const seconds = durationSeconds % 60;
            duration =
              hours > 0
                ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                : `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          return res.status(200).json({
            ...baseResponse,
            viewCount,
            likePercentage,
            duration,
          });
        }

        if (!youtubeResponse.ok && youtubeData?.error) {
          console.warn(
            'YouTube Data API error:',
            youtubeData.error.code,
            youtubeData.error.message
          );
        }
      } catch (youtubeError) {
        console.warn(
          'YouTube Data API error, using oEmbed data only:',
          youtubeError
        );
      }
    }

    // Return oEmbed data (works without API key, but stats will be 0)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json(baseResponse);
  } catch (error: any) {
    console.error('YouTube metadata error:', error);
    return res.status(500).json({
      error: 'Failed to fetch YouTube metadata',
      message: error.message,
    });
  }
}
