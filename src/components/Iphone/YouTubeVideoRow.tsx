import type { YouTubeVideo } from '../../types/youtube';

interface YouTubeVideoRowProps {
  video: YouTubeVideo;
}

export function YouTubeVideoRow({ video }: YouTubeVideoRowProps) {
  return (
    <div className="iphone-youtube-video-row" style={{ cursor: 'pointer' }}>
      {/* Thumbnail */}
      <div className="iphone-youtube-video-thumbnail">
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="iphone-youtube-video-thumbnail-image"
        />
      </div>
      
      {/* Video Info */}
      <div className="iphone-youtube-video-info">
        {/* Title Section */}
        <div className="iphone-youtube-video-title-section">
          <h3 className="iphone-youtube-video-title">{video.title}</h3>
        </div>
        
        {/* Stats Section */}
        <div className="iphone-youtube-video-stats-section">
          <div className="iphone-youtube-video-likes">
            <img 
              src="/assets/youtubeapp/youtube-thumb.webp" 
              alt=""
              className="iphone-youtube-video-thumbs-up"
            />
            <span className="iphone-youtube-video-like-percentage">100%</span>
          </div>
          <span className="iphone-youtube-video-views">
            {video.viewCount.toLocaleString()} views
          </span>
        </div>
        
        {/* Meta Section */}
        <div className="iphone-youtube-video-meta-section">
          <span className="iphone-youtube-video-duration">{video.duration}</span>
          <span className="iphone-youtube-video-channel">{video.channelName}</span>
        </div>
      </div>
      
      {/* Chevron */}
      <div className="iphone-youtube-video-chevron">
        <img 
          src="/assets/youtubeapp/youtube-chevron.webp" 
          alt=""
          className="iphone-youtube-video-chevron-image"
        />
      </div>
    </div>
  );
}
