/**
 * Utility functions for collecting user tracking data
 */

export interface TrackingData {
  userAgent: string;
  referrer: string;
  pageUrl: string;
  screenResolution: string;
  viewportSize: string;
  language: string;
  timezone: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  os: string;
  sessionId: string;
  isFirstVisit: boolean;
}

/**
 * Detects device type from user agent
 */
function detectDeviceType(userAgent: string): 'Desktop' | 'Mobile' | 'Tablet' {
  const ua = userAgent.toLowerCase();
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile';
  }
  
  return 'Desktop';
}

/**
 * Extracts browser name from user agent
 */
function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  if (ua.includes('msie') || ua.includes('trident')) return 'IE';
  
  return 'Unknown';
}

/**
 * Extracts operating system from user agent
 */
function detectOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('win')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  if (ua.includes('x11')) return 'Unix';
  
  return 'Unknown';
}

/**
 * Generates or retrieves a session ID
 */
function getSessionId(): string {
  const storageKey = 'visitor_session_id';
  let sessionId = localStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

/**
 * Checks if this is the user's first visit
 */
function isFirstVisit(): boolean {
  const hasVisitedKey = 'has_visited';
  const hasVisited = localStorage.getItem(hasVisitedKey);
  
  if (!hasVisited) {
    localStorage.setItem(hasVisitedKey, 'true');
    return true;
  }
  
  return false;
}

/**
 * Collects all available tracking data from the browser
 */
export function collectTrackingData(): TrackingData {
  const userAgent = navigator.userAgent;
  const referrer = document.referrer || '';
  const pageUrl = window.location.href;
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
  const language = navigator.language || navigator.languages?.[0] || 'unknown';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return {
    userAgent,
    referrer,
    pageUrl,
    screenResolution,
    viewportSize,
    language,
    timezone,
    deviceType: detectDeviceType(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    sessionId: getSessionId(),
    isFirstVisit: isFirstVisit(),
  };
}
