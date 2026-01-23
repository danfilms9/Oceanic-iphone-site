import { useState, useEffect, useRef } from 'react';
import { fetchYouTubeVideosFromNotion, filterVideosByPage } from '../../services/youtubeService';
import type { YouTubeVideo } from '../../types/youtube';
import { YouTubeVideoRow } from './YouTubeVideoRow';
import { YouTubeVideoView } from './YouTubeVideoView';

type YoutubeTab = 'featured' | 'mostviewed' | 'search' | 'favorites' | 'more';

const TAB_TO_PAGE_MAP: Record<YoutubeTab, string> = {
  featured: 'Featured',
  mostviewed: 'Most Viewed',
  search: 'Search',
  favorites: 'Favorites',
  more: 'More',
};

export function YoutubePlaceholder() {
  const [currentTab, setCurrentTab] = useState<YoutubeTab>('featured');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showNewTitle, setShowNewTitle] = useState(false);
  const videoTitleRef = useRef<HTMLHeadingElement>(null);

  const getImageSrc = (tab: YoutubeTab): string => {
    switch (tab) {
      case 'featured':
        return '/assets/youtubeapp/youtube-bottom-featured.webp';
      case 'mostviewed':
        return '/assets/youtubeapp/youtube-bottom-mostviewed.webp';
      case 'search':
        return '/assets/youtubeapp/youtube-bottom-search.webp';
      case 'favorites':
        return '/assets/youtubeapp/youtube-bottom-favorites.webp';
      case 'more':
        return '/assets/youtubeapp/youtube-bottom-more.webp';
      default:
        return '/assets/youtubeapp/youtube-bottom-featured.webp';
    }
  };

  const getTabTitle = (tab: YoutubeTab): string => {
    switch (tab) {
      case 'featured':
        return 'Featured';
      case 'mostviewed':
        return 'Most Viewed';
      case 'search':
        return 'Search';
      case 'favorites':
        return 'Favorites';
      case 'more':
        return 'More';
      default:
        return 'YouTube';
    }
  };

  useEffect(() => {
    async function loadVideos() {
      setLoading(true);
      try {
        const allVideos = await fetchYouTubeVideosFromNotion();
        setVideos(allVideos);
      } catch (error) {
        console.error('Error loading videos:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadVideos();
  }, []);

  const handleBottomBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const sectionWidth = width / 5;
    
    // Determine which 1/5 section was clicked
    if (clickX < sectionWidth) {
      setCurrentTab('featured');
    } else if (clickX < sectionWidth * 2) {
      setCurrentTab('mostviewed');
    } else if (clickX < sectionWidth * 3) {
      setCurrentTab('search');
    } else if (clickX < sectionWidth * 4) {
      setCurrentTab('favorites');
    } else {
      setCurrentTab('more');
    }
  };

  const handleVideoSelect = (video: YouTubeVideo) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setSelectedVideo(video);
    // Delay showing new title to ensure it starts off-screen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowNewTitle(true);
      });
    });
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setSelectedVideo(null);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const currentPage = TAB_TO_PAGE_MAP[currentTab];
  let filteredVideos = filterVideosByPage(videos, currentPage);
  
  // Sort by view count for "Most Viewed" tab
  if (currentTab === 'mostviewed') {
    filteredVideos = [...filteredVideos].sort((a, b) => b.viewCount - a.viewCount);
  }

  const isVideoView = selectedVideo !== null;
  const videoTitle = selectedVideo?.title || '';
  const [shouldScrollTitle, setShouldScrollTitle] = useState(false);

  // Calculate scroll distance for long titles based on actual width
  useEffect(() => {
    if (isVideoView && videoTitleRef.current && videoTitle.length > 22) {
      const titleElement = videoTitleRef.current;
      const container = titleElement.closest('.iphone-settings-title-container');
      if (!container) return;

      // Wait for DOM to update
      setTimeout(() => {
        const containerWidth = container.clientWidth;
        const titleWidth = titleElement.scrollWidth;
        const availableWidth = containerWidth - 200; // Account for back button space (132px + padding)
        
        if (titleWidth > availableWidth) {
          const scrollDistance = titleWidth - availableWidth + 20; // Add some padding
          titleElement.style.setProperty('--youtube-scroll-distance', `${scrollDistance}px`);
          setShouldScrollTitle(true);
        } else {
          setShouldScrollTitle(false);
          titleElement.style.removeProperty('--youtube-scroll-distance');
        }
      }, 100);
    } else {
      setShouldScrollTitle(false);
      if (videoTitleRef.current) {
        videoTitleRef.current.style.removeProperty('--youtube-scroll-distance');
      }
    }
  }, [isVideoView, videoTitle]);

  return (
    <div className="iphone-youtube">
      {/* YouTube Top Bar */}
      <div className={`iphone-settings-top-bar ${isVideoView ? 'iphone-youtube-top-bar-video' : ''}`}>
        {isVideoView && (
          <button 
            className="iphone-notes-back-button"
            onClick={handleBack}
          >
            <div className="iphone-notes-back-arrow">
              <svg 
                className="iphone-notes-back-arrow-svg"
                width="62" 
                height="32" 
                viewBox="0 0 62 32" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="bevel-filter-youtube" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="blur"/>
                    <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
                    <feOffset in="blur" dx="0" dy="-1" result="offsetBlurDark"/>
                    <feFlood floodColor="rgba(255, 255, 255, 0.3)" result="lightColor"/>
                    <feFlood floodColor="rgba(0, 0, 0, 0.15)" result="darkColor"/>
                    <feComposite in="lightColor" in2="offsetBlur" operator="in" result="lightShadow"/>
                    <feComposite in="darkColor" in2="offsetBlurDark" operator="in" result="darkShadow"/>
                    <feMerge>
                      <feMergeNode in="darkShadow"/>
                      <feMergeNode in="lightShadow"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path 
                  d="M61.1874 4.7C61.1874 2.49086 59.3966 0.700001 57.1874 0.700001H12.5856C11.9608 0.700001 11.3719 0.992027 10.9936 1.4894L1.10801 14.4894C0.563997 15.2048 0.563997 16.1952 1.10801 16.9106L10.9936 29.9106C11.3719 30.408 11.9608 30.7 12.5856 30.7H57.1874C59.3966 30.7 61.1874 28.9091 61.1874 26.7V4.7Z" 
                  fill="transparent" 
                  stroke="rgba(0, 0, 0, 0.6)" 
                  strokeWidth="1.4"
                  filter="url(#bevel-filter-youtube)"
                />
              </svg>
            </div>
            <span className="iphone-notes-back-text">Back</span>
          </button>
        )}
        <div className="iphone-settings-title-container">
          <h1 
            className={`iphone-settings-title ${isVideoView ? 'iphone-settings-title-slide-out' : 'iphone-settings-title-active'}`}
          >
            {getTabTitle(currentTab)}
          </h1>
          {isVideoView && (
            <h1 
              ref={videoTitleRef}
              className={`iphone-settings-title iphone-settings-title-new ${showNewTitle ? 'iphone-settings-title-slide-in' : ''} ${shouldScrollTitle ? 'iphone-youtube-title-scrolling' : ''}`}
            >
              {selectedVideo.title}
            </h1>
          )}
        </div>
      </div>

      {/* Page Container */}
      <div className={`iphone-youtube-page-container ${isVideoView ? 'iphone-youtube-page-container-video-view' : ''}`}>
        {/* Video List Page */}
        <div 
          className={`iphone-youtube-main-page ${isVideoView ? 'iphone-youtube-page-slide-out' : 'iphone-youtube-page-active'}`}
        >
          {/* Content Area */}
          <div className="iphone-youtube-content">
            <div className="iphone-youtube-content-inner">
              {loading ? (
                <div className="iphone-notes-loading">
                  <div className="iphone-notes-loading-spinner"></div>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="iphone-youtube-empty">No videos found</div>
              ) : (
                filteredVideos.map((video) => (
                  <div key={video.id} onClick={() => handleVideoSelect(video)}>
                    <YouTubeVideoRow video={video} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Video View Page */}
        {selectedVideo && (
          <div 
            className={`iphone-youtube-sub-page ${isVideoView ? 'iphone-youtube-page-active' : 'iphone-youtube-page-hidden'}`}
          >
            <YouTubeVideoView video={selectedVideo} onBack={handleBack} />
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      {!isVideoView && (
        <div 
          className="iphone-youtube-bottom-bar"
          onClick={handleBottomBarClick}
        >
          <img 
            src={getImageSrc(currentTab)} 
            alt="YouTube Navigation"
            className="iphone-youtube-bottom-image"
          />
        </div>
      )}
    </div>
  );
}
