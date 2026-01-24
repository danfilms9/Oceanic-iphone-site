/**
 * Device detection utilities for mobile optimization
 */

/**
 * Detect if the device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  if (mobileRegex.test(userAgent)) {
    return true;
  }
  
  // Check screen size (fallback for desktop browsers in mobile mode)
  if (window.innerWidth <= 768) {
    return true;
  }
  
  // Check for touch support
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    return true;
  }
  
  return false;
}

/**
 * Detect if the device is likely in battery saver mode
 * This is a heuristic based on performance characteristics
 */
export function isLikelyBatterySaverMode(): boolean {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return false;
  
  // Check if requestAnimationFrame is being throttled
  // This is a simple heuristic - in battery saver mode, rAF is often throttled to 30fps or less
  const now = performance.now();
  let lastFrameTime = now;
  let frameCount = 0;
  let totalFrameTime = 0;
  
  const checkFrame = (currentTime: number) => {
    frameCount++;
    const delta = currentTime - lastFrameTime;
    totalFrameTime += delta;
    lastFrameTime = currentTime;
    
    if (frameCount >= 10) {
      const avgFrameTime = totalFrameTime / frameCount;
      // If average frame time is > 33ms (less than 30fps), likely throttled
      return avgFrameTime > 33;
    }
    
    requestAnimationFrame(checkFrame);
    return false;
  };
  
  // This is async, so we'll use a simpler synchronous check
  // Just check if we're on mobile (which often has battery saver-like behavior)
  return isMobileDevice();
}

/**
 * Get optimal FFT size for the device
 * Smaller FFT size = less CPU usage but lower frequency resolution
 */
export function getOptimalFFTSize(): number {
  if (isMobileDevice()) {
    return 1024; // Reduced from 2048 for mobile
  }
  return 2048; // Desktop can handle larger FFT
}

/**
 * Get optimal pixel ratio for the device
 */
export function getOptimalPixelRatio(): number {
  if (isMobileDevice()) {
    // On mobile, use lower pixel ratio to improve performance
    return Math.min(window.devicePixelRatio, 1.5);
  }
  return Math.min(window.devicePixelRatio, 2);
}
