export interface ForecastDay {
  date: string;
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
  body: string;
  htmlBody?: string;
  read: boolean;
  account: string;
}

export interface MailAccountInfo {
  name: string;
  unreadCount: number;
  provider: string;
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
  type: 'mail' | 'weather' | 'home-control' | 'news' | 'custom';
  title: string;
  order: number;
  enabled: boolean;
  flexExpanded?: number;
}

export interface DashboardConfig {
  panels: PanelConfig[];
}

export interface NewsPost {
  id: string;
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
