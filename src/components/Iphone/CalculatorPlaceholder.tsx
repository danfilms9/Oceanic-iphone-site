import { useState } from 'react';
import { ComingSoonDialog } from './ComingSoonDialog';

export function CalculatorPlaceholder() {
  const [showDialog, setShowDialog] = useState(true);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {showDialog && <ComingSoonDialog onClose={() => setShowDialog(false)} />}
    </div>
  );
}
