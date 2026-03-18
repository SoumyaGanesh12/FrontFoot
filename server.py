"""
Cognitive Scaffold — Backend
Google Calendar OAuth2 + Gemini AI (Groq fallback)
"""

import os, json, datetime, re
from functools import wraps
from zoneinfo import ZoneInfo

from flask import Flask, redirect, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import requests as http_req


def try_parse_json(text):
    if not text:
        return None
    # Direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Strip markdown fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`")
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    # Repair truncated JSON
    repaired = cleaned.rstrip()
    # Remove trailing incomplete key:value like  ,"key": or ,"key":"partial
    repaired = re.sub(r""",?\s*"[^"]*"\s*:\s*"?[^"}\]]*$""", "", repaired)
    # Close unclosed brackets
    stack = []
    in_str = False
    esc = False
    for ch in repaired:
        if esc:
            esc = False
            continue
        if ch == "\\":
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]" and stack:
            stack.pop()
    repaired += "".join(reversed(stack))
    try:
        result = json.loads(repaired)
        print("[json_repair] Repaired truncated JSON")
        return result
    except Exception as e:
        print(f"[json_repair] Repair failed: {e}")
    return None


load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "cognitive-scaffold-dev-key")
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

CLIENT_SECRETS = os.getenv("GOOGLE_CLIENT_SECRETS", "client_secret.json")
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
REDIRECT_URI = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:5000/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_KEY = os.getenv("GROQ_API_KEY", "")


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


def cal_svc():
    c = creds()
    return build("calendar", "v3", credentials=c) if c else None


def need_auth(f):
    @wraps(f)
    def wrapper(*a, **kw):
        if "creds" not in session:
            return jsonify(error="Not authenticated"), 401
        return f(*a, **kw)

    return wrapper


# --- AI PROVIDERS ---


def gemini_call(
    system_prompt,
    user_prompt,
    model="gemini-2.5-flash-lite",
    max_tokens=2000,
    json_mode=False,
):
    if not GEMINI_KEY:
        return None
    models = [model]
    if model != "gemini-2.5-flash-lite":
        models.append("gemini-2.5-flash-lite")
    if model != "gemini-2.5-flash":
        models.append("gemini-2.5-flash")
    for m in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={GEMINI_KEY}"
            gen_config = dict(temperature=0.4, maxOutputTokens=max_tokens)
            if json_mode:
                gen_config["responseMimeType"] = "application/json"
            r = http_req.post(
                url,
                json=dict(
                    contents=[dict(role="user", parts=[dict(text=user_prompt)])],
                    systemInstruction=dict(parts=[dict(text=system_prompt)]),
                    generationConfig=gen_config,
                ),
                timeout=45,
            )
            if r.status_code == 200:
                res = r.json()
                candidates = res.get("candidates", [])
                if candidates:
                    txt = "".join(
                        p.get("text", "")
                        for p in candidates[0].get("content", {}).get("parts", [])
                    )
                    print(f"[gemini] {m} ({len(txt)} chars)")
                    return txt
            if r.status_code == 429:
                print(f"[gemini] {m} rate limited")
                continue
            print(f"[gemini] {m} returned {r.status_code}")
        except Exception as e:
            print(f"[gemini] {m} error: {e}")
            continue
    return None


def groq_call(system_prompt, user_prompt, max_tokens=2000, json_mode=False):
    if not GROQ_KEY:
        print("[groq] No API key set")
        return None
    try:
        body = dict(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.4,
        )
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        print("[groq] Calling llama-3.3-70b...")
        r = http_req.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_KEY}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=60,
        )
        if r.status_code == 200:
            txt = r.json()["choices"][0]["message"]["content"]
            print(f"[groq] ({len(txt)} chars)")
            return txt
        print(f"[groq] Error {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"[groq] Failed: {e}")
    return None


def ai_call(
    system_prompt,
    user_prompt,
    model="gemini-2.5-flash-lite",
    max_tokens=2000,
    json_mode=False,
):
    result = gemini_call(system_prompt, user_prompt, model, max_tokens, json_mode)
    if result:
        return result
    print("[ai] Gemini unavailable, trying Groq...")
    result = groq_call(system_prompt, user_prompt, max_tokens, json_mode)
    if result:
        return result
    return None


# --- AUTH ---


@app.route("/auth/login")
def auth_login():
    f = get_flow()
    url, state = f.authorization_url(access_type="offline", prompt="consent")
    session["state"] = state
    return redirect(url)


@app.route("/auth/callback")
def auth_callback():
    f = get_flow()
    f.fetch_token(authorization_response=request.url)
    save_creds(f.credentials)
    return redirect(f"{FRONTEND_URL}?auth=success")


@app.route("/auth/status")
def auth_status():
    return jsonify(authenticated="creds" in session)


@app.route("/auth/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return jsonify(ok=True)


# --- CALENDAR ---


@app.route("/api/calendars")
@need_auth
def list_calendars():
    svc = cal_svc()
    result = svc.calendarList().list().execute()
    return jsonify(
        calendars=[
            dict(
                id=c["id"],
                name=c.get("summary", ""),
                color=c.get("backgroundColor", "#4285f4"),
                primary=c.get("primary", False),
            )
            for c in result.get("items", [])
            if "#holiday@" not in c["id"]
        ]
    )


@app.route("/api/events")
@need_auth
def list_events():
    svc = cal_svc()
    t_min = request.args.get("timeMin")
    t_max = request.args.get("timeMax")
    tz = request.args.get("timeZone", "America/New_York")
    if not t_min or not t_max:
        return jsonify(error="timeMin and timeMax required"), 400
    if not t_min.endswith("Z"):
        t_min += "Z"
    if not t_max.endswith("Z"):
        t_max += "Z"
    calendars = svc.calendarList().list().execute().get("items", [])
    events = []
    for cal in calendars:
        if "#holiday@" in cal["id"]:
            continue
        try:
            result = (
                svc.events()
                .list(
                    calendarId=cal["id"],
                    timeMin=t_min,
                    timeMax=t_max,
                    timeZone=tz,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
            for ev in result.get("items", []):
                start = ev.get("start", {})
                end = ev.get("end", {})
                events.append(
                    dict(
                        id=ev.get("id"),
                        summary=ev.get("summary", ""),
                        location=ev.get("location", ""),
                        start=start.get("dateTime") or start.get("date", ""),
                        end=end.get("dateTime") or end.get("date", ""),
                        allDay="date" in start and "dateTime" not in start,
                        calendarName=cal.get("summary", ""),
                        calendarColor=cal.get("backgroundColor", "#4285f4"),
                    )
                )
        except Exception:
            continue
    events.sort(key=lambda e: e["start"])
    return jsonify(events=events, count=len(events))


# --- AI ENDPOINTS ---

SCHEDULE_SYSTEM = """You are an intelligent study schedule planner that prevents student burnout.
Decide which tasks should be studied on which days, in what order, and with what topics.
Spread harder tasks across more days, start difficult tasks earlier, leave buffer before exams.
Events are time blocks not study tasks. Respect blocked days and busy times."""


@app.route("/api/ai/generate-schedule", methods=["POST"])
@need_auth
def generate_schedule():
    data = request.get_json()
    deadlines = data.get("deadlines", [])
    constraints = data.get("constraints", {})
    calendar_events = data.get("calendarEvents", [])
    today = data.get("todayDate") or datetime.date.today().isoformat()

    if not deadlines:
        return jsonify(error="Add at least one deadline"), 400

    budget_lines = []
    expected_totals = {}
    for d in deadlines:
        est = d.get("estimatedMinutes", 60)
        title = d.get("title", "Task")
        expected_totals[title] = est
        budget_lines.append(
            f"- {title}: {est}min, due {d.get('dueDate','')}, difficulty {d.get('difficulty',3)}/5"
        )

    prompt = f"""Today is {today}.

TASKS:
{chr(10).join(budget_lines)}

CALENDAR EVENTS (avoid):
{json.dumps(calendar_events[:20], indent=2)}

CONSTRAINTS:
- Blocked days: {', '.join(constraints.get('blockedDays', [])) or 'none'}
- Busy times: {json.dumps(constraints.get('timeBlocks', [])) if constraints.get('timeBlocks') else 'none'}

DEADLINES:
{json.dumps(deadlines, indent=2)}

For each day from {today} to the last deadline, list which tasks to work on, start times, and topics.

Return ONLY JSON:
{{"schedule":[{{"date":"YYYY-MM-DD","tasks":[{{"taskTitle":"...","startTime":"HH:MM","topic":"or null"}}],"cognitive_load":1-10}}],"warnings":["..."],"insights":[{{"type":"danger|tip|info|warn","message":"..."}}]}}

Include ALL days. Blocked days: tasks:[], cognitive_load:0. No tasks before 08:00 or after 22:00."""

    result = ai_call(
        SCHEDULE_SYSTEM,
        prompt,
        model="gemini-2.5-flash",
        max_tokens=8000,
        json_mode=True,
    )
    if not result:
        return jsonify(error="AI unavailable. Try again."), 503

    print(f"[gen_plan] AI response ({len(result)} chars)")
    parsed = try_parse_json(result)
    if not parsed:
        return jsonify(error="AI returned invalid format."), 500

    ai_schedule = parsed.get("schedule", [])

    # --- PYTHON DISTRIBUTES EXACT HOURS ---
    blocked_names = set(constraints.get("blockedDays", []))
    max_session = 90

    # Find available dates
    start_d = datetime.date.fromisoformat(today)
    last_due = max((d.get("dueDate", today) for d in deadlines), default=today)
    end_d = datetime.date.fromisoformat(last_due)
    all_available = []
    cur = start_d
    while cur <= end_d:
        if cur.strftime("%A") not in blocked_names:
            all_available.append(cur.isoformat())
        cur += datetime.timedelta(days=1)

    # Collect AI day assignments per task
    task_day_slots = {}
    for day in ai_schedule:
        for t in day.get("tasks", day.get("sessions", [])):
            title = t.get("taskTitle", "")
            if title and title in expected_totals:
                slot = (day["date"], t.get("startTime", "09:00"), t.get("topic"))
                if title not in task_day_slots:
                    task_day_slots[title] = []
                task_day_slots[title].append(slot)

    # Ensure enough slots per task
    for title, est in expected_totals.items():
        slots = task_day_slots.get(title, [])
        dl = next((d for d in deadlines if d.get("title") == title), None)
        due = dl.get("dueDate", last_due) if dl else last_due

        # Remove slots on/after due date
        slots = [s for s in slots if s[0] < due]

        min_slots = max(1, -(-est // max_session))
        if len(slots) < min_slots:
            used = set(s[0] for s in slots)
            candidates = [d for d in all_available if d < due and d not in used]
            needed = min_slots - len(slots)
            topics_list = []
            if dl and dl.get("topics"):
                topics_list = [t.strip() for t in dl["topics"].split(",") if t.strip()]
            for cd in reversed(candidates):
                if needed <= 0:
                    break
                topic = (
                    topics_list[len(slots) % len(topics_list)] if topics_list else None
                )
                slots.append((cd, "09:00", topic))
                needed -= 1

        if not slots:
            candidates = [d for d in all_available if d < due] or [today]
            slots = [(candidates[-1], "09:00", None)]

        task_day_slots[title] = slots

    # Distribute exact minutes
    final_schedule = {}
    for day in ai_schedule:
        if day["date"] not in final_schedule:
            final_schedule[day["date"]] = {
                "date": day["date"],
                "sessions": [],
                "cognitive_load": 0,
            }

    for title, slots in task_day_slots.items():
        est = expected_totals.get(title, 60)
        n = len(slots)
        base = est // n
        rem = est % n
        for i, (date, start_time, topic) in enumerate(slots):
            dur = base + (1 if i < rem else 0)
            if dur <= 0:
                continue
            if date not in final_schedule:
                final_schedule[date] = {
                    "date": date,
                    "sessions": [],
                    "cognitive_load": 0,
                }
            final_schedule[date]["sessions"].append(
                {
                    "taskTitle": title,
                    "startTime": start_time,
                    "duration": dur,
                    "type": "study",
                    "topic": topic,
                }
            )

    # Sort sessions, enforce gaps, calc load
    for date, day in final_schedule.items():
        sessions = sorted(day["sessions"], key=lambda s: s.get("startTime", "00:00"))
        for i in range(1, len(sessions)):
            prev = sessions[i - 1]
            curr = sessions[i]
            if prev.get("startTime") and curr.get("startTime") and prev.get("duration"):
                ph, pm = map(int, prev["startTime"].split(":"))
                prev_end = ph * 60 + pm + prev["duration"]
                ch, cm = map(int, curr["startTime"].split(":"))
                if ch * 60 + cm < prev_end + 15:
                    ns = prev_end + 15
                    nh, nm = divmod(ns, 60)
                    if nh < 22:
                        curr["startTime"] = f"{nh:02d}:{nm:02d}"
        day["sessions"] = sessions
        day_name = datetime.date.fromisoformat(date).strftime("%A")
        if day_name in blocked_names:
            day["sessions"] = []
            day["cognitive_load"] = 0
        else:
            total_hrs = sum(s.get("duration", 0) for s in sessions) / 60
            if total_hrs == 0:
                day["cognitive_load"] = 0
            elif total_hrs <= 1:
                day["cognitive_load"] = 2
            elif total_hrs <= 2:
                day["cognitive_load"] = 3
            elif total_hrs <= 3:
                day["cognitive_load"] = 5
            elif total_hrs <= 4:
                day["cognitive_load"] = 6
            elif total_hrs <= 5:
                day["cognitive_load"] = 7
            elif total_hrs <= 6:
                day["cognitive_load"] = 8
            else:
                day["cognitive_load"] = min(10, round(8 + (total_hrs - 6)))

    schedule_list = sorted(final_schedule.values(), key=lambda d: d["date"])

    # Verify
    for t, exp in expected_totals.items():
        act = sum(
            s["duration"]
            for day in schedule_list
            for s in day["sessions"]
            if s["taskTitle"] == t
        )
        print(
            f"[gen_plan] {'ok' if act == exp else 'MISMATCH'} {t}: {act}min / {exp}min"
        )

    return jsonify(
        schedule=schedule_list,
        warnings=parsed.get("warnings", []),
        insights=parsed.get("insights", []),
    )


RESCHEDULE_SYSTEM = "You redistribute missed study sessions. Keep responses short. Return only valid JSON."

RESCHEDULE_SYSTEM = "You are a study schedule optimizer. Decide how to redistribute missed study time. Return only valid JSON."


@app.route("/api/ai/reschedule", methods=["POST"])
@need_auth
def reschedule():
    data = request.get_json()
    missed_date = data.get("missedDate")
    missed_sessions = data.get("missedSessions", [])
    current_schedule = data.get("currentSchedule", [])
    constraints = data.get("constraints", {})

    if not missed_date or not missed_sessions:
        return jsonify(error="No missed sessions"), 400

    blocked_names = set(constraints.get("blockedDays", []))

    # Get next available days
    next_days = []
    for d in current_schedule:
        if d["date"] <= missed_date:
            continue
        day_name = datetime.date.fromisoformat(d["date"]).strftime("%A")
        if day_name not in blocked_names:
            next_days.append(d)
        if len(next_days) >= 5:
            break

    if not next_days:
        return jsonify(error="No upcoming days to reschedule into"), 400

    # Group missed by task
    missed_by_task = {}
    for s in missed_sessions:
        title = s.get("taskTitle", "")
        if not title:
            continue
        if title not in missed_by_task:
            missed_by_task[title] = {"minutes": 0, "topic": s.get("topic")}
        missed_by_task[title]["minutes"] += s.get("duration", 0)

    total_missed = sum(v["minutes"] for v in missed_by_task.values())
    day_dates = [d["date"] for d in next_days]
    task_list = [f"{t}: {v['minutes']}min" for t, v in missed_by_task.items()]

    # Ask AI: how should we distribute? (simple question, simple answer)
    prompt = f"""Student missed these on {missed_date}: {', '.join(task_list)}.
Available days: {', '.join(day_dates)}.
Existing load per day: {', '.join(f"{d['date']}={sum(s.get('duration',0) for s in d.get('sessions',[]))}min" for d in next_days)}.

How should the {total_missed}min be spread? Consider which tasks are most urgent (closest deadline).

Return ONLY this JSON — assign exact percentages that sum to 100 for each day:
{{"distribution":{{"YYYY-MM-DD": percentage, ...}}, "reasoning": "brief explanation"}}"""

    ai_result = ai_call(
        RESCHEDULE_SYSTEM,
        prompt,
        model="gemini-2.5-flash",
        max_tokens=1000,
        json_mode=True,
    )
    ai_parsed = try_parse_json(ai_result) if ai_result else None

    # Get distribution weights (AI decides, or fallback to even split)
    weights = {}
    reasoning = "Spread evenly across available days"
    if ai_parsed and "distribution" in ai_parsed:
        raw_dist = ai_parsed["distribution"]
        total_pct = sum(raw_dist.values())
        if total_pct > 0:
            weights = {k: v / total_pct for k, v in raw_dist.items()}
            reasoning = ai_parsed.get("reasoning", reasoning)
            print(f"[reschedule] AI distribution: {raw_dist} — {reasoning}")

    if not weights:
        # Even split fallback
        for d in day_dates:
            weights[d] = 1.0 / len(day_dates)
        print(f"[reschedule] Using even distribution")

    # Python executes: distribute each task's minutes using AI's weights
    updated_days = {}
    for title, info in missed_by_task.items():
        task_total = info["minutes"]
        allocated = 0

        sorted_dates = sorted(weights.keys())
        for i, date in enumerate(sorted_dates):
            if date not in [d["date"] for d in next_days]:
                continue
            if i == len(sorted_dates) - 1:
                dur = task_total - allocated  # last day gets remainder — exact match
            else:
                dur = round(task_total * weights.get(date, 0))
            allocated += dur

            if dur <= 0:
                continue

            if date not in updated_days:
                existing = next((d for d in next_days if d["date"] == date), {})
                updated_days[date] = {
                    "date": date,
                    "sessions": list(existing.get("sessions", [])),
                    "cognitive_load": 0,
                }

            # Find start time after existing sessions
            existing_sessions = updated_days[date]["sessions"]
            start_hour = 9
            if existing_sessions:
                last = existing_sessions[-1]
                if last.get("startTime") and last.get("duration"):
                    lh, lm = map(int, last["startTime"].split(":"))
                    end_min = lh * 60 + lm + last["duration"] + 15
                    start_hour = end_min // 60
            if start_hour >= 22:
                start_hour = 9

            updated_days[date]["sessions"].append(
                {
                    "taskTitle": title,
                    "startTime": f"{start_hour:02d}:00",
                    "duration": dur,
                    "type": "study",
                    "topic": info.get("topic"),
                }
            )

    # Recalculate cognitive load
    for date, day in updated_days.items():
        total_hrs = sum(s.get("duration", 0) for s in day["sessions"]) / 60
        if total_hrs == 0:
            day["cognitive_load"] = 0
        elif total_hrs <= 1:
            day["cognitive_load"] = 2
        elif total_hrs <= 2:
            day["cognitive_load"] = 3
        elif total_hrs <= 3:
            day["cognitive_load"] = 5
        elif total_hrs <= 4:
            day["cognitive_load"] = 6
        elif total_hrs <= 5:
            day["cognitive_load"] = 7
        elif total_hrs <= 6:
            day["cognitive_load"] = 8
        else:
            day["cognitive_load"] = min(10, round(8 + (total_hrs - 6)))

    print(
        f"[reschedule] {total_missed}min redistributed across {len(updated_days)} days — {reasoning}"
    )

    return jsonify(
        updated_days=list(updated_days.values()),
        message=reasoning,
    )


CHAT_SYSTEM_TEMPLATE = """You are a supportive study coach called Cognitive Scaffold AI.
Student data:
EVENTS: {events}
DEADLINES: {deadlines}
SCHEDULE: {schedule_summary}
CONSTRAINTS: {constraints}

Rules: Keep responses 100-200 words. Short paragraphs. Always complete your thoughts. Be warm and actionable. Reference their real data."""


@app.route("/api/ai/chat", methods=["POST"])
@need_auth
def ai_chat():
    data = request.get_json()
    message = data.get("message", "")
    history = data.get("history", [])
    context = data.get("context", {})
    system = CHAT_SYSTEM_TEMPLATE.format(
        events=context.get("events", "None"),
        deadlines=context.get("deadlines", "None"),
        schedule_summary=context.get("scheduleSummary", "None"),
        constraints=context.get("constraints", "None"),
    )
    conv = "\n".join(
        f"{'Student' if m['role']=='user' else 'Coach'}: {m['content']}"
        for m in history
    )
    conv += f"\nStudent: {message}"
    result = ai_call(
        system, conv, model="gemini-2.5-flash", max_tokens=4000, json_mode=False
    )
    if not result:
        return jsonify(error="AI unavailable."), 503
    return jsonify(response=result)


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
    print(
        f"  Gemini: {'Y' if GEMINI_KEY else 'N'} | Groq: {'Y' if GROQ_KEY else 'N'} | OAuth: {'Y' if os.path.exists(CLIENT_SECRETS) else 'N'}"
    )
    print(f"{'='*50}\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
