// ═══ DATE / TIME FORMATTERS ═══
export const fmtMin = m => {
  const h = Math.floor(m / 60), mn = m % 60;
  return h === 0 ? `${mn}m` : mn === 0 ? `${h}h` : `${h}h ${mn}m`;
};

export const fmtDateShort = d => {
  if (!d) return '';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return d; }
};

export const toDateStr = dt =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

export const todayStr = () => toDateStr(new Date());

export const fmtTime = iso => {
  if (!iso || !iso.includes('T')) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// ═══ SCHEDULE HELPERS ═══

/**
 * Filters out zero-duration sessions, enforces 15-min gaps between sessions,
 * and clears blocked days.
 */
export function cleanScheduleData(rawSchedule, blockedDayNames) {
  return (rawSchedule || []).map(day => {
    const dn = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    if (blockedDayNames.includes(dn)) return { ...day, sessions: [], cognitive_load: 0 };
    const filtered = (day.sessions || []).filter(s => s.duration && s.duration > 0 && s.startTime);
    if (filtered.length <= 1) return { ...day, sessions: filtered };
    const sorted = [...filtered].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1], curr = sorted[i];
      if (!prev.startTime || !curr.startTime || !prev.duration) continue;
      const [ph, pm] = prev.startTime.split(':').map(Number);
      const prevEnd = ph * 60 + pm + prev.duration;
      const [ch, cm] = curr.startTime.split(':').map(Number);
      if (ch * 60 + cm < prevEnd + 15) {
        const ns = prevEnd + 15;
        const nh = Math.floor(ns / 60);
        const nm = ns % 60;
        if (nh < 22) curr.startTime = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
      }
    }
    return { ...day, sessions: sorted };
  });
}
