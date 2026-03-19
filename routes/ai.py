"""
AI-powered endpoints: schedule generation, rescheduling, and study chat.
"""

import json
import datetime

from flask import Blueprint, request, jsonify

from routes.auth import need_auth
from ai_providers import ai_call
from utils import try_parse_json, cognitive_load_score

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


# ── System prompts ───────────────────────────────────────────────────────────

SCHEDULE_SYSTEM = """You are an intelligent study schedule planner that prevents student burnout.
Decide which tasks should be studied on which days, in what order, and with what topics.
Spread harder tasks across more days, start difficult tasks earlier, leave buffer before exams.
Events are time blocks not study tasks. Respect blocked days and busy times."""

RESCHEDULE_SYSTEM = "You are a study schedule optimizer. Decide how to redistribute missed study time. Return only valid JSON."

CHAT_SYSTEM_TEMPLATE = """You are a supportive study coach called LoadLens AI.
Today's date: {today}
Student data:
EVENTS: {events}
DEADLINES: {deadlines}
SCHEDULE: {schedule_summary}
CONSTRAINTS: {constraints}

Rules: Keep responses 100-200 words. Short paragraphs. Always complete your thoughts. Be warm and actionable. Reference their real data.
For off-topic questions: briefly acknowledge your role as a study coach, offer 2-3 genuinely helpful suggestions on what they asked, then naturally close by referencing something relevant from their actual schedule or deadlines. The transition back should feel organic, not scripted.

After your reply, always end with exactly this block on a new line:
SUGGESTIONS: <suggestion 1> | <suggestion 2> | <suggestion 3>

Each suggestion must be under 8 words. If your reply ends with a question to the student, the suggestions should be likely answers. Otherwise they should be natural follow-up questions based on the conversation and the student's actual deadlines."""


# ── Schedule generation ──────────────────────────────────────────────────────

@ai_bp.route("/generate-schedule", methods=["POST"])
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

Include ALL days. Blocked days: tasks:[], cognitive_load:0. No tasks before 08:00 or after 22:00.
Insights and warnings must only be about academic tasks (exams, assignments, workload). Do NOT generate insights or warnings about calendar events or personal events."""

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
    schedule_list = _distribute_sessions(ai_schedule, deadlines, expected_totals, constraints, today)

    return jsonify(
        schedule=schedule_list,
        warnings=parsed.get("warnings", []),
        insights=parsed.get("insights", []),
    )


def _distribute_sessions(ai_schedule, deadlines, expected_totals, constraints, today):
    """
    Use the AI's day assignments as a skeleton, then distribute exact minutes
    per task and enforce session gaps and cognitive load scores.
    """
    blocked_names = set(constraints.get("blockedDays", []))
    max_session = 90

    # Build list of available dates
    start_d = datetime.date.fromisoformat(today)
    last_due = max((d.get("dueDate", today) for d in deadlines), default=today)
    end_d = datetime.date.fromisoformat(last_due)
    all_available = []
    cur = start_d
    while cur <= end_d:
        if cur.strftime("%A") not in blocked_names:
            all_available.append(cur.isoformat())
        cur += datetime.timedelta(days=1)

    # Collect AI's day assignments per task
    task_day_slots = {}
    for day in ai_schedule:
        for t in day.get("tasks", day.get("sessions", [])):
            title = t.get("taskTitle", "")
            if title and title in expected_totals:
                slot = (day["date"], t.get("startTime", "09:00"), t.get("topic"))
                task_day_slots.setdefault(title, []).append(slot)

    # Ensure enough slots per task
    for title, est in expected_totals.items():
        slots = task_day_slots.get(title, [])
        dl = next((d for d in deadlines if d.get("title") == title), None)
        due = dl.get("dueDate", last_due) if dl else last_due

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
                topic = topics_list[len(slots) % len(topics_list)] if topics_list else None
                slots.append((cd, "09:00", topic))
                needed -= 1

        if not slots:
            candidates = [d for d in all_available if d < due] or [today]
            slots = [(candidates[-1], "09:00", None)]

        task_day_slots[title] = slots

    # Distribute exact minutes across slots
    final_schedule = {
        day["date"]: {"date": day["date"], "sessions": [], "cognitive_load": 0}
        for day in ai_schedule
    }

    for title, slots in task_day_slots.items():
        est = expected_totals.get(title, 60)
        n = len(slots)
        base, rem = est // n, est % n
        for i, (date, start_time, topic) in enumerate(slots):
            dur = base + (1 if i < rem else 0)
            if dur <= 0:
                continue
            final_schedule.setdefault(date, {"date": date, "sessions": [], "cognitive_load": 0})
            final_schedule[date]["sessions"].append({
                "taskTitle": title,
                "startTime": start_time,
                "duration": dur,
                "type": "study",
                "topic": topic,
            })

    # Sort sessions, enforce 15-min gaps, calculate cognitive load
    for date, day in final_schedule.items():
        sessions = sorted(day["sessions"], key=lambda s: s.get("startTime", "00:00"))
        for i in range(1, len(sessions)):
            prev, curr = sessions[i - 1], sessions[i]
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
            day["cognitive_load"] = cognitive_load_score(total_hrs)

    schedule_list = sorted(final_schedule.values(), key=lambda d: d["date"])

    # Verify minute totals
    for t, exp in expected_totals.items():
        act = sum(
            s["duration"]
            for day in schedule_list
            for s in day["sessions"]
            if s["taskTitle"] == t
        )
        print(f"[gen_plan] {'ok' if act == exp else 'MISMATCH'} {t}: {act}min / {exp}min")

    return schedule_list


# ── Reschedule ───────────────────────────────────────────────────────────────

@ai_bp.route("/reschedule", methods=["POST"])
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

    # Get next available days (up to 5)
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

    # Group missed sessions by task
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

    # Use AI distribution or fall back to even split
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
        weights = {d: 1.0 / len(day_dates) for d in day_dates}
        print("[reschedule] Using even distribution")

    # Distribute each task's minutes using weights
    updated_days = {}
    for title, info in missed_by_task.items():
        task_total = info["minutes"]
        allocated = 0
        sorted_dates = sorted(weights.keys())
        for i, date in enumerate(sorted_dates):
            if date not in day_dates:
                continue
            if i == len(sorted_dates) - 1:
                dur = task_total - allocated
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

            updated_days[date]["sessions"].append({
                "taskTitle": title,
                "startTime": f"{start_hour:02d}:00",
                "duration": dur,
                "type": "study",
                "topic": info.get("topic"),
            })

    # Recalculate cognitive load for updated days
    for day in updated_days.values():
        total_hrs = sum(s.get("duration", 0) for s in day["sessions"]) / 60
        day["cognitive_load"] = cognitive_load_score(total_hrs)

    print(f"[reschedule] {total_missed}min redistributed across {len(updated_days)} days — {reasoning}")

    return jsonify(
        updated_days=list(updated_days.values()),
        message=reasoning,
    )


# ── Chat ─────────────────────────────────────────────────────────────────────

@ai_bp.route("/chat", methods=["POST"])
@need_auth
def ai_chat():
    data = request.get_json()
    message = data.get("message", "")
    history = data.get("history", [])
    context = data.get("context", {})
    system = CHAT_SYSTEM_TEMPLATE.format(
        today=datetime.date.today().isoformat(),
        events=context.get("events", "None"),
        deadlines=context.get("deadlines", "None"),
        schedule_summary=context.get("scheduleSummary", "None"),
        constraints=context.get("constraints", "None"),
    )
    conv = "\n".join(
        f"{'Student' if m['role'] == 'user' else 'Coach'}: {m['content']}"
        for m in history
    )
    conv += f"\nStudent: {message}"
    result = ai_call(system, conv, model="gemini-2.5-flash", max_tokens=4000, json_mode=False)
    if not result:
        return jsonify(error="AI unavailable."), 503

    # Split on the SUGGESTIONS delimiter
    suggestions = []
    if "SUGGESTIONS:" in result:
        parts = result.rsplit("SUGGESTIONS:", 1)
        response_text = parts[0].strip()
        suggestions = [s.strip() for s in parts[1].split("|") if s.strip()][:3]
    else:
        response_text = result.strip()

    return jsonify(response=response_text, suggestions=suggestions)
