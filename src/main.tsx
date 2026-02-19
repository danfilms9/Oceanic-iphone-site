import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/visualizer.css'
import App from './App.tsx'
import { collectTrackingData } from './utils/tracking'
import { trackPageVisit } from './services/notionService'

// Global error handler to prevent crashes from unhandled promise rejections
// This is especially important for OBJ file loading and other async operations
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection caught:', event.reason);
  // Prevent the default browser behavior (which can crash the page)
  event.preventDefault();
  // Optionally, you can handle specific error types here
  if (event.reason?.message?.includes('OBJ') || event.reason?.message?.includes('load')) {
    console.warn('File loading error handled, continuing with defaults');
  }
});

// Also catch general errors
window.addEventListener('error', (event) => {
  console.warn('Global error caught:', event.error);
  // Don't prevent default for all errors, but log them
});

// Disable pull-to-refresh on mobile.
// We must NOT prevent touchmove when the user is scrolling inside the merch app (or any
// scrollable in-app area), or iOS Safari won't scroll the inner div in both directions.
// Use the touch *start* target for the whole gesture (touchmove target can change as the
// finger moves), and run in capture phase so we don't interfere with the scroll container.

function isInsideScrollableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Node)) return false;
  let node: Node | null = el as Node;
  while (node && node !== document.body) {
    if (node instanceof Element) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;
      const canScrollY = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
      const canScrollX = overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay';
      if (canScrollY || canScrollX) {
        const scrollHeight = node.scrollHeight;
        const clientHeight = node.clientHeight;
        const scrollWidth = node.scrollWidth;
        const clientWidth = node.clientWidth;
        const scrollableY = canScrollY && scrollHeight > clientHeight;
        const scrollableX = canScrollX && scrollWidth > clientWidth;
        if (scrollableY || scrollableX) return true;
      }
    }
    node = node.parentNode;
  }
  return false;
}

function isTouchInsideMerchApp(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Element)) return false;
  return !!el.closest('.iphone-merch');
}

let touchStartY = 0;
let touchStartX = 0;
let touchStartTarget: EventTarget | null = null;

document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
  touchStartTarget = e.target;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  // Use the element that was under the finger when the gesture started, not the current target
  // (which can change during move and break scroll, especially on iOS).
  const startEl = touchStartTarget;

  // Never block touchmove when the gesture started inside the merch app so scroll up/down both work.
  if (isTouchInsideMerchApp(startEl)) return;

  // Never block when the gesture started inside any scrollable container.
  if (isInsideScrollableElement(startEl)) return;

  const touchY = e.touches[0].clientY;
  const touchX = e.touches[0].clientX;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Only prevent pull-to-refresh: at top of *window* and user is dragging down.
  if (scrollTop === 0 && touchY > touchStartY && Math.abs(touchY - touchStartY) > Math.abs(touchX - touchStartX)) {
    e.preventDefault();
  }
}, { passive: false, capture: true });

document.addEventListener('touchend', () => {
  touchStartTarget = null;
}, { passive: true });
document.addEventListener('touchcancel', () => {
  touchStartTarget = null;
}, { passive: true });

// Track page visit on load
try {
  const trackingData = collectTrackingData();
  // Fire and forget - don't wait for it to complete
  trackPageVisit(trackingData).catch(() => {
    // Silently fail - tracking shouldn't break the app
  });
} catch (error) {
  // Silently fail - tracking shouldn't break the app
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
