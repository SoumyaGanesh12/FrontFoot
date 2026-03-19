import { C, labelSt, inputSt } from '../theme.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ConstraintsPanel({ constraints, setConstraints }) {
  const toggle = d => setConstraints(c => ({
    ...c,
    blockedDays: c.blockedDays.includes(d)
      ? c.blockedDays.filter(x => x !== d)
      : [...c.blockedDays, d],
  }));

  const addTimeBlock = () => setConstraints(c => ({
    ...c,
    timeBlocks: [...(c.timeBlocks || []), { id: Date.now(), label: '', day: 'Monday', startTime: '17:00', endTime: '21:00' }],
  }));

  const updateTimeBlock = (id, field, value) => setConstraints(c => ({
    ...c,
    timeBlocks: (c.timeBlocks || []).map(tb => tb.id === id ? { ...tb, [field]: value } : tb),
  }));

  const removeTimeBlock = id => setConstraints(c => ({
    ...c,
    timeBlocks: (c.timeBlocks || []).filter(tb => tb.id !== id),
  }));

  return (
    <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 10 }}>Your constraints</div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>Days off:</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {DAYS.map(d => {
          const blocked = constraints.blockedDays.includes(d);
          return (
            <button key={d} onClick={() => toggle(d)} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${blocked ? C.red : C.border}`, background: blocked ? C.redLight : C.surface, color: blocked ? C.red : C.text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}>
              {blocked ? '🚫 ' : ''}{d.slice(0, 3)}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>Recurring busy times:</div>
      {(constraints.timeBlocks || []).map(tb => (
        <div key={tb.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <input value={tb.label} onChange={e => updateTimeBlock(tb.id, 'label', e.target.value)} placeholder="Work" style={{ width: 80, ...inputSt, padding: '6px 8px', fontSize: 12 }} />
          <select value={tb.day} onChange={e => updateTimeBlock(tb.id, 'day', e.target.value)} style={{ ...inputSt, padding: '6px 8px', fontSize: 12, width: 80 }}>
            {DAYS.map(d => <option key={d} value={d}>{d.slice(0, 3)}</option>)}
          </select>
          <input type="time" value={tb.startTime} onChange={e => updateTimeBlock(tb.id, 'startTime', e.target.value)} style={{ ...inputSt, padding: '6px 8px', fontSize: 12, width: 100 }} />
          <span style={{ color: C.text3, fontSize: 11 }}>to</span>
          <input type="time" value={tb.endTime} onChange={e => updateTimeBlock(tb.id, 'endTime', e.target.value)} style={{ ...inputSt, padding: '6px 8px', fontSize: 12, width: 100 }} />
          <button onClick={() => removeTimeBlock(tb.id)} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
      ))}
      <button onClick={addTimeBlock} style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px dashed ${C.border}`, background: 'none', color: C.text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginBottom: 12 }}>+ Add busy time</button>
      <div style={{ fontSize: 11, color: C.text3, padding: '8px 10px', borderRadius: 8, background: C.surface2, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: C.green }}>●</span>Max 10h study/day to protect your energy
      </div>
      <input
        value={constraints.notes}
        onChange={e => setConstraints(c => ({ ...c, notes: e.target.value }))}
        placeholder='Any notes for the AI scheduler'
        style={{ ...inputSt, marginTop: 10, fontSize: 12 }}
      />
    </div>
  );
}
