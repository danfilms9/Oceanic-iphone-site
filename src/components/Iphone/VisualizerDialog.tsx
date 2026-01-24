import { useEffect } from 'react';
import { playAudio } from '../../utils/audioUtils';
import './ComingSoonDialog.css';

interface VisualizerDialogProps {
  onClose?: () => void;
  onPresave?: () => void;
}

export function VisualizerDialog({ onClose, onPresave }: VisualizerDialogProps) {
  // Play popup sound when dialog appears at 50% volume
  useEffect(() => {
    playAudio('/audio/sound-effects/popup.mp3', 0.5);
  }, []);

  const handlePresaveClick = () => {
    // Open presave link in new window
    window.open('https://distrokid.com/hyperfollow/oceanic1/hold-me-palomar-remix', '_blank');
    
    // After 1000ms, trigger the confirmation dialog
    setTimeout(() => {
      if (onPresave) {
        onPresave();
      }
    }, 1000);
  };

  return (
    <div className="coming-soon-dialog-overlay">
      <div className="coming-soon-dialog">
        <div className="coming-soon-dialog-top-glow"></div>
        <h1 className="coming-soon-dialog-headline">This song is unreleased</h1>
        <p className="coming-soon-dialog-subtitle">
          Pre save the song to get early access.
          <br />
          <br />
          come back here when you're done :)
        </p>
        <div className="coming-soon-dialog-buttons">
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-secondary" onClick={onClose}>
            <span className="coming-soon-dialog-btn-label">Cancel</span>
          </button>
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-primary" onClick={handlePresaveClick}>
            <span className="coming-soon-dialog-btn-label">Pre Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
