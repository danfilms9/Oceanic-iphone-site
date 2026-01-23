import { useEvents } from '../../hooks/useEvents';
import type { CalendarEvent } from '../../types/event';

export function ListView() {
  const { events, loading } = useEvents();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const weekdayAbbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter and sort future events
  const futureEvents: CalendarEvent[] = events
    .filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
  
  // Group events by month/year
  const eventsByMonth: { [key: string]: CalendarEvent[] } = {};
  futureEvents.forEach((event) => {
    const eventDate = new Date(event.date);
    const month = eventDate.getMonth();
    const year = eventDate.getFullYear();
    const key = `${year}-${month}`;
    if (!eventsByMonth[key]) {
      eventsByMonth[key] = [];
    }
    eventsByMonth[key].push(event);
  });
  
  // Get sorted month keys
  const sortedMonthKeys = Object.keys(eventsByMonth).sort((a, b) => {
    const [yearA, monthA] = a.split('-').map(Number);
    const [yearB, monthB] = b.split('-').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return monthA - monthB;
  });

  if (loading) {
    return (
      <div className="iphone-calendar-list-view">
        <div className="iphone-calendar-loading">
          <div className="iphone-calendar-loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="iphone-calendar-list-view">
      <div className="iphone-calendar-events-list">
        {sortedMonthKeys.map((monthKey) => {
          const [year, month] = monthKey.split('-').map(Number);
          const monthEvents = eventsByMonth[monthKey];
          
          return (
            <div key={monthKey}>
              {/* Month/Year Header */}
              <div className="iphone-calendar-list-month-header">
                {monthNames[month]} {year}
              </div>
              
              {/* Events for this month */}
              {monthEvents.map((event) => {
                const eventDate = new Date(event.date);
                const dayNumber = eventDate.getDate();
                const dayOfWeek = weekdayAbbrevs[eventDate.getDay()];
                
                return (
                  <div key={event.id} className="iphone-calendar-event-row">
                    {/* Date Square */}
                    <div className="iphone-calendar-event-date-square">
                      <div className="iphone-calendar-event-date-day">{dayOfWeek}</div>
                      <div className="iphone-calendar-event-date-number">{dayNumber}</div>
                    </div>
                    
                    {/* Event Content */}
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
                );
              })}
            </div>
          );
        })}
        
        {/* Blank rows if no events */}
        {futureEvents.length === 0 && (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={`blank-${index}`} className="iphone-calendar-event-row iphone-calendar-event-row-blank">
            </div>
          ))
        )}
      </div>
    </div>
  );
}
