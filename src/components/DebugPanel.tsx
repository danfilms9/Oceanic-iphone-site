import { useEffect, useState, useRef } from 'react';
import type { FrequencyBands } from '../audio/FrequencyAnalyzer';
import type { AudioController } from '../audio/AudioController';

interface DebugPanelProps {
  audioController: AudioController | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DebugPanel({ audioController, isOpen, onClose }: DebugPanelProps) {
  const [bands, setBands] = useState<FrequencyBands | null>(null);
  const lastBandsUpdateRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !audioController) return;

    const updateBands = () => {
      const now = performance.now();
      lastBandsUpdateRef.current = now;
      const currentBands = audioController.getFrequencyBands();
      setBands(currentBands);
    };

    // Update at 60fps for smooth visualization
    const interval = setInterval(updateBands, 16);
    updateBands(); // Initial update

    return () => clearInterval(interval);
  }, [isOpen, audioController]);

  if (!isOpen) return null;

  return (
    <div className="debug-panel-overlay" onClick={onClose}>
      <div className="debug-panel" onClick={(e) => e.stopPropagation()}>
        <div className="debug-panel-header">
          <span className="debug-panel-title">Audio Detection Debug</span>
          <button className="debug-panel-close" onClick={onClose}>×</button>
        </div>
        <div className="debug-panel-content">
          {bands ? (
            <>
              <div className="debug-section">
                <h3 className="debug-section-title">Frequency Bands</h3>
                <DebugBar label="Bass" value={bands.bass} color="#00d4ff" />
                <DebugBar label="Mid" value={bands.mid} color="#0080ff" />
                <DebugBar label="Treble" value={bands.treble} color="#c080ff" />
                <DebugBar label="Overall" value={bands.overall} color="#ffffff" />
              </div>

              <div className="debug-section">
                <h3 className="debug-section-title">Percussion Detection</h3>
                <DebugIndicator label="Kick" value={bands.kick} threshold={0.35} color="#ff0000" />
                <DebugIndicator label="Snare" value={bands.snare} threshold={0.25} color="#00ff00" />
                <DebugIndicator label="Hi-Hat" value={bands.hihat} threshold={0.2} color="#ffff00" />
                <DebugIndicator label="Transient" value={bands.transient} threshold={0.1} color="#ff00ff" />
              </div>

              <div className="debug-section">
                <h3 className="debug-section-title">Raw Values</h3>
                <div className="debug-raw-values">
                  <div>Bass: {bands.bass.toFixed(3)}</div>
                  <div>Mid: {bands.mid.toFixed(3)}</div>
                  <div>Treble: {bands.treble.toFixed(3)}</div>
                  <div>Overall: {bands.overall.toFixed(3)}</div>
                  <div>Kick: {bands.kick.toFixed(3)}</div>
                  <div>Snare: {bands.snare.toFixed(3)}</div>
                  <div>Hi-Hat: {bands.hihat.toFixed(3)}</div>
                  <div>Transient: {bands.transient.toFixed(3)}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="debug-no-data">No audio data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DebugBarProps {
  label: string;
  value: number;
  color: string;
}

function DebugBar({ label, value, color }: DebugBarProps) {
  return (
    <div className="debug-bar-container">
      <div className="debug-bar-label">{label}</div>
      <div className="debug-bar-wrapper">
        <div
          className="debug-bar-fill"
          style={{
            width: `${value * 100}%`,
            backgroundColor: color,
          }}
        />
        <div className="debug-bar-value">{Math.round(value * 100)}%</div>
      </div>
    </div>
  );
}

interface DebugIndicatorProps {
  label: string;
  value: number;
  threshold: number;
  color: string;
}

function DebugIndicator({ label, value, threshold, color }: DebugIndicatorProps) {
  const prevValueRef = useRef<number>(0);
  const triggerActiveRef = useRef<boolean>(false);
  const triggerTimeoutRef = useRef<number | null>(null);
  
  // For kick with threshold 0.35, use trigger behavior
  const isKickTrigger = label === 'Kick' && threshold === 0.35;
  
  useEffect(() => {
    if (isKickTrigger) {
      const prevValue = prevValueRef.current;
      const crossedThreshold = prevValue <= threshold && value > threshold;
      const peakedAbove = prevValue < value && value > threshold;
      
      if (crossedThreshold || peakedAbove) {
        triggerActiveRef.current = true;
        
        // Clear any existing timeout
        if (triggerTimeoutRef.current !== null) {
          clearTimeout(triggerTimeoutRef.current);
        }
        
        // Reset trigger after a brief moment (one frame)
        triggerTimeoutRef.current = window.setTimeout(() => {
          triggerActiveRef.current = false;
        }, 16); // ~1 frame at 60fps
      }
      
      prevValueRef.current = value;
    }
    
    return () => {
      if (triggerTimeoutRef.current !== null) {
        clearTimeout(triggerTimeoutRef.current);
      }
    };
  }, [value, threshold, isKickTrigger]);
  
  const isActive = isKickTrigger 
    ? triggerActiveRef.current 
    : value > threshold;
  
  return (
    <div className="debug-indicator-container">
      <div className="debug-indicator-label">{label}</div>
      <div className="debug-indicator-wrapper">
        <div
          className={`debug-indicator-light ${isActive ? 'active' : ''}`}
          style={{
            backgroundColor: isActive ? color : '#666',
            boxShadow: isActive ? `0 0 10px ${color}` : 'none',
          }}
        />
        <div className="debug-indicator-value">{value.toFixed(3)}</div>
        <div className="debug-indicator-bar">
          <div
            className="debug-indicator-bar-fill"
            style={{
              width: `${Math.min(value * 100, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}

