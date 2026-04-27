import {google} from "googleapis";
import type {calendar_v3} from "googleapis";
import {getDelegatedAuth} from "./googleAuth";

export const CALENDAR_SCOPES = {
  CALENDAR: "https://www.googleapis.com/auth/calendar",
} as const;

export type CalendarEventData = {
  summary: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

function addOneDay(dateYmd: string): string {
  const d = new Date(dateYmd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function buildEventBody(data: CalendarEventData): calendar_v3.Schema$Event {
  const descParts: string[] = [];
  if (data.description) descParts.push(data.description);
  if (data.description && (data.location || data.summary)) descParts.push("");
  // contact and link are not part of CalendarEventData but caller can include them in description

  return {
    summary: data.summary,
    description: data.description || undefined,
    location: data.location || undefined,
    start: {date: data.startDate},
    end: {date: addOneDay(data.endDate)}, // Google Calendar: all-day end is exclusive
  };
}

export class GoogleCalendarProvider {
  constructor(private delegatedUserEmail: string) {}

  private async getCalendarClient(): Promise<calendar_v3.Calendar> {
    const auth = await getDelegatedAuth([CALENDAR_SCOPES.CALENDAR], this.delegatedUserEmail);
    return google.calendar({version: "v3", auth});
  }

  async createEvent(calendarId: string, data: CalendarEventData): Promise<string> {
    const calendar = await this.getCalendarClient();
    const res = await calendar.events.insert({
      calendarId,
      requestBody: buildEventBody(data),
    });
    const id = res.data.id;
    if (!id) throw new Error("Google Calendar insert returned no event ID");
    return id;
  }

  async updateEvent(calendarId: string, gcalEventId: string, data: CalendarEventData): Promise<void> {
    const calendar = await this.getCalendarClient();
    await calendar.events.update({
      calendarId,
      eventId: gcalEventId,
      requestBody: buildEventBody(data),
    });
  }
}
