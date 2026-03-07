"""
StudyFlow.ai — Full Backend
Google Calendar OAuth2 + Gemini AI + PDF/DOCX Upload & Parsing
"""
import os, json, datetime, uuid
from functools import wraps
from pathlib import Path

from flask import Flask, redirect, request, jsonify, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import requests as http_req

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "studyflow-dev-key")
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

UPLOAD_DIR = Path("uploads"); UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_EXT = {"pdf","docx","png","jpg","jpeg","txt"}
CLIENT_SECRETS = os.getenv("GOOGLE_CLIENT_SECRETS", "client_secret.json")
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
REDIRECT_URI = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:5000/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

def ok_file(fn): return "." in fn and fn.rsplit(".",1)[1].lower() in ALLOWED_EXT
def get_flow(): return Flow.from_client_secrets_file(CLIENT_SECRETS, scopes=SCOPES, redirect_uri=REDIRECT_URI)

def creds():
    if "creds" not in session: return None
    d = session["creds"]
    return Credentials(token=d["token"],refresh_token=d.get("refresh_token"),token_uri=d["token_uri"],client_id=d["client_id"],client_secret=d["client_secret"],scopes=d.get("scopes"))

def save_creds(c):
    session["creds"]=dict(token=c.token,refresh_token=c.refresh_token,token_uri=c.token_uri,client_id=c.client_id,client_secret=c.client_secret,scopes=list(c.scopes) if c.scopes else SCOPES)

def cal_svc():
    c=creds(); return build("calendar","v3",credentials=c) if c else None

def need_auth(f):
    @wraps(f)
    def d(*a,**kw):
        if "creds" not in session: return jsonify(error="Not authenticated"),401
        return f(*a,**kw)
    return d

def read_pdf(path):
    try:
        import fitz
        doc=fitz.open(path); t="".join(p.get_text() for p in doc); doc.close(); return t.strip()
    except ImportError: return "[Install PyMuPDF: pip install pymupdf]"
    except Exception as e: return f"[PDF error: {e}]"

def read_file(path):
    ext=Path(path).suffix.lower()
    if ext==".pdf": return read_pdf(path)
    elif ext==".txt":
        with open(path,"r",errors="ignore") as f: return f.read()
    elif ext==".docx":
        try:
            import docx; return "\n".join(p.text for p in docx.Document(path).paragraphs)
        except ImportError: return "[Install: pip install python-docx]"
    return f"[Unsupported: {ext}]"

def get_week_events():
    """Fetch this week's events as text context."""
    try:
        svc=cal_svc()
        if not svc: return "No calendar connected."
        now=datetime.datetime.now(); s=now.replace(hour=0,minute=0,second=0); e=s+datetime.timedelta(days=7)
        cals=svc.calendarList().list().execute().get("items",[])
        lines=[]
        for cal in cals:
            if "#holiday@" in cal["id"]: continue
            try:
                evts=svc.events().list(calendarId=cal["id"],timeMin=s.isoformat()+"Z",timeMax=e.isoformat()+"Z",singleEvents=True,orderBy="startTime").execute()
                for ev in evts.get("items",[]):
                    st=ev.get("start",{}); loc=f" @ {ev['location']}" if ev.get("location") else ""
                    lines.append(f"- {ev.get('summary','Event')}: {st.get('dateTime',st.get('date',''))}{loc} [{cal.get('summary','')}]")
            except: continue
        return "This week's calendar:\n"+"\n".join(lines) if lines else "No events found."
    except: return "Calendar unavailable."

# ═══ AUTH ═══
@app.route("/auth/login")
def auth_login():
    f=get_flow(); url,st=f.authorization_url(access_type="offline",prompt="consent"); session["state"]=st; return redirect(url)

@app.route("/auth/callback")
def auth_callback():
    f=get_flow(); f.fetch_token(authorization_response=request.url); save_creds(f.credentials); return redirect(f"{FRONTEND_URL}?auth=success")

@app.route("/auth/status")
def auth_status(): return jsonify(authenticated="creds" in session)

@app.route("/auth/logout",methods=["POST"])
def auth_logout(): session.clear(); return jsonify(ok=True)

# ═══ CALENDAR ═══
@app.route("/api/calendars")
@need_auth
def list_cals():
    svc=cal_svc(); r=svc.calendarList().list().execute()
    return jsonify(calendars=[dict(id=c["id"],name=c.get("summary",""),color=c.get("backgroundColor","#4285f4"),primary=c.get("primary",False)) for c in r.get("items",[]) if "#holiday@" not in c["id"]])

@app.route("/api/events")
@need_auth
def list_events():
    svc=cal_svc(); t0=request.args.get("timeMin"); t1=request.args.get("timeMax"); tz=request.args.get("timeZone","America/New_York")
    if not t0 or not t1: return jsonify(error="timeMin/timeMax required"),400
    if not t0.endswith("Z"): t0+="Z"
    if not t1.endswith("Z"): t1+="Z"
    cals=svc.calendarList().list().execute().get("items",[])
    out=[]
    for cal in cals:
        if "#holiday@" in cal["id"]: continue
        try:
            evts=svc.events().list(calendarId=cal["id"],timeMin=t0,timeMax=t1,timeZone=tz,singleEvents=True,orderBy="startTime").execute()
            for e in evts.get("items",[]):
                s,en=e.get("start",{}),e.get("end",{})
                out.append(dict(id=e.get("id"),summary=e.get("summary",""),location=e.get("location",""),start=s.get("dateTime") or s.get("date",""),end=en.get("dateTime") or en.get("date",""),allDay="date" in s and "dateTime" not in s,calendarName=cal.get("summary",""),calendarColor=cal.get("backgroundColor","#4285f4")))
        except: continue
    out.sort(key=lambda e:e["start"])
    return jsonify(events=out,count=len(out))

# ═══ UPLOAD ═══
@app.route("/api/upload",methods=["POST"])
@need_auth
def upload():
    if "file" not in request.files:
        print("[upload] No file in request")
        return jsonify(error="No file"),400
    f=request.files["file"]; ft=request.form.get("type","syllabus")
    if f.filename=="" or not ok_file(f.filename):
        print(f"[upload] Invalid file: {f.filename}")
        return jsonify(error="Invalid file"),400
    fn=secure_filename(f"{ft}_{uuid.uuid4().hex[:8]}_{f.filename}")
    fp=UPLOAD_DIR/fn; f.save(fp)
    text=read_file(str(fp))
    print(f"[upload] Saved {f.filename} as {fn} ({len(text)} chars extracted)")
    if "uploads" not in session: session["uploads"]={}
    session["uploads"][ft]=dict(filename=f.filename,path=str(fp),text=text[:5000],uploaded_at=datetime.datetime.now().isoformat())
    session.modified=True
    return jsonify(success=True,filename=f.filename,type=ft,textLength=len(text),preview=text[:300]+("..." if len(text)>300 else ""))

@app.route("/api/uploads")
@need_auth
def list_uploads():
    u=session.get("uploads",{})
    return jsonify(uploads={k:dict(filename=v["filename"],uploaded_at=v["uploaded_at"]) for k,v in u.items()})

# ═══ GEMINI AI ═══
@app.route("/api/ai/chat",methods=["POST"])
@need_auth
def ai_chat():
    if not GEMINI_KEY: return jsonify(error="Set GEMINI_API_KEY in .env — free at https://aistudio.google.com/apikey"),500
    data=request.get_json(); msg=data.get("message",""); history=data.get("history",[])
    cal_ctx=get_week_events()
    upload_ctx=""
    for ft,info in session.get("uploads",{}).items():
        upload_ctx+=f"\n\n=== Uploaded {ft} ({info['filename']}) ===\n{info.get('text','')[:2000]}"
    system=f"""You are StudyFlow AI, an expert academic study advisor with access to the student's real Google Calendar and uploaded course materials.

{cal_ctx}
{upload_ctx if upload_ctx else "No course materials uploaded yet."}

Help with: study resources, strategies, time management, course-specific questions, syllabus analysis. Keep responses concise and actionable. Reference their real schedule when relevant."""

    contents=[{"role":"user" if m["role"]=="user" else "model","parts":[{"text":m["content"]}]} for m in history]
    contents.append({"role":"user","parts":[{"text":msg}]})
    try:
        print(f"[ai_chat] Sending message: {msg[:80]}...")
        r=http_req.post(f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}",json=dict(contents=contents,systemInstruction=dict(parts=[dict(text=system)]),generationConfig=dict(temperature=0.7,maxOutputTokens=1500)),timeout=30)
        if r.status_code != 200:
            print(f"[ai_chat] Gemini error {r.status_code}: {r.text[:300]}")
            return jsonify(error=f"Gemini API error {r.status_code}: {r.text[:200]}"),500
        res=r.json()
        txt="".join(p.get("text","") for p in res.get("candidates",[{}])[0].get("content",{}).get("parts",[]))
        return jsonify(response=txt or "Couldn't generate a response.")
    except Exception as e:
        print(f"[ai_chat] Error: {type(e).__name__}: {e}")
        return jsonify(error=str(e)),500

# ═══ PLAN GENERATION ═══
def clean_json(txt):
    """Strip markdown fences and extract JSON from Gemini response."""
    import re
    txt = txt.strip()
    # Remove ```json ... ``` or ``` ... ```
    m = re.search(r'```(?:json)?\s*\n?(.*?)```', txt, re.DOTALL)
    if m:
        txt = m.group(1).strip()
    # Fallback: find first { to last }
    if not txt.startswith('{'):
        start = txt.find('{')
        end = txt.rfind('}')
        if start != -1 and end != -1:
            txt = txt[start:end+1]
    return txt

@app.route("/api/generate-plan",methods=["POST"])
@need_auth
def gen_plan():
    if not GEMINI_KEY:
        print("[gen_plan] ERROR: No GEMINI_API_KEY set")
        return jsonify(error="GEMINI_API_KEY required — get one free at https://aistudio.google.com/apikey"),500

    cal_ctx=get_week_events()
    upload_ctx=""
    for ft,info in session.get("uploads",{}).items():
        upload_ctx+=f"\n\n=== {ft.upper()} ({info['filename']}) ===\n{info.get('text','')[:3000]}"

    print(f"[gen_plan] Calendar context: {cal_ctx[:100]}...")
    print(f"[gen_plan] Upload context length: {len(upload_ctx)} chars")

    prompt=f"""Analyze the student's uploaded course materials and calendar. Return ONLY valid JSON (no markdown fences, no explanation).

{cal_ctx}

UPLOADED MATERIALS:{upload_ctx or " None yet."}

Return ONLY this JSON structure (no text before or after):
{{"tasks":[{{"title":"...","course":"...","type":"reading|assignment|review|lecture","difficulty":1,"estimatedMinutes":60,"dueDate":"2026-03-14","priority":1}}],"insights":[{{"type":"danger|tip|info|warn","message":"..."}}],"studyBlocks":[{{"day":"Mon","time":"9:00 AM","task":"...","duration":60}}]}}

Generate 8-12 tasks, 3-4 insights, 10-15 study blocks scheduled around calendar events."""

    try:
        r=http_req.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}",
            json=dict(
                contents=[dict(role="user",parts=[dict(text=prompt)])],
                generationConfig=dict(temperature=0.3,maxOutputTokens=3000,responseMimeType="application/json")
            ),
            timeout=45
        )

        if r.status_code != 200:
            print(f"[gen_plan] Gemini API error {r.status_code}: {r.text[:500]}")
            return jsonify(error=f"Gemini API returned {r.status_code}: {r.text[:200]}"),500

        res=r.json()
        candidates=res.get("candidates",[])
        if not candidates:
            print(f"[gen_plan] No candidates in response: {json.dumps(res)[:500]}")
            return jsonify(error="Gemini returned no candidates — possibly blocked by safety filters"),500

        txt="".join(p.get("text","") for p in candidates[0].get("content",{}).get("parts",[]))
        print(f"[gen_plan] Raw Gemini response (first 300 chars): {txt[:300]}")

        txt = clean_json(txt)
        plan = json.loads(txt)
        print(f"[gen_plan] Success — {len(plan.get('tasks',[]))} tasks, {len(plan.get('insights',[]))} insights")
        return jsonify(plan=plan)

    except json.JSONDecodeError as e:
        print(f"[gen_plan] JSON parse error: {e}")
        print(f"[gen_plan] Cleaned text was: {txt[:500]}")
        return jsonify(error=f"AI returned invalid JSON: {str(e)}"),500
    except http_req.exceptions.Timeout:
        print("[gen_plan] Gemini API timed out")
        return jsonify(error="Gemini API timed out — try again"),500
    except Exception as e:
        print(f"[gen_plan] Unexpected error: {type(e).__name__}: {e}")
        return jsonify(error=f"{type(e).__name__}: {str(e)}"),500

@app.route("/health")
def health(): return jsonify(status="ok",gemini=bool(GEMINI_KEY),oauth=os.path.exists(CLIENT_SECRETS))

if __name__=="__main__":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"]="1"
    app.run(host="0.0.0.0",port=5000,debug=True)
