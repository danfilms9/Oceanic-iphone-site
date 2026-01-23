import { useState, useRef, useEffect } from 'react';
import type { YouTubeVideo } from '../../types/youtube';

interface YouTubeVideoViewProps {
  video: YouTubeVideo;
  onBack: () => void;
}

export function YouTubeVideoView({ video, onBack }: YouTubeVideoViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLIFrameElement>(null);

  // Extract video ID from URL
  const getVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(video.url);
  const embedUrl = videoId 
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=${window.location.origin}`
    : '';

  useEffect(() => {
    if (videoId && videoRef.current) {
      setIsPlaying(true);
    }

    // Listen for messages from YouTube iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') {
          // 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
          setIsPlaying(data.info === 1);
        } else if (data.event === 'onReady') {
          setIsPlaying(true);
        }
      } catch (e) {
        // Not a JSON message, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [videoId]);

  const handlePlayPause = () => {
    if (videoRef.current && videoRef.current.contentWindow) {
      videoRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: isPlaying ? 'pauseVideo' : 'playVideo',
          args: [],
        }),
        'https://www.youtube.com'
      );
      // Optimistically update state, will be corrected by message listener
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrevious = () => {
    // TODO: Implement previous video
  };

  const handleNext = () => {
    // TODO: Implement next video
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const scrubber = e.currentTarget;
    const rect = scrubber.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    // Estimate duration if not available (use video duration from metadata)
    const estimatedDuration = duration || (parseInt(video.duration.split(':')[0]) * 60 + parseInt(video.duration.split(':')[1]) || 180);
    const newTime = percentage * estimatedDuration;
    
    if (videoRef.current && videoRef.current.contentWindow) {
      videoRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [Math.floor(newTime), true],
        }),
        'https://www.youtube.com'
      );
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Use estimated duration if actual duration not available
  const estimatedDuration = duration || (() => {
    const parts = video.duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 180; // Default to 3 minutes
  })();
  
  const progressPercentage = estimatedDuration > 0 ? (currentTime / estimatedDuration) * 100 : 0;

  return (
    <div className="iphone-youtube-video-view">
      {/* Video Player */}
      <div className="iphone-youtube-video-player-container">
        <iframe
          ref={videoRef}
          src={embedUrl}
          className="iphone-youtube-video-iframe"
          allow="autoplay; encrypted-media"
          allowFullScreen
          frameBorder="0"
        />
      </div>

      {/* Custom Controls */}
      <div className="iphone-youtube-video-controls">
        <div className="iphone-youtube-video-controls-bar">
          {/* Control Buttons Row */}
          <div className="iphone-youtube-video-controls-buttons-row">
            {/* Play/Pause */}
            <button 
              className="iphone-youtube-video-control-button iphone-youtube-video-control-button-play"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg width="96" height="96" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6v12l14-6z" />
                </svg>
              )}
            </button>
          </div>

          {/* Progress Scrubber - Inside the bar */}
          <div 
            className="iphone-youtube-video-scrubber"
            onClick={handleScrub}
          >
            <div className="iphone-youtube-video-scrubber-track">
              <div 
                className="iphone-youtube-video-scrubber-progress"
                style={{ width: `${progressPercentage}%` }}
              />
            <div 
              className="iphone-youtube-video-scrubber-handle"
              style={{ left: `${progressPercentage}%` }}
            >
              <img 
                src="/assets/youtubeapp/youtube-playhead.webp" 
                alt=""
              />
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
