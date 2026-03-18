import { useState, useEffect, useRef, useCallback } from 'react';
import api from './api.js';

// ═══ LOGO ═══
const Logo = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="lg1" x1="0" y1="0" x2="40" y2="40">
        <stop offset="0%" stopColor="#7C5CFC" />
        <stop offset="100%" stopColor="#C47A8A" />
      </linearGradient>
      <linearGradient id="lg2" x1="0" y1="0" x2="40" y2="40">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill="url(#lg1)" />
    {/* Lens shape */}
    <circle cx="18" cy="18" r="9" stroke="url(#lg2)" strokeWidth="2.5" fill="none" />
    <line x1="24.5" y1="24.5" x2="31" y2="31" stroke="url(#lg2)" strokeWidth="2.5" strokeLinecap="round" />
    {/* Mini bar chart inside lens */}
    <rect x="13" y="19" width="3" height="4" rx="1" fill="#fff" opacity="0.7" />
    <rect x="17" y="15" width="3" height="8" rx="1" fill="#fff" opacity="0.85" />
    <rect x="21" y="17" width="3" height="6" rx="1" fill="#fff" opacity="0.7" />
  </svg>
);

// ═══ LIGHT THEME ═══
const C = {
  bg: '#F8F6F2',          // warm cream
  surface: '#FFFFFF',      // cards
  surface2: '#F0EDE8',     // secondary surfaces, inputs
  border: '#E2DDD5',       // warm gray borders
  text: '#2D2A26',         // warm near-black
  text2: '#78736B',        // muted warm gray
  text3: '#B0AAA0',        // hint text
  accent: '#7C5CFC',       // vibrant purple — primary action
  accentLight: '#F0ECFF',  // purple tint
  accentDark: '#5B3FD4',   // deep purple
  green: '#2D9F6F',        // soft sage green
  greenLight: '#EEF8F2',
  greenBorder: '#C2E5D1',
  yellow: '#C49A2A',       // warm gold
  yellowLight: '#FDF8EC',
  yellowBorder: '#F0DFA0',
  red: '#D4513A',          // muted terracotta
  redLight: '#FDF0ED',
  redBorder: '#F5C9BF',
  purple: '#7C5CFC',       // matches accent
  purpleLight: '#F0ECFF',
  purpleBorder: '#D4C9FF',
  orange: '#D98A3B',       // warm amber
  orangeLight: '#FFF6EC',
  orangeBorder: '#F5D9AD',
  rose: '#C47A8A',         // muted rose for special accents
  roseLight: '#FDF2F4',
};
const font = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const heading = "'Fraunces', Georgia, serif";

// ═══ UTILS ═══
const fmtMin = m => { const h = Math.floor(m / 60), mn = m % 60; return h === 0 ? `${mn}m` : mn === 0 ? `${h}h` : `${h}h ${mn}m`; };
const fmtDateShort = d => { if (!d) return ''; try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return d; } };
const toDateStr = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
const todayStr = () => toDateStr(new Date());
const fmtTime = iso => { if (!iso || !iso.includes('T')) return ''; return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); };

const labelSt = { fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 5, display: 'block' };
const inputSt = { width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, outline: 'none', fontFamily: font, boxSizing: 'border-box', transition: 'border-color .15s' };

// ═══ MARKDOWN RENDERER ═══
function RenderMD({ text }) {
  if (!text) return null;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    {text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
      if (line.startsWith('### ')) return <div key={i} style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{ib(line.slice(4))}</div>;
      if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{ib(line.slice(3))}</div>;
      if (line.match(/^[\-\*]\s/)) return <div key={i} style={{ paddingLeft: 14, position: 'relative' }}><span style={{ position: 'absolute', left: 2, color: C.accent }}>•</span>{ib(line.slice(2))}</div>;
      const num = line.match(/^(\d+)\.\s/);
      if (num) return <div key={i} style={{ paddingLeft: 18, position: 'relative' }}><span style={{ position: 'absolute', left: 0, color: C.accent, fontWeight: 600, fontSize: 12 }}>{num[1]}.</span>{ib(line.slice(num[0].length))}</div>;
      return <div key={i}>{ib(line)}</div>;
    })}
  </div>;
}
function ib(text) {
  const parts = []; let rem = text, k = 0;
  while (rem.length > 0) { const m = rem.match(/\*\*(.*?)\*\*/); if (m) { const idx = rem.indexOf(m[0]); if (idx > 0) parts.push(<span key={k++}>{rem.slice(0,idx)}</span>); parts.push(<strong key={k++} style={{ fontWeight: 600 }}>{m[1]}</strong>); rem = rem.slice(idx + m[0].length); } else { parts.push(<span key={k++}>{rem}</span>); break; } }
  return parts;
}

// ═══ SMALL COMPONENTS ═══
const Badge = ({ type }) => {
  const m = { reading:{bg:C.accentLight,c:C.accent,l:'Read'}, assignment:{bg:C.orangeLight,c:C.orange,l:'HW'}, exam:{bg:C.redLight,c:C.red,l:'Exam'}, quiz:{bg:C.yellowLight,c:C.yellow,l:'Quiz'}, project:{bg:C.purpleLight,c:C.purple,l:'Proj'}, review:{bg:C.purpleLight,c:C.purple,l:'Rev'}, event:{bg:C.greenLight,c:C.green,l:'Event'}, other:{bg:C.surface2,c:C.text2,l:'Other'} };
  const s = m[type] || m.other;
  return <span style={{ fontSize: 10, fontWeight: 600, background: s.bg, color: s.c, padding: '2px 8px', borderRadius: 6 }}>{s.l}</span>;
};

const DiffDots = ({ n }) => <div style={{ display: 'flex', gap: 2 }}>{[1,2,3,4,5].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= n ? (n >= 4 ? C.red : n >= 3 ? C.yellow : C.green) : C.border }} />)}</div>;

const Spinner = ({ text }) => <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}><div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRightColor: C.rose, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /><div style={{ color: C.text2, fontSize: 14, fontWeight: 500, animation: 'pulse 2s ease infinite' }}>{text}</div></div>;

const InsightCard = ({ type, msg }) => {
  const s = { danger:{bg:C.redLight,bd:C.redBorder,ic:'⚠️'}, warn:{bg:C.yellowLight,bd:C.yellowBorder,ic:'⚡'}, tip:{bg:C.greenLight,bd:C.greenBorder,ic:'💡'}, info:{bg:C.accentLight,bd:'#BFDBFE',ic:'📊'} }[type] || { bg:C.accentLight, bd:'#BFDBFE', ic:'📊' };
  return <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.6, color: C.text, background: s.bg, border: `1px solid ${s.bd}`, display: 'flex', gap: 8, alignItems: 'flex-start' }}><span style={{ fontSize: 14, flexShrink: 0 }}>{s.ic}</span><span>{msg}</span></div>;
};

// ═══ CLEAN SCHEDULE DATA ═══
function cleanScheduleData(rawSchedule, blockedDayNames) {
  return (rawSchedule || []).map(day => {
    const dn = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    if (blockedDayNames.includes(dn)) return { ...day, sessions: [], cognitive_load: 0 };
    const filtered = (day.sessions || []).filter(s => s.duration && s.duration > 0 && s.startTime);
    if (filtered.length <= 1) return { ...day, sessions: filtered };
    const sorted = [...filtered].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i-1], curr = sorted[i];
      if (!prev.startTime || !curr.startTime || !prev.duration) continue;
      const [ph, pm] = prev.startTime.split(':').map(Number);
      const prevEnd = ph * 60 + pm + prev.duration;
      const [ch, cm] = curr.startTime.split(':').map(Number);
      if (ch * 60 + cm < prevEnd + 15) { const ns = prevEnd + 15; const nh = Math.floor(ns / 60); const nm = ns % 60; if (nh < 22) curr.startTime = `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`; }
    }
    return { ...day, sessions: sorted };
  });
}

// ═══ ADD DEADLINE MODAL ═══
function AddDeadlineModal({ onClose, onAdd, courses }) {
  const [mode, setMode] = useState(null);
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState(courses[0] || '');
  const [newCourse, setNewCourse] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [type, setType] = useState('assignment');
  const [difficulty, setDifficulty] = useState(3);
  const [estHours, setEstHours] = useState(2);
  const [topics, setTopics] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');

  const submit = () => {
    if (!title.trim() || (!dueDate && !eventStart)) return;
    if (mode === 'event') {
      onAdd({ id: Date.now(), title: title.trim(), course: newCourse.trim() || course || 'Personal', dueDate: eventStart, type: 'event', difficulty: 0, estimatedMinutes: 0, eventTime: dueTime || null, eventEnd: eventEnd || null, isEvent: true, done: false });
    } else {
      onAdd({ id: Date.now(), title: title.trim(), course: newCourse.trim() || course || 'General', dueDate, type, difficulty, estimatedMinutes: Math.round(estHours * 60), topics: topics.trim() || null, isEvent: false, done: false });
    }
    onClose();
  };
  const types = ['assignment','exam','quiz','project','reading','review'];

  if (mode === null) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.15)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: 440, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>What are you adding?</h2>
          <p style={{ color: C.text2, fontSize: 13, marginTop: 4, marginBottom: 20 }}>This helps us schedule it correctly.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[{m:'task',icon:'📚',t:'Academic task',d:'Exam, assignment, project — needs prep time'},{m:'event',icon:'📅',t:'Event / time block',d:'Birthday, doctor visit — fixed time on one day'}].map(x =>
              <button key={x.m} onClick={() => setMode(x.m)} style={{ flex: 1, padding: 18, borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.surface, cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }} onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.background = C.accentLight; }} onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.background = C.surface; }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{x.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{x.t}</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 4, lineHeight: 1.5 }}>{x.d}</div>
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ width: '100%', marginTop: 14, padding: 10, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.15)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: 500, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,.08)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setMode(null)} style={{ background: C.surface2, border: 'none', color: C.text2, fontSize: 14, cursor: 'pointer', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{mode === 'event' ? 'Add event' : 'Add academic task'}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelSt}>Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder={mode === 'event' ? "Mom's birthday dinner" : 'CS412 Midterm'} autoFocus style={inputSt} /></div>
          <div>
            <label style={labelSt}>{mode === 'event' ? 'Category' : 'Course'}</label>
            {courses.length > 0 && mode === 'task' ? (
              <><select value={course} onChange={e => { setCourse(e.target.value); setNewCourse(''); }} style={{ ...inputSt }}>{courses.map(c => <option key={c} value={c}>{c}</option>)}<option value="__new">+ New course</option></select>{course === '__new' && <input value={newCourse} onChange={e => setNewCourse(e.target.value)} placeholder="Course name" style={{ ...inputSt, marginTop: 6 }} />}</>
            ) : (<input value={newCourse} onChange={e => setNewCourse(e.target.value)} placeholder={mode === 'event' ? 'Personal, Social' : 'CS412, EC204'} style={inputSt} />)}
          </div>
          {mode === 'event' ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}><label style={labelSt}>Date</label><input type="date" value={eventStart} onChange={e => setEventStart(e.target.value)} style={inputSt} /></div>
              <div style={{ flex: 1 }}><label style={labelSt}>Start</label><input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} style={inputSt} /></div>
              <div style={{ flex: 1 }}><label style={labelSt}>End</label><input type="time" value={eventEnd} onChange={e => setEventEnd(e.target.value)} style={inputSt} /></div>
            </div>
          ) : (
            <>
              <div><label style={labelSt}>Type</label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{types.map(t => <button key={t} onClick={() => setType(t)} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${type === t ? C.accent : C.border}`, background: type === t ? C.accentLight : C.surface, color: type === t ? C.accent : C.text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize', transition: 'all .15s' }}>{t}</button>)}</div></div>
              <div><label style={labelSt}>Due date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputSt} /></div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}><label style={labelSt}>Difficulty</label><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="range" min={1} max={5} step={1} value={difficulty} onChange={e => setDifficulty(+e.target.value)} style={{ flex: 1, accentColor: C.accent }} /><span style={{ fontSize: 20, fontWeight: 700, color: difficulty >= 4 ? C.red : difficulty >= 3 ? C.yellow : C.green, minWidth: 22, textAlign: 'center' }}>{difficulty}</span></div></div>
                <div style={{ flex: 1 }}><label style={labelSt}>Effort</label><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="range" min={0.5} max={20} step={0.5} value={estHours} onChange={e => setEstHours(+e.target.value)} style={{ flex: 1, accentColor: C.accent }} /><span style={{ fontSize: 20, fontWeight: 700, color: C.accent, minWidth: 36 }}>{estHours}h</span></div></div>
              </div>
              {['exam','quiz','review'].includes(type) && <div><label style={labelSt}>Topics to cover (optional)</label><textarea value={topics} onChange={e => setTopics(e.target.value)} placeholder="Design Patterns, Inheritance, Polymorphism" style={{ ...inputSt, minHeight: 56, resize: 'vertical' }} /></div>}
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={!title.trim() || (!dueDate && !eventStart)} style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', background: (title.trim() && (dueDate || eventStart)) ? C.accent : C.border, color: '#fff', fontSize: 13, fontWeight: 600, cursor: (title.trim() && (dueDate || eventStart)) ? 'pointer' : 'default', transition: 'all .15s' }}>{mode === 'event' ? 'Add Event' : 'Add Task'}</button>
        </div>
      </div>
    </div>
  );
}

// ═══ CONSTRAINTS PANEL ═══
function ConstraintsPanel({ constraints, setConstraints }) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const toggle = d => setConstraints(c => ({ ...c, blockedDays: c.blockedDays.includes(d) ? c.blockedDays.filter(x => x !== d) : [...c.blockedDays, d] }));
  const addTB = () => setConstraints(c => ({ ...c, timeBlocks: [...(c.timeBlocks || []), { id: Date.now(), label: '', day: 'Monday', startTime: '17:00', endTime: '21:00' }] }));
  const updateTB = (id, f, v) => setConstraints(c => ({ ...c, timeBlocks: (c.timeBlocks || []).map(tb => tb.id === id ? { ...tb, [f]: v } : tb) }));
  const removeTB = id => setConstraints(c => ({ ...c, timeBlocks: (c.timeBlocks || []).filter(tb => tb.id !== id) }));

  return (
    <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 10 }}>Your constraints</div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>Days off:</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {days.map(d => { const bl = constraints.blockedDays.includes(d); return <button key={d} onClick={() => toggle(d)} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${bl ? C.red : C.border}`, background: bl ? C.redLight : C.surface, color: bl ? C.red : C.text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}>{bl ? '🚫 ' : ''}{d.slice(0, 3)}</button>; })}
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>Recurring busy times:</div>
      {(constraints.timeBlocks || []).map(tb => (
        <div key={tb.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <input value={tb.label} onChange={e => updateTB(tb.id, 'label', e.target.value)} placeholder="Work" style={{ width: 80, ...inputSt, padding: '6px 8px', fontSize: 12 }} />
          <select value={tb.day} onChange={e => updateTB(tb.id, 'day', e.target.value)} style={{ ...inputSt, padding: '6px 8px', fontSize: 12, width: 80 }}>{days.map(d => <option key={d} value={d}>{d.slice(0, 3)}</option>)}</select>
          <input type="time" value={tb.startTime} onChange={e => updateTB(tb.id, 'startTime', e.target.value)} style={{ ...inputSt, padding: '6px 8px', fontSize: 12, width: 100 }} />
          <span style={{ color: C.text3, fontSize: 11 }}>to</span>
          <input type="time" value={tb.endTime} onChange={e => updateTB(tb.id, 'endTime', e.target.value)} style={{ ...inputSt, padding: '6px 8px', fontSize: 12, width: 100 }} />
          <button onClick={() => removeTB(tb.id)} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
      ))}
      <button onClick={addTB} style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px dashed ${C.border}`, background: 'none', color: C.text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginBottom: 12 }}>+ Add busy time</button>
      <div style={{ fontSize: 11, color: C.text3, padding: '8px 10px', borderRadius: 8, background: C.surface2, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.green }}>●</span>Max 10h study/day to prevent burnout</div>
      <input value={constraints.notes} onChange={e => setConstraints(c => ({ ...c, notes: e.target.value }))} placeholder='Any notes for the AI scheduler' style={{ ...inputSt, marginTop: 10, fontSize: 12 }} />
    </div>
  );
}

// ═══ EFFORT SUMMARY ═══
function EffortSummary({ schedule, deadlines }) {
  const [exp, setExp] = useState(false);
  const tm = {}; (schedule || []).forEach(day => { (day.sessions || []).forEach(s => { const k = s.taskTitle || '?'; if (!tm[k]) tm[k] = { total: 0, sessions: [] }; tm[k].total += s.duration || 0; tm[k].sessions.push({ date: day.date, startTime: s.startTime, duration: s.duration, topic: s.topic }); }); });
  const names = Object.keys(tm);
  if (!names.length) return null;
  return (
    <div style={{ padding: 14, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 16 }}>
      <div onClick={() => setExp(!exp)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>Effort breakdown</span>
        <span style={{ fontSize: 13, color: C.text3 }}>{exp ? '▲' : '▼'}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {names.map(n => { const info = tm[n]; const dl = deadlines.find(d => d.title === n); const est = dl?.estimatedMinutes || 0; const diff = info.total - est; const dc = Math.abs(diff) <= 15 ? C.green : diff > 0 ? C.red : C.yellow; return (
          <div key={n} style={{ padding: '6px 10px', borderRadius: 8, background: C.surface2, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: C.text }}>{n.length > 22 ? n.slice(0, 22) + '…' : n}</span>
            <span style={{ color: C.text2 }}>{fmtMin(info.total)}</span>
            {est > 0 && <span style={{ color: dc, fontWeight: 700 }}>({Math.abs(diff) <= 15 ? '✓' : (diff > 0 ? '+' : '') + fmtMin(Math.abs(diff))})</span>}
          </div>
        ); })}
      </div>
      {exp && <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {names.map(n => { const info = tm[n]; const dl = deadlines.find(d => d.title === n); return (
          <div key={n} style={{ padding: 12, borderRadius: 10, background: C.surface2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{n}</span>
              <span style={{ fontSize: 11, color: C.text2 }}>Scheduled: <span style={{ fontWeight: 600, color: C.accent }}>{fmtMin(info.total)}</span>{dl?.estimatedMinutes ? <> / Est: {fmtMin(dl.estimatedMinutes)}</> : ''}</span>
            </div>
            {dl?.dueDate && <div style={{ fontSize: 11, color: C.red, marginBottom: 6 }}>Due {fmtDateShort(dl.dueDate)}</div>}
            {info.sessions.map((s, i) => <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: C.text2, padding: '2px 0' }}><span style={{ fontWeight: 600, color: C.accent, minWidth: 60 }}>{fmtDateShort(s.date)}</span><span style={{ minWidth: 44 }}>{s.startTime}</span><span style={{ color: C.text, fontWeight: 500, minWidth: 36 }}>{s.duration}m</span>{s.topic && <span style={{ color: C.purple }}>📝 {s.topic}</span>}</div>)}
          </div>
        ); })}
      </div>}
    </div>
  );
}

// ═══ HEATMAP CALENDAR ═══
function HeatmapCalendar({ schedule, deadlines, calendarEvents, constraints, selectedDate, onSelectDate, onSlackOff }) {
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const td = todayStr();
  const sbd = {}; (schedule || []).forEach(d => { if (d.date) sbd[d.date] = d; });
  const dlbd = {}; (deadlines || []).forEach(t => { if (t.dueDate) (dlbd[t.dueDate] = dlbd[t.dueDate] || []).push(t); });
  const evbd = {}; (calendarEvents || []).forEach(ev => { try { const d = ev.start.includes('T') ? ev.start.split('T')[0] : ev.start; (evbd[d] = evbd[d] || []).push(ev); } catch {} });
  const tbbd = {}; (constraints.timeBlocks || []).forEach(tb => { (tbbd[tb.day] = tbbd[tb.day] || []).push(tb); });

  const fd = new Date(year, month, 1).getDay();
  const dim = new Date(year, month + 1, 0).getDate();
  const weeks = []; let week = Array(fd).fill(null);
  for (let d = 1; d <= dim; d++) { week.push(d); if (week.length === 7) { weeks.push(week); week = []; } }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

  const hc = s => { if (!s || s === 0) return C.surface; if (s <= 2) return C.greenLight; if (s <= 4) return '#ECFDF5'; if (s <= 5) return C.yellowLight; if (s <= 6) return '#FEF9C3'; if (s <= 7) return C.orangeLight; if (s <= 8) return '#FFEDD5'; return C.redLight; };
  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const mn = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const sel = selectedDate ? sbd[selectedDate] : null;
  const selDl = selectedDate ? (dlbd[selectedDate] || []) : [];
  const selEv = selectedDate ? (evbd[selectedDate] || []) : [];
  const selDN = selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : '';
  const selTB = tbbd[selDN] || [];
  const isBlk = constraints.blockedDays.includes(selDN);

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={prev} style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 16, color: C.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ fontSize: 18, fontWeight: 700, minWidth: 200, textAlign: 'center', color: C.text }}>{mn}</span>
            <button onClick={next} style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 16, color: C.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
          <button onClick={() => { setMonth(new Date().getMonth()); setYear(new Date().getFullYear()); onSelectDate(td); }} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: C.accent }}>Today</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.text3, padding: '8px 0' }}>{d}</div>)}
        </div>
        {weeks.map((wk, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
            {wk.map((day, di) => {
              if (!day) return <div key={di} style={{ minHeight: 80, borderRadius: 10, background: C.bg }} />;
              const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isT = ds === td, isS = ds === selectedDate;
              const sc = sbd[ds]; const ld = sc?.cognitive_load || 0; const ss = sc?.sessions || [];
              const dls = dlbd[ds] || []; const evs = evbd[ds] || [];
              const isP = ds < td;
              const dn = new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
              const isBl = constraints.blockedDays.includes(dn);
              const hasTB = (tbbd[dn] || []).length > 0;
              return (
                <div key={di} onClick={() => onSelectDate(ds)} style={{
                  minHeight: 80, borderRadius: 10, padding: '6px 7px', cursor: 'pointer',
                  background: isBl ? C.redLight : isS ? C.accentLight : hc(ld),
                  border: isS ? `2px solid ${C.accent}` : isT ? `2px solid ${C.green}` : isBl ? `1.5px solid ${C.redBorder}` : `1.5px solid ${C.border}`,
                  opacity: isP && !isT ? 0.4 : 1, transition: 'all .15s', display: 'flex', flexDirection: 'column', gap: 2,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: isT ? 700 : 500, color: isT ? C.green : isBl ? C.red : isS ? C.accent : C.text }}>{day}</span>
                    {ld > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: ld <= 3 ? C.green : ld <= 6 ? C.yellow : ld <= 8 ? C.orange : C.red, background: ld <= 3 ? C.greenLight : ld <= 6 ? C.yellowLight : ld <= 8 ? C.orangeLight : C.redLight, padding: '1px 5px', borderRadius: 4 }}>{ld}</span>}
                  </div>
                  {isBl && <div style={{ fontSize: 8, color: C.red, fontWeight: 600 }}>🚫 Off</div>}
                  {!isBl && hasTB && <div style={{ fontSize: 8, color: C.yellow, fontWeight: 600 }}>⚡ Busy</div>}
                  {ss.slice(0, 2).map((s, si) => <div key={si} style={{ fontSize: 8, padding: '1px 4px', borderRadius: 4, background: C.accentLight, color: C.accent, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '14px' }}>{(s.taskTitle || '').slice(0, 18)}</div>)}
                  {ss.length > 2 && <div style={{ fontSize: 8, color: C.text3 }}>+{ss.length - 2}</div>}
                  {dls.length > 0 && <div style={{ fontSize: 8, padding: '1px 4px', borderRadius: 4, background: C.redLight, color: C.red, fontWeight: 700, textAlign: 'center' }}>📌 {dls.length}</div>}
                  {evs.length > 0 && !ss.length && !dls.length && !isBl && <div style={{ fontSize: 8, color: C.text3 }}>📅 {evs.length}</div>}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, fontSize: 10, color: C.text2 }}>
          {[{ c: C.greenLight, l: 'Low' }, { c: C.yellowLight, l: 'Med' }, { c: C.orangeLight, l: 'High' }, { c: C.redLight, l: 'Critical' }].map((x, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 4, background: x.c, border: `1px solid ${C.border}` }} />{x.l}</div>)}
        </div>
      </div>
      <div style={{ width: 290, flexShrink: 0 }}>
        {selectedDate ? (
          <div style={{ position: 'sticky', top: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: C.text }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            {sel && sel.cognitive_load > 0 && (() => { const l = sel.cognitive_load; const cl = l <= 3 ? C.green : l <= 6 ? C.yellow : l <= 8 ? C.orange : C.red; const lb = l <= 3 ? 'Light' : l <= 6 ? 'Moderate' : l <= 8 ? 'Heavy' : 'Critical'; return <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><div style={{ flex: 1, height: 5, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${l * 10}%`, height: '100%', background: cl, borderRadius: 3, transition: 'width .3s' }} /></div><span style={{ fontSize: 11, fontWeight: 600, color: cl }}>{lb} ({l})</span></div>; })()}
            {isBlk && <div style={{ padding: '10px 12px', borderRadius: 10, background: C.redLight, border: `1px solid ${C.redBorder}`, marginBottom: 6, fontSize: 12, color: C.red, fontWeight: 500 }}>🚫 Day off — no studying</div>}
            {selTB.map((tb, i) => <div key={i} style={{ padding: '8px 12px', borderRadius: 10, background: C.yellowLight, border: `1px solid ${C.yellowBorder}`, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 3, height: 22, borderRadius: 2, background: C.yellow, flexShrink: 0 }} /><div><div style={{ fontSize: 12, fontWeight: 600, color: C.yellow }}>⚡ {tb.label || 'Busy'}</div><div style={{ fontSize: 11, color: C.text2 }}>{tb.startTime} – {tb.endTime}</div></div></div>)}
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 10 }}>{sel?.sessions?.length || 0} session{(sel?.sessions?.length || 0) !== 1 ? 's' : ''}{selEv.length > 0 ? ` · ${selEv.length} event${selEv.length !== 1 ? 's' : ''}` : ''}{selDl.length > 0 ? ` · ${selDl.length} due` : ''}</div>
            {selectedDate === td && sel?.sessions?.length > 0 && <button onClick={() => onSlackOff(selectedDate)} style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.red})`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>😅 I Slacked Off Today</button>}
            {selDl.map((t, i) => <div key={`dl${i}`} style={{ padding: '10px 12px', borderRadius: 10, background: t.isEvent ? C.greenLight : C.redLight, border: `1px solid ${t.isEvent ? C.greenBorder : C.redBorder}`, marginBottom: 5 }}><div style={{ fontSize: 12, fontWeight: 600, color: t.isEvent ? C.green : C.red }}>{t.isEvent ? '📅' : '📌'} {t.isEvent ? '' : 'DUE: '}{t.title}</div><div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{t.course}{t.estimatedMinutes ? ` · ~${fmtMin(t.estimatedMinutes)}` : ''}{t.eventTime ? ` · ${t.eventTime}` : ''}</div></div>)}
            {selEv.map((ev, i) => <div key={`ev${i}`} style={{ padding: '8px 12px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 3, height: 22, borderRadius: 2, background: ev.calendarColor || C.accent, flexShrink: 0 }} /><div><div style={{ fontSize: 12, fontWeight: 500 }}>{ev.summary}</div><div style={{ fontSize: 11, color: C.text2 }}>{fmtTime(ev.start)}{ev.location ? ` · ${ev.location}` : ''}</div></div></div>)}
            {(sel?.sessions || []).map((s, i) => <div key={`s${i}`} style={{ padding: '10px 12px', borderRadius: 10, background: C.accentLight, border: `1px solid #BFDBFE`, marginBottom: 5 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.taskTitle}</div><div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{s.startTime} · {s.duration}min{s.topic ? ` · ${s.topic}` : ''}</div></div>)}
            {!sel?.sessions?.length && !selDl.length && !selEv.length && !isBlk && !selTB.length && <div style={{ textAlign: 'center', padding: 28, color: C.text3, fontSize: 13 }}>Nothing scheduled</div>}
          </div>
        ) : <div style={{ textAlign: 'center', padding: 30, color: C.text3, fontSize: 13 }}>Select a day</div>}
      </div>
    </div>
  );
}

// ═══ AI CHAT ═══
function AIChat({ deadlines, schedule, constraints, calendarEvents, onClose, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef();
  useEffect(() => { ref.current && (ref.current.scrollTop = ref.current.scrollHeight); }, [messages]);
  const ctx = () => ({
    events: calendarEvents.slice(0, 20).map(e => `${e.summary} — ${e.start}`).join('\n') || 'None',
    deadlines: deadlines.map(d => `${d.title} (${d.course}, due ${d.dueDate}, diff ${d.difficulty}/5, ~${fmtMin(d.estimatedMinutes)}${d.topics ? ', topics: ' + d.topics : ''})`).join('\n') || 'None',
    scheduleSummary: schedule.length ? `${schedule.length} days, ${schedule.filter(d => d.cognitive_load >= 7).length} high-load` : 'None',
    constraints: `Blocked: ${constraints.blockedDays.join(', ') || 'none'}, Busy: ${(constraints.timeBlocks || []).map(tb => `${tb.label} ${tb.day} ${tb.startTime}-${tb.endTime}`).join('; ') || 'none'}`,
  });
  const send = async (text) => {
    if (!text?.trim() || loading) return;
    const um = { role: 'user', content: text }; const nm = [...messages, um]; setMessages(nm); setInput(''); setLoading(true);
    try { const res = await api.chat(text, nm.slice(0, -1), ctx()); setMessages([...nm, { role: 'assistant', content: res.response || res.error || 'No response.' }]); }
    catch (e) { setMessages([...nm, { role: 'assistant', content: `Error: ${e.message}` }]); }
    setLoading(false);
  };
  const sugg = ["What should I focus on today?", "Can I take tomorrow off?", "Help me study for my exam", "I'm feeling overwhelmed"];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, borderLeft: `1px solid ${C.border}` }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: C.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>✦</div>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Study Coach</div><div style={{ fontSize: 10, color: C.green, fontWeight: 500 }}>● Online</div></div>
        </div>
        <button onClick={onClose} style={{ background: C.surface2, border: 'none', color: C.text2, width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && <div>
          <div style={{ padding: 16, borderRadius: 14, background: `linear-gradient(135deg, ${C.accentLight}, ${C.roseLight})`, border: `1px solid ${C.purpleBorder}`, marginBottom: 12 }}><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, fontFamily: "'Fraunces', Georgia, serif" }}>Hey there! 👋</div><div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>I'm your AI study coach. I can see your calendar, deadlines, and schedule — ask me anything about planning your week.</div></div>
          {sugg.map((q, i) => <button key={i} onClick={() => send(q)} style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 12, cursor: 'pointer', textAlign: 'left', marginBottom: 5, transition: 'all .15s' }} onMouseEnter={e => e.target.style.borderColor = C.accent} onMouseLeave={e => e.target.style.borderColor = C.border}>{q}</button>)}
        </div>}
        {messages.map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}><div style={{ maxWidth: '88%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.65, background: m.role === 'user' ? C.accent : C.surface, color: m.role === 'user' ? '#fff' : C.text, border: m.role === 'user' ? 'none' : `1px solid ${C.border}`, borderBottomRightRadius: m.role === 'user' ? 4 : 14, borderBottomLeftRadius: m.role === 'user' ? 14 : 4, overflow: 'visible', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{m.role === 'assistant' ? <RenderMD text={m.content} /> : m.content}</div></div>)}
        {loading && <div style={{ display: 'flex', gap: 5, padding: '6px 12px' }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: C.text3, animation: `pulse 1s ease ${i * .15}s infinite` }} />)}</div>}
      </div>
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="Ask your study coach..." style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', fontFamily: font }} />
          <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: input.trim() ? C.accent : C.border, color: '#fff', fontSize: 14, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default', transition: 'all .15s' }}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN APP ═══
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

  useEffect(() => { api.checkAuth().then(d => setAuthed(d.authenticated)).catch(() => setAuthed(false)); }, []);
  useEffect(() => { if (authed) loadCalendar(); }, [authed]);

  const loadCalendar = useCallback(async () => {
    try {
      const now = new Date(); const s = new Date(now); s.setDate(now.getDate() - 28); s.setHours(0,0,0,0); const e = new Date(now); e.setDate(now.getDate() + 56); e.setHours(23,59,59);
      const [calData, evtData] = await Promise.all([api.getCalendars(), api.getEvents(s.toISOString().split('.')[0], e.toISOString().split('.')[0])]);
      setCalendars(calData.calendars || []); setCalendarEvents(evtData.events || []);
    } catch (e) { console.error(e); }
  }, []);

  const loadTestData = () => {
    const td = new Date(); const addD = n => { const d = new Date(td); d.setDate(d.getDate() + n); return toDateStr(d); };
    setDeadlines([
      { id:1, title:'CS412 Midterm', course:'CS412', type:'exam', dueDate:addD(7), difficulty:5, estimatedMinutes:360, topics:'Design Patterns, Inheritance, Polymorphism', isEvent:false, done:false },
      { id:2, title:'EC204 Problem Set #4', course:'EC204', type:'assignment', dueDate:addD(4), difficulty:3, estimatedMinutes:120, topics:null, isEvent:false, done:false },
      { id:3, title:'LJ111 Vocab Quiz', course:'LJ111', type:'quiz', dueDate:addD(3), difficulty:2, estimatedMinutes:60, topics:'Unit 9 vocabulary', isEvent:false, done:false },
      { id:4, title:"Mom's Birthday", course:'Personal', type:'event', dueDate:addD(5), difficulty:0, estimatedMinutes:0, eventTime:'18:00', eventEnd:'21:00', isEvent:true, done:false },
    ]);
    setConstraints({ blockedDays:['Sunday'], maxHours:10, notes:'Prioritize CS412 midterm', timeBlocks:[{ id:101, label:'Work', day:'Thursday', startTime:'17:00', endTime:'21:00' }] });
    if (schedule.length > 0) setScheduleStale(true);
  };

  const addDeadline = d => {
    const conflicts = [];
    if (d.isEvent && d.dueDate && d.eventTime) {
      calendarEvents.forEach(ev => { const ed = ev.start.includes('T') ? ev.start.split('T')[0] : ev.start; if (ed === d.dueDate) { const et = ev.start.includes('T') ? ev.start.split('T')[1].slice(0, 5) : null; const ee = ev.end?.includes('T') ? ev.end.split('T')[1].slice(0, 5) : null; if (et && d.eventTime && d.eventEnd && d.eventTime < (ee || '23:59') && (d.eventEnd || '23:59') > et) conflicts.push(`"${d.title}" overlaps with "${ev.summary}"`); } });
      deadlines.forEach(ex => { if (ex.isEvent && ex.dueDate === d.dueDate && ex.eventTime && d.eventTime < (ex.eventEnd || '23:59') && (d.eventEnd || '23:59') > ex.eventTime) conflicts.push(`"${d.title}" overlaps with "${ex.title}"`); });
    }
    if (conflicts.length > 0 && !window.confirm(`⚠️ Conflicts:\n\n${conflicts.join('\n')}\n\nAdd anyway?`)) return;
    setDeadlines(prev => [...prev, d]); if (schedule.length > 0) setScheduleStale(true);
  };
  const removeDeadline = id => { setDeadlines(prev => prev.filter(d => d.id !== id)); if (schedule.length > 0) setScheduleStale(true); };
  const courses = [...new Set(deadlines.map(d => d.course).filter(Boolean))];

  const handleGenerate = async () => {
    const tasks = deadlines.filter(d => !d.isEvent); const events = deadlines.filter(d => d.isEvent);
    if (tasks.length === 0) { alert('Add at least one academic task.'); return; }
    setLoading(true); setLoadingMsg('AI is analyzing your schedule...');
    try {
      const allEv = [...calendarEvents, ...events.map(e => ({ summary: e.title, start: e.dueDate + (e.eventTime ? 'T' + e.eventTime : ''), end: e.dueDate + (e.eventEnd ? 'T' + e.eventEnd : ''), calendarName: e.course }))];
      const res = await api.generateSchedule(tasks, constraints, allEv);
      if (res.error) { alert(res.error); }
      else { const cleaned = cleanScheduleData(res.schedule || [], constraints.blockedDays); setSchedule(cleaned); setInsights(res.insights || []); setScheduleStale(false); if (res.warnings?.length) setInsights(prev => [...res.warnings.map(w => ({ type: 'danger', message: w })), ...prev]); setView('heatmap'); }
    } catch (e) { alert('Failed: ' + e.message); }
    setLoading(false);
  };

  const handleSlackOff = async (date) => {
    const day = schedule.find(d => d.date === date); if (!day?.sessions?.length) return;
    setLoading(true); setLoadingMsg('Redistributing your work...');
    try {
      const res = await api.reschedule(date, day.sessions, schedule, constraints, calendarEvents);
      if (res.error) { alert(res.error); }
      else if (res.updated_days) { setSchedule(prev => prev.map(d => { if (d.date === date) return { ...d, sessions: [], cognitive_load: 0 }; const upd = res.updated_days.find(u => u.date === d.date); return upd || d; })); }
    } catch (e) { alert('Failed: ' + e.message); }
    setLoading(false);
  };

  const totalMin = deadlines.filter(d => !d.isEvent).reduce((a, d) => a + d.estimatedMinutes, 0);
  const highLoad = schedule.filter(d => (d.cognitive_load || 0) >= 7).length;
  const avgLoad = schedule.length ? (schedule.reduce((a, d) => a + (d.cognitive_load || 0), 0) / (schedule.filter(d => d.cognitive_load > 0).length || 1)).toFixed(1) : '0';

  if (authed === null) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}><style>{globalCSS}</style><Spinner text="Connecting..." /></div>;

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, fontFamily: font, color: C.text }}>
      <style>{globalCSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '40px 24px' }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', marginBottom: 20, boxShadow: '0 8px 30px rgba(124,92,252,.18)' }}><Logo size={40} /></div>
        <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, fontFamily: heading }}>Load<span style={{ color: C.accent }}>Lens</span></h1>
        <p style={{ color: C.text2, fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>See your semester before it hits you.</p>
        <p style={{ color: C.text3, fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>Connect your Google Calendar, add deadlines, and see when burnout is coming — so you can plan around it.</p>
        <a href={api.loginUrl()} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 14, background: C.surface, color: C.text, fontSize: 15, fontWeight: 600, textDecoration: 'none', border: `1.5px solid ${C.border}`, boxShadow: '0 4px 16px rgba(0,0,0,.06)', transition: 'all .2s' }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
          Continue with Google
        </a>
        <p style={{ color: C.text3, fontSize: 11, marginTop: 16 }}>Read-only calendar access · Your data stays private</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: font, overflow: 'hidden' }}>
      <style>{globalCSS}</style>
      {addOpen && <AddDeadlineModal onClose={() => setAddOpen(false)} onAdd={addDeadline} courses={courses} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={34} />
            <div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: heading }}>Load<span style={{ color: C.accent }}>Lens</span></div><div style={{ fontSize: 10, color: C.text3 }}>{calendars.length} cal · {calendarEvents.length} events · {deadlines.length} deadline{deadlines.length !== 1 ? 's' : ''}</div></div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={loadTestData} style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px dashed ${C.yellowBorder}`, background: C.yellowLight, color: C.yellow, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>🧪 Test</button>
            <button onClick={() => setAddOpen(true)} style={{ padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Add</button>
            {deadlines.length > 0 && <button onClick={() => setChatOpen(!chatOpen)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: chatOpen ? C.purple : C.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{chatOpen ? '× Close' : '✦ Coach'}</button>}
            <button onClick={async () => { await api.logout(); setAuthed(false); }} style={{ padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text3, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Logout</button>
          </div>
        </header>
        <nav style={{ display: 'flex', padding: '0 20px', borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
          {[{ k: 'dashboard', l: 'Dashboard' }, { k: 'heatmap', l: 'Burnout Map' }, { k: 'tasks', l: 'Deadlines' }].map(t => <button key={t.k} onClick={() => setView(t.k)} style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', color: view === t.k ? C.accent : C.text2, borderBottom: view === t.k ? `2px solid ${C.accent}` : '2px solid transparent' }}>{t.l}</button>)}
        </nav>
        <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          {loading ? <Spinner text={loadingMsg} /> : (
            <div style={{ animation: 'fadeIn .2s' }}>
              {view === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    {[{ l: 'Tasks', v: String(deadlines.filter(d => !d.isEvent).length), s: fmtMin(totalMin) + ' effort', c: C.accent }, { l: 'Events', v: String(calendarEvents.length + deadlines.filter(d => d.isEvent).length), s: 'calendar + custom', c: C.rose }, { l: 'Danger Days', v: String(highLoad), s: 'load ≥ 7/10', c: highLoad > 0 ? C.red : C.green }, { l: 'Avg Load', v: avgLoad, s: 'per study day', c: parseFloat(avgLoad) > 6 ? C.red : C.green }].map((s, i) => (
                      <div key={i} style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${s.c}`, animation: `slideUp .3s ease ${i * .06}s both` }}>
                        <div style={{ fontSize: 11, color: C.text3, fontWeight: 500, marginBottom: 6 }}>{s.l}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: s.c, fontFamily: heading }}>{s.v}</div>
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>{s.s}</div>
                      </div>
                    ))}
                  </div>
                  {courses.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{courses.map((c, i) => { const cols = [C.accent, C.purple, C.green, C.orange, C.yellow, C.red]; const col = cols[i % cols.length]; return <span key={c} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: col + '10', color: col, border: `1px solid ${col}20` }}>{c}</span>; })}</div>}
                  {calendarEvents.length > 0 && <div><div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Upcoming from Google Calendar</div>{calendarEvents.filter(e => e.start >= todayStr()).slice(0, 5).map((ev, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 4 }}><div style={{ width: 3, height: 20, borderRadius: 2, background: ev.calendarColor || C.accent, flexShrink: 0 }} /><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 500 }}>{ev.summary}</div><div style={{ fontSize: 11, color: C.text2 }}>{fmtDateShort(ev.start.split('T')[0])} · {fmtTime(ev.start)}{ev.location ? ` · ${ev.location}` : ''}</div></div></div>)}</div>}
                  {deadlines.length === 0 && <button onClick={() => setAddOpen(true)} style={{ padding: 24, borderRadius: 16, border: `2px dashed ${C.purpleBorder}`, background: `linear-gradient(135deg, ${C.accentLight}, ${C.roseLight})`, color: C.text, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16, animation: 'float 3s ease infinite' }}><div style={{ fontSize: 36, animation: 'float 2s ease infinite' }}>📌</div><div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: heading }}>Add your first deadline</div><div style={{ fontSize: 13, color: C.text2, marginTop: 4, lineHeight: 1.5 }}>Exams, assignments, birthday parties — anything that takes your time or energy. We'll help you see the big picture.</div></div></button>}
                  <ConstraintsPanel constraints={constraints} setConstraints={setConstraints} />
                  {insights.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>AI Insights</div>{insights.map((ins, i) => <InsightCard key={i} type={ins.type} msg={ins.message} />)}</div>}
                  {deadlines.length > 0 && <>
                    <div><div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Your deadlines & events</div>
                      {deadlines.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).map(t => <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 5 }}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div><div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}><Badge type={t.isEvent ? 'event' : t.type} /><span style={{ fontSize: 11, color: C.text2 }}>{t.course}</span><span style={{ fontSize: 11, color: C.red, fontWeight: 500 }}>{fmtDateShort(t.dueDate)}</span>{!t.isEvent && <span style={{ fontSize: 11, color: C.text3 }}>~{fmtMin(t.estimatedMinutes)}</span>}{!t.isEvent && <DiffDots n={t.difficulty} />}{t.topics && <span style={{ fontSize: 10, color: C.purple }}>📝</span>}</div></div><button onClick={() => removeDeadline(t.id)} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 16, cursor: 'pointer' }}>×</button></div>)}
                    </div>
                    <button onClick={handleGenerate} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,92,252,.2)', transition: 'all .15s' }}>Generate Burnout Heatmap →</button>
                  </>}
                  {!chatOpen && deadlines.length > 0 && <button onClick={() => setChatOpen(true)} style={{ padding: '14px 16px', borderRadius: 12, border: `1px solid ${C.purpleBorder}`, background: `linear-gradient(135deg, ${C.accentLight}, ${C.roseLight})`, color: C.text, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', flexShrink: 0 }}>✦</div><div><div style={{ fontSize: 13, fontWeight: 600 }}>Ask Study Coach</div><div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>Personalized advice powered by Gemini AI</div></div></button>}
                </div>
              )}
              {view === 'heatmap' && (
                <div>{schedule.length === 0 ? <div style={{ textAlign: 'center', padding: 60 }}><div style={{ fontSize: 48, marginBottom: 16, animation: 'float 3s ease infinite' }}>📅</div><div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: heading }}>No schedule yet</div><div style={{ fontSize: 14, color: C.text2, marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>Add deadlines and hit generate to see your burnout heatmap come to life.</div><button onClick={() => setView('dashboard')} style={{ padding: '11px 28px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,92,252,.2)' }}>Go to Dashboard</button></div> : <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                    {[{ l: 'Sessions', v: String(schedule.reduce((a, d) => a + (d.sessions?.length || 0), 0)), s: 'planned', c: C.accent }, { l: 'Avg Load', v: avgLoad, s: 'per day', c: parseFloat(avgLoad) > 6 ? C.red : C.green }, { l: 'Danger Days', v: String(highLoad), s: 'load ≥ 7', c: C.red }, { l: 'Blocked', v: String(constraints.blockedDays.length + (constraints.timeBlocks || []).length), s: 'days + slots', c: C.yellow }].map((s, i) => <div key={i} style={{ padding: 12, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}><div style={{ fontSize: 11, color: C.text3, fontWeight: 500 }}>{s.l}</div><div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, color: C.text2 }}>{s.s}</div></div>)}
                  </div>
                  {scheduleStale && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: C.yellowLight, border: `1px solid ${C.yellowBorder}`, marginBottom: 12 }}><span style={{ fontSize: 13, color: C.yellow }}>⚠ Deadlines changed. Schedule may be outdated.</span><button onClick={handleGenerate} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Regenerate</button></div>}
                  <EffortSummary schedule={schedule} deadlines={deadlines} />
                  <HeatmapCalendar schedule={schedule} deadlines={deadlines} calendarEvents={calendarEvents} constraints={constraints} selectedDate={selectedDate} onSelectDate={setSelectedDate} onSlackOff={handleSlackOff} />
                </>}</div>
              )}
              {view === 'tasks' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}><h2 style={{ fontSize: 18, fontWeight: 700 }}>All Deadlines & Events</h2><button onClick={() => setAddOpen(true)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add</button></div>
                  {deadlines.length === 0 ? <div style={{ textAlign: 'center', padding: 50 }}><div style={{ fontSize: 40, marginBottom: 14 }}>📌</div><div style={{ fontSize: 17, fontWeight: 600 }}>Nothing added yet</div></div>
                  : deadlines.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).map(t => <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 5 }}><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>{t.title}</div><div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}><Badge type={t.isEvent ? 'event' : t.type} /><span style={{ fontSize: 11, color: C.text2 }}>{t.course}</span><span style={{ fontSize: 11, color: C.red, fontWeight: 500 }}>{fmtDateShort(t.dueDate)}</span>{!t.isEvent && <span style={{ fontSize: 11, color: C.text3 }}>~{fmtMin(t.estimatedMinutes)}</span>}{!t.isEvent && <DiffDots n={t.difficulty} />}{t.topics && <span style={{ fontSize: 10, color: C.purple, background: C.purpleLight, padding: '2px 8px', borderRadius: 4 }}>📝 {t.topics.split(',').length} topics</span>}</div></div><button onClick={() => removeDeadline(t.id)} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 16, cursor: 'pointer' }}>×</button></div>)}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {chatOpen && <div style={{ width: 380, flexShrink: 0, animation: 'slideLeft .25s', display: 'flex', flexDirection: 'column' }}><AIChat deadlines={deadlines} schedule={schedule} constraints={constraints} calendarEvents={calendarEvents} onClose={() => setChatOpen(false)} messages={chatMessages} setMessages={setChatMessages} /></div>}
    </div>
  );
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg};color:${C.text};font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideLeft{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(124,92,252,.15)}50%{box-shadow:0 0 20px rgba(124,92,252,.3)}}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}::-webkit-scrollbar-thumb:hover{background:${C.text3}}
  input[type="range"]{-webkit-appearance:none;background:linear-gradient(90deg,${C.accentLight},${C.border});height:5px;border-radius:3px;outline:none}
  input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${C.accent};cursor:pointer;box-shadow:0 2px 8px rgba(124,92,252,.3);transition:transform .15s}
  input[type="range"]::-webkit-slider-thumb:hover{transform:scale(1.15)}
  button{font-family:inherit;transition:all .15s ease}
  button:hover{filter:brightness(1.05)}
  button:active{transform:scale(.98)}
  select{font-family:inherit}
  input:focus,textarea:focus,select:focus{border-color:${C.accent}!important;box-shadow:0 0 0 3px rgba(124,92,252,.1)}
`;