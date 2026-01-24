// Audio utility for reliable playback on mobile devices
// Preloads audio files and ensures they're ready before playing

interface AudioPreloadState {
  isLoaded: boolean;
  isLoading: boolean;
  loadPromise?: Promise<void>;
}

const audioPreloadStates: { [key: string]: AudioPreloadState } = {};
let audioContextUnlocked = false;

/**
 * Unlock audio context on first user interaction
 * This is required for mobile browsers to allow audio playback
 */
export function unlockAudioContext() {
  if (audioContextUnlocked) return;
  
  // Create a silent audio buffer and play it to unlock the audio context
  const unlockAudio = () => {
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    audio.volume = 0.01;
    audio.play()
      .then(() => {
        audioContextUnlocked = true;
        audio.remove();
      })
      .catch(() => {
        // Ignore errors during unlock attempt
      });
  };

  // Try to unlock on various user interactions
  const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
  const unlockOnce = () => {
    unlockAudio();
    events.forEach(event => {
      document.removeEventListener(event, unlockOnce, { capture: true });
    });
  };

  events.forEach(event => {
    document.addEventListener(event, unlockOnce, { capture: true, once: true });
  });
}

/**
 * Preload an audio file to ensure it's ready for playback
 */
function preloadAudio(audioPath: string): Promise<void> {
  // If already loaded, return immediately
  const state = audioPreloadStates[audioPath];
  if (state?.isLoaded) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (state?.isLoading && state.loadPromise) {
    return state.loadPromise;
  }

  // Create new preload state
  const preloadState: AudioPreloadState = {
    isLoaded: false,
    isLoading: true
  };
  audioPreloadStates[audioPath] = preloadState;

  // Create preload promise
  preloadState.loadPromise = new Promise((resolve, reject) => {
    const audio = new Audio(audioPath);
    
    // Set preload attribute
    audio.preload = 'auto';
    
    // Handle successful load
    const handleCanPlay = () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      preloadState.isLoaded = true;
      preloadState.isLoading = false;
      resolve();
    };

    // Handle errors
    const handleError = () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      preloadState.isLoading = false;
      reject(new Error(`Failed to load audio: ${audioPath}`));
    };

    audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    
    // Start loading
    audio.load();
  });

  return preloadState.loadPromise;
}

/**
 * Play audio with mobile-friendly handling
 * @param audioPath - Path to the audio file
 * @param volume - Volume level (0.0 to 1.0), defaults to 1.0
 * @returns Promise that resolves when audio starts playing
 */
export async function playAudio(audioPath: string, volume: number = 1.0): Promise<void> {
  try {
    // Unlock audio context on first call
    unlockAudioContext();

    // Ensure audio is preloaded (wait if it's still loading)
    try {
      await preloadAudio(audioPath);
    } catch (error) {
      // If preload fails, still try to play (might work anyway)
      console.warn('Audio preload failed, attempting to play anyway:', audioPath);
    }

    // Create a new audio instance for this playback
    // This allows multiple simultaneous plays of the same sound
    const audio = new Audio(audioPath);
    
    // Set volume
    audio.volume = Math.max(0, Math.min(1, volume));
    
    // Reset to beginning
    audio.currentTime = 0;
    
    // Set preload to ensure it's ready
    audio.preload = 'auto';
    
    // Play the audio with retry logic for mobile
    try {
      await audio.play();
    } catch (error) {
      // If play fails, wait a bit and try again
      // This helps with mobile browsers that need a moment to process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reset and try again
      audio.currentTime = 0;
      try {
        await audio.play();
      } catch (retryError) {
        console.warn('Failed to play audio after retry:', audioPath, retryError);
        throw retryError;
      }
    }
  } catch (error) {
    console.warn('Failed to play audio:', audioPath, error);
  }
}

/**
 * Preload multiple audio files at once
 * Useful for preloading all sound effects on app initialization
 */
export async function preloadAudioFiles(audioPaths: string[]): Promise<void> {
  // Unlock audio context first
  unlockAudioContext();
  
  const promises = audioPaths.map(path => 
    preloadAudio(path).catch(error => {
      console.warn(`Failed to preload audio: ${path}`, error);
    })
  );
  await Promise.all(promises);
}
