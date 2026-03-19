"""
Cognitive Scaffold — Entry Point
Registers blueprints and starts the Flask dev server.
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS

from config import FLASK_SECRET_KEY, FRONTEND_URL, GEMINI_KEY, GROQ_KEY, CLIENT_SECRETS
from routes.auth import auth_bp
from routes.calendar import calendar_bp
from routes.ai import ai_bp

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY
CORS(app, supports_credentials=True, origins=[FRONTEND_URL])

app.register_blueprint(auth_bp)
app.register_blueprint(calendar_bp)
app.register_blueprint(ai_bp)


@app.route("/health")
def health():
    return jsonify(
        status="ok",
        gemini=bool(GEMINI_KEY),
        groq=bool(GROQ_KEY),
        oauth=os.path.exists(CLIENT_SECRETS),
    )


if __name__ == "__main__":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
    print(f"\n{'='*50}")
    print(f"  Cognitive Scaffold")
    print(f"  Gemini: {'Y' if GEMINI_KEY else 'N'} | Groq: {'Y' if GROQ_KEY else 'N'} | OAuth: {'Y' if os.path.exists(CLIENT_SECRETS) else 'N'}")
    print(f"{'='*50}\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
