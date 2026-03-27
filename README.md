# AI Homespace

A personal dashboard built for a 1920×440 touch display, designed to run on a Raspberry Pi or a NAS. Displays weather, mail, home automation controls, and news at a glance.

> This project was created with GitHub Copilot and Claude Sonnet 4.6, for private use only.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A free [OpenWeatherMap](https://openweathermap.org/api) API key
- (Optional) An IMAP mail account
- (Optional) A running [Home Assistant](https://www.home-assistant.io/) instance on your LAN
- (Optional) An [OpenAI](https://platform.openai.com/) API key for AI-powered news ranking

---

## Quick Start (NAS / production)

This is the recommended way to run the dashboard. Pre-built images are pulled from GitHub Container Registry — no build step required.

```sh
# 1. Clone the repo
git clone https://github.com/benawi1402/ai-homespace.git
cd ai-homespace

# 2. Create your environment file
cp .env.example .env
# Edit .env with your API keys and settings (see below)

# 3. Start the stack
docker compose -f docker-compose.prod.yml up -d
```

The dashboard is then available at **http://\<host-ip\>:3000**.

To update to the latest version:
```sh
./update.sh
```

---

## Local Development

### Backend

```sh
cd backend
npm install

# Create a local .env (the dev script reads it automatically)
cp ../.env.example .env
# Edit .env with your keys

npm run dev   # starts with hot-reload on :3001
```

### Frontend

```sh
cd frontend
npm install
npm run dev   # starts Vite dev server on :5173
```

In dev mode the frontend proxies `/api` and `/health` to `localhost:3001`, so both servers need to be running.

### Build Docker images locally

```sh
# From the repo root
docker compose up --build
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Only the backend reads environment variables; the frontend has no runtime config.

### Weather

| Variable | Default | Description |
|---|---|---|
| `WEATHER_API_KEY` | — | OpenWeatherMap API key (required) |
| `WEATHER_CITY` | `Amsterdam` | City name for the forecast |
| `WEATHER_UNITS` | `metric` | `metric` or `imperial` |
| `WEATHER_CACHE_TTL` | `600` | Cache lifetime in seconds |

### Mail (up to two IMAP accounts)

Repeat the block with `MAIL2_` prefix for a second account. Both are optional.

| Variable | Default | Description |
|---|---|---|
| `MAIL_HOST` | — | IMAP server hostname |
| `MAIL_PORT` | `993` | IMAP port |
| `MAIL_USER` | — | IMAP username / email address |
| `MAIL_PASSWORD` | — | IMAP password |
| `MAIL_TLS` | `true` | Use TLS (`true`/`false`) |
| `MAIL_MAILBOX` | `INBOX` | Mailbox to read |
| `MAIL_NAME` | — | Display name shown in the panel |
| `MAIL_CACHE_TTL` | `120` | Cache lifetime in seconds |

### Home Assistant

| Variable | Default | Description |
|---|---|---|
| `HASS_URL` | — | URL of your Home Assistant instance (e.g. `http://192.168.1.100:8123`) |
| `HASS_TOKEN` | — | Long-lived access token (Settings → Profile → Security) |
| `HASS_CACHE_TTL` | `30` | Cache lifetime in seconds |

### News

| Variable | Default | Description |
|---|---|---|
| `NEWS_FEED_URLS` | — | Comma-separated `url\|Name` pairs (e.g. `https://hnrss.org/frontpage\|Hacker News`) |
| `NEWS_CACHE_TTL` | `1800` | Cache lifetime in seconds |
| `OPENAI_API_KEY` | — | Optional — enables AI relevance ranking of headlines |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use for ranking |

### Google Calendar

| Variable | Default | Description |
|---|---|---|
| `GCAL_CREDENTIALS_FILE` | — | Absolute path to a Google service account JSON credentials file |
| `GCAL_CALENDAR_IDS` | `primary` | Comma-separated list of calendar IDs to fetch |
| `GCAL_CACHE_TTL` | `300` | Cache lifetime in seconds |

### Server

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend listen port |
| `NODE_ENV` | `production` | Set to `development` for verbose logs |
| `DATA_DIR` | `/app/data` | Path for persistent data (mount a volume here) |

---

## Ports

| Port | Service |
|---|---|
| `3000` | Frontend (Nginx) |
| `3001` | Backend API |

---

## Google Calendar Setup

The calendar panel uses a **Google service account** so no browser OAuth flow is needed — it works headlessly on a kiosk.

**One-time setup (≈10 minutes):**

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or use an existing one).
2. Enable the **Google Calendar API**: left sidebar → **APIs & Services** → **Library** → search "Google Calendar API" → click it → **Enable**.
3. Create a Service Account: **APIs & Services** → **Credentials** → **Create Credentials** → **Service account**.
   - Enter any name (e.g. `homespace`) → **Create and Continue** → skip the optional role/user steps → **Done**.
4. Download the JSON key:
   - Back on the **Credentials** page, click the service account email you just created.
   - Go to the **Keys** tab → **Add Key** → **Create new key** → select **JSON** → **Create**.
   - A `.json` file is downloaded automatically — this is the credentials file.
5. In **Google Calendar** (calendar.google.com), share your calendar with the service account:
   - Open calendar settings (gear ⚙ → **Settings**) → select the calendar on the left.
   - Scroll to **Share with specific people** → **Add people** → paste the service account email (it looks like `homespace@your-project-id.iam.gserviceaccount.com`).
   - Set permission to **"See all event details"** → **Send**.
6. Copy the downloaded JSON file to your server (e.g. `/volume1/docker/homespace/data/google-credentials.json`).
7. Set in your `.env`:
   ```
   GCAL_CREDENTIALS_FILE=/app/data/google-credentials.json
   GCAL_CALENDAR_IDS=primary,your.other.calendar@gmail.com
   ```
   > **Note:** `primary` refers to the main calendar of the account that *shared* their calendar with the service account. For personal Google accounts, use the calendar's actual ID (visible in the calendar's settings page under "Integrate calendar").

8. Make sure the credentials file is accessible inside the container. With the default compose setup, the `/volume1/docker/homespace/data` volume is already mounted at `/app/data`, so placing the file there is all you need.

The panel is hidden automatically when `GCAL_CREDENTIALS_FILE` is not set.

---

## CI / CD

Pushing to `main` triggers a GitHub Actions workflow that builds and pushes Docker images to GitHub Container Registry:

- `ghcr.io/benawi1402/homespace-frontend:latest`
- `ghcr.io/benawi1402/homespace-backend:latest`

Required GitHub secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (to avoid Docker Hub pull rate limits during the build).

