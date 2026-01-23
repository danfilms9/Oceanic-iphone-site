import { useState, useEffect, useRef } from 'react';
import './iphone.css';

function formatLockTime() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 || 12;
  return h12.toString() + ':' + m.toString().padStart(2, '0');
}

function formatLockDate() {
  const d = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
}

interface LockScreenProps {
  onUnlock: () => void;
  isUnlocking?: boolean;
}

export function LockScreen({ onUnlock, isUnlocking = false }: LockScreenProps) {
  const [time, setTime] = useState(formatLockTime);
  const [date, setDate] = useState(formatLockDate);
  const [slidePosition, setSlidePosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startPosition, setStartPosition] = useState(0);
  const slideBarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setTime(formatLockTime());
      setDate(formatLockDate());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const getMaxSlide = () => {
    if (!slideBarRef.current || !buttonRef.current) return 0;
    // Use original dimensions since slidePosition is in original coordinate space
    // (translateX gets scaled by CSS transform, so we work in original space)
    return slideBarRef.current.offsetWidth - buttonRef.current.offsetWidth - 20; // 20px for padding
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    if (slideBarRef.current) {
      const rect = slideBarRef.current.getBoundingClientRect();
      // Calculate mouse position relative to the slide bar in rendered space
      const relativeX = e.clientX - rect.left;
      setStartX(relativeX);
      setStartPosition(slidePosition);
    }
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (slideBarRef.current) {
      const rect = slideBarRef.current.getBoundingClientRect();
      // Calculate touch position relative to the slide bar in rendered space
      const relativeX = e.touches[0].clientX - rect.left;
      setStartX(relativeX);
      setStartPosition(slidePosition);
    }
    e.preventDefault();
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !slideBarRef.current) return;
    const rect = slideBarRef.current.getBoundingClientRect();
    // Calculate mouse position relative to the slide bar in rendered space
    const relativeX = clientX - rect.left;
    // Calculate delta in rendered pixels
    const deltaRendered = relativeX - startX;
    // Convert delta from rendered space to original space
    // Since translateX is also scaled, we need to scale the delta inversely
    const scale = slideBarRef.current.offsetWidth / rect.width;
    const deltaOriginal = deltaRendered * scale;
    const maxSlide = getMaxSlide();
    const newPosition = Math.max(0, Math.min(maxSlide, startPosition + deltaOriginal));
    setSlidePosition(newPosition);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const maxSlide = getMaxSlide();
    // Check if fully slid (within 5px of max) when released
    if (slidePosition >= maxSlide - 5) {
      setSlidePosition(maxSlide);
      // Small delay for visual feedback
      setTimeout(() => {
        onUnlock();
      }, 100);
    } else {
      // Snap back if not fully slid
      setSlidePosition(0);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, startX, startPosition, slidePosition]);

  return (
    <div className="iphone-lockscreen">
      <div className={`iphone-lockscreen-top-bar ${isUnlocking ? 'iphone-lockscreen-top-bar-unlocking' : ''}`}></div>
      
      <div className={`iphone-lockscreen-time-date ${isUnlocking ? 'iphone-lockscreen-time-date-unlocking' : ''}`}>
        <div className="iphone-lockscreen-time">{time}</div>
        <div className="iphone-lockscreen-date">{date}</div>
      </div>

      <div className={`iphone-lockscreen-bottom-bar ${isUnlocking ? 'iphone-lockscreen-bottom-bar-unlocking' : ''}`}></div>
      
      <div className={`iphone-lockscreen-slide-container ${isUnlocking ? 'iphone-lockscreen-slide-container-unlocking' : ''}`}>
        <div className="iphone-lockscreen-slide-bar" ref={slideBarRef}>
          <div
            className="iphone-lockscreen-slide-button"
            ref={buttonRef}
            style={{ 
              transform: `translateX(${slidePosition}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <svg className="iphone-lockscreen-slide-arrow" width="68" height="50" viewBox="0 0 68 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="13.5" width="33" height="23" fill="rgba(130, 130, 130, 0.5)"/>
              <path d="M33 1L66 25L33 49Z" fill="rgba(130, 130, 130, 0.5)"/>
            </svg>
          </div>
          <div 
            className="iphone-lockscreen-slide-text-wrapper"
            style={{
              '--button-right-edge': `${8 + slidePosition + 136}px`
            } as React.CSSProperties}
          >
            <div className="iphone-lockscreen-slide-text">slide to unlock</div>
          </div>
        </div>
      </div>
    </div>
  );
}
