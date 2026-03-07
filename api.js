/** StudyFlow API Client — talks to Flask backend */
const API = '/api', AUTH = '/auth';

export default {
  // Auth
  checkAuth: () => fetch(`${AUTH}/status`, { credentials: 'include' }).then(r => r.json()),
  loginUrl: () => `${AUTH}/login`,
  logout: () => fetch(`${AUTH}/logout`, { method: 'POST', credentials: 'include' }).then(r => r.json()),

  // Calendar
  getCalendars: () => fetch(`${API}/calendars`, { credentials: 'include' }).then(r => r.json()),
  getEvents: (timeMin, timeMax, tz = 'America/New_York') =>
    fetch(`${API}/events?${new URLSearchParams({ timeMin, timeMax, timeZone: tz })}`, { credentials: 'include' }).then(r => r.json()),

  // Upload
  uploadFile: (file, type) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    return fetch(`${API}/upload`, { method: 'POST', credentials: 'include', body: fd }).then(r => r.json());
  },
  getUploads: () => fetch(`${API}/uploads`, { credentials: 'include' }).then(r => r.json()),

  // AI Chat
  chat: (message, history = []) =>
    fetch(`${API}/ai/chat`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    }).then(r => r.json()),

  // Plan Generation
  generatePlan: (tasks = []) =>
    fetch(`${API}/generate-plan`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    }).then(r => r.json()),
};
