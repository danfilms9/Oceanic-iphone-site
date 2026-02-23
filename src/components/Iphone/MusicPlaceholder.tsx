import { useState, useEffect, useRef } from 'react';
import { useAppNavigation } from './AppNavigationContext';
import { unlockAudioContext } from '../../utils/audioUtils';
import { trackButtonClick, NOTION_BUTTON_IDS } from '../../services/notionService';

type MusicTab = 'playlists' | 'artists' | 'songs' | 'albums' | 'more';
type ArtistsPage = 'main' | 'oceanic';
type AlbumsPage = 'main' | 'everything';
type PlaylistsPage = 'main' | 'dance';
type SongDetailPage = null | 'imyourboy';

const IYB_AUDIO_SRC = '/audio/im-your-boy/IYBFeaturePreview.mp3';
const IYB_COVER_SRC = '/assets/musicapp/imyourboy_cover.webp';

export function MusicPlaceholder() {
  const [selectedTab, setSelectedTab] = useState<MusicTab>('songs');
  const [artistsPage, setArtistsPage] = useState<ArtistsPage>('main');
  const [albumsPage, setAlbumsPage] = useState<AlbumsPage>('main');
  const [playlistsPage, setPlaylistsPage] = useState<PlaylistsPage>('main');
  const [songDetailPage, setSongDetailPage] = useState<SongDetailPage>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showNewTitle, setShowNewTitle] = useState(false);
  const [isIYBPlaying, setIsIYBPlaying] = useState(false);
  const [iybCurrentTime, setIybCurrentTime] = useState(0);
  const [iybDuration, setIybDuration] = useState(0);
  const [showIYBPreSave, setShowIYBPreSave] = useState(false);
  const [hasClickedIYBPreSaveInline, setHasClickedIYBPreSaveInline] = useState(false);
  const [showIYBWelcomeOverlay, setShowIYBWelcomeOverlay] = useState(false);
  const [isIYBWelcomeFading, setIsIYBWelcomeFading] = useState(false);
  const iybAudioRef = useRef<HTMLAudioElement | null>(null);

  const IYB_PRESAVE_URL = 'https://distrokid.com/hyperfollow/oceanicandcapitalsoiree/im-your-boy';
  const { openApp, closeApp } = useAppNavigation();

  const attachIYBAudioListeners = (audio: HTMLAudioElement) => {
    const onTimeUpdate = () => setIybCurrentTime(audio.currentTime);
    const onDurationChange = () => setIybDuration(audio.duration);
    const onLoadedMetadata = () => setIybDuration(audio.duration);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    setIybDuration(audio.duration || 0);
    setIybCurrentTime(audio.currentTime || 0);
  };

  // Sync IYB progress when on album page and audio already exists
  useEffect(() => {
    if (songDetailPage !== 'imyourboy' || !iybAudioRef.current) return;
    const audio = iybAudioRef.current;
    setIybCurrentTime(audio.currentTime);
    setIybDuration(audio.duration || 0);
  }, [songDetailPage]);

  // Show Pre Save popup after 26 seconds, unless user already clicked the inline Pre Save button
  useEffect(() => {
    if (isIYBPlaying && iybCurrentTime >= 26 && !hasClickedIYBPreSaveInline) {
      setShowIYBPreSave(true);
    }
  }, [isIYBPlaying, iybCurrentTime, hasClickedIYBPreSaveInline]);

  const handleOpenVisualizer = () => {
    closeApp();
    setTimeout(() => openApp('visualizer'), 100);
  };

  const handleOpenIYourBoyPage = () => {
    setSelectedTab('songs');
    setSongDetailPage('imyourboy');
    setShowIYBWelcomeOverlay(true);
    setIsIYBWelcomeFading(false);
  };

  const handleSongDetailBack = () => {
    if (iybAudioRef.current) {
      iybAudioRef.current.pause();
      setIsIYBPlaying(false);
    }
    setShowIYBPreSave(false);
    setHasClickedIYBPreSaveInline(false);
    setShowIYBWelcomeOverlay(false);
    setIsIYBWelcomeFading(false);
    setSongDetailPage(null);
  };

  const handleIYBPreSaveClick = () => {
    trackButtonClick(NOTION_BUTTON_IDS.PRE_SAVE);
    window.open(IYB_PRESAVE_URL, '_blank', 'noopener,noreferrer');
    setTimeout(() => setShowIYBPreSave(false), 3000);
  };

  const handleIYBDontLikeClick = () => {
    trackButtonClick(NOTION_BUTTON_IDS.DONT_LIKE_THE_SONG);
    setShowIYBPreSave(false);
  };

  const handleIYBPreviewNow = () => {
    setIsIYBWelcomeFading(true);
    toggleIYBPlayPause();
    setTimeout(() => {
      setShowIYBWelcomeOverlay(false);
      setIsIYBWelcomeFading(false);
    }, 350);
  };

  const toggleIYBPlayPause = () => {
    unlockAudioContext();
    if (!iybAudioRef.current) {
      iybAudioRef.current = new Audio(IYB_AUDIO_SRC);
      iybAudioRef.current.addEventListener('ended', () => setIsIYBPlaying(false));
      attachIYBAudioListeners(iybAudioRef.current);
    }
    const audio = iybAudioRef.current;
    if (isIYBPlaying) {
      audio.pause();
      setIsIYBPlaying(false);
    } else {
      audio.play().then(() => setIsIYBPlaying(true)).catch(() => {});
    }
  };
  
  // Refs for title elements to check if they overflow
  const titleRefs = {
    artists: useRef<HTMLHeadingElement>(null),
    artistsDetail: useRef<HTMLHeadingElement>(null),
    albums: useRef<HTMLHeadingElement>(null),
    albumsDetail: useRef<HTMLHeadingElement>(null),
    playlists: useRef<HTMLHeadingElement>(null),
    playlistsDetail: useRef<HTMLHeadingElement>(null),
    songs: useRef<HTMLHeadingElement>(null),
    more: useRef<HTMLHeadingElement>(null),
  };

  const getTabTitle = () => {
    if (selectedTab === 'songs' && songDetailPage === 'imyourboy') {
      return "I'm Your Boy feat ???";
    }
    if (selectedTab === 'artists' && artistsPage === 'oceanic') {
      return 'Oceanic';
    }
    if (selectedTab === 'albums' && albumsPage === 'everything') {
      return 'Everything I Want, I Need (Deluxe)';
    }
    if (selectedTab === 'playlists' && playlistsPage === 'dance') {
      return 'Dance Playlist';
    }
    switch (selectedTab) {
      case 'playlists': return 'Playlists';
      case 'artists': return 'Artists';
      case 'songs': return 'Songs';
      case 'albums': return 'Albums';
      case 'more': return 'More';
      default: return 'Music';
    }
  };

  const handleArtistsPageChange = (page: ArtistsPage) => {
    if (isAnimating || artistsPage === page) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setArtistsPage(page);
    // Delay showing new title to ensure it starts off-screen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowNewTitle(true);
      });
    });
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleArtistsBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setArtistsPage('main');
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleAlbumsPageChange = (page: AlbumsPage) => {
    if (isAnimating || albumsPage === page) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setAlbumsPage(page);
    // Delay showing new title to ensure it starts off-screen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowNewTitle(true);
      });
    });
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleAlbumsBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setAlbumsPage('main');
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handlePlaylistsPageChange = (page: PlaylistsPage) => {
    if (isAnimating || playlistsPage === page) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setPlaylistsPage(page);
    // Delay showing new title to ensure it starts off-screen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowNewTitle(true);
      });
    });
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handlePlaylistsBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setPlaylistsPage('main');
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleTabSelect = (tab: MusicTab) => {
    setSelectedTab(tab);
    // Reset page state when switching tabs
    if (tab !== 'artists') {
      setArtistsPage('main');
    }
    if (tab !== 'albums') {
      setAlbumsPage('main');
    }
    if (tab !== 'playlists') {
      setPlaylistsPage('main');
    }
    if (tab !== 'songs') {
      if (songDetailPage === 'imyourboy' && iybAudioRef.current) {
        iybAudioRef.current.pause();
        setIsIYBPlaying(false);
      }
      setSongDetailPage(null);
    }
  };

  // Check if title overflows and add scrolling class with dynamic scroll distance (YouTube-style)
  useEffect(() => {
    const checkOverflow = () => {
      // Check all title refs
      Object.values(titleRefs).forEach(ref => {
        if (ref.current) {
          const element = ref.current;
          const container = element.parentElement;
          const topBar = container?.closest('.iphone-music-top-bar');
          
          // Check if element is visible (not during slide transitions)
          // For main titles: must have 'iphone-music-title-active' and not 'iphone-music-title-slide-out'
          // For detail titles: must have 'iphone-music-title-new' and 'iphone-music-title-slide-in'
          const hasSlideOut = element.classList.contains('iphone-music-title-slide-out');
          const hasSlideIn = element.classList.contains('iphone-music-title-slide-in');
          const hasActive = element.classList.contains('iphone-music-title-active');
          const isNew = element.classList.contains('iphone-music-title-new');
          
          const isVisible = (!hasSlideOut && hasActive) || (isNew && hasSlideIn);
          
          if (container && topBar && element.offsetParent && isVisible) {
            // Wait for DOM to update
            setTimeout(() => {
              const containerWidth = container.clientWidth;
              const titleWidth = element.scrollWidth;
              
              // Get actual button positions and widths
              const backButton = topBar.querySelector('.iphone-music-back-button') as HTMLElement;
              const nowPlayingButton = topBar.querySelector('.iphone-music-now-playing-button') as HTMLElement;
              
              // Calculate available space between buttons
              // Back button: left: 8px, width: 132px, so ends at 140px
              // Now playing button: right side, width: 132px, margin-right: -18px, so starts at containerWidth - 132 - 8
              const backButtonEnd = backButton ? (backButton.offsetLeft + backButton.offsetWidth) : 0;
              const nowPlayingButtonStart = nowPlayingButton 
                ? (containerWidth - nowPlayingButton.offsetWidth - 8) // 8px right padding
                : containerWidth;
              
              // Title should start after back button with some padding
              // If back button exists: 8px (left padding) + 132px (button) + 10px (padding) = 150px
              // If no back button: start at 8px (left padding) + 10px (padding) = 18px
              const titleStartX = backButton ? 150 : 18;
              // End before now playing button with padding
              const titleEndX = nowPlayingButton ? (nowPlayingButtonStart - 10) : (containerWidth - 10);
              const availableWidth = titleEndX - titleStartX;
              
              if (titleWidth > availableWidth && availableWidth > 0) {
                // Calculate how much we need to scroll
                // The title starts at titleStartX, so we need to scroll left by (titleWidth - availableWidth)
                const scrollDistance = titleWidth - availableWidth + 20; // Add some padding
                element.style.setProperty('--youtube-scroll-distance', `${scrollDistance}px`);
                element.style.setProperty('--music-title-start-x', `${titleStartX}px`);
                element.classList.add('iphone-music-title-scrolling');
                // Add class to container for fade mask
                if (container) {
                  container.classList.add('iphone-music-title-container-scrolling');
                }
              } else {
                element.classList.remove('iphone-music-title-scrolling');
                element.style.removeProperty('--youtube-scroll-distance');
                // When back button is visible, still position title after it and apply left fade
                if (backButton) {
                  element.style.setProperty('--music-title-start-x', `${titleStartX}px`);
                  element.classList.add('iphone-music-title-with-back');
                  if (container) {
                    container.classList.add('iphone-music-title-container-scrolling');
                  }
                } else {
                  element.style.removeProperty('--music-title-start-x');
                  element.classList.remove('iphone-music-title-with-back');
                  if (container) {
                    container.classList.remove('iphone-music-title-container-scrolling');
                  }
                }
              }
            }, 100);
          } else {
            // Remove scrolling during transitions
            element.classList.remove('iphone-music-title-scrolling');
            element.classList.remove('iphone-music-title-with-back');
            element.style.removeProperty('--youtube-scroll-distance');
            element.style.removeProperty('--music-title-start-x');
            if (container) {
              container.classList.remove('iphone-music-title-container-scrolling');
            }
          }
        }
      });
    };

    // Check on mount and when relevant state changes
    checkOverflow();
    const timeout = setTimeout(checkOverflow, 100); // Small delay to ensure DOM is updated
    const timeout2 = setTimeout(checkOverflow, 400); // Additional delay for animations to complete
    const timeout3 = setTimeout(checkOverflow, 600); // Extra delay to ensure slide-in animation completes
    
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [selectedTab, artistsPage, albumsPage, playlistsPage, showNewTitle, songDetailPage]);

  const renderContent = () => {
    switch (selectedTab) {
      case 'playlists':
        return (
          <div className="iphone-music-page-container">
            {/* Main Playlists Page */}
            <div 
              className={`iphone-music-main-page ${playlistsPage !== 'main' ? 'iphone-music-page-slide-out' : 'iphone-music-page-active'}`}
            >
              <div className="iphone-music-list">
                <button 
                  className="iphone-music-item"
                  onClick={() => handlePlaylistsPageChange('dance')}
                >
                  <span className="iphone-music-item-text">Dance Playlist</span>
                  <span className="iphone-music-item-chevron"></span>
                </button>
              </div>
            </div>

            {/* Dance Playlist Detail Page */}
            <div 
              className={`iphone-music-sub-page ${playlistsPage === 'dance' ? 'iphone-music-page-active' : playlistsPage === 'main' ? 'iphone-music-page-slide-in' : 'iphone-music-page-hidden'}`}
            >
              <div className="iphone-music-list">
                <button 
                  className="iphone-music-item"
                  onClick={handleOpenVisualizer}
                >
                  <span className="iphone-music-item-text">Hold Me (Palomar Remix) (Visulizer)</span>
                  <span className="iphone-music-item-chevron"></span>
                </button>
                <button 
                  className="iphone-music-item"
                  onClick={handleOpenIYourBoyPage}
                >
                  <span className="iphone-music-item-text">I'm Your Boy feat ???</span>
                  <span className="iphone-music-item-chevron"></span>
                </button>
              </div>
            </div>
          </div>
        );
      case 'artists':
        return (
          <div className="iphone-music-page-container">
            {/* Main Artists Page */}
            <div 
              className={`iphone-music-main-page ${artistsPage !== 'main' ? 'iphone-music-page-slide-out' : 'iphone-music-page-active'}`}
            >
              <div className="iphone-music-list">
                <button 
                  className="iphone-music-item"
                  onClick={() => handleArtistsPageChange('oceanic')}
                >
                  <span className="iphone-music-item-text">Oceanic</span>
                  <span className="iphone-music-item-chevron"></span>
                </button>
              </div>
            </div>

            {/* Oceanic Detail Page */}
            <div 
              className={`iphone-music-sub-page ${artistsPage === 'oceanic' ? 'iphone-music-page-active' : artistsPage === 'main' ? 'iphone-music-page-slide-in' : 'iphone-music-page-hidden'}`}
            >
              <div className="iphone-music-list">
                <button 
                  className="iphone-music-item"
                  onClick={handleOpenVisualizer}
                >
                  <span className="iphone-music-item-text">Hold Me (Palomar Remix) (Visulizer)</span>
                  <span className="iphone-music-item-chevron"></span>
                </button>
                <button 
                  className="iphone-music-item"
                  onClick={handleOpenIYourBoyPage}
                >
                  <span className="iphone-music-item-text">I'm Your Boy feat ???</span>
                  <span className="iphone-music-item-chevron"></span>
                </button>
              </div>
            </div>
          </div>
        );
      case 'songs':
        if (songDetailPage === 'imyourboy') {
          const iybProgress = iybDuration > 0 ? iybCurrentTime / iybDuration : 0;
          const showWelcomeOverlay = showIYBWelcomeOverlay || isIYBWelcomeFading;
          return (
            <div className="iphone-music-album-page">
              {showWelcomeOverlay && (
                <div
                  className={`iphone-music-album-welcome-overlay ${isIYBWelcomeFading ? 'iphone-music-album-welcome-overlay-fade-out' : ''}`}
                  role="dialog"
                  aria-label="New release announcement"
                >
                  <div className="iphone-music-album-welcome-popup">
                    <p className="iphone-music-album-welcome-message">
                      We are releasing a new version of &quot;I&apos;m Your Boy&quot; with a suprise feature! It comes out this Friday
                    </p>
                    <button
                      type="button"
                      className="iphone-music-album-welcome-preview-btn"
                      onClick={handleIYBPreviewNow}
                    >
                      Preview Now
                    </button>
                  </div>
                </div>
              )}
              <img
                src={IYB_COVER_SRC}
                alt="I'm Your Boy"
                className={`iphone-music-album-cover ${isIYBPlaying ? 'iphone-music-album-cover-playing' : ''}`}
              />
              <button
                type="button"
                className="iphone-music-album-play-pause"
                onClick={toggleIYBPlayPause}
                aria-label={isIYBPlaying ? 'Pause' : 'Play'}
              >
                <span className={`iphone-music-play-pause-icon ${isIYBPlaying ? 'iphone-music-pause' : 'iphone-music-play'}`} />
              </button>
              <div className="iphone-music-album-progress-wrap">
                <div
                  className="iphone-music-album-progress-track"
                  role="progressbar"
                  aria-valuenow={iybDuration ? (iybCurrentTime / iybDuration) * 100 : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="iphone-music-album-progress-fill"
                    style={{ width: `${iybProgress * 100}%` }}
                  />
                </div>
              </div>
              {showIYBPreSave && (
                <div className="iphone-music-album-presave-overlay" role="dialog" aria-label="Pre-save">
                  <div className="iphone-music-album-presave-popup">
                    <p className="iphone-music-album-presave-message">
                      Pre-save the song to be the first to hear the whole thing
                    </p>
                    <div className="iphone-music-album-presave-popup-buttons">
                      <button
                        type="button"
                        className="iphone-music-album-presave-dontlike-btn"
                        onClick={handleIYBDontLikeClick}
                      >
                        I don&apos;t like the song
                      </button>
                      <button
                        type="button"
                        className="iphone-music-album-presave-btn"
                        onClick={handleIYBPreSaveClick}
                      >
                        Pre Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="iphone-music-album-presave-inline">
                <a
                  href={IYB_PRESAVE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="iphone-music-album-presave-inline-btn"
                  onClick={() => {
                    setHasClickedIYBPreSaveInline(true);
                    trackButtonClick(NOTION_BUTTON_IDS.PRE_SAVE);
                  }}
                >
                  Pre Save
                </a>
              </div>
            </div>
          );
        }
        return (
          <div className="iphone-music-list">
            <button 
              className="iphone-music-item"
              onClick={handleOpenVisualizer}
            >
              <span className="iphone-music-item-text">Hold Me (Palomar Remix) (Visulizer)</span>
              <span className="iphone-music-item-chevron"></span>
            </button>
            <button 
              className="iphone-music-item"
              onClick={handleOpenIYourBoyPage}
            >
              <span className="iphone-music-item-text">I'm Your Boy feat ???</span>
              <span className="iphone-music-item-chevron"></span>
            </button>
          </div>
        );
      case 'albums':
        return (
          <div className="iphone-music-page-container">
            {/* Main Albums Page */}
            <div 
              className={`iphone-music-main-page ${albumsPage !== 'main' ? 'iphone-music-page-slide-out' : 'iphone-music-page-active'}`}
            >
              <div className="iphone-music-list">
                <button 
                  className="iphone-music-item"
                  onClick={() => handleAlbumsPageChange('everything')}
                >
                  <span className="iphone-music-item-text">Everything I Want, I Need (Deluxe)</span>
                  <span className="iphone-music-item-chevron"></span>
                </button>
              </div>
            </div>

            {/* Everything I Want, I Need (Deluxe) Detail Page */}
            <div 
              className={`iphone-music-sub-page ${albumsPage === 'everything' ? 'iphone-music-page-active' : albumsPage === 'main' ? 'iphone-music-page-slide-in' : 'iphone-music-page-hidden'}`}
            >
              <div className="iphone-music-list">
                <button 
                  className="iphone-music-item"
                  onClick={handleOpenVisualizer}
                >
                  <span className="iphone-music-item-text">Hold Me (Palomar Remix) (Visulizer)</span>
                  <span className="iphone-music-item-chevron"></span>
                </button>
                <button 
                  className="iphone-music-item"
                  onClick={handleOpenIYourBoyPage}
                >
                  <span className="iphone-music-item-text">I'm Your Boy feat ???</span>
                  <span className="iphone-music-item-chevron"></span>
                </button>
              </div>
            </div>
          </div>
        );
      case 'more':
        return (
          <div className="iphone-music-list">
            {/* Empty for now */}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="iphone-music">
      {/* Top Bar */}
      <div className="iphone-music-top-bar">
        {((selectedTab === 'artists' && artistsPage !== 'main') || 
          (selectedTab === 'albums' && albumsPage !== 'main') ||
          (selectedTab === 'playlists' && playlistsPage !== 'main') ||
          (selectedTab === 'songs' && songDetailPage !== null)) && (
          <button 
            className="iphone-music-back-button"
            onClick={
              selectedTab === 'songs' ? handleSongDetailBack :
              selectedTab === 'artists' ? handleArtistsBack : 
              selectedTab === 'albums' ? handleAlbumsBack :
              handlePlaylistsBack
            }
          >
            <div className="iphone-music-back-arrow">
              <div className="iphone-music-back-arrow-stem"></div>
              <div className="iphone-music-back-arrow-head"></div>
            </div>
            <span className="iphone-music-back-text">
              {selectedTab === 'songs' ? 'Songs' :
               selectedTab === 'artists' ? 'Artists' : 
               selectedTab === 'albums' ? 'Albums' : 
               'Playlists'}
            </span>
          </button>
        )}
        <div className={`iphone-music-title-container ${selectedTab === 'songs' && songDetailPage !== null ? 'iphone-music-title-container-fade-left-only' : ''}`}>
          {selectedTab === 'artists' ? (
            <>
              <h1 
                ref={titleRefs.artists}
                className={`iphone-music-title ${artistsPage !== 'main' ? 'iphone-music-title-slide-out' : 'iphone-music-title-active'}`}
              >
                Artists
              </h1>
              {artistsPage !== 'main' && (
                <h1 
                  ref={titleRefs.artistsDetail}
                  className={`iphone-music-title iphone-music-title-new ${showNewTitle ? 'iphone-music-title-slide-in' : ''}`}
                >
                  Oceanic
                </h1>
              )}
            </>
          ) : selectedTab === 'albums' ? (
            <>
              <h1 
                ref={titleRefs.albums}
                className={`iphone-music-title ${albumsPage !== 'main' ? 'iphone-music-title-slide-out' : 'iphone-music-title-active'}`}
              >
                Albums
              </h1>
              {albumsPage !== 'main' && (
                <h1 
                  ref={titleRefs.albumsDetail}
                  className={`iphone-music-title iphone-music-title-new ${showNewTitle ? 'iphone-music-title-slide-in' : ''}`}
                >
                  Everything I Want, I Need (Deluxe)
                </h1>
              )}
            </>
          ) : selectedTab === 'playlists' ? (
            <>
              <h1 
                ref={titleRefs.playlists}
                className={`iphone-music-title ${playlistsPage !== 'main' ? 'iphone-music-title-slide-out' : 'iphone-music-title-active'}`}
              >
                Playlists
              </h1>
              {playlistsPage !== 'main' && (
                <h1 
                  ref={titleRefs.playlistsDetail}
                  className={`iphone-music-title iphone-music-title-new ${showNewTitle ? 'iphone-music-title-slide-in' : ''}`}
                >
                  Dance Playlist
                </h1>
              )}
            </>
          ) : (
            <h1 
              ref={titleRefs[selectedTab as keyof typeof titleRefs]}
              className="iphone-music-title iphone-music-title-active"
            >
              {getTabTitle()}
            </h1>
          )}
        </div>
        {songDetailPage === null && (
          <button 
            className="iphone-music-now-playing-button"
            onClick={handleOpenVisualizer}
          >
            <span className="iphone-music-now-playing-text">
              <span>Now</span>
              <span>Playing</span>
            </span>
            <div className="iphone-music-now-playing-arrow">
              <div className="iphone-music-now-playing-arrow-stem"></div>
              <div className="iphone-music-now-playing-arrow-head"></div>
            </div>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="iphone-music-content">
        {renderContent()}
      </div>

      {/* Bottom Toolbar */}
      <div className="iphone-music-toolbar">
        <img 
          src="/assets/musicapp/musictoolbar.webp" 
          alt="Music Toolbar" 
          className="iphone-music-toolbar-image"
        />
        <div className="iphone-music-toolbar-overlay">
          <button 
            className={`iphone-music-toolbar-button ${selectedTab === 'playlists' ? 'iphone-music-toolbar-button-selected' : ''}`}
            onClick={() => handleTabSelect('playlists')}
            style={{ left: '0%', width: '20%' }}
          />
          <button 
            className={`iphone-music-toolbar-button ${selectedTab === 'artists' ? 'iphone-music-toolbar-button-selected' : ''}`}
            onClick={() => handleTabSelect('artists')}
            style={{ left: '20%', width: '20%' }}
          />
          <button 
            className={`iphone-music-toolbar-button ${selectedTab === 'songs' ? 'iphone-music-toolbar-button-selected' : ''}`}
            onClick={() => handleTabSelect('songs')}
            style={{ left: '40%', width: '20%' }}
          />
          <button 
            className={`iphone-music-toolbar-button ${selectedTab === 'albums' ? 'iphone-music-toolbar-button-selected' : ''}`}
            onClick={() => handleTabSelect('albums')}
            style={{ left: '60%', width: '20%' }}
          />
          <button 
            className={`iphone-music-toolbar-button ${selectedTab === 'more' ? 'iphone-music-toolbar-button-selected' : ''}`}
            onClick={() => handleTabSelect('more')}
            style={{ left: '80%', width: '20%' }}
          />
        </div>
      </div>
      
    </div>
  );
}
