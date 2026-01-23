import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/visualizer.css'
import App from './App.tsx'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
