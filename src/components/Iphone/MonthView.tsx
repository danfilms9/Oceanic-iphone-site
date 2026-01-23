import { useState } from 'react';
import { useEvents } from '../../hooks/useEvents';

export function MonthView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { getEventsForDate, loading } = useEvents();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = monthNames[month];
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : null;

  // Get previous month's last few days
  const prevMonth = new Date(year, month - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();
  const prevMonthDays: number[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  // Current month days
  const currentMonthDays: number[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(i);
  }

  // Calculate minimum rows needed dynamically
  const totalCellsNeeded = prevMonthDays.length + currentMonthDays.length;
  const minRowsNeeded = Math.ceil(totalCellsNeeded / 7);
  const totalCellsForMinRows = minRowsNeeded * 7;
  
  // Only add next month days if needed to complete the last row
  const remainingCells = Math.max(0, totalCellsForMinRows - totalCellsNeeded);
  const nextMonthDays: number[] = [];
  for (let i = 1; i <= remainingCells; i++) {
    nextMonthDays.push(i);
  }

  return (
    <div className="iphone-calendar-month-view">
      {/* Month Navigation Section - same height as title bar (88px) */}
      <div className="iphone-calendar-month-nav">
        {/* Top container - 80% height */}
        <div className="iphone-calendar-month-nav-top">
          <div className="iphone-calendar-month-nav-left">
            <button 
              className="iphone-calendar-month-nav-arrow"
              onClick={getPreviousMonth}
              aria-label="Previous month"
            >
              <div className="iphone-calendar-month-nav-triangle-left"></div>
            </button>
          </div>
          <div className="iphone-calendar-month-nav-center">
            <span className="iphone-calendar-month-nav-text">
              {monthName} {year}
            </span>
          </div>
          <div className="iphone-calendar-month-nav-right">
            <button 
              className="iphone-calendar-month-nav-arrow"
              onClick={getNextMonth}
              aria-label="Next month"
            >
              <div className="iphone-calendar-month-nav-triangle-right"></div>
            </button>
          </div>
        </div>
        {/* Bottom container - 20% height */}
        <div className="iphone-calendar-month-nav-bottom">
          {weekdayNames.map((day) => (
            <div key={day} className="iphone-calendar-weekday-header">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="iphone-calendar-grid">
        {/* Previous month days */}
        {prevMonthDays.map((day, index) => (
          <div key={`prev-${day}`} className="iphone-calendar-grid-cell iphone-calendar-grid-cell-other-month">
            {day}
          </div>
        ))}
        
        {/* Current month days */}
        {currentMonthDays.map((day) => {
          const cellDate = new Date(year, month, day);
          const dayEvents = getEventsForDate(cellDate);
          const hasEvents = dayEvents.length > 0;
          const isSelected = selectedDate && 
            selectedDate.getFullYear() === year &&
            selectedDate.getMonth() === month &&
            selectedDate.getDate() === day;
          
          return (
            <div 
              key={day} 
              className={`iphone-calendar-grid-cell ${todayDate === day ? 'iphone-calendar-grid-cell-today' : ''} ${hasEvents ? 'iphone-calendar-grid-cell-has-events' : ''} ${isSelected ? 'iphone-calendar-grid-cell-selected' : ''}`}
              title={hasEvents ? `${dayEvents.length} event(s)` : ''}
              onClick={() => setSelectedDate(cellDate)}
            >
              {day}
              {hasEvents && (
                <div className="iphone-calendar-grid-cell-event-indicator" />
              )}
            </div>
          );
        })}
        
        {/* Next month days */}
        {nextMonthDays.map((day) => (
          <div key={`next-${day}`} className="iphone-calendar-grid-cell iphone-calendar-grid-cell-other-month">
            {day}
          </div>
        ))}
      </div>

      {/* Events List Section */}
      <div className="iphone-calendar-events-section">
        {loading ? (
          <div className="iphone-calendar-loading">
            <div className="iphone-calendar-loading-spinner"></div>
          </div>
        ) : selectedDate ? (
          (() => {
            const selectedEvents = getEventsForDate(selectedDate);
            const minRows = 6; // Minimum number of rows to always show
            const blankRowsNeeded = Math.max(0, minRows - selectedEvents.length);
            
            return (
              <div className="iphone-calendar-events-list">
                {/* Event rows */}
                {selectedEvents.map((event) => (
                  <div key={event.id} className="iphone-calendar-event-row">
                    <div className="iphone-calendar-event-content">
                      <div className="iphone-calendar-event-title">
                        {event.city}{event.state ? `, ${event.state}` : ''}
                      </div>
                      <div className="iphone-calendar-event-subtitle">
                        {event.venueName}
                      </div>
                    </div>
                    {event.ticketLink && (
                      <a
                        href={event.ticketLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="iphone-calendar-event-tickets-button"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Tickets
                      </a>
                    )}
                  </div>
                ))}
                {/* Blank rows */}
                {Array.from({ length: blankRowsNeeded }).map((_, index) => (
                  <div key={`blank-${index}`} className="iphone-calendar-event-row iphone-calendar-event-row-blank">
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <div className="iphone-calendar-events-list">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`blank-${index}`} className="iphone-calendar-event-row iphone-calendar-event-row-blank">
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
