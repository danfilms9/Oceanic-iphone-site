export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  viewCount: number;
  likePercentage: number;
  duration: string; // Format: "MM:SS" or "H:MM:SS"
  channelName: string;
  pages: string[]; // Array of page names (Featured, Most Viewed, etc.)
  priority: number;
}

export interface NotionYouTubeVideo {
  id: string;
  properties: {
    'Aa Name'?: {
      title: Array<{ plain_text: string }>;
    };
    'URL'?: {
      url: string;
    };
    'Page'?: {
      multi_select: Array<{ name: string }>;
    };
    'Priority'?: {
      number: number | null;
    };
  };
}
