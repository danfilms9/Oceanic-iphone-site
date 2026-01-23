import { createContext, useContext, useState, type ReactNode } from 'react';

interface NotesContextType {
  isDetailView: boolean;
  setIsDetailView: (value: boolean) => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [isDetailView, setIsDetailView] = useState(false);

  return (
    <NotesContext.Provider value={{ isDetailView, setIsDetailView }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  // Return default values if not in provider (for use in IphoneShell)
  if (!context) {
    return { isDetailView: false, setIsDetailView: () => {} };
  }
  return context;
}
