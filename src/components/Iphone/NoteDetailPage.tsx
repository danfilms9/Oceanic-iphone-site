import { useState, useEffect, useRef } from 'react';
import type { Note } from '../../types/note';

interface NoteDetailPageProps {
  note: Note;
}

// Function to split text into lines based on available width
function splitTextIntoLines(text: string, maxWidth: number, fontSize: number, fontFamily: string): string[] {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return [text];
  
  context.font = `${fontSize}px ${fontFamily}`;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = context.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

export function NoteDetailPage({ note }: NoteDetailPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [emptyRowsCount, setEmptyRowsCount] = useState(0);
  const [wrappedLines, setWrappedLines] = useState<string[]>([]);

  // Split content by newlines and then wrap long lines
  useEffect(() => {
    if (!containerRef.current) {
      setWrappedLines([]);
      return;
    }

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const paddingLeft = 70;
    const paddingRight = 20;
    const availableWidth = containerWidth - paddingLeft - paddingRight;
    
    const allWrappedLines: string[] = [];
    
    // Add title as the first line (wrap if needed)
    if (note.name) {
      const titleWrapped = splitTextIntoLines(note.name, availableWidth, 39, 'Marker Felt, MarkerFelt-Wide, Comic Sans MS, cursive');
      allWrappedLines.push(...titleWrapped);
      // Add one blank line after the title
      allWrappedLines.push('');
    }
    
    // Split content by newlines and wrap (preserve empty lines)
    if (note.content) {
      const rawLines = note.content.split('\n');
      rawLines.forEach(line => {
        // If line is empty or only whitespace, add an empty line to preserve spacing
        if (line.trim() === '') {
          allWrappedLines.push('');
        } else {
          // Wrap non-empty lines
          const wrapped = splitTextIntoLines(line, availableWidth, 39, 'Marker Felt, MarkerFelt-Wide, Comic Sans MS, cursive');
          allWrappedLines.push(...wrapped);
        }
      });
    }
    
    setWrappedLines(allWrappedLines);
  }, [note.content, note.name]);

  // Calculate how many rows fit on the page and add empty rows to fill
  useEffect(() => {
    const calculateEmptyRows = () => {
      if (!containerRef.current) return;
      
      // Get the parent container (iphone-notes-sub-page) to get actual available height
      const container = containerRef.current;
      const parentContainer = container.closest('.iphone-notes-sub-page') as HTMLElement;
      const containerHeight = parentContainer?.clientHeight || container.clientHeight || window.innerHeight;
      
      const rowHeight = 62;
      const topBarHeight = 128; // 88px bar + 40px status bar margin
      
      // Calculate available height (container height minus top bar)
      const availableHeight = containerHeight - topBarHeight;
      
      // Calculate how many rows can fit
      const totalRowsNeeded = Math.ceil(availableHeight / rowHeight);
      
      // We have: 1 empty top row + wrappedLines.length content rows
      const currentRows = 1 + wrappedLines.length;
      
      // Calculate minimum rows needed to fill viewport
      const minRowsToFill = Math.max(0, totalRowsNeeded - currentRows);
      
      // Always add 3 more rows at the bottom (guaranteed minimum)
      const neededEmptyRows = minRowsToFill + 3;
      setEmptyRowsCount(neededEmptyRows);
    };

    // Calculate immediately and after a short delay to ensure DOM is ready
    calculateEmptyRows();
    const timeout = setTimeout(calculateEmptyRows, 200);
    window.addEventListener('resize', calculateEmptyRows);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', calculateEmptyRows);
    };
  }, [wrappedLines.length]);

  return (
    <div className="iphone-notes-detail-page" ref={containerRef}>
      <div className="iphone-notes-detail-content">
        {/* Empty row at top for spacing - no border */}
        <div className="iphone-notes-detail-row iphone-notes-detail-row-empty iphone-notes-detail-row-no-border"></div>
        {wrappedLines.map((line, index) => (
          <div key={index} className={`iphone-notes-detail-row ${line === '' ? 'iphone-notes-detail-row-empty' : ''}`}>
            {line !== '' && <span className="iphone-notes-detail-text">{line}</span>}
          </div>
        ))}
        {/* Empty rows to fill the page */}
        {Array.from({ length: emptyRowsCount }).map((_, index) => (
          <div key={`empty-${index}`} className="iphone-notes-detail-row iphone-notes-detail-row-empty">
            {/* Empty row */}
          </div>
        ))}
      </div>
    </div>
  );
}
