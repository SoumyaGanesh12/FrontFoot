# StudyFlow.ai — Full-Stack AI Study Planner

Upload your syllabus, sync your Google Calendar, and let AI build an optimized study plan.

## Architecture

```
studyflow/
├── backend/
│   ├── server.py          ← Flask API: OAuth, Calendar, Gemini AI, File Upload
│   ├── requirements.txt
│   ├── .env.example       ← Environment template
│   └── client_secret.json ← You create this (Google OAuth)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx        ← Full React UI (Dashboard, Timeline, Tasks, AI Chat, Upload)
│   │   ├── api.js         ← API client service
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js     ← Dev proxy to Flask
│   └── package.json
│
└── README.md
```

## Features

| Feature | Description |
|---------|-------------|
| **Google Calendar OAuth** | Real-time sync with all your calendars |
| **PDF/DOCX Upload** | Upload syllabus, schedule, assignments |
| **AI Plan Generation** | Gemini analyzes uploads + calendar → study tasks |
| **AI Chat Assistant** | Ask for study resources, strategies, course help |
| **Priority Queue** | Tasks ranked by difficulty × urgency |
| **Week Timeline** | Day-by-day view with real events |
| **Task Tracking** | Check off tasks, track progress |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login` | → Google OAuth consent |
| GET | `/auth/callback` | OAuth callback handler |
| GET | `/auth/status` | Check authentication |
| POST | `/auth/logout` | Clear session |
| GET | `/api/calendars` | List all calendars |
| GET | `/api/events?timeMin=&timeMax=` | Get events from all calendars |
| POST | `/api/upload` | Upload PDF/DOCX/TXT (multipart) |
| GET | `/api/uploads` | List uploaded files |
| POST | `/api/ai/chat` | Chat with Gemini AI |
| POST | `/api/generate-plan` | AI generates study plan |
| GET | `/health` | Health check |

## Quick Start

### 1. Google Cloud Setup (5 min)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable **Google Calendar API**
3. APIs & Services → Credentials → Create **OAuth 2.0 Client ID** (Web application)
4. Add redirect URI: `http://localhost:5000/auth/callback`
5. Download JSON → save as `backend/client_secret.json`

### 2. Gemini API Key (1 min)
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create API key (free tier is plenty)
3. Save it for the next step

### 3. Backend
```bash
cd backend
cp .env.example .env
# Edit .env → paste your GEMINI_API_KEY

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python server.py
# → Running on http://localhost:5000
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# → Running on http://localhost:5173
```

### 5. Use it
1. Open http://localhost:5173
2. Click "Sign in with Google" → authorize calendar access
3. Click "📄 Upload" → upload your syllabus PDF
4. AI generates tasks and study plan around your calendar
5. Click "✦ Study AI" → ask for study resources, strategies

## Tech Stack
- **Backend**: Python 3.10+, Flask, Google OAuth2, Google Calendar API, Gemini 2.0 Flash
- **Frontend**: React 18, Vite 6
- **File parsing**: PyMuPDF (PDF), python-docx (DOCX)
- **Auth**: Session-based, Google OAuth2 flow
