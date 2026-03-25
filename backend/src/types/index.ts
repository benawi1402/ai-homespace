export interface ForecastDay {
  date: string;        // ISO date string, midnight local time
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
}

export interface WeatherData {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  forecast: ForecastDay[];
  updatedAt: string;
}

export interface MailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  preview: string;
  body: string;       // plain text (preview fallback)
  htmlBody?: string;  // HTML with CID images inlined as data URIs
  read: boolean;
  account: string;    // display name of the source mail account
}

export interface MailAccountInfo {
  name: string;
  unreadCount: number;
  provider: string;  // 'gmail' | 'posteo' | 'generic'
}

export interface MailData {
  unreadCount: number;
  messages: MailMessage[];
  accounts: MailAccountInfo[];
  updatedAt: string;
}

export interface HomeDevice {
  id: string;
  name: string;
  type: 'light' | 'switch' | 'sensor' | 'climate' | 'cover' | 'unknown';
  state: string;
  available: boolean;
  attributes: Record<string, unknown>;
}

export interface HomeControlData {
  devices: HomeDevice[];
  updatedAt: string;
}

export interface PanelConfig {
  id: string;
  type: 'mail' | 'weather' | 'home-control' | 'news' | 'calendar' | 'custom';
  title: string;
  order: number;
  enabled: boolean;
  flexExpanded?: number;
}

export interface DashboardConfig {
  panels: PanelConfig[];
}

export interface NewsPost {
  id: string;          // sha1 hash of article URL
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
}

export interface NewsData {
  posts: NewsPost[];
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;        // ISO dateTime or YYYY-MM-DD for all-day
  end: string;
  allDay: boolean;
  calendarId: string;
  calendarName: string;
  color: string;        // hex color for visual differentiation
}

export interface CalendarData {
  events: CalendarEvent[];
  updatedAt: string;
}
