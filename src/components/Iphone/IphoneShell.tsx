import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { IphoneHome } from './IphoneHome';
import { LockScreen } from './LockScreen';
import { getApp } from '../../apps/appRegistry';
import { WallpaperProvider, useWallpaper } from './WallpaperContext';
import { AppNavigationProvider } from './AppNavigationContext';
import { VisualizerProvider, useVisualizer } from '../VisualizerContext';
import { useNotes, NotesProvider } from './NotesContext';
import { WelcomeDialog } from './WelcomeDialog';
import { playAudio, preloadAudioFiles } from '../../utils/audioUtils';
import './iphone.css';

const FRAME_W = 826;
const FRAME_H = 1517;

function formatTime() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
}

function formatLockTime() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 || 12;
  return h12.toString() + ':' + m.toString().padStart(2, '0');
}

function getFrameScale(): number {
  const padH = 72;  /* iphone-page padding top + bottom */
  const padW = 48;
  const scaleByH = (window.innerHeight - padH) / FRAME_H;
  const scaleByW = (window.innerWidth - padW) / FRAME_W;
  return Math.max(0.1, Math.min(1, scaleByH, scaleByW));
}

function IphoneShellContent() {
  const location = useLocation();
  const isTourDeepLink = location.pathname === '/tour';
  const isMerchDeepLink = location.pathname === '/merch';
  const { wallpaper } = useWallpaper();
  const { pause: pauseVisualizer, dispose: disposeVisualizer } = useVisualizer();
  const { isDetailView: isNotesDetailView } = useNotes();
  const [isLocked, setIsLocked] = useState(!(isTourDeepLink || isMerchDeepLink));
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [time, setTime] = useState(formatTime);
  const [lockTime, setLockTime] = useState(formatLockTime);
  const [scale, setScale] = useState(getFrameScale);
  const [isHomeButtonClicked, setIsHomeButtonClicked] = useState(false);
  const [isLockButtonClicked, setIsLockButtonClicked] = useState(false);
  const [blackOverlayOpacity, setBlackOverlayOpacity] = useState(0);
  const [isLocking, setIsLocking] = useState(false);
  const [overlayTransition, setOverlayTransition] = useState('opacity 100ms ease-out');
  const [shouldAnimateOut, setShouldAnimateOut] = useState(false);
  const [pendingAppId, setPendingAppId] = useState<string | null>(null);
  const pendingAppIdRef = useRef<string | null>(null);
  const tourDeepLinkAppliedRef = useRef(false);
  const merchDeepLinkAppliedRef = useRef(false);
  const [isAppClosing, setIsAppClosing] = useState(false);
  const appViewRef = useRef<HTMLDivElement | null>(null);
  const closeAppTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const welcomeDialogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFrameImageLoaded, setIsFrameImageLoaded] = useState(false);
  const [isWallpaperLoaded, setIsWallpaperLoaded] = useState(false);
  const frameImageRef = useRef<HTMLImageElement | null>(null);
  const wallpaperImageRef = useRef<HTMLImageElement | null>(null);

  // Check if all critical assets are loaded
  const isReady = isFrameImageLoaded && isWallpaperLoaded;

  // Preload sound effects on mount for better mobile performance
  useEffect(() => {
    preloadAudioFiles([
      '/audio/sound-effects/unlock.mp3',
      '/audio/sound-effects/lock.mp3',
      '/audio/sound-effects/home.mp3',
      '/audio/sound-effects/popup.mp3'
    ]).catch(error => {
      console.warn('Failed to preload some audio files:', error);
    });
  }, []);

  // Preload iPhone frame image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsFrameImageLoaded(true);
    img.onerror = () => {
      console.warn('Failed to load iPhone frame image');
      setIsFrameImageLoaded(true); // Allow rendering even if image fails
    };
    img.src = '/assets/iphone/iPhone.webp';
    frameImageRef.current = img;
  }, []);

  // Preload wallpaper image
  useEffect(() => {
    if (!wallpaper) {
      setIsWallpaperLoaded(true); // No wallpaper to load
      return;
    }
    const img = new Image();
    img.onload = () => setIsWallpaperLoaded(true);
    img.onerror = () => {
      console.warn('Failed to load wallpaper image');
      setIsWallpaperLoaded(true); // Allow rendering even if image fails
    };
    img.src = wallpaper;
    wallpaperImageRef.current = img;
  }, [wallpaper]);

  useEffect(() => {
    const t = setInterval(() => {
      setTime(formatTime());
      setLockTime(formatLockTime());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeAppId) {
        // Cancel any existing close timeout
        if (closeAppTimeoutRef.current) {
          clearTimeout(closeAppTimeoutRef.current);
          closeAppTimeoutRef.current = null;
        }
        // Trigger close animation
        setIsAppClosing(true);
        if (appViewRef.current) {
          const appIdToClose = activeAppId;
          closeAppTimeoutRef.current = setTimeout(() => {
            if (activeAppId === appIdToClose) {
              setActiveAppId(null);
              setIsAppClosing(false);
            } else {
              setIsAppClosing(false);
            }
            closeAppTimeoutRef.current = null;
          }, 400);
        } else {
          setActiveAppId(null);
          setIsAppClosing(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeAppId]);

  useEffect(() => {
    const onResize = () => setScale(getFrameScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Deep link: /tour → open calendar app once after home screen is visible (user can close and stay on home)
  useEffect(() => {
    if (!isTourDeepLink || isLocked || activeAppId || pendingAppId || tourDeepLinkAppliedRef.current) return;
    tourDeepLinkAppliedRef.current = true;
    const timer = setTimeout(() => {
      setShouldAnimateOut(true);
      setPendingAppId('calendar');
      pendingAppIdRef.current = 'calendar';
    }, 600); // Let home screen and dock/apps appear first
    return () => clearTimeout(timer);
  }, [isTourDeepLink, isLocked, activeAppId, pendingAppId]);

  // Deep link: /merch → open merch app once after home screen is visible (same behavior as /tour)
  useEffect(() => {
    if (!isMerchDeepLink || isLocked || activeAppId || pendingAppId || merchDeepLinkAppliedRef.current) return;
    merchDeepLinkAppliedRef.current = true;
    const timer = setTimeout(() => {
      setShouldAnimateOut(true);
      setPendingAppId('merch');
      pendingAppIdRef.current = 'merch';
    }, 600); // Let home screen and dock/apps appear first
    return () => clearTimeout(timer);
  }, [isMerchDeepLink, isLocked, activeAppId, pendingAppId]);

  // Cleanup welcome dialog timeout on unmount
  useEffect(() => {
    return () => {
      if (welcomeDialogTimeoutRef.current) {
        clearTimeout(welcomeDialogTimeoutRef.current);
      }
    };
  }, []);

  // Reset animate out state when returning to home (only if we're not in the process of opening an app)
  useEffect(() => {
    // Only reset if we're returning to home (no active app) AND we're not in the process of opening a new app
    // If pendingAppId exists, we're opening an app, so don't reset
    if (!activeAppId && shouldAnimateOut && !pendingAppId) {
      setShouldAnimateOut(false);
      setPendingAppId(null);
      pendingAppIdRef.current = null;
    }
  }, [activeAppId, shouldAnimateOut, pendingAppId]);

  // Stable callback for animate out completion
  const handleAnimateOutComplete = useCallback(() => {
    // After animate out completes, show the app
    const appIdToOpen = pendingAppIdRef.current;
    if (appIdToOpen !== null) {
      setActiveAppId(appIdToOpen);
      setPendingAppId(null);
      pendingAppIdRef.current = null;
      setShouldAnimateOut(false);
    }
  }, []);

  const app = activeAppId ? getApp(activeAppId) : null;
  const Component = app?.component;
  const isHomeScreen = !isLocked && !activeAppId;
  const isSettingsApp = activeAppId === 'settings';
  const isMusicApp = activeAppId === 'music';
  const isVisualizerApp = activeAppId === 'visualizer';
  
  const isPhotosApp = activeAppId === 'photos';
  const isCalendarApp = activeAppId === 'calendar';
  const isNotesApp = activeAppId === 'notes';
  const isYoutubeApp = activeAppId === 'youtube';
  const isNotesDetailViewActive = isNotesApp && isNotesDetailView;

  // Show loading state until critical assets are ready
  if (!isReady) {
    return (
      <div className="iphone-page" style={{ opacity: 1 }}>
        {/* Preload images in the background */}
        <img
          src="/assets/iphone/iPhone.webp"
          alt=""
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          onLoad={() => setIsFrameImageLoaded(true)}
          onError={() => setIsFrameImageLoaded(true)}
        />
        {wallpaper && (
          <img
            src={wallpaper}
            alt=""
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            onLoad={() => setIsWallpaperLoaded(true)}
            onError={() => setIsWallpaperLoaded(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="iphone-page">
      <div
        className="iphone-frame-wrapper"
        style={{ '--scale': scale } as React.CSSProperties}
      >
        <div className="iphone-frame">
        <div className="iphone-screen">
          {/* Shared wallpaper (lock screen and home screen; blurred/darkened on home) */}
          <div 
            className={`iphone-wallpaper ${!isLocked ? 'iphone-wallpaper-home' : ''}`}
            style={wallpaper 
              ? { backgroundImage: `url(${wallpaper})` }
              : { backgroundColor: '#000' }
            } 
          />
          
          {/* Shared status bar */}
          <div className={`iphone-lockscreen-statusbar-bg ${isCalendarApp ? 'iphone-statusbar-calendar' : ''}`}>
            <header className="iphone-lockscreen-statusbar">
              <div className="iphone-lockscreen-statusbar-left">
                <span className="iphone-lockscreen-signal">
                  <span className="iphone-lockscreen-signal-bar"></span>
                  <span className="iphone-lockscreen-signal-bar"></span>
                  <span className="iphone-lockscreen-signal-bar"></span>
                  <span className="iphone-lockscreen-signal-bar"></span>
                  <span className="iphone-lockscreen-signal-bar"></span>
                </span>
              </div>
              <div className="iphone-lockscreen-statusbar-center">
                {isLocked ? (
                  <span className={`iphone-lockscreen-lock-icon ${isUnlocking ? 'iphone-lockscreen-lock-icon-unlocking' : ''}`}>🔒</span>
                ) : (
                  <span className={`iphone-lockscreen-statusbar-time iphone-lockscreen-statusbar-time-home`}>
                    {time}
                  </span>
                )}
              </div>
              <div className="iphone-lockscreen-statusbar-right">
                <span className="iphone-lockscreen-battery">
                  <svg width="18" height="9" viewBox="0 0 18 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="1" width="14" height="7" rx="1" fill="#FFFFFF"/>
                    <rect x="15" y="2.5" width="2.5" height="4" rx="0.5" fill="#FFFFFF"/>
                  </svg>
                </span>
              </div>
            </header>
          </div>
          
          {isLocked ? (
            <LockScreen 
              isUnlocking={isUnlocking}
              onUnlock={() => {
                // Sound is already played in LockScreen component during user interaction
                // This ensures it works on mobile browsers
                setIsUnlocking(true);
                // Delay the actual unlock state change to allow animation
                // Bars: 300ms delay + 325ms animation = 625ms total
                setTimeout(() => {
                  setIsLocked(false);
                  
                  // Check if this is the first unlock
                  const hasUnlockedBefore = localStorage.getItem('iphone_has_unlocked');
                  if (!hasUnlockedBefore) {
                    // Mark as unlocked
                    localStorage.setItem('iphone_has_unlocked', 'true');
                    
                    // Show welcome dialog after 1500ms delay
                    if (welcomeDialogTimeoutRef.current) {
                      clearTimeout(welcomeDialogTimeoutRef.current);
                    }
                    welcomeDialogTimeoutRef.current = setTimeout(() => {
                      setShowWelcomeDialog(true);
                      welcomeDialogTimeoutRef.current = null;
                    }, 1500);
                  }
                  
                  // Keep isUnlocking true for dock and apps animation
                  // Dock: 100ms delay + 300ms fade-in = 400ms
                  // Apps: appear after dock finishes
                  setTimeout(() => {
                    setIsUnlocking(false);
                  }, 400); // 100ms delay + 300ms dock fade-in
                }, 300 + 325); // 300ms delay + 325ms animation
              }} 
            />
          ) : (
            <>
              {Component ? (
                <div 
                  key={activeAppId} 
                  ref={appViewRef}
                  className={`iphone-app-view ${isAppClosing ? 'iphone-app-closing' : ''}`}
                >
                  <AppNavigationProvider 
                    openApp={(id) => {
                      // Cancel any pending close animation if a new app is being opened
                      if (closeAppTimeoutRef.current) {
                        clearTimeout(closeAppTimeoutRef.current);
                        closeAppTimeoutRef.current = null;
                        setIsAppClosing(false);
                      }
                      setActiveAppId(id);
                    }} 
                    closeApp={() => {
                      // Cancel any existing close timeout
                      if (closeAppTimeoutRef.current) {
                        clearTimeout(closeAppTimeoutRef.current);
                        closeAppTimeoutRef.current = null;
                      }
                      // Trigger close animation
                      setIsAppClosing(true);
                      if (appViewRef.current) {
                        // Wait for animation to complete before actually closing
                        // Store the appId at the time of closing to check if it's still the same
                        const appIdToClose = activeAppId;
                        closeAppTimeoutRef.current = setTimeout(() => {
                          // Only close if the active app is still the one we intended to close
                          // (i.e., no new app has been opened)
                          if (activeAppId === appIdToClose) {
                            setActiveAppId(null);
                            setIsAppClosing(false);
                          } else {
                            setIsAppClosing(false);
                          }
                          closeAppTimeoutRef.current = null;
                        }, 400); // Match animation duration
                      } else {
                        setActiveAppId(null);
                        setIsAppClosing(false);
                      }
                    }}
                  >
                    <Component />
                  </AppNavigationProvider>
                </div>
              ) : (
                <IphoneHome 
                  onSelectApp={(id) => {
                    // Trigger animate out before showing app
                    setShouldAnimateOut(true);
                    setPendingAppId(id);
                    pendingAppIdRef.current = id;
                  }} 
                  isUnlocking={isUnlocking}
                  shouldAnimateOut={shouldAnimateOut}
                  onAnimateOutComplete={handleAnimateOutComplete}
                />
              )}
            </>
          )}
          
          {/* Welcome Dialog */}
          {showWelcomeDialog && (
            <WelcomeDialog onClose={() => setShowWelcomeDialog(false)} />
          )}
        </div>

        {/* Black overlay for lock animation */}
        {isLocking && (
          <div 
            className="iphone-black-overlay"
            style={{ 
              opacity: blackOverlayOpacity,
              transition: overlayTransition
            }}
          />
        )}

        <img
          ref={frameImageRef}
          src="/assets/iphone/iPhone.webp"
          alt=""
          className="iphone-frame-img"
          width={826}
          height={1517}
          onLoad={() => setIsFrameImageLoaded(true)}
          onError={() => setIsFrameImageLoaded(true)}
        />

        <button
          type="button"
          className={`iphone-home-button ${isHomeButtonClicked ? 'iphone-home-button-clicked' : ''}`}
          onMouseDown={() => setIsHomeButtonClicked(true)}
          onMouseUp={() => setIsHomeButtonClicked(false)}
          onMouseLeave={() => setIsHomeButtonClicked(false)}
          onClick={() => {
            // Play home sound when home button is clicked
            playAudio('/audio/sound-effects/home.mp3');
            // If visualizer is active, fully dispose it before navigating away
            if (activeAppId === 'visualizer') {
              disposeVisualizer();
            }
            // Cancel any existing close timeout
            if (closeAppTimeoutRef.current) {
              clearTimeout(closeAppTimeoutRef.current);
              closeAppTimeoutRef.current = null;
            }
            // Trigger close animation
            if (activeAppId) {
              setIsAppClosing(true);
              if (appViewRef.current) {
                // Wait for animation to complete before actually closing
                const appIdToClose = activeAppId;
                closeAppTimeoutRef.current = setTimeout(() => {
                  if (activeAppId === appIdToClose) {
                    setActiveAppId(null);
                    setIsAppClosing(false);
                  } else {
                    setIsAppClosing(false);
                  }
                  closeAppTimeoutRef.current = null;
                }, 400); // Match animation duration
              } else {
                setActiveAppId(null);
                setIsAppClosing(false);
              }
            } else {
              setActiveAppId(null);
            }
          }}
          aria-label="Home"
        />

        <button
          type="button"
          className={`iphone-lock-button ${isLockButtonClicked ? 'iphone-lock-button-clicked' : ''}`}
          onMouseDown={() => setIsLockButtonClicked(true)}
          onMouseUp={() => setIsLockButtonClicked(false)}
          onMouseLeave={() => setIsLockButtonClicked(false)}
          onClick={() => {
            // If already locked, just ensure state is correct
            if (isLocked) {
              setActiveAppId(null);
              setIsUnlocking(false);
              return;
            }
            
            // Play lock sound when lock button is clicked
            playAudio('/audio/sound-effects/lock.mp3');
            
            // Start locking animation sequence
            setIsLocking(true);
            setActiveAppId(null);
            setIsUnlocking(false);
            
            // Set transition for fade in (100ms)
            setOverlayTransition('opacity 100ms ease-out');
            
            // Use requestAnimationFrame to ensure transition is applied before opacity change
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Fade in black overlay over 100ms
                setBlackOverlayOpacity(1);
                
                // After fade in completes (100ms), reveal lock screen
                setTimeout(() => {
                  setIsLocked(true);
                  
                  // Delay 100ms, then start fade out
                  setTimeout(() => {
                    // Change transition for fade out (500ms)
                    setOverlayTransition('opacity 500ms ease-out');
                    
                    // Use requestAnimationFrame to ensure transition is applied
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        // Fade out over 500ms
                        setBlackOverlayOpacity(0);
                        
                        // After fade out completes (500ms), cleanup
                        setTimeout(() => {
                          setIsLocking(false);
                        }, 500);
                      });
                    });
                  }, 100);
                }, 100);
              });
            });
          }}
          aria-label="Lock"
        />
      </div>
      </div>
    </div>
  );
}

export function IphoneShell() {
  return (
    <WallpaperProvider>
      <VisualizerProvider>
        <NotesProvider>
          <IphoneShellContent />
        </NotesProvider>
      </VisualizerProvider>
    </WallpaperProvider>
  );
}
