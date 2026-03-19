import { C } from '../theme.js';

const BADGE_STYLES = {
  reading:    { bg: C.accentLight,  c: C.accent,  l: 'Read'  },
  assignment: { bg: C.orangeLight,  c: C.orange,  l: 'HW'    },
  exam:       { bg: C.redLight,     c: C.red,     l: 'Exam'  },
  quiz:       { bg: C.yellowLight,  c: C.yellow,  l: 'Quiz'  },
  project:    { bg: C.purpleLight,  c: C.purple,  l: 'Proj'  },
  review:     { bg: C.purpleLight,  c: C.purple,  l: 'Rev'   },
  event:      { bg: C.greenLight,   c: C.green,   l: 'Event' },
  other:      { bg: C.surface2,     c: C.text2,   l: 'Other' },
};

export default function Badge({ type }) {
  const s = BADGE_STYLES[type] || BADGE_STYLES.other;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, background: s.bg, color: s.c,
      padding: '2px 8px', borderRadius: 6,
    }}>
      {s.l}
    </span>
  );
}
