import { useState } from 'react';
import { C, labelSt, inputSt } from '../theme.js';

export default function AddDeadlineModal({ onClose, onAdd, courses }) {
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

  const types = ['assignment', 'exam', 'quiz', 'project', 'reading', 'review'];

  const submit = () => {
    if (!title.trim() || (!dueDate && !eventStart)) return;
    if (mode === 'event') {
      onAdd({
        id: Date.now(), title: title.trim(),
        course: newCourse.trim() || course || 'Personal',
        dueDate: eventStart, type: 'event', difficulty: 0, estimatedMinutes: 0,
        eventTime: dueTime || null, eventEnd: eventEnd || null, isEvent: true, done: false,
      });
    } else {
      onAdd({
        id: Date.now(), title: title.trim(),
        course: newCourse.trim() || course || 'General',
        dueDate, type, difficulty,
        estimatedMinutes: Math.round(estHours * 60),
        topics: topics.trim() || null, isEvent: false, done: false,
      });
    }
    onClose();
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,.15)', backdropFilter: 'blur(4px)',
  };
  const cardStyle = {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
    padding: 28, width: 500, maxWidth: '92vw',
    boxShadow: '0 20px 60px rgba(0,0,0,.08)', maxHeight: '90vh', overflowY: 'auto',
  };

  // Step 1: choose mode
  if (mode === null) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ ...cardStyle, width: 440 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>What are you adding?</h2>
          <p style={{ color: C.text2, fontSize: 13, marginTop: 4, marginBottom: 20 }}>This helps us schedule it correctly.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { m: 'task',  icon: '📚', t: 'Academic task',     d: 'Exam, assignment, project — needs prep time' },
              { m: 'event', icon: '📅', t: 'Event / time block', d: 'Birthday, doctor visit — fixed time on one day' },
            ].map(x => (
              <button
                key={x.m}
                onClick={() => setMode(x.m)}
                style={{ flex: 1, padding: 18, borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.surface, cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLight; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{x.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{x.t}</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 4, lineHeight: 1.5 }}>{x.d}</div>
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ width: '100%', marginTop: 14, padding: 10, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  // Step 2: fill details
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setMode(null)} style={{ background: C.surface2, border: 'none', color: C.text2, fontSize: 14, cursor: 'pointer', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{mode === 'event' ? 'Add event' : 'Add academic task'}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelSt}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={mode === 'event' ? "Mom's birthday dinner" : 'CS412 Midterm'} autoFocus style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>{mode === 'event' ? 'Category' : 'Course'}</label>
            {courses.length > 0 && mode === 'task' ? (
              <>
                <select value={course} onChange={e => { setCourse(e.target.value); setNewCourse(''); }} style={{ ...inputSt }}>
                  {courses.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new">+ New course</option>
                </select>
                {course === '__new' && <input value={newCourse} onChange={e => setNewCourse(e.target.value)} placeholder="Course name" style={{ ...inputSt, marginTop: 6 }} />}
              </>
            ) : (
              <input value={newCourse} onChange={e => setNewCourse(e.target.value)} placeholder={mode === 'event' ? 'Personal, Social' : 'CS412, EC204'} style={inputSt} />
            )}
          </div>
          {mode === 'event' ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}><label style={labelSt}>Date</label><input type="date" value={eventStart} onChange={e => setEventStart(e.target.value)} style={inputSt} /></div>
              <div style={{ flex: 1 }}><label style={labelSt}>Start</label><input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} style={inputSt} /></div>
              <div style={{ flex: 1 }}><label style={labelSt}>End</label><input type="time" value={eventEnd} onChange={e => setEventEnd(e.target.value)} style={inputSt} /></div>
            </div>
          ) : (
            <>
              <div>
                <label style={labelSt}>Type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {types.map(t => (
                    <button key={t} onClick={() => setType(t)} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${type === t ? C.accent : C.border}`, background: type === t ? C.accentLight : C.surface, color: type === t ? C.accent : C.text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize', transition: 'all .15s' }}>{t}</button>
                  ))}
                </div>
              </div>
              <div><label style={labelSt}>Due date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputSt} /></div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelSt}>Difficulty</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min={1} max={5} step={1} value={difficulty} onChange={e => setDifficulty(+e.target.value)} style={{ flex: 1, accentColor: C.accent }} />
                    <span style={{ fontSize: 20, fontWeight: 700, color: difficulty >= 4 ? C.red : difficulty >= 3 ? C.yellow : C.green, minWidth: 22, textAlign: 'center' }}>{difficulty}</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelSt}>Effort</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min={0.5} max={20} step={0.5} value={estHours} onChange={e => setEstHours(+e.target.value)} style={{ flex: 1, accentColor: C.accent }} />
                    <span style={{ fontSize: 20, fontWeight: 700, color: C.accent, minWidth: 36 }}>{estHours}h</span>
                  </div>
                </div>
              </div>
              {['exam', 'quiz', 'review'].includes(type) && (
                <div>
                  <label style={labelSt}>Topics to cover (optional)</label>
                  <textarea value={topics} onChange={e => setTopics(e.target.value)} placeholder="Design Patterns, Inheritance, Polymorphism" style={{ ...inputSt, minHeight: 56, resize: 'vertical' }} />
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={submit}
            disabled={!title.trim() || (!dueDate && !eventStart)}
            style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', background: (title.trim() && (dueDate || eventStart)) ? C.accent : C.border, color: '#fff', fontSize: 13, fontWeight: 600, cursor: (title.trim() && (dueDate || eventStart)) ? 'pointer' : 'default', transition: 'all .15s' }}
          >
            {mode === 'event' ? 'Add Event' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
