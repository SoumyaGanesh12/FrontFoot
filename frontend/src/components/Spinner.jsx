import { C } from '../theme.js';

export default function Spinner({ text }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 60, gap: 16,
    }}>
      <div style={{
        width: 36, height: 36,
        border: `3px solid ${C.border}`,
        borderTopColor: C.accent,
        borderRightColor: C.rose,
        borderRadius: '50%',
        animation: 'spin .7s linear infinite',
      }} />
      <div style={{
        color: C.text2, fontSize: 14, fontWeight: 500,
        animation: 'pulse 2s ease infinite',
      }}>
        {text}
      </div>
    </div>
  );
}
