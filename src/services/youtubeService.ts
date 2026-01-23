import type { YouTubeVideo, NotionYouTubeVideo } from '../types/youtube';

/**
 * Extracts video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Formats duration from seconds to MM:SS or H:MM:SS
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Fetches YouTube video metadata from the backend
 */
async function fetchYouTubeMetadata(videoUrl: string): Promise<{
  title: string;
  thumbnail: string;
  viewCount: number;
  likePercentage: number;
  duration: string;
  channelName: string;
}> {
  try {
    const response = await fetch(`/api/youtube/metadata?videoUrl=${encodeURIComponent(videoUrl)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube metadata: ${response.statusText}`);
    }
    
    const data = await response.json();
    const videoId = extractVideoId(videoUrl);
    
    // For now, return basic data. In production, you'd want to use YouTube Data API v3
    // to get accurate view counts, likes, duration, and channel info
    return {
      title: data.title || 'Untitled',
      thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      viewCount: data.viewCount || 0,
      likePercentage: data.likePercentage || 0,
      duration: data.duration || '0:00',
      channelName: data.channelName || 'Unknown Channel',
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    const videoId = extractVideoId(videoUrl);
    return {
      title: 'Video',
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '',
      viewCount: 0,
      likePercentage: 0,
      duration: '0:00',
      channelName: 'Unknown Channel',
    };
  }
}

/**
 * Fetches YouTube videos from Notion database via backend proxy
 */
export async function fetchYouTubeVideosFromNotion(): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch('/api/notion/youtube-videos');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube videos: ${response.statusText}`);
    }
    
    const data: NotionYouTubeVideo[] = await response.json();
    
    // Transform Notion data to YouTubeVideo format
    const videos = await Promise.all(
      data.map(async (notionVideo) => {
        const properties = notionVideo.properties;
        
        // Get name/title
        const name = properties['Aa Name']?.title?.[0]?.plain_text || '';
        const url = properties['URL']?.url || '';
        
        if (!url) {
          return null; // Skip videos without URLs
        }
        
        // Get pages (multi-select)
        const pages = properties['Page']?.multi_select?.map((item) => item.name) || [];
        
        // Get priority
        const priority = properties['Priority']?.number || 999;
        
        // Fetch YouTube metadata
        const metadata = await fetchYouTubeMetadata(url);
        
        return {
          id: notionVideo.id,
          title: metadata.title || name,
          url,
          thumbnail: metadata.thumbnail,
          viewCount: metadata.viewCount,
          likePercentage: metadata.likePercentage,
          duration: metadata.duration,
          channelName: metadata.channelName,
          pages,
          priority,
        };
      })
    );
    
    return videos.filter((video): video is YouTubeVideo => video !== null);
  } catch (error) {
    console.error('Error fetching YouTube videos from Notion:', error);
    return [];
  }
}

/**
 * Filters videos by page/tab
 */
export function filterVideosByPage(videos: YouTubeVideo[], page: string): YouTubeVideo[] {
  return videos.filter((video) => video.pages.includes(page));
}
