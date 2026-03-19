"""
Authentication routes and credential helpers.
Other route modules import `need_auth` from here.
"""

from functools import wraps
from flask import Blueprint, redirect, request, jsonify, session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

from config import CLIENT_SECRETS, SCOPES, REDIRECT_URI, FRONTEND_URL

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


# ── Credential helpers ──────────────────────────────────────────────────────

def get_flow():
    return Flow.from_client_secrets_file(
        CLIENT_SECRETS, scopes=SCOPES, redirect_uri=REDIRECT_URI
    )


def creds():
    if "creds" not in session:
        return None
    d = session["creds"]
    return Credentials(
        token=d["token"],
        refresh_token=d.get("refresh_token"),
        token_uri=d["token_uri"],
        client_id=d["client_id"],
        client_secret=d["client_secret"],
        scopes=d.get("scopes"),
    )


def save_creds(c):
    session["creds"] = dict(
        token=c.token,
        refresh_token=c.refresh_token,
        token_uri=c.token_uri,
        client_id=c.client_id,
        client_secret=c.client_secret,
        scopes=list(c.scopes) if c.scopes else SCOPES,
    )


def need_auth(f):
    """Decorator: return 401 if the user is not authenticated."""
    @wraps(f)
    def wrapper(*a, **kw):
        if "creds" not in session:
            return jsonify(error="Not authenticated"), 401
        return f(*a, **kw)
    return wrapper


# ── Routes ──────────────────────────────────────────────────────────────────

@auth_bp.route("/login")
def auth_login():
    f = get_flow()
    url, state = f.authorization_url(access_type="offline", prompt="consent")
    session["state"] = state
    return redirect(url)


@auth_bp.route("/callback")
def auth_callback():
    f = get_flow()
    f.fetch_token(authorization_response=request.url)
    save_creds(f.credentials)
    return redirect(f"{FRONTEND_URL}?auth=success")


@auth_bp.route("/status")
def auth_status():
    return jsonify(authenticated="creds" in session)


@auth_bp.route("/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return jsonify(ok=True)
