/** Cognitive Scaffold — API Client */
const API = '/api';
const AUTH = '/auth';

const api = {
  // ── Auth ──
  checkAuth: () =>
    fetch(`${AUTH}/status`, { credentials: 'include' }).then(r => r.json()),

  loginUrl: () => `${AUTH}/login`,

  logout: () =>
    fetch(`${AUTH}/logout`, { method: 'POST', credentials: 'include' }).then(r => r.json()),

  // ── Calendar ──
  getCalendars: () =>
    fetch(`${API}/calendars`, { credentials: 'include' }).then(r => r.json()),

  getEvents: (timeMin, timeMax, tz = 'America/New_York') =>
    fetch(
      `${API}/events?${new URLSearchParams({ timeMin, timeMax, timeZone: tz })}`,
      { credentials: 'include' }
    ).then(r => r.json()),

  // ── AI: Schedule Generation ──
  generateSchedule: (deadlines, constraints, calendarEvents) => {
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return fetch(`${API}/ai/generate-schedule`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deadlines,
        constraints,
        calendarEvents,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        todayDate: localToday,
      }),
    }).then(r => r.json());
  },

  // ── AI: Reschedule ("I Slacked Off") ──
  reschedule: (missedDate, missedSessions, currentSchedule, constraints, calendarEvents) =>
    fetch(`${API}/ai/reschedule`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        missedDate,
        missedSessions,
        currentSchedule,
        constraints,
        calendarEvents,
      }),
    }).then(r => r.json()),

  // ── AI: Chat ──
  chat: (message, history, context) =>
    fetch(`${API}/ai/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, context }),
    }).then(r => r.json()),
};

export default api;