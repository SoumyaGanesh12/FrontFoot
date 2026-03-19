"""
Google Calendar routes: list calendars and fetch events.
"""

from flask import Blueprint, request, jsonify
from googleapiclient.discovery import build

from routes.auth import need_auth, creds

calendar_bp = Blueprint("calendar", __name__, url_prefix="/api")


def cal_svc():
    """Build an authenticated Google Calendar service, or None if not authed."""
    c = creds()
    return build("calendar", "v3", credentials=c) if c else None


@calendar_bp.route("/calendars")
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


@calendar_bp.route("/events")
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
