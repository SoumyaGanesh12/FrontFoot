"""
StudyFlow.ai — Full Backend
Google Calendar OAuth2 + Gemini AI + PDF/DOCX Upload & Parsing
"""
import os, json, datetime, uuid, re, time
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
GROQ_KEY = os.getenv("GROQ_API_KEY", "")

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
    if "file" not in request.files: return jsonify(error="No file"),400
    f=request.files["file"]; ft=request.form.get("type","syllabus")
    if f.filename=="" or not ok_file(f.filename): return jsonify(error="Invalid file"),400
    fn=secure_filename(f"{ft}_{uuid.uuid4().hex[:8]}_{f.filename}")
    fp=UPLOAD_DIR/fn; f.save(fp)
    text=read_file(str(fp))
    if "uploads" not in session: session["uploads"]={}
    session["uploads"][ft]=dict(filename=f.filename,path=str(fp),text=text[:5000],uploaded_at=datetime.datetime.now().isoformat())
    session.modified=True
    return jsonify(success=True,filename=f.filename,type=ft,textLength=len(text),preview=text[:300]+("..." if len(text)>300 else ""))

@app.route("/api/uploads")
@need_auth
def list_uploads():
    u=session.get("uploads",{})
    return jsonify(uploads={k:dict(filename=v["filename"],uploaded_at=v["uploaded_at"]) for k,v in u.items()})

# ═══ SMART PLAN EXTRACTION (LOCAL — no API needed) ═══
def extract_tasks_from_text(text, source_type="syllabus"):
    """Parse uploaded text to extract tasks, deadlines, and course info locally.
    No Gemini call needed — uses regex patterns to find assignments, dates, etc."""
    tasks = []
    task_id = 1

    # Detect course name from text
    course_match = re.search(r'(CS|EC|LJ|CDS|MA|PH|BI|CH|ENG|HI|PS)\s*(\d{3})', text, re.IGNORECASE)
    course = f"{course_match.group(1).upper()} {course_match.group(2)}" if course_match else "General"

    # ── Pattern 1: "Due: <date>" or "Due <date>" lines ──
    due_patterns = [
        r'(?:due|deadline|submit(?:ted)?)\s*[:\-—]?\s*(\w+day,?\s+\w+\s+\d{1,2},?\s*\d{0,4})',
        r'(?:due|deadline)\s*[:\-—]?\s*(\d{1,2}/\d{1,2}(?:/\d{2,4})?)',
        r'(?:due|deadline)\s*[:\-—]?\s*(\w+\s+\d{1,2},?\s*\d{4})',
    ]

    # ── Pattern 2: Problem Set / Assignment / Homework / Lab / Project / Exam / Quiz ──
    task_patterns = [
        (r'(Problem Set|PS|Homework|HW)\s*#?\s*(\d+)', 'assignment', 4, 120),
        (r'(Programming Project|Project)\s*#?\s*(\d+)', 'assignment', 5, 180),
        (r'(Lab)\s*#?\s*(\d+)', 'assignment', 3, 90),
        (r'(Midterm|Mid-term)\s*(Exam)?', 'review', 5, 150),
        (r'(Final)\s*(Exam)?', 'review', 5, 180),
        (r'(Quiz)\s*#?\s*(\d+)?', 'review', 2, 45),
        (r'(Essay|Paper)\s*(?:draft)?', 'assignment', 4, 120),
        (r'(Reading|Read)\s+(?:Ch(?:apter)?\.?\s*)?(\d+)', 'reading', 2, 60),
        (r'(Review)\s+(?:lecture|notes|chapter)', 'review', 3, 45),
        (r'(Vocab|Vocabulary)\s+(?:quiz|test|prep)', 'review', 2, 30),
    ]

    lines = text.split('\n')
    seen_titles = set()

    for i, line in enumerate(lines):
        for pattern, task_type, difficulty, est_minutes in task_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if not match:
                continue

            # Build title
            title = match.group(0).strip()
            # Look for more context on the same line
            rest = line[match.end():].strip(' \t:—-–')
            if rest and len(rest) < 80:
                title = f"{title} — {rest}"
            title = re.sub(r'\s+', ' ', title).strip()

            if title.lower() in seen_titles or len(title) < 4:
                continue
            seen_titles.add(title.lower())

            # Try to find a due date nearby (same line or next 3 lines)
            due_date = None
            search_block = " ".join(lines[i:i+4])
            for dp in due_patterns:
                dm = re.search(dp, search_block, re.IGNORECASE)
                if dm:
                    due_date = dm.group(1)
                    break

            # Also check for dates in common formats on the line
            if not due_date:
                date_m = re.search(r'(\w+\s+\d{1,2},?\s*\d{4}|\d{1,2}/\d{1,2}(?:/\d{2,4})?)', line)
                if date_m:
                    due_date = date_m.group(1)

            tasks.append(dict(
                id=task_id,
                title=title,
                course=course,
                type=task_type,
                difficulty=difficulty,
                estimatedMinutes=est_minutes,
                dueDate=due_date or "",
                priority=task_id,
                done=False,
            ))
            task_id += 1

    # ── Pattern 3: Table rows like "Week | Date | Topic | Due" ──
    table_due = re.findall(r'(PS|Project|Lab|Quiz|Midterm|Final|Essay)\s*#?\s*(\d*)', text, re.IGNORECASE)
    for match_type, match_num in table_due:
        title = f"{match_type} {match_num}".strip() if match_num else match_type
        if title.lower() in seen_titles:
            continue
        seen_titles.add(title.lower())
        is_exam = match_type.lower() in ('midterm', 'final')
        tasks.append(dict(
            id=task_id,
            title=f"{title} — {course}",
            course=course,
            type='review' if is_exam else 'assignment',
            difficulty=5 if is_exam else 3,
            estimatedMinutes=150 if is_exam else 90,
            dueDate="",
            priority=task_id,
            done=False,
        ))
        task_id += 1

    return tasks[:15]  # Cap at 15 tasks

def generate_insights_from_events(events, tasks):
    """Generate smart insights locally from calendar events and tasks."""
    insights = []

    # Analyze busiest days
    day_load = {}
    for ev in events:
        start = ev.get("start", "")
        # Handle Google Calendar raw format: {"dateTime": "..."} or {"date": "..."}
        if isinstance(start, dict):
            start = start.get("dateTime") or start.get("date") or ""
        if not start or not isinstance(start, str):
            continue
        try:
            day = datetime.datetime.fromisoformat(start.replace("Z", "+00:00")).strftime("%A")
        except:
            day = start[:10] if len(start) >= 10 else start
        day_load[day] = day_load.get(day, 0) + 1

    if day_load:
        busiest = max(day_load, key=day_load.get)
        lightest = min(day_load, key=day_load.get)
        insights.append(dict(type="danger", message=f"⚠ {busiest} is your busiest day ({day_load[busiest]} event{'s' if day_load[busiest]!=1 else ''}). Avoid scheduling deep work then."))
        # Only show lightest if it's a different day
        if lightest != busiest:
            insights.append(dict(type="tip", message=f"💡 {lightest} is your lightest day ({day_load[lightest]} event{'s' if day_load[lightest]!=1 else ''}). Great for focused study."))
        else:
            # Find days with NO events for free-day suggestion
            all_days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
            free_days = [d for d in all_days if d not in day_load]
            if free_days:
                insights.append(dict(type="tip", message=f"💡 {free_days[0]} is completely free. Great for focused study."))

    # Task load insight
    total_hours = sum(t.get("estimatedMinutes", 60) for t in tasks) / 60
    hard_tasks = [t for t in tasks if t.get("difficulty", 3) >= 4]
    insights.append(dict(type="info", message=f"📊 {len(tasks)} tasks totaling ~{total_hours:.1f} hrs of study. {len(hard_tasks)} are high-difficulty."))

    # Deadline clustering
    if hard_tasks:
        insights.append(dict(type="warn", message=f"🔥 {len(hard_tasks)} difficult task{'s' if len(hard_tasks)>1 else ''}: {', '.join(t['title'][:30] for t in hard_tasks[:3])}. Start early!"))

    return insights[:5]

def generate_study_blocks(events, tasks):
    """Schedule study blocks around calendar events."""
    blocks = []
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    # Find busy hours per day from events
    busy_hours = {d: set() for d in days}
    for ev in events:
        start = ev.get("start", "")
        # Handle Google Calendar raw format: {"dateTime": "..."} or {"date": "..."}
        if isinstance(start, dict):
            start = start.get("dateTime") or start.get("date") or ""
        if not start or not isinstance(start, str) or "T" not in start:
            continue
        try:
            dt = datetime.datetime.fromisoformat(start.replace("Z", "+00:00"))
            day_name = dt.strftime("%a")[:3]
            if day_name in busy_hours:
                busy_hours[day_name].add(dt.hour)
        except:
            pass

    # Available study slots (prefer morning and evening)
    study_slots = [
        ("9:00 AM", 9), ("10:00 AM", 10), ("2:00 PM", 14),
        ("3:00 PM", 15), ("4:00 PM", 16), ("7:00 PM", 19), ("8:00 PM", 20),
    ]

    task_idx = 0
    for day in days:
        if task_idx >= len(tasks):
            break
        for time_str, hour in study_slots:
            if task_idx >= len(tasks):
                break
            # Skip if there's a class at this hour
            if hour in busy_hours.get(day, set()):
                continue
            t = tasks[task_idx]
            duration = min(t.get("estimatedMinutes", 60), 90)  # Cap blocks at 90min
            blocks.append(dict(day=day, time=time_str, task=t["title"], duration=duration))
            task_idx += 1

    return blocks[:15]

def gemini_request_light(prompt, max_tokens=800):
    """Lightweight Gemini call with retry across multiple models.
    Used only for optional AI enrichment — plan still works without it."""
    models = ["gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"]

    for model in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_KEY}"
            r = http_req.post(url, json=dict(
                contents=[dict(role="user", parts=[dict(text=prompt)])],
                generationConfig=dict(temperature=0.5, maxOutputTokens=max_tokens, responseMimeType="application/json")
            ), timeout=15)

            if r.status_code == 200:
                res = r.json()
                candidates = res.get("candidates", [])
                if candidates:
                    txt = "".join(p.get("text", "") for p in candidates[0].get("content", {}).get("parts", []))
                    print(f"[gemini_light] ✓ {model} ({len(txt)} chars)")
                    return txt

            if r.status_code == 429:
                print(f"[gemini_light] {model} quota exhausted, trying next...")
                continue

            print(f"[gemini_light] {model} returned {r.status_code}, trying next...")
        except Exception as e:
            print(f"[gemini_light] {model} failed: {e}")
            continue

    return None  # All models exhausted — that's okay, plan still works

# ═══ GROQ FALLBACK (free, fast, generous quota) ═══
def groq_chat(system, messages, max_tokens=1500):
    """Call Groq API (free tier: 30 req/min, 14400/day). Uses Llama 3.1."""
    if not GROQ_KEY:
        return None
    try:
        print(f"[groq] Calling llama-3.1-8b-instant...")
        r = http_req.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
            json=dict(
                model="llama-3.1-8b-instant",
                messages=[{"role": "system", "content": system}] + messages,
                max_tokens=max_tokens,
                temperature=0.7,
            ),
            timeout=30,
        )
        if r.status_code == 200:
            txt = r.json()["choices"][0]["message"]["content"]
            print(f"[groq] ✓ Success ({len(txt)} chars)")
            return txt
        print(f"[groq] Error {r.status_code}: {r.text[:120]}")
    except Exception as e:
        print(f"[groq] Failed: {e}")
    return None

# ═══ AI CHAT (Gemini → Groq fallback) ═══
@app.route("/api/ai/chat",methods=["POST"])
@need_auth
def ai_chat():
    if not GEMINI_KEY and not GROQ_KEY:
        return jsonify(error="Set GEMINI_API_KEY or GROQ_API_KEY in .env"),500

    data=request.get_json(); msg=data.get("message",""); history=data.get("history",[])
    cal_ctx=get_week_events()
    upload_ctx=""
    for ft,info in session.get("uploads",{}).items():
        upload_ctx+=f"\n\n=== Uploaded {ft} ({info['filename']}) ===\n{info.get('text','')[:2000]}"
    system=f"""You are StudyFlow AI, an expert academic study advisor with access to the student's real Google Calendar and uploaded course materials.

{cal_ctx}
{upload_ctx if upload_ctx else "No course materials uploaded yet."}

Help with: study resources, strategies, time management, course-specific questions, syllabus analysis. Keep responses concise and actionable. Reference their real schedule when relevant."""

    # ── Try Gemini first ──
    if GEMINI_KEY:
        contents=[{"role":"user" if m["role"]=="user" else "model","parts":[{"text":m["content"]}]} for m in history]
        contents.append({"role":"user","parts":[{"text":msg}]})

        models = ["gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"]
        for model in models:
            try:
                print(f"[ai_chat] Trying Gemini {model}...")
                r = http_req.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_KEY}",
                    json=dict(contents=contents, systemInstruction=dict(parts=[dict(text=system)]),
                              generationConfig=dict(temperature=0.7, maxOutputTokens=1500)),
                    timeout=30
                )
                if r.status_code == 429:
                    print(f"[ai_chat] {model} quota exhausted, trying next...")
                    continue
                if r.status_code == 200:
                    res = r.json()
                    txt = "".join(p.get("text","") for p in res.get("candidates",[{}])[0].get("content",{}).get("parts",[]))
                    print(f"[ai_chat] ✓ Gemini {model} ({len(txt)} chars)")
                    return jsonify(response=txt or "Couldn't generate a response.")
            except Exception as e:
                print(f"[ai_chat] Gemini {model} error: {e}")
                continue
        print("[ai_chat] All Gemini models exhausted, falling back to Groq...")

    # ── Fallback to Groq ──
    openai_msgs = [{"role": m["role"], "content": m["content"]} for m in history]
    openai_msgs.append({"role": "user", "content": msg})
    txt = groq_chat(system, openai_msgs)
    if txt:
        return jsonify(response=txt)

    return jsonify(error="All AI providers are at capacity. Please try again in a minute."),500

# ═══ PLAN GENERATION (HYBRID: local extraction + optional AI enrichment) ═══
@app.route("/api/generate-plan",methods=["POST"])
@need_auth
def gen_plan():
    uploads = session.get("uploads", {})
    if not uploads:
        return jsonify(error="Upload at least one file first (syllabus, schedule, or assignments)"), 400

    print(f"[gen_plan] Processing {len(uploads)} upload(s)...")

    # ── Step 1: Extract tasks locally from uploaded text (FREE, instant) ──
    all_tasks = []
    for ft, info in uploads.items():
        text = info.get("text", "")
        if text:
            tasks = extract_tasks_from_text(text, ft)
            print(f"[gen_plan] Extracted {len(tasks)} tasks from {ft} ({info['filename']})")
            all_tasks.extend(tasks)

    # Deduplicate by title similarity
    seen = set()
    unique_tasks = []
    for t in all_tasks:
        key = re.sub(r'[^a-z0-9]', '', t['title'].lower())[:30]
        if key not in seen:
            seen.add(key)
            t['id'] = len(unique_tasks) + 1
            t['priority'] = len(unique_tasks) + 1
            unique_tasks.append(t)
    unique_tasks = unique_tasks[:12]

    # ── Step 2: Get calendar events for scheduling ──
    events = []
    try:
        svc = cal_svc()
        if svc:
            now = datetime.datetime.now()
            s = now.replace(hour=0, minute=0, second=0)
            e = s + datetime.timedelta(days=7)
            cals = svc.calendarList().list().execute().get("items", [])
            for cal in cals:
                if "#holiday@" in cal["id"]:
                    continue
                try:
                    evts = svc.events().list(
                        calendarId=cal["id"], timeMin=s.isoformat()+"Z",
                        timeMax=e.isoformat()+"Z", singleEvents=True, orderBy="startTime"
                    ).execute()
                    events.extend(evts.get("items", []))
                except:
                    continue
    except:
        pass

    # ── Step 3: Generate insights and study blocks locally (FREE, instant) ──
    insights = generate_insights_from_events(events, unique_tasks)
    study_blocks = generate_study_blocks(events, unique_tasks)

    print(f"[gen_plan] Local plan: {len(unique_tasks)} tasks, {len(insights)} insights, {len(study_blocks)} blocks")

    # ── Step 4: OPTIONAL — enrich with AI if available ──
    if unique_tasks and (GEMINI_KEY or GROQ_KEY):
        task_summary = "; ".join(f"{t['title']} (diff:{t['difficulty']})" for t in unique_tasks[:8])
        enrich_prompt = f"""Given these student tasks: {task_summary}
Return ONLY JSON with 3-4 extra insights:
{{"insights":[{{"type":"danger|tip|info|warn","message":"..."}}]}}
Keep messages short and actionable. Focus on study strategy."""

        try:
            ai_txt = None

            # Try Gemini first
            if GEMINI_KEY:
                ai_txt = gemini_request_light(enrich_prompt, max_tokens=500)

            # Fallback to Groq
            if not ai_txt and GROQ_KEY:
                print("[gen_plan] Gemini unavailable, trying Groq for enrichment...")
                groq_resp = groq_chat(
                    "You are a study advisor. Return ONLY valid JSON, no markdown.",
                    [{"role": "user", "content": enrich_prompt}],
                    max_tokens=500
                )
                if groq_resp:
                    ai_txt = groq_resp

            if ai_txt:
                ai_txt = ai_txt.strip()
                m = re.search(r'```(?:json)?\s*\n?(.*?)```', ai_txt, re.DOTALL)
                if m:
                    ai_txt = m.group(1).strip()
                if not ai_txt.startswith('{'):
                    start = ai_txt.find('{')
                    end = ai_txt.rfind('}')
                    if start != -1 and end != -1:
                        ai_txt = ai_txt[start:end+1]
                ai_data = json.loads(ai_txt)
                ai_insights = ai_data.get("insights", [])
                insights.extend(ai_insights[:3])
                print(f"[gen_plan] AI enriched with {len(ai_insights)} extra insights")
        except Exception as e:
            print(f"[gen_plan] AI enrichment skipped (non-fatal): {e}")

    plan = dict(tasks=unique_tasks, insights=insights, studyBlocks=study_blocks)
    print(f"[gen_plan] ✓ Final plan: {len(plan['tasks'])} tasks, {len(plan['insights'])} insights, {len(plan['studyBlocks'])} blocks")
    return jsonify(plan=plan)

@app.route("/health")
def health():
    return jsonify(
        status="ok",
        gemini=bool(GEMINI_KEY),
        groq=bool(GROQ_KEY),
        oauth=os.path.exists(CLIENT_SECRETS),
    )

if __name__=="__main__":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"]="1"
    print(f"\n{'='*50}")
    print(f"  StudyFlow.ai Backend")
    print(f"  Gemini: {'loaded' if GEMINI_KEY else 'NOT SET'}")
    print(f"  Groq:   {'loaded' if GROQ_KEY else 'NOT SET'}")
    print(f"  Chat: Gemini → Groq fallback")
    print(f"  Plan: local extraction + AI enrichment")
    print(f"{'='*50}\n")
    app.run(host="0.0.0.0",port=5000,debug=True)