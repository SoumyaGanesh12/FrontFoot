import { useState } from 'react';
import { C } from '../theme.js';
import { todayStr, fmtTime, fmtDateShort, fmtMin } from '../utils.js';

function heatColor(load) {
  if (!load || load === 0) return C.surface;
  if (load <= 2) return C.greenLight;
  if (load <= 4) return '#ECFDF5';
  if (load <= 5) return C.yellowLight;
  if (load <= 6) return '#FEF9C3';
  if (load <= 7) return C.orangeLight;
  if (load <= 8) return '#FFEDD5';
  return C.redLight;
}

export default function HeatmapCalendar({ schedule, deadlines, calendarEvents, constraints, selectedDate, onSelectDate, onSlackOff }) {
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());

  const td = todayStr();

  // Index data by date
  const scheduleByDate = {};
  (schedule || []).forEach(d => { if (d.date) scheduleByDate[d.date] = d; });
  const deadlinesByDate = {};
  (deadlines || []).forEach(t => { if (t.dueDate) (deadlinesByDate[t.dueDate] = deadlinesByDate[t.dueDate] || []).push(t); });
  const eventsByDate = {};
  (calendarEvents || []).forEach(ev => {
    try { const d = ev.start.includes('T') ? ev.start.split('T')[0] : ev.start; (eventsByDate[d] = eventsByDate[d] || []).push(ev); } catch {}
  });
  const timeBlocksByDay = {};
  (constraints.timeBlocks || []).forEach(tb => (timeBlocksByDay[tb.day] = timeBlocksByDay[tb.day] || []).push(tb));

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let week = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Selected date details
  const selDay = selectedDate ? scheduleByDate[selectedDate] : null;
  const selDeadlines = selectedDate ? (deadlinesByDate[selectedDate] || []) : [];
  const selEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];
  const selDayName = selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : '';
  const selTimeBlocks = timeBlocksByDay[selDayName] || [];
  const isBlocked = constraints.blockedDays.includes(selDayName);

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Calendar grid */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 16, color: C.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ fontSize: 18, fontWeight: 700, minWidth: 200, textAlign: 'center', color: C.text }}>{monthLabel}</span>
            <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 16, color: C.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
          <button onClick={() => { setMonth(new Date().getMonth()); setYear(new Date().getFullYear()); onSelectDate(td); }} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: C.accent }}>Today</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 6 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.text3, padding: '6px 0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>
        {weeks.map((wk, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 5 }}>
            {wk.map((day, di) => {
              if (!day) return <div key={di} style={{ minHeight: 90, borderRadius: 12, background: 'transparent' }} />;
              const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = ds === td;
              const isSelected = ds === selectedDate;
              const sc = scheduleByDate[ds];
              const load = sc?.cognitive_load || 0;
              const sessions = sc?.sessions || [];
              const dls = deadlinesByDate[ds] || [];
              const evs = eventsByDate[ds] || [];
              const isPast = ds < td;
              const dayName = new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
              const isBlk = constraints.blockedDays.includes(dayName);
              const hasTB = (timeBlocksByDay[dayName] || []).length > 0;

              const tag = (text, accent, bg) => (
                <div style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: bg, color: accent, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '15px', borderLeft: `2.5px solid ${accent}` }}>
                  {text}
                </div>
              );

              return (
                <div
                  key={di}
                  onClick={() => onSelectDate(ds)}
                  style={{
                    minHeight: 90, borderRadius: 12, padding: '7px 8px', cursor: 'pointer',
                    background: isBlk ? C.redLight : isSelected ? C.accentLight : heatColor(load),
                    border: isSelected ? `2px solid ${C.accent}` : isToday ? `2px solid ${C.green}` : isBlk ? `1.5px solid ${C.redBorder}` : `1.5px solid ${C.border}`,
                    boxShadow: isSelected ? `0 4px 14px rgba(124,92,252,.18)` : isToday ? `0 4px 12px rgba(45,159,111,.15)` : 'none',
                    opacity: isPast && !isToday ? 0.38 : 1,
                    transition: 'all .15s', display: 'flex', flexDirection: 'column', gap: 3,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                    {isToday
                      ? <span style={{ width: 22, height: 22, borderRadius: '50%', background: C.green, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{day}</span>
                      : <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isBlk ? C.red : isSelected ? C.accent : C.text }}>{day}</span>
                    }
                    {load > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: load <= 3 ? C.green : load <= 6 ? C.yellow : load <= 8 ? C.orange : C.red, background: load <= 3 ? C.greenLight : load <= 6 ? C.yellowLight : load <= 8 ? C.orangeLight : C.redLight, padding: '1px 5px', borderRadius: 5, lineHeight: '14px' }}>{load}</span>
                    )}
                  </div>
                  {isBlk && tag('Day off', C.text2, C.surface2)}
                  {!isBlk && hasTB && tag('Busy', C.yellow, C.yellowLight)}
                  {sessions.slice(0, 2).map((s) => tag((s.taskTitle || '').slice(0, 22), C.accent, C.accentLight))}
                  {sessions.length > 2 && <div style={{ fontSize: 8, color: C.text3, paddingLeft: 2 }}>+{sessions.length - 2} more</div>}
                  {dls.filter(d => !d.isEvent).map((dl) => tag((dl.title || '').slice(0, 22), C.red, C.redLight))}
                  {dls.filter(d => d.isEvent).map((ev) => tag((ev.title || '').slice(0, 22), C.green, C.greenLight))}
                  {evs.map((ev) => tag((ev.summary || '').slice(0, 22), C.green, C.greenLight))}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, fontSize: 10, color: C.text2 }}>
          {[{ c: C.greenLight, l: 'Low' }, { c: C.yellowLight, l: 'Med' }, { c: C.orangeLight, l: 'High' }, { c: C.redLight, l: 'Critical' }].map((x, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: x.c, border: `1px solid ${C.border}` }} />{x.l}
            </div>
          ))}
        </div>
      </div>

      {/* Day detail sidebar */}
      <div style={{ width: 290, flexShrink: 0 }}>
        {selectedDate ? (
          <div style={{ position: 'sticky', top: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: C.text }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {selDay && selDay.cognitive_load > 0 && (() => {
              const l = selDay.cognitive_load;
              const cl = l <= 3 ? C.green : l <= 6 ? C.yellow : l <= 8 ? C.orange : C.red;
              const lb = l <= 3 ? 'Light' : l <= 6 ? 'Moderate' : l <= 8 ? 'Heavy' : 'Critical';
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 5, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${l * 10}%`, height: '100%', background: cl, borderRadius: 3, transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: cl }}>{lb} ({l})</span>
                </div>
              );
            })()}
            {isBlocked && <div style={{ padding: '10px 12px', borderRadius: 10, background: C.redLight, border: `1px solid ${C.redBorder}`, marginBottom: 6, fontSize: 12, color: C.red, fontWeight: 500 }}>🚫 Day off — no studying</div>}
            {selTimeBlocks.map((tb, i) => (
              <div key={i} style={{ padding: '8px 12px', borderRadius: 10, background: C.yellowLight, border: `1px solid ${C.yellowBorder}`, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 22, borderRadius: 2, background: C.yellow, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.yellow }}>⚡ {tb.label || 'Busy'}</div>
                  <div style={{ fontSize: 11, color: C.text2 }}>{tb.startTime} – {tb.endTime}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 10 }}>
              {selDay?.sessions?.length || 0} session{(selDay?.sessions?.length || 0) !== 1 ? 's' : ''}
              {selEvents.length > 0 ? ` · ${selEvents.length} event${selEvents.length !== 1 ? 's' : ''}` : ''}
              {selDeadlines.length > 0 ? ` · ${selDeadlines.length} due` : ''}
            </div>
            {selectedDate === td && selDay?.sessions?.length > 0 && (
              <button onClick={() => onSlackOff(selectedDate)} style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.red})`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
                😅 I Slacked Off Today
              </button>
            )}
            {selDeadlines.map((t, i) => (
              <div key={`dl${i}`} style={{ padding: '10px 12px', borderRadius: 10, background: t.isEvent ? C.greenLight : C.redLight, border: `1px solid ${t.isEvent ? C.greenBorder : C.redBorder}`, marginBottom: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.isEvent ? C.green : C.red }}>{t.isEvent ? '📅' : '📌'} {t.isEvent ? '' : 'DUE: '}{t.title}</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{t.course}{t.estimatedMinutes ? ` · ~${fmtMin(t.estimatedMinutes)}` : ''}{t.eventTime ? ` · ${t.eventTime}` : ''}</div>
              </div>
            ))}
            {selEvents.map((ev, i) => (
              <div key={`ev${i}`} style={{ padding: '8px 12px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 22, borderRadius: 2, background: ev.calendarColor || C.accent, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{ev.summary}</div>
                  <div style={{ fontSize: 11, color: C.text2 }}>{fmtTime(ev.start)}{ev.location ? ` · ${ev.location}` : ''}</div>
                </div>
              </div>
            ))}
            {(selDay?.sessions || []).map((s, i) => (
              <div key={`s${i}`} style={{ padding: '10px 12px', borderRadius: 10, background: C.accentLight, border: '1px solid #BFDBFE', marginBottom: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.taskTitle}</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{s.startTime} · {s.duration}min{s.topic ? ` · ${s.topic}` : ''}</div>
              </div>
            ))}
            {!selDay?.sessions?.length && !selDeadlines.length && !selEvents.length && !isBlocked && !selTimeBlocks.length && (
              <div style={{ textAlign: 'center', padding: 28, color: C.text3, fontSize: 13 }}>Nothing scheduled</div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: C.text3, fontSize: 13 }}>Select a day</div>
        )}
      </div>
    </div>
  );
}
