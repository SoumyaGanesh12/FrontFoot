import { useState, useEffect, useCallback } from 'react';
import api from './api.js';
import { C, heading, globalCSS } from './theme.js';
import { toDateStr, todayStr, fmtMin, fmtDateShort, fmtTime, cleanScheduleData } from './utils.js';

import Logo from './components/Logo.jsx';
import Spinner from './components/Spinner.jsx';
import Badge from './components/Badge.jsx';
import DiffDots from './components/DiffDots.jsx';
import InsightCard from './components/InsightCard.jsx';
import AddDeadlineModal from './components/AddDeadlineModal.jsx';
import ConstraintsPanel from './components/ConstraintsPanel.jsx';
import HeatmapCalendar from './components/HeatmapCalendar.jsx';
import AIChat from './components/AIChat.jsx';

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [view, setView] = useState('dashboard');
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [insights, setInsights] = useState([]);
  const [constraints, setConstraints] = useState({ blockedDays: [], maxHours: 10, notes: '', timeBlocks: [] });
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [scheduleStale, setScheduleStale] = useState(false);

  useEffect(() => {
    api.checkAuth().then(d => setAuthed(d.authenticated)).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (authed) loadCalendar();
  }, [authed]);

  const loadCalendar = useCallback(async () => {
    try {
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate() - 28); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setDate(now.getDate() + 56); end.setHours(23, 59, 59);
      const [calData, evtData] = await Promise.all([
        api.getCalendars(),
        api.getEvents(start.toISOString().split('.')[0], end.toISOString().split('.')[0]),
      ]);
      setCalendars(calData.calendars || []);
      setCalendarEvents(evtData.events || []);
    } catch (e) { console.error(e); }
  }, []);

  const loadTestData = () => {
    const td = new Date();
    const addD = n => { const d = new Date(td); d.setDate(d.getDate() + n); return toDateStr(d); };

    // 2 academic tasks: one urgent (forces a danger day), one relaxed (produces light days)
    setDeadlines([
      { id: 1, title: 'CS301 Midterm',      course: 'CS301',    type: 'exam',       dueDate: addD(1), difficulty: 5, estimatedMinutes: 360, topics: 'Graph Algorithms, Dynamic Programming, Sorting', isEvent: false, done: false },
      { id: 2, title: 'HIST201 Essay Draft', course: 'HIST201',  type: 'assignment', dueDate: addD(7), difficulty: 3, estimatedMinutes: 150, topics: null, isEvent: false, done: false },
      { id: 3, title: "Mom's Birthday Dinner", course: 'Personal', type: 'event',    dueDate: addD(5), difficulty: 0, estimatedMinutes: 0,   eventTime: '18:00', eventEnd: '21:00', isEvent: true, done: false },
    ]);

    // 2–3 calendar events visible on the heatmap
    const demoEvents = [
      { summary: 'CS301 Lecture',        start: addD(1) + 'T09:00:00', end: addD(1) + 'T10:30:00', calendarColor: '#7C5CFC', calendarName: 'University' },
      { summary: 'Study Group – HIST201', start: addD(4) + 'T14:00:00', end: addD(4) + 'T15:30:00', calendarColor: '#F59E0B', calendarName: 'University' },
      { summary: 'Soccer Practice',       start: addD(3) + 'T17:00:00', end: addD(3) + 'T18:30:00', calendarColor: '#2D9F6F', calendarName: 'Personal' },
    ];
    setCalendarEvents(prev => [...demoEvents, ...prev.filter(e => !demoEvents.some(d => d.summary === e.summary))]);

    setConstraints({ blockedDays: ['Sunday'], maxHours: 10, notes: 'CS301 is the priority this week', timeBlocks: [{ id: 101, label: 'Gym', day: 'Wednesday', startTime: '18:00', endTime: '20:00' }] });
    if (schedule.length > 0) setScheduleStale(true);
  };

  const addDeadline = d => {
    const conflicts = [];
    if (d.isEvent && d.dueDate && d.eventTime) {
      calendarEvents.forEach(ev => {
        const ed = ev.start.includes('T') ? ev.start.split('T')[0] : ev.start;
        if (ed === d.dueDate) {
          const et = ev.start.includes('T') ? ev.start.split('T')[1].slice(0, 5) : null;
          const ee = ev.end?.includes('T') ? ev.end.split('T')[1].slice(0, 5) : null;
          if (et && d.eventTime && d.eventEnd && d.eventTime < (ee || '23:59') && (d.eventEnd || '23:59') > et)
            conflicts.push(`"${d.title}" overlaps with "${ev.summary}"`);
        }
      });
      deadlines.forEach(ex => {
        if (ex.isEvent && ex.dueDate === d.dueDate && ex.eventTime && d.eventTime < (ex.eventEnd || '23:59') && (d.eventEnd || '23:59') > ex.eventTime)
          conflicts.push(`"${d.title}" overlaps with "${ex.title}"`);
      });
    }
    if (conflicts.length > 0 && !window.confirm(`⚠️ Conflicts:\n\n${conflicts.join('\n')}\n\nAdd anyway?`)) return;
    setDeadlines(prev => [...prev, d]);
    if (schedule.length > 0) setScheduleStale(true);
  };

  const removeDeadline = id => {
    setDeadlines(prev => prev.filter(d => d.id !== id));
    if (schedule.length > 0) setScheduleStale(true);
  };

  const courses = [...new Set(deadlines.map(d => d.course).filter(Boolean))];

  const handleGenerate = async () => {
    const tasks = deadlines.filter(d => !d.isEvent);
    if (tasks.length === 0) { alert('Add at least one academic task.'); return; }
    setLoading(true); setLoadingMsg('AI is analyzing your schedule...');
    try {
      const events = deadlines.filter(d => d.isEvent);
      const allEv = [
        ...calendarEvents,
        ...events.map(e => ({ summary: e.title, start: e.dueDate + (e.eventTime ? 'T' + e.eventTime : ''), end: e.dueDate + (e.eventEnd ? 'T' + e.eventEnd : ''), calendarName: e.course })),
      ];
      const res = await api.generateSchedule(tasks, constraints, allEv);
      if (res.error) {
        alert(res.error);
      } else {
        const cleaned = cleanScheduleData(res.schedule || [], constraints.blockedDays);
        setSchedule(cleaned);
        setInsights(res.insights || []);
        setScheduleStale(false);
        if (res.warnings?.length) setInsights(prev => [...res.warnings.map(w => ({ type: 'danger', message: w })), ...prev]);
        setView('heatmap');
      }
    } catch (e) { alert('Failed: ' + e.message); }
    setLoading(false);
  };

  const handleSlackOff = async (date) => {
    const day = schedule.find(d => d.date === date);
    if (!day?.sessions?.length) return;
    setLoading(true); setLoadingMsg('Redistributing your work...');
    try {
      const res = await api.reschedule(date, day.sessions, schedule, constraints, calendarEvents);
      if (res.error) {
        alert(res.error);
      } else if (res.updated_days) {
        setSchedule(prev => prev.map(d => {
          if (d.date === date) return { ...d, sessions: [], cognitive_load: 0 };
          const upd = res.updated_days.find(u => u.date === d.date);
          return upd || d;
        }));
      }
    } catch (e) { alert('Failed: ' + e.message); }
    setLoading(false);
  };

  const totalMin = deadlines.filter(d => !d.isEvent).reduce((a, d) => a + d.estimatedMinutes, 0);
  const highLoad = schedule.filter(d => (d.cognitive_load || 0) >= 7).length;
  const avgLoad = schedule.length
    ? (schedule.reduce((a, d) => a + (d.cognitive_load || 0), 0) / (schedule.filter(d => d.cognitive_load > 0).length || 1)).toFixed(1)
    : '0';

  // ── Loading / auth screens ────────────────────────────────────────────────

  if (authed === null) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <style>{globalCSS}</style>
      <Spinner text="Connecting..." />
    </div>
  );

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.text, overflow: 'hidden', position: 'relative', padding: '40px 24px' }}>
      <style>{globalCSS}</style>

      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: -100, left: -100, width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${C.accentLight} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${C.roseLight} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '45%', right: '15%', width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.yellowLight} 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Centred two-panel container */}
      <div style={{ display: 'flex', gap: 48, maxWidth: 900, width: '100%', alignItems: 'center', position: 'relative', zIndex: 1 }}>

        {/* Left — branding */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <Logo size={38} />
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: heading }}>Load<span style={{ color: C.accent }}>Lens</span></span>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, fontFamily: heading }}>
            See your semester<br />
            <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>before it hits you.</span>
          </h1>
          <p style={{ color: C.text2, fontSize: 15, lineHeight: 1.7, marginBottom: 36 }}>
            Connect your calendar, add your deadlines, and get a clear picture of your week - so you always have energy when it counts.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '📅', label: 'Syncs with Google Calendar',   color: C.accentLight, border: C.purpleBorder,     text: C.accent },
              { icon: '⚡', label: 'AI-powered study scheduling',  color: C.yellowLight,  border: C.yellowBorder,     text: C.yellow },
              { icon: '✦',  label: 'Personal study coach built-in', color: C.roseLight,   border: `${C.rose}50`,      text: C.rose   },
            ].map((f, i) => (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12, background: f.color, border: `1px solid ${f.border}`, width: 'fit-content', animation: `slideUp .4s ease ${i * .1}s both` }}>
                <span style={{ fontSize: 15 }}>{f.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: f.text }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — sign-in card */}
        <div style={{ width: 380, flexShrink: 0 }}>
          <div style={{ background: C.surface, borderRadius: 24, padding: '38px 34px', boxShadow: '0 20px 60px rgba(124,92,252,.10), 0 4px 20px rgba(0,0,0,.06)', border: `1px solid ${C.border}` }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, boxShadow: `0 8px 24px rgba(124,92,252,.25)` }}>
              <Logo size={34} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: heading, marginBottom: 6, color: C.text }}>Welcome back</h2>
            <p style={{ color: C.text2, fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>Sign in to view your personalised study plan and energy map.</p>

            <a
              href={api.loginUrl()}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderRadius: 13, background: C.surface, color: C.text, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: `1.5px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,.06)', transition: 'all .2s', marginBottom: 18 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.boxShadow = `0 4px 16px rgba(124,92,252,.15)`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Continue with Google
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 11, color: C.text3 }}>New here?</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <div style={{ padding: '13px 15px', borderRadius: 12, background: `linear-gradient(135deg, ${C.accentLight}, ${C.roseLight})`, border: `1px solid ${C.purpleBorder}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 4 }}>✦ Explore with sample data</div>
              <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>Sign in, then hit <strong>Demo</strong> in the top bar to load a sample schedule and explore the app instantly.</div>
            </div>

            <p style={{ color: C.text3, fontSize: 11, marginTop: 18, textAlign: 'center', lineHeight: 1.6 }}>Read-only calendar access · Your data stays private</p>
          </div>
        </div>

      </div>
    </div>
  );

  // ── Main app shell ────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, overflow: 'hidden' }}>
      <style>{globalCSS}</style>
      {addOpen && <AddDeadlineModal onClose={() => setAddOpen(false)} onAdd={addDeadline} courses={courses} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={34} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: heading }}>Load<span style={{ color: C.accent }}>Lens</span></div>
              <div style={{ fontSize: 10, color: C.text3 }}>{calendars.length} cal · {calendarEvents.length} events · {deadlines.length} deadline{deadlines.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={loadTestData} style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px dashed ${C.yellowBorder}`, background: C.yellowLight, color: C.yellow, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Demo</button>
            <button onClick={() => setAddOpen(true)} style={{ padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Add</button>
            {deadlines.length > 0 && <button onClick={() => setChatOpen(!chatOpen)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: chatOpen ? C.purple : C.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{chatOpen ? '× Close' : '✦ Coach'}</button>}
            <button onClick={async () => { await api.logout(); setAuthed(false); }} style={{ padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text3, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Logout</button>
          </div>
        </header>

        {/* Nav */}
        <nav style={{ display: 'flex', padding: '0 20px', borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
          {[{ k: 'dashboard', l: 'Dashboard' }, { k: 'heatmap', l: 'Energy Map' }, { k: 'tasks', l: 'Deadlines' }].map(t => (
            <button key={t.k} onClick={() => setView(t.k)} style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', color: view === t.k ? C.accent : C.text2, borderBottom: view === t.k ? `2px solid ${C.accent}` : '2px solid transparent' }}>{t.l}</button>
          ))}
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          {loading ? <Spinner text={loadingMsg} /> : (
            <div style={{ animation: 'fadeIn .2s' }}>

              {/* ── DASHBOARD ── */}
              {view === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Stats cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    {[
                      { l: 'Tasks',       v: String(deadlines.filter(d => !d.isEvent).length), s: fmtMin(totalMin) + ' effort', c: C.accent },
                      { l: 'Events',      v: String(calendarEvents.length + deadlines.filter(d => d.isEvent).length), s: 'calendar + custom', c: C.rose },
                      { l: 'Danger Days', v: String(highLoad), s: 'load ≥ 7/10', c: highLoad > 0 ? C.red : C.green },
                      { l: 'Avg Load',    v: avgLoad, s: 'per study day', c: parseFloat(avgLoad) > 6 ? C.red : C.green },
                    ].map((s, i) => (
                      <div key={i} style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${s.c}`, animation: `slideUp .3s ease ${i * .06}s both` }}>
                        <div style={{ fontSize: 11, color: C.text3, fontWeight: 500, marginBottom: 6 }}>{s.l}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: s.c, fontFamily: heading }}>{s.v}</div>
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>{s.s}</div>
                      </div>
                    ))}
                  </div>

                  {/* Course chips */}
                  {courses.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {courses.map((c, i) => {
                        const cols = [C.accent, C.purple, C.green, C.orange, C.yellow, C.red];
                        const col = cols[i % cols.length];
                        return <span key={c} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: col + '10', color: col, border: `1px solid ${col}20` }}>{c}</span>;
                      })}
                    </div>
                  )}

                  {/* Upcoming calendar events */}
                  {calendarEvents.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Upcoming Events</div>
                      {calendarEvents.filter(e => e.start >= todayStr()).slice(0, 5).map((ev, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 4 }}>
                          <div style={{ width: 3, height: 20, borderRadius: 2, background: ev.calendarColor || C.accent, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{ev.summary}</div>
                            <div style={{ fontSize: 11, color: C.text2 }}>{fmtDateShort(ev.start.split('T')[0])} · {fmtTime(ev.start)}{ev.location ? ` · ${ev.location}` : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state CTA */}
                  {deadlines.length === 0 && (
                    <button onClick={() => setAddOpen(true)} style={{ padding: 24, borderRadius: 16, border: `2px dashed ${C.purpleBorder}`, background: `linear-gradient(135deg, ${C.accentLight}, ${C.roseLight})`, color: C.text, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16, animation: 'float 3s ease infinite' }}>
                      <div style={{ fontSize: 36, animation: 'float 2s ease infinite' }}>📌</div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: heading }}>Add your first deadline</div>
                        <div style={{ fontSize: 13, color: C.text2, marginTop: 4, lineHeight: 1.5 }}>Exams, assignments, birthday parties — anything that takes your time or energy. We'll help you see the big picture.</div>
                      </div>
                    </button>
                  )}

                  <ConstraintsPanel constraints={constraints} setConstraints={setConstraints} />

                  {/* AI insights */}
                  {insights.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>AI Insights</div>
                      {insights.map((ins, i) => <InsightCard key={i} type={ins.type} msg={ins.message} />)}
                    </div>
                  )}

                  {/* Deadline list + generate */}
                  {deadlines.length > 0 && (
                    <>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Your deadlines & events</div>
                        {deadlines.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 5 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                                <Badge type={t.isEvent ? 'event' : t.type} />
                                <span style={{ fontSize: 11, color: C.text2 }}>{t.course}</span>
                                <span style={{ fontSize: 11, color: C.red, fontWeight: 500 }}>{fmtDateShort(t.dueDate)}</span>
                                {!t.isEvent && <span style={{ fontSize: 11, color: C.text3 }}>~{fmtMin(t.estimatedMinutes)}</span>}
                                {!t.isEvent && <DiffDots n={t.difficulty} />}
                                {t.topics && <span style={{ fontSize: 10, color: C.purple }}>📝</span>}
                              </div>
                            </div>
                            <button onClick={() => removeDeadline(t.id)} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 16, cursor: 'pointer' }}>×</button>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleGenerate} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,92,252,.2)', transition: 'all .15s' }}>
                        Generate My Energy Map →
                      </button>
                    </>
                  )}

                  {/* Open coach CTA */}
                  {!chatOpen && deadlines.length > 0 && (
                    <button onClick={() => setChatOpen(true)} style={{ padding: '14px 16px', borderRadius: 12, border: `1px solid ${C.purpleBorder}`, background: `linear-gradient(135deg, ${C.accentLight}, ${C.roseLight})`, color: C.text, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', flexShrink: 0 }}>✦</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Ask Study Coach</div>
                        <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>Personalized advice powered by Gemini AI</div>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* ── HEATMAP ── */}
              {view === 'heatmap' && (
                <div>
                  {schedule.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                      <div style={{ fontSize: 48, marginBottom: 16, animation: 'float 3s ease infinite' }}>📅</div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: heading }}>No schedule yet</div>
                      <div style={{ fontSize: 14, color: C.text2, marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>Add deadlines and hit generate to see your energy map come to life.</div>
                      <button onClick={() => setView('dashboard')} style={{ padding: '11px 28px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,92,252,.2)' }}>Go to Dashboard</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                        {[
                          { l: 'Sessions',  v: String(schedule.reduce((a, d) => a + (d.sessions?.length || 0), 0)), s: 'planned', c: C.accent },
                          { l: 'Avg Load',  v: avgLoad, s: 'per day', c: parseFloat(avgLoad) > 6 ? C.red : C.green },
                          { l: 'Danger Days', v: String(highLoad), s: 'load ≥ 7', c: C.red },
                          { l: 'Blocked',   v: String(constraints.blockedDays.length + (constraints.timeBlocks || []).length), s: 'days + slots', c: C.yellow },
                        ].map((s, i) => (
                          <div key={i} style={{ padding: 12, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 11, color: C.text3, fontWeight: 500 }}>{s.l}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
                            <div style={{ fontSize: 11, color: C.text2 }}>{s.s}</div>
                          </div>
                        ))}
                      </div>
                      {scheduleStale && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: C.yellowLight, border: `1px solid ${C.yellowBorder}`, marginBottom: 12 }}>
                          <span style={{ fontSize: 13, color: C.yellow }}>⚠ Deadlines changed. Schedule may be outdated.</span>
                          <button onClick={handleGenerate} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Regenerate</button>
                        </div>
                      )}
                      <HeatmapCalendar schedule={schedule} deadlines={deadlines} calendarEvents={calendarEvents} constraints={constraints} selectedDate={selectedDate} onSelectDate={setSelectedDate} onSlackOff={handleSlackOff} />
                    </>
                  )}
                </div>
              )}

              {/* ── TASKS ── */}
              {view === 'tasks' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>All Deadlines & Events</h2>
                    <button onClick={() => setAddOpen(true)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add</button>
                  </div>
                  {deadlines.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 50 }}>
                      <div style={{ fontSize: 40, marginBottom: 14 }}>📌</div>
                      <div style={{ fontSize: 17, fontWeight: 600 }}>Nothing added yet</div>
                    </div>
                  ) : deadlines.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 5 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{t.title}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                          <Badge type={t.isEvent ? 'event' : t.type} />
                          <span style={{ fontSize: 11, color: C.text2 }}>{t.course}</span>
                          <span style={{ fontSize: 11, color: C.red, fontWeight: 500 }}>{fmtDateShort(t.dueDate)}</span>
                          {!t.isEvent && <span style={{ fontSize: 11, color: C.text3 }}>~{fmtMin(t.estimatedMinutes)}</span>}
                          {!t.isEvent && <DiffDots n={t.difficulty} />}
                          {t.topics && <span style={{ fontSize: 10, color: C.purple, background: C.purpleLight, padding: '2px 8px', borderRadius: 4 }}>📝 {t.topics.split(',').length} topics</span>}
                        </div>
                      </div>
                      <button onClick={() => removeDeadline(t.id)} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 16, cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* AI Chat sidebar */}
      {chatOpen && (
        <div style={{ width: 380, flexShrink: 0, animation: 'slideLeft .25s', display: 'flex', flexDirection: 'column' }}>
          <AIChat deadlines={deadlines} schedule={schedule} constraints={constraints} calendarEvents={calendarEvents} onClose={() => setChatOpen(false)} messages={chatMessages} setMessages={setChatMessages} />
        </div>
      )}
    </div>
  );
}
