import { createContext, useContext, type ReactNode, useState, useCallback } from 'react';

interface VisualizerContextType {
  isPaused: boolean;
  pausedTime: number | null;
  pause: () => void;
  resume: () => void;
  dispose: () => void;
  registerPauseResume: (pauseFn: () => number, resumeFn: (time: number) => void) => void;
  registerDispose: (disposeFn: () => void) => void;
}

const VisualizerContext = createContext<VisualizerContextType | undefined>(undefined);

export function VisualizerProvider({ children }: { children: ReactNode }) {
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState<number | null>(null);
  const [pauseFn, setPauseFn] = useState<(() => number) | null>(null);
  const [resumeFn, setResumeFn] = useState<((time: number) => void) | null>(null);
  const [disposeFn, setDisposeFn] = useState<(() => void) | null>(null);

  const registerPauseResume = useCallback((pause: () => number, resume: (time: number) => void) => {
    setPauseFn(() => pause);
    setResumeFn(() => resume);
  }, []);

  const registerDispose = useCallback((dispose: () => void) => {
    setDisposeFn(() => dispose);
  }, []);

  const pause = useCallback(() => {
    if (pauseFn) {
      const time = pauseFn();
      setIsPaused(true);
      setPausedTime(time);
    }
  }, [pauseFn]);

  const resume = useCallback(() => {
    if (resumeFn && pausedTime !== null) {
      resumeFn(pausedTime);
      setIsPaused(false);
      setPausedTime(null);
    }
  }, [resumeFn, pausedTime]);

  const dispose = useCallback(() => {
    if (disposeFn) {
      disposeFn();
      setIsPaused(false);
      setPausedTime(null);
    }
  }, [disposeFn]);

  return (
    <VisualizerContext.Provider
      value={{
        isPaused,
        pausedTime,
        pause,
        resume,
        dispose,
        registerPauseResume,
        registerDispose,
      }}
    >
      {children}
    </VisualizerContext.Provider>
  );
}

export function useVisualizer() {
  const context = useContext(VisualizerContext);
  if (!context) {
    throw new Error('useVisualizer must be used within VisualizerProvider');
  }
  return context;
}
