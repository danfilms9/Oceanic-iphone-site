import { useState, useEffect, useRef } from 'react';
import { fetchNotesFromNotion } from '../../services/notionService';
import type { Note } from '../../types/note';
import { NoteDetailPage } from './NoteDetailPage';
import { useNotes } from './NotesContext';

type NotesPage = 'main' | 'detail';

function NotesPlaceholderContent() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<NotesPage>('main');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showNewTitle, setShowNewTitle] = useState(false);
  const [detailPageVisible, setDetailPageVisible] = useState(false);
  const { setIsDetailView } = useNotes();
  
  // Refs for title elements
  const mainTitleRef = useRef<HTMLHeadingElement>(null);
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  
  useEffect(() => {
    // Fetch notes from Notion when component mounts
    fetchNotesFromNotion()
      .then((fetchedNotes) => {
        setNotes(fetchedNotes);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load notes:', error);
        setIsLoading(false);
      });
  }, []);

  const handleNoteClick = (note: Note) => {
    if (isAnimating || currentPage === 'detail') return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setDetailPageVisible(false);
    setSelectedNote(note);
    setCurrentPage('detail');
    setIsDetailView(true);
    // Delay showing new title and detail page to ensure they start off-screen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDetailPageVisible(true);
        setShowNewTitle(true);
      });
    });
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowNewTitle(false);
    setDetailPageVisible(false);
    setCurrentPage('main');
    setSelectedNote(null);
    setIsDetailView(false);
    setTimeout(() => setIsAnimating(false), 300);
  };
  
  // Check if title overflows and adjust positioning/scrolling
  useEffect(() => {
    const checkTitleOverflow = () => {
      const titleRef = currentPage === 'main' ? mainTitleRef : detailTitleRef;
      if (!titleRef.current) return;
      
      const element = titleRef.current;
      const topBar = element.closest('.iphone-notes-top-bar');
      const backButton = topBar?.querySelector('.iphone-notes-back-button');
      
      if (!topBar || !element.offsetParent) return;
      
      // Check if element is visible (not during slide transitions)
      const hasSlideOut = element.classList.contains('iphone-notes-title-slide-out');
      const hasSlideIn = element.classList.contains('iphone-notes-title-slide-in');
      const hasActive = element.classList.contains('iphone-notes-title-active');
      const isNew = element.classList.contains('iphone-notes-title-new');
      
      const isVisible = (!hasSlideOut && hasActive) || (isNew && hasSlideIn);
      
      if (isVisible) {
        const topBarWidth = topBar.clientWidth;
        const textWidth = element.scrollWidth;
        
        // Calculate available space
        let availableWidth = topBarWidth;
        if (backButton) {
          const buttonRect = backButton.getBoundingClientRect();
          const buttonRight = buttonRect.right - topBar.getBoundingClientRect().left;
          availableWidth = topBarWidth - buttonRight - 24; // 24px spacing
        }
        
        // Check if text would overlap button when centered (more strict criteria)
        const centerX = topBarWidth / 2;
        const textHalfWidth = textWidth / 2;
        const textLeftWhenCentered = centerX - textHalfWidth;
        const buttonRight = backButton ? backButton.getBoundingClientRect().right - topBar.getBoundingClientRect().left : 0;
        // Right-align if text would be within 24px of button
        const wouldOverlap = backButton && textLeftWhenCentered < buttonRight + 24;
        
        if (wouldOverlap) {
          // Right-align next to button
          element.classList.add('iphone-notes-title-right-aligned');
          element.classList.remove('iphone-notes-title-centered');
          
          // Check if text still overflows available space
          if (textWidth > availableWidth) {
            const scrollDistance = textWidth - availableWidth + 16; // Add some padding
            element.style.setProperty('--scroll-distance', `${scrollDistance}px`);
            element.classList.add('iphone-notes-title-scrolling');
          } else {
            element.classList.remove('iphone-notes-title-scrolling');
            element.style.removeProperty('--scroll-distance');
          }
        } else {
          // Center the text
          element.classList.remove('iphone-notes-title-right-aligned');
          element.classList.add('iphone-notes-title-centered');
          
          // Check if text overflows when centered
          const maxWidth = Math.min(420, topBarWidth - 32); // 32px padding
          if (textWidth > maxWidth) {
            const scrollDistance = textWidth - maxWidth;
            element.style.setProperty('--scroll-distance', `${scrollDistance}px`);
            element.classList.add('iphone-notes-title-scrolling');
          } else {
            element.classList.remove('iphone-notes-title-scrolling');
            element.style.removeProperty('--scroll-distance');
          }
        }
      } else {
        // Remove classes during transitions
        element.classList.remove('iphone-notes-title-scrolling', 'iphone-notes-title-right-aligned', 'iphone-notes-title-centered');
        element.style.removeProperty('--scroll-distance');
      }
    };
    
    checkTitleOverflow();
    const timeout = setTimeout(checkTitleOverflow, 100);
    const timeout2 = setTimeout(checkTitleOverflow, 400);
    const timeout3 = setTimeout(checkTitleOverflow, 600);
    
    window.addEventListener('resize', checkTitleOverflow);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      window.removeEventListener('resize', checkTitleOverflow);
    };
  }, [currentPage, selectedNote, showNewTitle]);
  
  // Calculate number of rows: minimum 8, or number of notes if >= 8
  const minRows = 8;
  const emptyRows = Math.max(0, minRows - notes.length);

  return (
    <div className="iphone-notes">
      {/* Notes Top Bar */}
      <div className="iphone-notes-top-bar">
        {currentPage !== 'main' && (
          <button 
            className="iphone-notes-back-button"
            onClick={handleBack}
          >
            <div className="iphone-notes-back-arrow">
              <svg 
                className="iphone-notes-back-arrow-svg"
                width="62" 
                height="32" 
                viewBox="0 0 62 32" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="bevel-filter-notes" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="blur"/>
                    <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
                    <feOffset in="blur" dx="0" dy="-1" result="offsetBlurDark"/>
                    <feFlood floodColor="rgba(255, 255, 255, 0.3)" result="lightColor"/>
                    <feFlood floodColor="rgba(0, 0, 0, 0.15)" result="darkColor"/>
                    <feComposite in="lightColor" in2="offsetBlur" operator="in" result="lightShadow"/>
                    <feComposite in="darkColor" in2="offsetBlurDark" operator="in" result="darkShadow"/>
                    <feMerge>
                      <feMergeNode in="darkShadow"/>
                      <feMergeNode in="lightShadow"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path 
                  d="M61.1874 4.7C61.1874 2.49086 59.3966 0.700001 57.1874 0.700001H12.5856C11.9608 0.700001 11.3719 0.992027 10.9936 1.4894L1.10801 14.4894C0.563997 15.2048 0.563997 16.1952 1.10801 16.9106L10.9936 29.9106C11.3719 30.408 11.9608 30.7 12.5856 30.7H57.1874C59.3966 30.7 61.1874 28.9091 61.1874 26.7V4.7Z" 
                  fill="transparent" 
                  stroke="rgba(0, 0, 0, 0.6)" 
                  strokeWidth="1.4"
                  filter="url(#bevel-filter-notes)"
                />
              </svg>
            </div>
            <span className="iphone-notes-back-text">Notes</span>
          </button>
        )}
        <div className="iphone-notes-title-container">
          <h1 
            ref={mainTitleRef}
            className={`iphone-notes-title ${currentPage !== 'main' ? 'iphone-notes-title-slide-out' : 'iphone-notes-title-active'}`}
          >
            Notes
          </h1>
          {currentPage !== 'main' && selectedNote && (
            <h1 
              ref={detailTitleRef}
              className={`iphone-notes-title iphone-notes-title-new ${showNewTitle ? 'iphone-notes-title-slide-in' : ''}`}
            >
              {selectedNote.name}
            </h1>
          )}
        </div>
      </div>

      {/* Page Container */}
      <div className="iphone-notes-page-container">
        {/* Main Notes List Page */}
        <div 
          className={`iphone-notes-main-page ${currentPage !== 'main' ? 'iphone-notes-page-slide-out' : 'iphone-notes-page-active'}`}
        >
          <div className="iphone-notes-content">
            {isLoading ? (
              <div className="iphone-notes-loading">
                <div className="iphone-notes-loading-spinner"></div>
              </div>
            ) : (
              <div className="iphone-notes-list">
                {/* Render note rows */}
                {notes.map((note) => (
                  <div 
                    key={note.id} 
                    className="iphone-notes-row"
                    onClick={() => handleNoteClick(note)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="iphone-notes-row-content">
                      <span className="iphone-notes-row-label">{note.name}</span>
                      <span className="iphone-notes-row-chevron"></span>
                    </div>
                  </div>
                ))}
                
                {/* Render empty rows if needed */}
                {Array.from({ length: emptyRows }).map((_, index) => (
                  <div key={`empty-${index}`} className="iphone-notes-row iphone-notes-row-empty">
                    {/* Empty row */}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Note Detail Page */}
        {selectedNote && (
          <div 
            className={`iphone-notes-sub-page ${detailPageVisible && currentPage === 'detail' ? 'iphone-notes-page-active' : currentPage === 'main' ? 'iphone-notes-page-slide-in' : 'iphone-notes-page-hidden'}`}
          >
            <NoteDetailPage note={selectedNote} />
          </div>
        )}
      </div>
    </div>
  );
}

export function NotesPlaceholder() {
  // NotesProvider is now at IphoneShell level, so we don't need to wrap here
  return <NotesPlaceholderContent />;
}
