import { useEffect, useRef, useState } from 'react';
import { VisualizerEngine } from '../engine/VisualizerEngine';
import { MultiStemAudioController } from '../audio/MultiStemAudioController';
import { useVisualizer } from './VisualizerContext';

export function VisualizerApp() {
  const { registerPauseResume, registerDispose, pausedTime, resume } = useVisualizer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualizerEngine | null>(null);
  const audioControllerRef = useRef<MultiStemAudioController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState('Loading...');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    let engine: VisualizerEngine | null = null;
    let audioController: MultiStemAudioController | null = null;
    let initTimeout: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    // Use a function to check refs with retry logic
    const initializeVisualizer = async () => {
      let canvas = canvasRef.current;
      let container = containerRef.current;
      
      // Retry up to 10 times if refs are not ready
      let retries = 0;
      const maxRetries = 10;
      
      while ((!canvas || !container) && retries < maxRetries && !isCleanedUp) {
        await new Promise(resolve => setTimeout(resolve, 50));
        canvas = canvasRef.current;
        container = containerRef.current;
        retries++;
      }
      
      if (isCleanedUp) {
        return;
      }
      
      if (!canvas || !container) {
        return;
      }

      // Initialize after a delay to ensure container is fully laid out and animation is complete
      // Wait longer to ensure the app opening animation has finished
      initTimeout = setTimeout(async () => {
      try {
        // Wait a bit more to ensure container has reached full size after animation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const rect = container.getBoundingClientRect();
        
        // Ensure we have valid dimensions (container should be fully rendered by now)
        if (rect.width < 10 || rect.height < 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          const retryRect = container.getBoundingClientRect();
          if (retryRect.width >= 10 && retryRect.height >= 10) {
            canvas.width = retryRect.width;
            canvas.height = retryRect.height;
          } else {
            canvas.width = 800; // Fallback
            canvas.height = 600; // Fallback
          }
        } else {
          // Use full width and height for full screen
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
        
        // Create multi-stem audio controller
        try {
          audioController = new MultiStemAudioController();
          audioControllerRef.current = audioController;
        
          // Set up track change callback
          audioController.setOnTrackChange((name) => {
            setTrackName(name);
            setCurrentTime(0);
            setDuration(0);
          });

          // Set up duration change callback
          audioController.setOnDurationChange((duration) => {
            setDuration(duration);
          });
          
          // Get initial track name
          setTrackName(audioController.getCurrentTrackName());
          
          // Wait for all stems (incl. SERUM_3) to load so play() can start them; avoids
          // orbit/Serum-3 reactivity never turning on when a stem loads after play().
          await audioController.whenReady();
          
          // Check for initial duration
          const initialDuration = audioController.getDuration();
          if (initialDuration > 0) {
            setDuration(initialDuration);
          }
          
          // Check if we should resume from a paused state
          if (pausedTime !== null && pausedTime > 0) {
            // Seek to the paused time
            audioController.seekTo(pausedTime);
            // Resume playback
            await audioController.play();
            setIsPlaying(true);
            // Clear the paused state
            resume();
          } else {
            // Auto-play audio (all stems will play)
            await audioController.play();
            setIsPlaying(true);
          }
          setIsLoading(false);
        } catch (error) {
          if (audioController) {
            setTrackName(audioController.getCurrentTrackName());
          }
          setIsLoading(false);
          setIsPlaying(true);
        }
      
      // Create engine with audio controller
      try {
        engine = new VisualizerEngine(canvas, audioController || undefined);
        engineRef.current = engine;
        engine.start();
      } catch (error) {
        throw error;
      }
      
      // Handle resize
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          // Use full width and height for full screen
          canvas.width = width;
          canvas.height = height;
          if (engine) {
            engine.resize(width, height);
          }
        }
      });

      resizeObserver.observe(container);
      } catch (error) {
        // Error handling
      }
      }, 10);
    };

    // Start initialization
    initializeVisualizer().catch(() => {
      // Error handling
    });

    // Cleanup
    return () => {
      isCleanedUp = true;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (audioController) {
        audioController.dispose();
        audioControllerRef.current = null;
      }
      if (engine) {
        engine.dispose();
        engineRef.current = null;
      }
    };
  }, [pausedTime, resume]);

  // Register pause/resume/dispose methods with context after initialization
  useEffect(() => {
    const pauseVisualizer = (): number => {
      const audioController = audioControllerRef.current;
      const engine = engineRef.current;
      if (audioController && engine) {
        // Pause audio
        audioController.pause();
        setIsPlaying(false);
        // Stop animation loop
        engine.stop();
        // Return current playback time
        return audioController.getCurrentTime();
      }
      return 0;
    };

    const resumeVisualizer = (time: number): void => {
      const audioController = audioControllerRef.current;
      const engine = engineRef.current;
      if (audioController && engine) {
        // Seek to the paused time
        audioController.seekTo(time);
        // Resume audio
        audioController.play().then(() => {
          setIsPlaying(true);
        });
        // Restart animation loop
        engine.start();
      }
    };

    const disposeVisualizer = (): void => {
      const audioController = audioControllerRef.current;
      const engine = engineRef.current;
      if (audioController) {
        // Fully dispose audio controller (stops all audio, clears sources, closes context)
        audioController.dispose();
        audioControllerRef.current = null;
        setIsPlaying(false);
      }
      if (engine) {
        // Fully dispose engine (stops animation, disposes resources)
        engine.dispose();
        engineRef.current = null;
      }
    };

    registerPauseResume(pauseVisualizer, resumeVisualizer);
    registerDispose(disposeVisualizer);
  }, [registerPauseResume, registerDispose]);

  const [isDragging, setIsDragging] = useState(false);

  // Track mouse over the canvas and pass normalized position to the engine for pan/tilt
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        engineRef.current?.setMousePosition(normX, normY);
        
        // Handle drag
        if (isDragging && engineRef.current) {
          engineRef.current.handleMouseMove(e.clientX, e.clientY, rect, isDragging);
        }
      }
    };

    const handleMouseLeave = () => {
      engineRef.current?.setMousePosition(null, null);
      if (isDragging) {
        setIsDragging(false);
        engineRef.current?.handleMouseUp();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (engineRef.current) {
        const dragStarted = engineRef.current.handleMouseDown(e.clientX, e.clientY, rect);
        if (dragStarted) {
          setIsDragging(true);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        engineRef.current?.handleMouseUp();
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Update current time periodically. Interval is always created so it starts as soon as
  // audioControllerRef is set (after async init). Early return only inside the tick.
  useEffect(() => {
    const updateTime = () => {
      const audioController = audioControllerRef.current;
      if (!audioController) return;

      if (!isScrubbing) {
        const time = audioController.getCurrentTime();
        setCurrentTime(time);
      }

      // Fallback: check duration periodically (will only update if it changes)
      const newDuration = audioController.getDuration();
      if (newDuration > 0) {
        setDuration(prevDuration => {
          return newDuration !== prevDuration ? newDuration : prevDuration;
        });
      }
    };

    const interval = setInterval(updateTime, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, [isScrubbing]);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audioController = audioControllerRef.current;
    if (!audioController) return;

    const newTime = parseFloat(e.target.value);
    if (!isNaN(newTime) && isFinite(newTime)) {
      setCurrentTime(newTime);
      audioController.seekTo(newTime);
    }
  };

  const handleSliderMouseDown = () => {
    setIsScrubbing(true);
  };

  const handleSliderMouseUp = () => {
    setIsScrubbing(false);
  };

  const handlePlayPause = async () => {
    const audioController = audioControllerRef.current;
    if (!audioController) return;

    if (isPlaying) {
      audioController.pause();
      setIsPlaying(false);
    } else {
      await audioController.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="visualizer-app" ref={containerRef}>
      <canvas 
        ref={canvasRef} 
        className="visualizer-canvas"
        width={600}
        height={600}
      />
      {isLoading && (
        <div className="visualizer-loading">
          <div>Loading audio stems...</div>
          <div style={{ fontSize: '0.8em', marginTop: '0.5em', opacity: 0.7 }}>
            Please wait while we load all audio tracks
          </div>
        </div>
      )}
    </div>
  );
}
