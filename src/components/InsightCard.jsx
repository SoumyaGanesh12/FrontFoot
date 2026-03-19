import { C } from '../theme.js';

const STYLES = {
  danger: { bg: C.redLight,    bd: C.redBorder,    ic: '⚠️' },
  warn:   { bg: C.yellowLight, bd: C.yellowBorder,  ic: '⚡' },
  tip:    { bg: C.greenLight,  bd: C.greenBorder,   ic: '💡' },
  info:   { bg: C.accentLight, bd: '#BFDBFE',       ic: '📊' },
};

export default function InsightCard({ type, msg }) {
  const s = STYLES[type] || STYLES.info;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.6,
      color: C.text, background: s.bg, border: `1px solid ${s.bd}`,
      display: 'flex', gap: 8, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{s.ic}</span>
      <span>{msg}</span>
    </div>
  );
}
