import { useEffect } from 'react';
import { playAudio } from '../../utils/audioUtils';
import './ComingSoonDialog.css';

interface WelcomeDialogProps {
  onClose?: () => void;
}

export function WelcomeDialog({ onClose }: WelcomeDialogProps) {
  // Play popup sound when dialog appears at 50% volume
  useEffect(() => {
    playAudio('/audio/sound-effects/popup.mp3', 0.5);
  }, []);

  return (
    <div className="coming-soon-dialog-overlay">
      <div className="coming-soon-dialog">
        <div className="coming-soon-dialog-top-glow"></div>
        <h1 className="coming-soon-dialog-headline">Hello!</h1>
        <p className="coming-soon-dialog-subtitle">Welcome to Oceanics phone (website). Have a look around!</p>
        <div className="coming-soon-dialog-buttons">
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-primary" onClick={onClose}>
            <span className="coming-soon-dialog-btn-label">OK</span>
          </button>
        </div>
      </div>
    </div>
  );
}
