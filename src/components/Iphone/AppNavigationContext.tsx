import { createContext, useContext, type ReactNode } from 'react';

interface AppNavigationContextType {
  openApp: (appId: string) => void;
  closeApp: () => void;
}

const AppNavigationContext = createContext<AppNavigationContextType | undefined>(undefined);

export function AppNavigationProvider({ 
  children, 
  openApp, 
  closeApp 
}: { 
  children: ReactNode;
  openApp: (appId: string) => void;
  closeApp: () => void;
}) {
  return (
    <AppNavigationContext.Provider value={{ openApp, closeApp }}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const context = useContext(AppNavigationContext);
  if (!context) {
    throw new Error('useAppNavigation must be used within AppNavigationProvider');
  }
  return context;
}
