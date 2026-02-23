import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface MusicDeepLinkContextType {
  /** Consume the "open to I'm Your Boy" flag. Returns true once if it was set, then clears it. */
  consumeOpenToIYB: () => boolean;
  /** Set the flag so the next Music app mount will open directly to I'm Your Boy. */
  setOpenToIYB: () => void;
}

const MusicDeepLinkContext = createContext<MusicDeepLinkContextType | undefined>(undefined);

export function MusicDeepLinkProvider({ children }: { children: ReactNode }) {
  const [openToIYB, setOpenToIYBState] = useState(false);

  const setOpenToIYB = useCallback(() => {
    setOpenToIYBState(true);
  }, []);

  const consumeOpenToIYB = useCallback(() => {
    if (!openToIYB) return false;
    setOpenToIYBState(false);
    return true;
  }, [openToIYB]);

  return (
    <MusicDeepLinkContext.Provider value={{ consumeOpenToIYB, setOpenToIYB }}>
      {children}
    </MusicDeepLinkContext.Provider>
  );
}

export function useMusicDeepLink() {
  const context = useContext(MusicDeepLinkContext);
  if (!context) {
    throw new Error('useMusicDeepLink must be used within MusicDeepLinkProvider');
  }
  return context;
}
