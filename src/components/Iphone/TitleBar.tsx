import React from 'react';
import { OverflowMarqueeText } from './OverflowMarqueeText';

interface TitleBarProps {
  title: string;
  showBackButton?: boolean;
  backButtonText?: string;
  onBack?: () => void;
  rightButton?: React.ReactNode;
}

export function TitleBar({ 
  title, 
  showBackButton = false, 
  backButtonText, 
  onBack,
  rightButton 
}: TitleBarProps) {
  const titleClassName = `iphone-title-bar-title ${showBackButton ? 'iphone-title-bar-title-with-back' : ''}`.trim();

  return (
    <div className="iphone-title-bar">
      {showBackButton && (
        <button 
          className="iphone-title-bar-back-button"
          onClick={onBack}
        >
          <div className="iphone-title-bar-back-arrow">
            <div className="iphone-title-bar-back-arrow-stem"></div>
            <div className="iphone-title-bar-back-arrow-head"></div>
          </div>
          {backButtonText && (
            <span className="iphone-title-bar-back-text">{backButtonText}</span>
          )}
        </button>
      )}
      <div className="iphone-title-bar-title-container">
        <h1 className={titleClassName}>
          <OverflowMarqueeText
            text={title}
            containerClassName="iphone-title-bar-marquee"
            textClassName="iphone-title-bar-title-text"
          />
        </h1>
      </div>
      {rightButton && (
        <div className="iphone-title-bar-right-button">
          {rightButton}
        </div>
      )}
    </div>
  );
}
