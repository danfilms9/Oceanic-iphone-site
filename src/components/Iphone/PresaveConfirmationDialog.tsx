import { useEffect } from 'react';
import './ComingSoonDialog.css';

// Helper function to play audio
function playAudio(audioPath: string, volume: number = 1.0) {
  const audio = new Audio(audioPath);
  audio.volume = volume;
  audio.play().catch((error) => {
    console.warn('Failed to play audio:', error);
  });
}

interface PresaveConfirmationDialogProps {
  onClose?: () => void;
  onConfirm?: () => void;
}

export function PresaveConfirmationDialog({ onClose, onConfirm }: PresaveConfirmationDialogProps) {
  // Play popup sound when dialog appears at 50% volume
  useEffect(() => {
    playAudio('/audio/sound-effects/popup.mp3', 0.5);
  }, []);

  return (
    <div className="coming-soon-dialog-overlay">
      <div className="coming-soon-dialog">
        <div className="coming-soon-dialog-top-glow"></div>
        <h1 className="coming-soon-dialog-headline">Did you Presave?</h1>
        <div className="coming-soon-dialog-buttons">
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-secondary" onClick={onClose}>
            <span className="coming-soon-dialog-btn-label">Not Yet :(</span>
          </button>
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-primary" onClick={onConfirm}>
            <span className="coming-soon-dialog-btn-label">Yes!</span>
          </button>
        </div>
      </div>
    </div>
  );
}
