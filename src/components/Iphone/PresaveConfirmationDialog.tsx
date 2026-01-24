import './ComingSoonDialog.css';

interface PresaveConfirmationDialogProps {
  onClose?: () => void;
  onConfirm?: () => void;
}

export function PresaveConfirmationDialog({ onClose, onConfirm }: PresaveConfirmationDialogProps) {
  const handleConfirm = () => {
    // Store presave confirmation in localStorage
    localStorage.setItem('hold_me_presaved', 'true');
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <div className="coming-soon-dialog-overlay">
      <div className="coming-soon-dialog">
        <div className="coming-soon-dialog-top-glow"></div>
        <h1 className="coming-soon-dialog-headline">Did you Pre-Save?</h1>
        <div className="coming-soon-dialog-buttons">
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-secondary" onClick={onClose}>
            <span className="coming-soon-dialog-btn-label">Not Yet :(</span>
          </button>
          <button className="coming-soon-dialog-btn coming-soon-dialog-btn-primary" onClick={handleConfirm}>
            <span className="coming-soon-dialog-btn-label">Yes!</span>
          </button>
        </div>
      </div>
    </div>
  );
}
