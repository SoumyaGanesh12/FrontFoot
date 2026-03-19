import { useState, useEffect, useRef } from 'react';
import api from '../api.js';
import { C } from '../theme.js';
import { fmtMin } from '../utils.js';
import RenderMD from './RenderMD.jsx';

const INITIAL_SUGGESTIONS = [
  "What should I focus on today?",
  "Can I take tomorrow off?",
  "Help me study for my exam",
  "I'm feeling overwhelmed",
];

export default function AIChat({ deadlines, schedule, constraints, calendarEvents, onClose, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const buildContext = () => ({
    events: calendarEvents.slice(0, 20).map(e => `${e.summary} — ${e.start}`).join('\n') || 'None',
    deadlines: deadlines.map(d => `${d.title} (${d.course}, due ${d.dueDate}, diff ${d.difficulty}/5, ~${fmtMin(d.estimatedMinutes)}${d.topics ? ', topics: ' + d.topics : ''})`).join('\n') || 'None',
    scheduleSummary: schedule.length ? `${schedule.length} days, ${schedule.filter(d => d.cognitive_load >= 7).length} high-load` : 'None',
    constraints: `Blocked: ${constraints.blockedDays.join(', ') || 'none'}, Busy: ${(constraints.timeBlocks || []).map(tb => `${tb.label} ${tb.day} ${tb.startTime}-${tb.endTime}`).join('; ') || 'none'}`,
  });

  const send = async (text) => {
    if (!text?.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);
    try {
      const res = await api.chat(text, newHistory.slice(0, -1), buildContext());
      setMessages([...newHistory, {
        role: 'assistant',
        content: res.response || res.error || 'No response.',
        suggestions: res.suggestions || [],
      }]);
    } catch (e) {
      setMessages([...newHistory, { role: 'assistant', content: `Error: ${e.message}`, suggestions: [] }]);
    }
    setLoading(false);
  };

  const lastAssistantIdx = messages.map(m => m.role).lastIndexOf('assistant');

  const chipStyle = {
    padding: '7px 11px', borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: C.surface, color: C.text2, fontSize: 11, cursor: 'pointer',
    textAlign: 'left', transition: 'all .15s', whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, borderLeft: `1px solid ${C.border}` }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: C.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>✦</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Study Coach</div>
            <div style={{ fontSize: 10, color: C.green, fontWeight: 500 }}>● Online</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: C.surface2, border: 'none', color: C.text2, width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Welcome screen */}
        {messages.length === 0 && (
          <div>
            <div style={{ padding: 16, borderRadius: 14, background: `linear-gradient(135deg, ${C.accentLight}, ${C.roseLight})`, border: `1px solid ${C.purpleBorder}`, marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, fontFamily: "'Fraunces', Georgia, serif" }}>Hey there! 👋</div>
              <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>I'm your AI study coach. I can see your calendar, deadlines, and schedule — ask me anything about planning your week.</div>
            </div>
            {INITIAL_SUGGESTIONS.map((q, i) => (
              <button key={i} onClick={() => send(q)} style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 12, cursor: 'pointer', textAlign: 'left', marginBottom: 5, transition: 'all .15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = C.accent} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>{q}</button>
            ))}
          </div>
        )}

        {/* Conversation */}
        {messages.map((m, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '88%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.65, background: m.role === 'user' ? C.accent : C.surface, color: m.role === 'user' ? '#fff' : C.text, border: m.role === 'user' ? 'none' : `1px solid ${C.border}`, borderBottomRightRadius: m.role === 'user' ? 4 : 14, borderBottomLeftRadius: m.role === 'user' ? 14 : 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {m.role === 'assistant' ? <RenderMD text={m.content} /> : m.content}
              </div>
            </div>

            {/* Contextual suggestions after the last AI reply */}
            {m.role === 'assistant' && i === lastAssistantIdx && !loading && m.suggestions?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8, paddingLeft: 4 }}>
                {m.suggestions.map((q, si) => (
                  <button
                    key={si}
                    onClick={() => send(q)}
                    style={chipStyle}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div style={{ display: 'flex', gap: 5, padding: '6px 12px' }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: C.text3, animation: `pulse 1s ease ${i * .15}s infinite` }} />)}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask your study coach..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none' }}
          />
          <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: input.trim() ? C.accent : C.border, color: '#fff', fontSize: 14, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default', transition: 'all .15s' }}>↑</button>
        </div>
      </div>
    </div>
  );
}
