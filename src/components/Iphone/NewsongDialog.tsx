import { useEffect } from 'react';
import { playAudio } from '../../utils/audioUtils';
import './ComingSoonDialog.css';

interface NewsongDialogProps {
  onClose?: () => void;
  onYes?: () => void;
}

export function NewsongDialog({ onClose, onYes }: NewsongDialogProps) {
  useEffect(() => {
    playAudio('/audio/sound-effects/popup.mp3', 0.5);
  }, []);

  return (
    <div className="coming-soon-dialog-overlay">
      <div className="coming-soon-dialog">
        <div className="coming-soon-dialog-top-glow"></div>
        <h1 className="coming-soon-dialog-headline">Want to hear the unreleased song?</h1>
        <div className="coming-soon-dialog-buttons">
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-secondary" onClick={onClose}>
            <span className="coming-soon-dialog-btn-label">Cancel</span>
          </button>
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-primary" onClick={onYes}>
            <span className="coming-soon-dialog-btn-label">Yes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
