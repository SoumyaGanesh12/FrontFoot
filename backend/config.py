"""
Centralised configuration — loaded once at startup.
All modules import constants from here instead of reading env vars directly.
"""

import os
from dotenv import load_dotenv

load_dotenv()

_backend_secret = os.path.join(os.path.dirname(__file__), "client_secret.json")
_root_secret = os.path.join(os.path.dirname(__file__), "..", "client_secret.json")
CLIENT_SECRETS = os.getenv("GOOGLE_CLIENT_SECRETS") or (_backend_secret if os.path.exists(_backend_secret) else _root_secret)
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
REDIRECT_URI = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:5000/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "cognitive-scaffold-dev-key")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_KEY = os.getenv("GROQ_API_KEY", "")
