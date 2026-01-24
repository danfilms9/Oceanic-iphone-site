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

// Disable pull-to-refresh on mobile
// Prevent touchmove when at the top of the page to avoid accidental refresh
let touchStartY = 0;
let touchStartX = 0;

document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  const touchY = e.touches[0].clientY;
  const touchX = e.touches[0].clientX;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // If we're at the top of the page and user is trying to scroll down, prevent it
  if (scrollTop === 0 && touchY > touchStartY && Math.abs(touchY - touchStartY) > Math.abs(touchX - touchStartX)) {
    e.preventDefault();
  }
}, { passive: false });

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
