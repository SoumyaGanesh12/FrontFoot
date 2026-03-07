import { useState, useEffect, useRef, useCallback } from 'react';
import api from './api.js';

const T = {
  bg: '#F6F5F1', card: '#FFFFFF', card2: '#F0EFEB', border: '#E2E0DA',
  text: '#1A1A1A', muted: '#6B6B6B', dim: '#9E9E9E',
  accent: '#E8553A', accentLight: '#FFF0EC',
  green: '#1A9E5C', greenLight: '#E8F8EF',
  yellow: '#C08B00', yellowLight: '#FFF8E1',
  red: '#D93025', redLight: '#FEECEB',
  blue: '#1A6DD0', blueLight: '#EBF3FF',
  purple: '#7B4FC4', purpleLight: '#F3EEFF',
};
const F = { display: "'Fraunces',serif", body: "'Outfit',sans-serif", mono: "'JetBrains Mono',monospace" };
const fmt = m => { const h = Math.floor(m / 60), mn = m % 60; return h === 0 ? `${mn}m` : mn === 0 ? `${h}h` : `${h}h ${mn}m`; };
const fmtTime = iso => { if (!iso) return ''; return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); };
const fmtDateShort = d => { if (!d) return ''; try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return d; } };
const dayKey = iso => new Date(iso).toISOString().split('T')[0];

const Badge = ({ type }) => { const m = { reading: { bg: T.blueLight, c: T.blue, l: 'Reading' }, assignment: { bg: T.redLight, c: T.red, l: 'HW' }, lecture: { bg: T.greenLight, c: T.green, l: 'Lecture' }, review: { bg: T.purpleLight, c: T.purple, l: 'Review' } }; const s = m[type] || m.reading; return <span style={{ fontSize: 9, fontWeight: 600, background: s.bg, color: s.c, padding: '2px 7px', borderRadius: 5 }}>{s.l}</span>; };
const DiffBar = ({ n }) => <div style={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>{[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: 10, height: 3, borderRadius: 1.5, background: i <= n ? (n >= 4 ? T.red : n >= 3 ? T.yellow : T.green) : T.border }} />)}</div>;
const Spinner = ({ text }) => <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 50, gap: 12 }}><div style={{ width: 24, height: 24, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin .8s linear infinite' }} /><div style={{ color: T.muted, fontSize: 12 }}>{text || 'Loading...'}</div></div>;

const DueTag = ({ date }) => {
  if (!date) return null;
  const d = new Date(date + 'T12:00:00'), now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - now) / (86400000));
  const label = fmtDateShort(date);
  const urgent = diff <= 3, soon = diff <= 7;
  return <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: urgent ? T.redLight : soon ? T.yellowLight : T.card2, color: urgent ? T.red : soon ? T.yellow : T.dim }}>{urgent ? '⏰ ' : ''}{label}</span>;
};

function InsightCard({ type, msg }) {
  const s = { danger: { icon: '⚠️', bg: T.redLight, border: '#F5C6C2' }, tip: { icon: '💡', bg: T.greenLight, border: '#B8E6CB' }, info: { icon: '📊', bg: T.blueLight, border: '#B8D4F0' }, warn: { icon: '🔥', bg: T.yellowLight, border: '#E8D89E' } }[type] || { icon: '📊', bg: T.blueLight, border: '#B8D4F0' };
  return <div style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5, color: T.text, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', gap: 8, alignItems: 'flex-start' }}><span style={{ fontSize: 13, flexShrink: 0 }}>{s.icon}</span><span>{msg.replace(/^[⚠💡📊🔥️]\s*/, '')}</span></div>;
}

/* ── Upload Modal ── */
function UploadModal({ onClose, onUploaded }) {
  const [files, setFiles] = useState({ syllabus: null, schedule: null, assignments: null });
  const [uploading, setUploading] = useState(false); const [progress, setProgress] = useState({});
  const refs = { syllabus: useRef(), schedule: useRef(), assignments: useRef() };
  const upload = async () => { setUploading(true); const results = {}; for (const [type, file] of Object.entries(files)) { if (!file) continue; setProgress(p => ({ ...p, [type]: 'up' })); try { const res = await api.uploadFile(file, type); results[type] = res; setProgress(p => ({ ...p, [type]: res.success ? 'ok' : 'err' })); } catch (e) { setProgress(p => ({ ...p, [type]: 'err' })); } } setTimeout(() => onUploaded(results), 500); };
  const anyFile = Object.values(files).some(Boolean);
  const meta = { syllabus: { icon: '📋', desc: 'Course syllabus' }, schedule: { icon: '📅', desc: 'Class schedule' }, assignments: { icon: '📝', desc: 'Assignments' } };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.2)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '22px 24px', width: 420, maxWidth: '92vw', boxShadow: '0 16px 48px rgba(0,0,0,.1)', animation: 'slideUp .2s ease' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, fontFamily: F.display, margin: 0 }}>Upload Materials</h2>
        <p style={{ color: T.muted, fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>AI extracts tasks & deadlines from your documents.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
          {['syllabus', 'schedule', 'assignments'].map(type => (
            <div key={type}><input ref={refs[type]} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setFiles(p => ({ ...p, [type]: f })); }} />
              <div onClick={() => !uploading && refs[type].current?.click()} style={{ padding: '10px 12px', borderRadius: 8, cursor: uploading ? 'default' : 'pointer', border: `1.5px ${files[type] ? 'solid' : 'dashed'} ${files[type] ? T.green : T.border}`, background: files[type] ? T.greenLight : T.card2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 18 }}>{meta[type].icon}</span><div><div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{type}</div><div style={{ color: T.muted, fontSize: 10, marginTop: 1 }}>{files[type] ? files[type].name : meta[type].desc}</div></div>
                  <div style={{ marginLeft: 'auto' }}>{progress[type] === 'ok' ? <span style={{ color: T.green }}>✓</span> : progress[type] === 'up' ? <div style={{ width: 12, height: 12, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : null}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={upload} disabled={!anyFile || uploading} style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: anyFile && !uploading ? T.accent : T.border, color: anyFile && !uploading ? '#fff' : T.dim, fontSize: 12, fontWeight: 700, cursor: anyFile && !uploading ? 'pointer' : 'default' }}>{uploading ? 'Analyzing...' : 'Upload & Generate Plan'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── AI Chat ── */
function AIChat({ onClose }) {
  const [messages, setMessages] = useState([]); const [input, setInput] = useState(''); const [loading, setLoading] = useState(false); const scrollRef = useRef();
  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages]);
  const send = async (text) => { if (!text?.trim() || loading) return; const um = { role: 'user', content: text }; const nm = [...messages, um]; setMessages(nm); setInput(''); setLoading(true); try { const res = await api.chat(text, nm.slice(0, -1)); setMessages([...nm, { role: 'assistant', content: res.response || res.error || 'No response.' }]); } catch (e) { setMessages([...nm, { role: 'assistant', content: `Error: ${e.message}` }]); } setLoading(false); };
  const renderText = text => text.split('\n').map((line, i) => { line = line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); if (line.startsWith('* ') || line.startsWith('- ')) return <div key={i} style={{ paddingLeft: 12, position: 'relative', marginBottom: 2 }}><span style={{ position: 'absolute', left: 0, color: T.accent }}>•</span><span dangerouslySetInnerHTML={{ __html: line.slice(2) }} /></div>; if (!line.trim()) return <div key={i} style={{ height: 5 }} />; return <div key={i} style={{ marginBottom: 1 }} dangerouslySetInnerHTML={{ __html: line }} />; });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, borderLeft: `1px solid ${T.border}` }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, background: T.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${T.purple},${T.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>✦</div><div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: F.display }}>Study AI</div><div style={{ fontSize: 9, color: T.green, fontWeight: 600 }}>● Online</div></div></div>
        <button onClick={onClose} style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.muted, width: 24, height: 24, borderRadius: 6, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && <div style={{ animation: 'fadeIn .3s' }}><div style={{ padding: 12, borderRadius: 10, background: T.card, border: `1px solid ${T.border}`, marginBottom: 10 }}><div style={{ fontSize: 13, fontWeight: 700, fontFamily: F.display, marginBottom: 3 }}>Hi! I'm your study assistant.</div><div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>Ask me about study strategies, resources, or course help.</div></div>
          {["Help me plan my study schedule", "Best order for my tasks?", "Explain dynamic programming", "Recommend practice problems"].map((q, i) => <button key={i} onClick={() => send(q)} style={{ display: 'block', width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 11, cursor: 'pointer', textAlign: 'left', marginBottom: 4 }}>{q}</button>)}
        </div>}
        {messages.map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}><div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: 10, fontSize: 12, lineHeight: 1.6, background: m.role === 'user' ? T.accent : T.card, color: m.role === 'user' ? '#fff' : T.text, border: m.role === 'user' ? 'none' : `1px solid ${T.border}`, borderBottomRightRadius: m.role === 'user' ? 2 : 10, borderBottomLeftRadius: m.role === 'user' ? 10 : 2 }}>{m.role === 'assistant' ? renderText(m.content) : m.content}</div></div>)}
        {loading && <div style={{ display: 'flex', gap: 4, padding: '5px 10px' }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: T.dim, animation: `pulse 1s ease ${i * .15}s infinite` }} />)}</div>}
      </div>
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}><div style={{ display: 'flex', gap: 5 }}><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="Ask anything..." style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card2, color: T.text, fontSize: 12, outline: 'none' }} /><button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: input.trim() ? T.accent : T.border, color: '#fff', fontSize: 13, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default' }}>↑</button></div></div>
    </div>
  );
}

/* ── Calendar Component ── */
function PlanCalendar({ studyBlocks, tasks, events, toggle }) {
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [selDate, setSelDate] = useState(() => new Date().toISOString().split('T')[0]);
  const today = new Date(); today.setHours(0, 0, 0, 0); const todayStr = today.toISOString().split('T')[0];

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };
  const goToday = () => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()); setSelDate(todayStr); };

  // Index data
  const blocksByDate = {}, evByDate = {}, dlByDate = {};
  studyBlocks.forEach(b => { if (!b.date) return; (blocksByDate[b.date] = blocksByDate[b.date] || []).push(b); });
  events.forEach(ev => { try { const d = new Date(ev.start).toISOString().split('T')[0]; (evByDate[d] = evByDate[d] || []).push(ev); } catch (e) { } });
  tasks.forEach(t => { if (t.dueDate) (dlByDate[t.dueDate] = dlByDate[t.dueDate] || []).push(t); });

  // Build calendar grid for current month
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const weeks = []; let week = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) { week.push(d); if (week.length === 7) { weeks.push(week); week = []; } }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selBlocks = blocksByDate[selDate] || [], selEvts = evByDate[selDate] || [], selDl = dlByDate[selDate] || [];

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ flex: 1 }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted }}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: F.display, minWidth: 160, textAlign: 'center' }}>{monthName}</span>
            <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted }}>›</button>
          </div>
          <button onClick={goToday} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, fontSize: 10, fontWeight: 700, cursor: 'pointer', color: T.accent }}>Today</button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: T.dim, padding: '4px 0', letterSpacing: '.04em' }}>{d}</div>)}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ minHeight: 72, borderRadius: 6, background: T.bg }} />;
              const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = ds === todayStr, isSel = ds === selDate;
              const db = blocksByDate[ds] || [], dd = dlByDate[ds] || [], de = evByDate[ds] || [];
              const isPast = new Date(ds + 'T00:00:00') < today;
              return (
                <div key={di} onClick={() => setSelDate(ds)} style={{
                  minHeight: 72, borderRadius: 6, padding: '4px 5px', cursor: 'pointer',
                  background: isSel ? T.accentLight : isToday ? '#F0FFF4' : T.card,
                  border: isSel ? `2px solid ${T.accent}` : isToday ? `2px solid ${T.green}` : `1px solid ${T.border}`,
                  opacity: isPast ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: 1, transition: 'all .1s',
                }}>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, fontFamily: F.mono, color: isToday ? T.green : isSel ? T.accent : T.text, marginBottom: 1 }}>{day}</div>
                  {db.slice(0, 2).map((b, bi) => <div key={bi} style={{ fontSize: 7.5, padding: '1px 3px', borderRadius: 2, background: T.blueLight, color: T.blue, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '12px' }}>{b.task.length > 18 ? b.task.slice(0, 18) + '…' : b.task}</div>)}
                  {db.length > 2 && <div style={{ fontSize: 7, color: T.dim, paddingLeft: 2 }}>+{db.length - 2} more</div>}
                  {dd.length > 0 && <div style={{ fontSize: 7.5, padding: '1px 3px', borderRadius: 2, background: T.redLight, color: T.red, fontWeight: 700, textAlign: 'center', lineHeight: '12px' }}>📌 {dd.length} due</div>}
                  {de.length > 0 && !db.length && !dd.length && <div style={{ fontSize: 7, color: T.dim }}>📚 {de.length}</div>}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend + Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ c: T.blueLight, bc: T.blue, l: 'Study' }, { c: T.redLight, bc: T.red, l: 'Deadline' }, { c: '#F0FFF4', bc: T.green, l: 'Today' }].map((x, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: T.muted }}><div style={{ width: 8, height: 8, borderRadius: 2, background: x.c, border: `1px solid ${x.bc}` }} />{x.l}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ v: studyBlocks.length, l: 'sessions', c: T.blue }, { v: fmt(studyBlocks.reduce((a, b) => a + (b.duration || 45), 0)), l: 'total', c: T.accent }, { v: tasks.filter(t => t.dueDate).length, l: 'deadlines', c: T.red }].map((s, i) => <div key={i} style={{ fontSize: 10, color: T.muted }}><span style={{ fontWeight: 800, color: s.c, fontFamily: F.mono }}>{s.v}</span> {s.l}</div>)}
          </div>
        </div>
      </div>

      {/* Day detail */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: F.display, marginBottom: 2 }}>{new Date(selDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <div style={{ fontSize: 10, color: T.dim, marginBottom: 10 }}>{selBlocks.length} session{selBlocks.length !== 1 ? 's' : ''}{selEvts.length > 0 ? ` · ${selEvts.length} class${selEvts.length !== 1 ? 'es' : ''}` : ''}{selDl.length > 0 ? ` · ${selDl.length} due` : ''}</div>

          {selDl.map((t, i) => <div key={`dl${i}`} style={{ padding: '7px 9px', borderRadius: 7, background: T.redLight, border: '1px solid #F5C6C2', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12 }}>📌</span><div><div style={{ fontSize: 11, fontWeight: 700, color: T.red }}>DUE: {t.title}</div><div style={{ fontSize: 9, color: T.muted }}>{t.course}</div></div></div>)}
          {selEvts.map((ev, i) => <div key={`ev${i}`} style={{ padding: '6px 9px', borderRadius: 7, background: T.card, border: `1px solid ${T.border}`, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 3, height: 20, borderRadius: 1.5, background: ev.calendarColor || T.dim }} /><div><div style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>{ev.summary}</div><div style={{ fontSize: 9, color: T.dim }}>{fmtTime(ev.start)}</div></div></div>)}
          {selBlocks.map((b, j) => {
            const mt = tasks.find(t => t.title === b.task); const done = mt?.done; return (
              <div key={`sb${j}`} onClick={() => mt && toggle(mt.id)} style={{ padding: '8px 9px', borderRadius: 7, background: done ? T.greenLight : T.blueLight, border: `1px solid ${done ? '#B8E6CB' : '#B8D4F0'}`, marginBottom: 3, cursor: mt ? 'pointer' : 'default', opacity: done ? 0.45 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 13, height: 13, borderRadius: 3, border: `2px solid ${done ? T.green : T.blue}`, background: done ? T.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', flexShrink: 0 }}>{done && '✓'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 600, textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.sessionTitle || b.task}</div><div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>{b.time} · {b.duration}min{b.dueDate ? ` · due ${fmtDateShort(b.dueDate)}` : ''}</div></div>
                </div>
              </div>
            );
          })}
          {!selBlocks.length && !selEvts.length && !selDl.length && <div style={{ textAlign: 'center', padding: 20, color: T.dim, fontSize: 11 }}>Nothing scheduled</div>}
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN APP ═══ */
export default function App() {
  const [authed, setAuthed] = useState(null);
  const [view, setView] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [studyBlocks, setStudyBlocks] = useState([]);
  const [uploads, setUploads] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { api.checkAuth().then(d => setAuthed(d.authenticated)).catch(() => setAuthed(false)); }, []);
  useEffect(() => { if (authed) loadData(); }, [authed]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date(), s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(s.getDate() + 7); e.setHours(23, 59, 59);
      const [calData, evtData, upData] = await Promise.all([api.getCalendars(), api.getEvents(s.toISOString().split('.')[0], e.toISOString().split('.')[0]), api.getUploads()]);
      setCalendars(calData.calendars || []); setEvents(evtData.events || []); setUploads(upData.uploads || {}); setSelectedDay(dayKey(now.toISOString()));
    } catch (e) { console.error(e); } setLoading(false);
  }, []);

  const toggle = id => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const handleUploaded = async (results) => {
    setUploadOpen(false); loadData(); setGenerating(true);
    try {
      const res = await api.generatePlan(tasks); if (res.plan) {
        if (res.plan.tasks) setTasks(res.plan.tasks.map((t, i) => ({ ...t, id: i + 1, diff: t.difficulty, est: t.estimatedMinutes, done: false })));
        if (res.plan.insights) setInsights(res.plan.insights.map(i => ({ type: i.type, msg: i.message })));
        if (res.plan.studyBlocks) setStudyBlocks(res.plan.studyBlocks);
        setView('plan');
      }
    } catch (e) { console.error('Plan generation failed:', e); } setGenerating(false);
  };

  if (authed === null) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}><style>{globalCSS}</style><Spinner text="Connecting..." /></div>;
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: F.body }}><style>{globalCSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: '40px 20px' }}>
        <div style={{ width: 52, height: 52, borderRadius: 13, background: T.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', boxShadow: '0 4px 20px rgba(232,85,58,.2)', marginBottom: 18 }}>📚</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: F.display, color: T.text, lineHeight: 1.2, marginBottom: 6 }}>StudyFlow<span style={{ color: T.accent }}>.ai</span></h1>
        <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>AI study planner synced with your Google Calendar</p>
        <a href={api.loginUrl()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 10, background: T.card, color: T.text, fontSize: 13, fontWeight: 700, textDecoration: 'none', border: `1px solid ${T.border}`, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
          Continue with Google
        </a>
        <p style={{ color: T.dim, fontSize: 10, marginTop: 14 }}>Read-only calendar access · Data stays private</p>
      </div>
    </div>
  );

  const totalEst = tasks.reduce((a, t) => a + (t.est || 0), 0), doneEst = tasks.filter(t => t.done).reduce((a, t) => a + (t.est || 0), 0);
  const prog = totalEst > 0 ? Math.round(doneEst / totalEst * 100) : 0, doneCount = tasks.filter(t => t.done).length;
  const uploadCount = Object.keys(uploads).length;
  const eventsByDay = {}; events.forEach(e => { const d = dayKey(e.start); (eventsByDay[d] = eventsByDay[d] || []).push(e); });
  const dayKeys = Object.keys(eventsByDay).sort();
  const selEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, color: T.text, fontFamily: F.body, overflow: 'hidden' }}>
      <style>{globalCSS}</style>
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', borderBottom: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>📚</div>
            <div><div style={{ fontSize: 14, fontWeight: 800, fontFamily: F.display }}>StudyFlow<span style={{ color: T.accent }}>.ai</span></div><div style={{ fontSize: 9, color: T.muted }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, display: 'inline-block', marginRight: 4 }}></span>{calendars.length} cal · {uploadCount} file{uploadCount !== 1 ? 's' : ''}</div></div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => setUploadOpen(true)} style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📄 Upload</button>
            <button onClick={() => setChatOpen(!chatOpen)} style={{ padding: '6px 10px', borderRadius: 7, border: 'none', background: chatOpen ? T.purple : T.accent, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{chatOpen ? '✕ Close' : '✦ Study AI'}</button>
            <button onClick={async () => { await api.logout(); setAuthed(false); }} style={{ padding: '6px 8px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.muted, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Logout</button>
          </div>
        </header>
        {/* Nav */}
        <nav style={{ display: 'flex', padding: '0 18px', borderBottom: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
          {[{ k: 'dashboard', l: 'Dashboard' }, { k: 'plan', l: 'Study Plan' }, { k: 'tasks', l: 'Tasks' }].map(t => (
            <button key={t.k} onClick={() => setView(t.k)} style={{ padding: '9px 12px', fontSize: 12, fontWeight: view === t.k ? 700 : 500, cursor: 'pointer', border: 'none', background: 'none', color: view === t.k ? T.accent : T.muted, borderBottom: view === t.k ? `2px solid ${T.accent}` : '2px solid transparent' }}>{t.l}</button>
          ))}
        </nav>
        {/* Content */}
        <main style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
          {loading || generating ? <Spinner text={generating ? 'Generating study plan...' : 'Loading...'} /> : (
            <>
              {/* DASHBOARD */}
              {view === 'dashboard' && (
                <div style={{ animation: 'fadeIn .2s', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[{ l: 'Progress', v: `${prog}%`, s: `${doneCount}/${tasks.length} done`, c: T.accent, bar: prog }, { l: 'Study Left', v: fmt(totalEst - doneEst), s: `of ${fmt(totalEst)}`, c: T.blue }, { l: 'Events', v: String(events.length), s: 'this week', c: T.green }, { l: 'Uploads', v: String(uploadCount), s: uploadCount ? Object.keys(uploads).join(', ') : 'none yet', c: T.yellow }].map((s, i) => (
                      <div key={i} style={{ padding: 12, borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 9, color: T.dim, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 5 }}>{s.l}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.c, fontFamily: F.display, lineHeight: 1 }}>{s.v}</div>
                        <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{s.s}</div>
                        {s.bar !== undefined && <div style={{ marginTop: 6, height: 3, background: T.border, borderRadius: 1.5, overflow: 'hidden' }}><div style={{ height: '100%', width: `${s.bar}%`, background: T.accent, borderRadius: 1.5 }} /></div>}
                      </div>
                    ))}
                  </div>
                  {uploadCount === 0 && <button onClick={() => setUploadOpen(true)} style={{ padding: '14px 16px', borderRadius: 10, border: `1.5px dashed ${T.border}`, background: T.card, color: T.text, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📄</div>
                    <div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: F.display }}>Upload course materials</div><div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>AI extracts tasks and builds a calendar study plan.</div></div>
                  </button>}
                  {insights.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><div style={{ fontSize: 9, fontWeight: 700, color: T.dim, letterSpacing: '.04em', textTransform: 'uppercase' }}>Insights</div>{insights.slice(0, 4).map((ins, i) => <InsightCard key={i} type={ins.type} msg={ins.msg} />)}</div>}
                  {!chatOpen && <button onClick={() => setChatOpen(true)} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: `linear-gradient(135deg,${T.purpleLight},${T.blueLight})`, color: T.text, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${T.purple},${T.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', flexShrink: 0 }}>✦</div>
                    <div><div style={{ fontSize: 12, fontWeight: 700, fontFamily: F.display }}>Ask Study AI</div><div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>Strategies, resources, course help</div></div>
                  </button>}
                  {/* Upcoming tasks with dates */}
                  {tasks.length > 0 && <div><div style={{ fontSize: 9, fontWeight: 700, color: T.dim, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>Upcoming Tasks</div>
                    {tasks.filter(t => !t.done).sort((a, b) => { if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate); if (a.dueDate) return -1; if (b.dueDate) return 1; return (b.diff || 0) - (a.diff || 0); }).slice(0, 5).map((t, i) => (
                      <div key={t.id} onClick={() => toggle(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 8, background: T.card, border: `1px solid ${T.border}`, cursor: 'pointer', marginBottom: 3 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${T.accent}`, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}><Badge type={t.type} /><DueTag date={t.dueDate} /><span style={{ fontSize: 9, color: T.dim }}>~{fmt(t.est || 60)}</span><DiffBar n={t.diff || 3} /></div>
                        </div>
                      </div>
                    ))}
                  </div>}
                </div>
              )}
              {/* STUDY PLAN */}
              {view === 'plan' && (
                <div style={{ animation: 'fadeIn .2s' }}>
                  {studyBlocks.length === 0 && tasks.length === 0 ? <div style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 36, marginBottom: 12 }}>📅</div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: F.display, marginBottom: 4 }}>No study plan yet</div><div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Upload materials to generate a calendar study schedule.</div><button onClick={() => setUploadOpen(true)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Upload Materials</button></div>
                    : <PlanCalendar studyBlocks={studyBlocks} tasks={tasks} events={events} toggle={toggle} />}
                </div>
              )}
              {/* TASKS */}
              {view === 'tasks' && (
                <div style={{ animation: 'fadeIn .2s' }}>
                  {tasks.length === 0 ? <div style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 36, marginBottom: 12 }}>📄</div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: F.display, marginBottom: 4 }}>No tasks yet</div><div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Upload materials to generate tasks.</div><button onClick={() => setUploadOpen(true)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Upload</button></div> : (
                    <>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                        {[...new Set(tasks.map(t => t.course).filter(Boolean))].slice(0, 6).map((n, i) => { const colors = [T.accent, T.blue, T.green, T.purple, T.yellow]; return <span key={n} style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: `${colors[i % colors.length]}12`, color: colors[i % colors.length] }}>{n}</span>; })}
                      </div>
                      {tasks.sort((a, b) => { if (a.done !== b.done) return a.done ? 1 : -1; if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate); if (a.dueDate) return -1; if (b.dueDate) return 1; return (b.diff || 0) - (a.diff || 0); }).map((t, i) => (
                        <div key={t.id} onClick={() => toggle(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 8, background: t.done ? T.bg : T.card, border: `1px solid ${t.done ? T.border : T.border}`, cursor: 'pointer', opacity: t.done ? .3 : 1, marginBottom: 3 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${t.done ? T.green : T.accent}`, background: t.done ? T.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>{t.done && '✓'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, textDecoration: t.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                              <Badge type={t.type} />{t.course && <span style={{ fontSize: 9, color: T.muted }}>{t.course}</span>}<DueTag date={t.dueDate} /><span style={{ fontSize: 9, color: T.dim }}>~{fmt(t.est || 60)}</span><DiffBar n={t.diff || 3} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {chatOpen && <div style={{ width: 340, flexShrink: 0, animation: 'slideLeft .2s', display: 'flex', flexDirection: 'column' }}><AIChat onClose={() => setChatOpen(false)} /></div>}
    </div>
  );
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700;800&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}body{background:${T.bg};color:${T.text};font-family:'Outfit',sans-serif}
  @keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideLeft{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
  @keyframes spin{to{transform:rotate(360deg)}}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
`;
