import { useEffect, useState, useRef } from 'react';
import { APP_REGISTRY, DOCK_APP_IDS, getDockApps } from '../../apps/appRegistry';
import { ComingSoonDialog } from './ComingSoonDialog';

interface IphoneHomeProps {
  onSelectApp: (id: string) => void;
  isUnlocking?: boolean;
  shouldAnimateOut?: boolean;
  onAnimateOutComplete?: () => void;
}

interface AppIconProps {
  app: { id: string; label: string; iconPath: string };
  onSelect: (id: string) => void;
  index: number;
  shouldAnimate: boolean;
  shouldAnimateOut?: boolean;
}

function AppIcon({
  app,
  onSelect,
  index,
  shouldAnimate,
  shouldAnimateOut,
}: AppIconProps) {
  const iconRef = useRef<HTMLButtonElement>(null);
  const [animationStyle, setAnimationStyle] = useState<React.CSSProperties>({});
  const animationValuesRef = useRef<{ startX: string; startY: string } | null>(null);

  useEffect(() => {
    if (!shouldAnimate || !iconRef.current) return;

    const icon = iconRef.current;
    const grid = icon.closest('.iphone-grid') as HTMLElement;
    if (!grid) return;

    // Wait for next frame to ensure layout is complete
    requestAnimationFrame(() => {
      // Get grid dimensions and position
      const gridRect = grid.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();

      // Ensure grid is visible and has dimensions
      if (gridRect.width === 0 || gridRect.height === 0) {
        // Retry after a short delay
        setTimeout(() => {
          if (iconRef.current) {
            iconRef.current.classList.add('iphone-icon-animating');
          }
        }, 50);
        return;
      }

      // Calculate grid center
      const gridCenterX = gridRect.left + gridRect.width / 2;
      const gridCenterY = gridRect.top + gridRect.height / 2;

      // Calculate icon center
      const iconCenterX = iconRect.left + iconRect.width / 2;
      const iconCenterY = iconRect.top + iconRect.height / 2;

      // Calculate direction vector from grid center to icon
      const dx = iconCenterX - gridCenterX;
      const dy = iconCenterY - gridCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Handle edge case where icon is at center
      if (distance < 1) {
        setAnimationStyle({
          '--start-x': '0px',
          '--start-y': '0px',
          '--animation-delay': '0ms',
        } as React.CSSProperties);
        icon.classList.add('iphone-icon-animating');
        return;
      }

      // Normalize direction
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;

      // Calculate off-screen distance (1.5x screen diagonal to ensure off-screen)
      const screenDiagonal = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);
      const offScreenDistance = screenDiagonal * 1.5;

      // Calculate start position
      const startX = normalizedDx * offScreenDistance;
      const startY = normalizedDy * offScreenDistance;

      // Calculate stagger delay based on distance (closer apps arrive earlier)
      // Max distance for 4x4 grid is roughly half the grid diagonal
      const maxDistance = Math.sqrt(gridRect.width ** 2 + gridRect.height ** 2) / 2;
      const distanceRatio = Math.min(distance / maxDistance, 1);
      const staggerDelay = distanceRatio * 30; // Max 30ms stagger

      // Store animation values for reverse animation
      animationValuesRef.current = {
        startX: `${startX}px`,
        startY: `${startY}px`,
      };

      // Set CSS custom properties for animation
      setAnimationStyle({
        '--start-x': `${startX}px`,
        '--start-y': `${startY}px`,
        '--animation-delay': `${staggerDelay}ms`,
      } as React.CSSProperties);

      // Trigger animation by adding class
      requestAnimationFrame(() => {
        icon.classList.add('iphone-icon-animating');
      });
    });
  }, [shouldAnimate, index]);

  // Handle animate out (for icons that weren't clicked directly)
  useEffect(() => {
    if (!shouldAnimateOut || !iconRef.current) {
      return;
    }
    
    const icon = iconRef.current;
    
    // If class already added (from click handler), just update the stagger delay
    if (icon.classList.contains('iphone-icon-animating-out')) {
      // Calculate stagger delay for this icon
      const grid = icon.closest('.iphone-grid') as HTMLElement;
      const dock = icon.closest('.iphone-dock') as HTMLElement;
      if (grid || dock) {
        const container = grid || dock;
        const containerRect = container.getBoundingClientRect();
        const iconRect = icon.getBoundingClientRect();
        
        const containerCenterX = containerRect.left + containerRect.width / 2;
        const containerCenterY = containerRect.top + containerRect.height / 2;
        const iconCenterX = iconRect.left + iconRect.width / 2;
        const iconCenterY = iconRect.top + iconRect.height / 2;
        
        const dx = iconCenterX - containerCenterX;
        const dy = iconCenterY - containerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance >= 1 && animationValuesRef.current) {
          const maxDistance = Math.sqrt(containerRect.width ** 2 + containerRect.height ** 2) / 2;
          const distanceRatio = Math.min(distance / maxDistance, 1);
          const staggerDelay = (1 - distanceRatio) * 30;
          
          setAnimationStyle(prev => ({
            ...prev,
            '--animation-delay': `${staggerDelay}ms`,
          } as React.CSSProperties));
        }
      }
      return;
    }
    
    // Skip if no animation values (e.g., dock apps that didn't animate in)
    if (!animationValuesRef.current) {
      icon.classList.add('iphone-icon-animating-out');
      return;
    }
    
    // Calculate reverse stagger delay (farther apps leave earlier)
    const grid = icon.closest('.iphone-grid') as HTMLElement;
    const dock = icon.closest('.iphone-dock') as HTMLElement;
    if (!grid && !dock) return;

    const container = grid || dock;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    const iconCenterX = iconRect.left + iconRect.width / 2;
    const iconCenterY = iconRect.top + iconRect.height / 2;
    
    const dx = iconCenterX - containerCenterX;
    const dy = iconCenterY - containerCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let staggerDelay = 0;
    if (distance >= 1) {
      const maxDistance = Math.sqrt(containerRect.width ** 2 + containerRect.height ** 2) / 2;
      const distanceRatio = Math.min(distance / maxDistance, 1);
      staggerDelay = (1 - distanceRatio) * 30;
    }
    
    setAnimationStyle({
      '--start-x': animationValuesRef.current.startX,
      '--start-y': animationValuesRef.current.startY,
      '--animation-delay': `${staggerDelay}ms`,
    } as React.CSSProperties);
    
    icon.classList.add('iphone-icon-animating-out');
  }, [shouldAnimateOut]);

  // Generate calendar icon with dynamic date for calendar app
  const getCalendarIcon = () => {
    if (app.id !== 'calendar') return null;
    
    const now = new Date();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const dayNumber = now.getDate().toString();
    
    return (
      <div className="iphone-icon-calendar-wrapper">
        <div className="iphone-icon-calendar-red">
          {dayOfWeek}
        </div>
        <div className="iphone-icon-calendar-white">
          {dayNumber}
        </div>
      </div>
    );
  };

  const handleClick = () => {
    // Add animate-out class immediately on click to prevent flicker
    // This ensures the icon stays visible during the state transition
    if (iconRef.current && animationValuesRef.current) {
      // Set the animation style immediately to prevent flicker
      setAnimationStyle({
        '--start-x': animationValuesRef.current.startX,
        '--start-y': animationValuesRef.current.startY,
        '--animation-delay': '0ms',
      } as React.CSSProperties);
      // Add the class immediately
      iconRef.current.classList.add('iphone-icon-animating-out');
    }
    onSelect(app.id);
  };

  return (
    <button
      ref={iconRef}
      type="button"
      className="iphone-icon-wrap"
      onClick={handleClick}
      aria-label={app.label}
      style={animationStyle}
    >
      {app.id === 'calendar' ? (
        getCalendarIcon()
      ) : (
        <img
          src={app.iconPath}
          alt=""
          className="iphone-icon"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <span className="iphone-icon-label">{app.label}</span>
    </button>
  );
}

// List of app IDs that are placeholders (not fully implemented)
const PLACEHOLDER_APP_IDS: string[] = [];

export function IphoneHome({ onSelectApp, isUnlocking = false, shouldAnimateOut = false, onAnimateOutComplete }: IphoneHomeProps) {
  const [showDock, setShowDock] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const hasAnimatedRef = useRef(false);
  const [showDialog, setShowDialog] = useState(false);
  
  // Track when animate out completes
  useEffect(() => {
    if (!shouldAnimateOut) {
      return;
    }
    if (!onAnimateOutComplete) {
      return;
    }
    
    // Trigger app opening 200ms after animate out starts
    const timer = setTimeout(() => {
      onAnimateOutComplete();
    }, 200);
    
    return () => {
      clearTimeout(timer);
    };
  }, [shouldAnimateOut, onAnimateOutComplete]);
  
  // Get grid apps (all apps except those in the dock)
  // To add more apps: simply add them to APP_REGISTRY in appRegistry.ts
  // They will automatically appear in the grid (unless added to DOCK_APP_IDS)
  const gridApps = APP_REGISTRY.filter((a) => !(DOCK_APP_IDS as readonly string[]).includes(a.id) && a.id !== 'visualizer');
  const dockApps = getDockApps();

  useEffect(() => {
    if (isUnlocking) {
      // Bars finish at 625ms (300ms delay + 325ms animation)
      // Dock starts after 100ms delay = 725ms
      let appsTimer: NodeJS.Timeout | null = null;
      const dockTimer = setTimeout(() => {
        setShowDock(true);
        // Apps appear 200ms after dock starts (reduced from 300ms) = 925ms
        appsTimer = setTimeout(() => {
          setShowApps(true);
          // Trigger animation only once when transitioning from lock screen
          if (!hasAnimatedRef.current) {
            hasAnimatedRef.current = true;
            // Reduced delay to trigger animation sooner
            requestAnimationFrame(() => {
              setShouldAnimate(true);
            });
          }
        }, 200);
      }, 100);
      return () => {
        clearTimeout(dockTimer);
        if (appsTimer) clearTimeout(appsTimer);
      };
    } else {
      // If not unlocking (normal state), show everything immediately
      setShowDock(true);
      setShowApps(true);
      // Don't animate if already shown (e.g., returning from an app)
      if (!hasAnimatedRef.current) {
        hasAnimatedRef.current = true;
        requestAnimationFrame(() => {
          setShouldAnimate(true);
        });
      }
    }
  }, [isUnlocking]);

  const handleAppSelect = (appId: string) => {
    if (PLACEHOLDER_APP_IDS.includes(appId)) {
      // Show dialog for placeholder apps without navigating
      setShowDialog(true);
    } else {
      // Navigate to fully implemented apps
      onSelectApp(appId);
    }
  };

  return (
    <div className="iphone-home">
      {showDialog && <ComingSoonDialog onClose={() => setShowDialog(false)} />}
      <div className={`iphone-grid ${showApps ? 'iphone-grid-visible' : ''}`}>
        {gridApps.map((app, index) => (
          <AppIcon 
            key={app.id} 
            app={app} 
            onSelect={() => handleAppSelect(app.id)}
            index={index}
            shouldAnimate={shouldAnimate}
            shouldAnimateOut={shouldAnimateOut}
          />
        ))}
      </div>
      <div className={`iphone-dock ${showDock ? 'iphone-dock-visible' : ''}`}>
        {dockApps.map((app) => (
          <AppIcon key={app.id} app={app} onSelect={(id) => handleAppSelect(id)} index={-1} shouldAnimate={false} shouldAnimateOut={false} />
        ))}
      </div>
    </div>
  );
}
