import React from 'react';

interface BottomBarProps {
  leftButton?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightButton?: React.ReactNode;
}

export function BottomBar({ leftButton, centerContent, rightButton }: BottomBarProps) {
  return (
    <div className="iphone-bottom-bar">
      {leftButton && (
        <div className="iphone-bottom-bar-left">
          {leftButton}
        </div>
      )}
      {centerContent && (
        <div className="iphone-bottom-bar-center">
          {centerContent}
        </div>
      )}
      {rightButton && (
        <div className="iphone-bottom-bar-right">
          {rightButton}
        </div>
      )}
    </div>
  );
}
