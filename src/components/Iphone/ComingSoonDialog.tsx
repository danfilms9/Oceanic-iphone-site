import { useEffect } from 'react';
import { playAudio } from '../../utils/audioUtils';
import './ComingSoonDialog.css';

interface ComingSoonDialogProps {
  onClose?: () => void;
}

export function ComingSoonDialog({ onClose }: ComingSoonDialogProps) {
  // Play popup sound when dialog appears at 50% volume
  useEffect(() => {
    playAudio('/audio/sound-effects/popup.mp3', 0.5);
  }, []);

  return (
    <div className="coming-soon-dialog-overlay">
      <div className="coming-soon-dialog">
        <div className="coming-soon-dialog-top-glow"></div>
        <h1 className="coming-soon-dialog-headline">Coming soon.</h1>
        <p className="coming-soon-dialog-subtitle">Please come back later.</p>
        <div className="coming-soon-dialog-buttons">
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-secondary" onClick={onClose}>
            <span className="coming-soon-dialog-btn-label">Cancel</span>
          </button>
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-primary" onClick={onClose}>
            <span className="coming-soon-dialog-btn-label">OK</span>
          </button>
        </div>
      </div>
    </div>
  );
}
