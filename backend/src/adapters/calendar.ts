import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { cache } from '../cache';
import { config } from '../config';
import type { CalendarData, CalendarEvent } from '../types/index';

const CACHE_KEY = 'calendar';
const TOKEN_CACHE_KEY = '_gcal_token';

interface ServiceAccountCreds {
  client_email: string;
  private_key: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface GCalEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface GCalEventsResponse {
  items?: GCalEvent[];
}

function makeJwt(creds: ServiceAccountCreds): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  ).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(creds.private_key, 'base64url');
  return `${header}.${payload}.${sig}`;
}

async function getAccessToken(creds: ServiceAccountCreds): Promise<string> {
  const cached = cache.get<string>(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const jwt = makeJwt(creds);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as TokenResponse;
  // Cache for 5 minutes less than the actual expiry to avoid stale tokens
  cache.set(TOKEN_CACHE_KEY, data.access_token, (data.expires_in ?? 3600) - 300);
  return data.access_token;
}

// Distinct colors for up to 6 calendars, picked from our design tokens
const CALENDAR_COLORS = ['#4a9eff', '#d966ff', '#4cdb80', '#f0aa40', '#ff5555', '#7BA3C8'];

export async function fetchCalendar(): Promise<CalendarData> {
  const cached = cache.get<CalendarData>(CACHE_KEY);
  if (cached) return cached;

  if (!config.gcal.credentialsFile) {
    return mockCalendarData();
  }

  const credsRaw = await readFile(config.gcal.credentialsFile, 'utf-8');
  const creds = JSON.parse(credsRaw) as ServiceAccountCreds;
  const token = await getAccessToken(creds);

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const allEvents: CalendarEvent[] = [];

  await Promise.all(
    config.gcal.calendarIds.map(async (calId, idx) => {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
      );
      url.searchParams.set('timeMin', timeMin);
      url.searchParams.set('timeMax', timeMax);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', '250');

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return; // skip calendars that aren't accessible

      const data = (await res.json()) as GCalEventsResponse;

      for (const item of data.items ?? []) {
        const allDay = !item.start.dateTime;
        allEvents.push({
          id: item.id,
          title: item.summary?.trim() || '(No title)',
          start: item.start.dateTime ?? item.start.date ?? '',
          end: item.end.dateTime ?? item.end.date ?? '',
          allDay,
          calendarId: calId,
          calendarName: calId === 'primary' ? 'Calendar' : calId,
          color: CALENDAR_COLORS[idx % CALENDAR_COLORS.length]!,
        });
      }
    }),
  );

  allEvents.sort((a, b) => a.start.localeCompare(b.start));

  const data: CalendarData = { events: allEvents, updatedAt: new Date().toISOString() };
  cache.set(CACHE_KEY, data, config.gcal.cacheTtl);
  return data;
}

function mockCalendarData(): CalendarData {
  const now = new Date();

  const at = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const dateOnly = (dayOffset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    return d.toISOString().slice(0, 10);
  };

  return {
    events: [
      {
        id: '1',
        title: 'Team standup',
        start: at(0, 9, 0),
        end: at(0, 9, 30),
        allDay: false,
        calendarId: 'primary',
        calendarName: 'Work',
        color: '#4a9eff',
      },
      {
        id: '2',
        title: 'Dentist appointment',
        start: at(0, 14, 30),
        end: at(0, 15, 30),
        allDay: false,
        calendarId: 'primary',
        calendarName: 'Personal',
        color: '#d966ff',
      },
      {
        id: '3',
        title: 'Project review',
        start: at(1, 10, 0),
        end: at(1, 11, 30),
        allDay: false,
        calendarId: 'work',
        calendarName: 'Work',
        color: '#4a9eff',
      },
      {
        id: '4',
        title: 'Birthday 🎉',
        start: dateOnly(2),
        end: dateOnly(3),
        allDay: true,
        calendarId: 'primary',
        calendarName: 'Personal',
        color: '#4cdb80',
      },
      {
        id: '5',
        title: 'Quarterly planning',
        start: at(14, 13, 0),
        end: at(14, 15, 0),
        allDay: false,
        calendarId: 'work',
        calendarName: 'Work',
        color: '#4a9eff',
      },
      {
        id: '6',
        title: 'Holiday',
        start: dateOnly(45),
        end: dateOnly(46),
        allDay: true,
        calendarId: 'primary',
        calendarName: 'Personal',
        color: '#f0aa40',
      },
      {
        id: '7',
        title: 'Conference',
        start: at(75, 9, 0),
        end: at(75, 17, 0),
        allDay: false,
        calendarId: 'work',
        calendarName: 'Work',
        color: '#4a9eff',
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}
