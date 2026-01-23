import { useState } from 'react';
import { TitleBar } from './TitleBar';
import { BottomBar } from './BottomBar';
import { MonthView } from './MonthView';
import { ListView } from './ListView';

type CalendarView = 'list' | 'month';

export function CalendarPlaceholder() {
  const [currentView, setCurrentView] = useState<CalendarView>('list');

  const handleTodayClick = () => {
    // TODO: Navigate to today's date
  };

  const handleViewChange = (view: CalendarView) => {
    setCurrentView(view);
  };

  return (
    <div className="iphone-calendar">
      <TitleBar title="Calendar" />
      
      {/* Content Area - will be populated with List/Month views */}
      <div className="iphone-calendar-content">
        {currentView === 'month' && <MonthView />}
        {currentView === 'list' && <ListView />}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomBar
        leftButton={
          <div className="iphone-calendar-today-container">
            <button 
              className="iphone-calendar-today-button"
              onClick={handleTodayClick}
            >
              Today
            </button>
          </div>
        }
        centerContent={
          <div className="iphone-calendar-segmented-control">
            <button
              className={`iphone-calendar-segmented-button ${currentView === 'list' ? 'iphone-calendar-segmented-button-selected' : ''}`}
              onClick={() => handleViewChange('list')}
            >
              List
            </button>
            <button
              className={`iphone-calendar-segmented-button ${currentView === 'month' ? 'iphone-calendar-segmented-button-selected' : ''}`}
              onClick={() => handleViewChange('month')}
            >
              Month
            </button>
          </div>
        }
      />
    </div>
  );
}
