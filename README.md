# LoadLens

> See your semester before it hits you.

LoadLens connects to your Google Calendar, lets you add deadlines and exams, and uses AI to build a study schedule around your real life. A cognitive load heatmap shows you exactly which days are going to be heavy, before they arrive.

---

## Demo

[Watch the demo video](https://drive.google.com/file/d/1RlnPJlzreKQLU3R45iusZuUNHwft6mGg/view?usp=sharing)

---

## Features

| Feature | Description |
|---|---|
| **Google Calendar Sync** | Read-only OAuth sync across all your calendars |
| **AI Schedule Generation** | Gemini analyzes your deadlines, difficulty, and free time to build a day-by-day plan |
| **Cognitive Load Heatmap** | Color-coded calendar (green → red) showing study intensity per day |
| **Slack Off Recovery** | Missed a study day? AI redistributes the work across upcoming days |
| **AI Study Coach** | Chat assistant with full context of your schedule, deadlines, and constraints |
| **Constraints** | Block days off, add recurring busy slots, set max daily hours |
| **Demo Mode** | Load sample data instantly to explore the app without setup |

---

## Project Structure

```
LoadLens/
├── backend/
│   ├── server.py            ← Flask entry point
│   ├── config.py            ← Centralised env/config loading
│   ├── ai_providers.py      ← Gemini (primary) + Groq (fallback)
│   ├── utils.py             ← JSON repair, cognitive load scoring
│   ├── requirements.txt
│   ├── .env.example         ← Environment template
│   ├── client_secret.json   ← You create this (Google OAuth)
│   └── routes/
│       ├── auth.py          ← Google OAuth2 login/logout
│       ├── calendar.py      ← Calendar & events API
│       └── ai.py            ← Schedule generation, reschedule, chat
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Root component, all state
│   │   ├── api.js           ← Fetch wrapper for all endpoints
│   │   ├── theme.js         ← Colour palette, fonts, global CSS
│   │   ├── utils.js         ← Date/time formatters
│   │   └── components/
│   │       ├── AIChat.jsx
│   │       ├── HeatmapCalendar.jsx
│   │       ├── AddDeadlineModal.jsx
│   │       ├── ConstraintsPanel.jsx
│   │       └── ...
│   ├── index.html
│   ├── vite.config.js       ← Dev proxy to Flask on :5000
│   └── package.json
│
├── README.md
├── .gitignore
└── LICENSE
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/auth/login` | Redirect to Google OAuth consent |
| `GET` | `/auth/callback` | OAuth callback, saves credentials |
| `GET` | `/auth/status` | Check if user is authenticated |
| `POST` | `/auth/logout` | Clear session |
| `GET` | `/api/calendars` | List all Google Calendars |
| `GET` | `/api/events?timeMin=&timeMax=` | Fetch events across all calendars |
| `POST` | `/api/ai/generate-schedule` | Generate a full study schedule with AI |
| `POST` | `/api/ai/reschedule` | Redistribute missed sessions across upcoming days |
| `POST` | `/api/ai/chat` | Chat with the AI study coach |
| `GET` | `/health` | Health check (shows which services are configured) |

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Google Cloud project (free)
- A Gemini API key (free)

---

### 1. Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → enable the **Google Calendar API**
3. Go to **APIs & Services → Credentials → Create OAuth 2.0 Client ID** (Web application)
4. Add `http://localhost:5000/auth/callback` as an authorised redirect URI
5. Download the JSON → save it as `client_secret.json` inside the `backend/` folder

> The app also looks for `client_secret.json` at the project root if it's not found in `backend/`, so either location works.

---

### 2. Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create a free API key
3. You'll paste it into `.env` in the next step

---

### 3. Backend

```bash
cd backend

cp .env.example .env
# Open .env and paste your GEMINI_API_KEY, GROQ_API_KEY

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

python server.py
# Running on http://localhost:5000
```

---

### 4. Frontend

```bash
cd frontend

npm install
npm run dev
# Running on http://localhost:5173
```

---

### 5. Open the app

1. Visit `http://localhost:5173`
2. Click **Sign in with Google** and authorise calendar access
3. Add your deadlines and exams using **+ Add**
4. Hit **Generate My Energy Map** to let AI build your schedule
5. Click any day on the heatmap to see sessions, events, and what's due
6. Open **Coach** to chat with the AI study assistant

> **Don't want to add tasks manually?** After signing in, click **Demo** in the header to instantly load sample deadlines and events so you can test the app without entering anything yourself.

---

## Environment Variables

All variables go in `backend/.env`. Copy `backend/.env.example` to get started.

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini AI key from Google AI Studio |
| `FLASK_SECRET_KEY` | Yes | Any random string for session signing |
| `GROQ_API_KEY` | No | Groq key for Llama fallback if Gemini is unavailable |
| `GOOGLE_CLIENT_SECRETS` | No | Path to `client_secret.json` (auto-detected if omitted) |
| `OAUTH_REDIRECT_URI` | No | Defaults to `http://localhost:5000/auth/callback` |
| `FRONTEND_URL` | No | Defaults to `http://localhost:5173` |

---

## Tech Stack

**Backend**
- Python 3.10+, Flask, Flask-CORS
- Google OAuth2, Google Calendar API
- Gemini 2.5 Flash (primary AI), Groq / Llama 3.3 70B (fallback)

**Frontend**
- React 18, Vite 6

**Auth**
- Session-based Google OAuth2 (read-only calendar scope)

---

## License

MIT