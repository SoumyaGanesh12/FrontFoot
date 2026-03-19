import { C } from '../theme.js';

/** Five dots indicating difficulty level 1-5. */
export default function DiffDots({ n }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: i <= n ? (n >= 4 ? C.red : n >= 3 ? C.yellow : C.green) : C.border,
          }}
        />
      ))}
    </div>
  );
}
