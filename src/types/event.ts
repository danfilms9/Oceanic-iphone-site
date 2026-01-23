export interface CalendarEvent {
  id: string;
  title: string;
  venueName: string;
  date: Date;
  city: string;
  state: string;
  ticketLink: string;
}

export interface NotionEvent {
  id: string;
  properties: {
    'Name'?: { title: Array<{ plain_text: string }> };
    'Venue'?: { rich_text: Array<{ plain_text: string }> } | { title: Array<{ plain_text: string }> };
    'Date': { date: { start: string } | null };
    'City': { rich_text: Array<{ plain_text: string }> } | { select: { name: string } | null };
    'State'?: { rich_text: Array<{ plain_text: string }> } | { select: { name: string } | null };
    'Ticket Link': { url: string | null };
  };
}
