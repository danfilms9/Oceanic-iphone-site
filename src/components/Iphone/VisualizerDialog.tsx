import { useEffect } from 'react';
import { playAudio } from '../../utils/audioUtils';
import './ComingSoonDialog.css';

interface VisualizerDialogProps {
  onClose?: () => void;
  onPresave?: () => void;
  onOpenVisualizer?: () => void;
}

export function VisualizerDialog({ onClose, onPresave, onOpenVisualizer }: VisualizerDialogProps) {
  // Play popup sound when dialog appears at 50% volume
  useEffect(() => {
    playAudio('/audio/sound-effects/popup.mp3', 0.5);
  }, []);

  // Check if user has already presaved
  const hasPresaved = localStorage.getItem('hold_me_presaved') === 'true';

  const handlePresaveClick = () => {
    if (hasPresaved) {
      // If already presaved, open visualizer directly
      if (onOpenVisualizer) {
        onOpenVisualizer();
      }
    } else {
      // Open presave link in new window
      window.open('https://distrokid.com/hyperfollow/oceanic1/hold-me-palomar-remix', '_blank');
      
      // After 1000ms, trigger the confirmation dialog
      setTimeout(() => {
        if (onPresave) {
          onPresave();
        }
      }, 1000);
    }
  };

  const handleCancelClick = () => {
    if (hasPresaved) {
      // If already presaved, "Cancel" button becomes "Pre Save" button
      // Open presave link and trigger confirmation dialog
      window.open('https://distrokid.com/hyperfollow/oceanic1/hold-me-palomar-remix', '_blank');
      setTimeout(() => {
        if (onPresave) {
          onPresave();
        }
      }, 1000);
    } else {
      // Normal cancel behavior
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <div className="coming-soon-dialog-overlay">
      <div className="coming-soon-dialog">
        <div className="coming-soon-dialog-top-glow"></div>
        <h1 className="coming-soon-dialog-headline">This song is unreleased</h1>
        <p className="coming-soon-dialog-subtitle">
          Pre-Save the song to get early access.
          <br />
          <br />
          come back here when you're done :)
        </p>
        <div className="coming-soon-dialog-buttons">
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-secondary" onClick={handleCancelClick}>
            <span className="coming-soon-dialog-btn-label">{hasPresaved ? 'Pre-Save' : 'Cancel'}</span>
          </button>
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-primary" onClick={handlePresaveClick}>
            <span className="coming-soon-dialog-btn-label">{hasPresaved ? 'Already Saved' : 'Pre-Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
