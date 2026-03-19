import { C } from '../theme.js';

/** Inline bold: replaces **text** with <strong> */
export function ib(text) {
  const parts = [];
  let rem = text, k = 0;
  while (rem.length > 0) {
    const m = rem.match(/\*\*(.*?)\*\*/);
    if (m) {
      const idx = rem.indexOf(m[0]);
      if (idx > 0) parts.push(<span key={k++}>{rem.slice(0, idx)}</span>);
      parts.push(<strong key={k++} style={{ fontWeight: 600 }}>{m[1]}</strong>);
      rem = rem.slice(idx + m[0].length);
    } else {
      parts.push(<span key={k++}>{rem}</span>);
      break;
    }
  }
  return parts;
}

/** Renders a subset of Markdown: headings, bullet lists, numbered lists, bold. */
export default function RenderMD({ text }) {
  if (!text) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        if (line.startsWith('### ')) return <div key={i} style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{ib(line.slice(4))}</div>;
        if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{ib(line.slice(3))}</div>;
        if (line.match(/^[\-\*]\s/)) return (
          <div key={i} style={{ paddingLeft: 14, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 2, color: C.accent }}>•</span>
            {ib(line.slice(2))}
          </div>
        );
        const num = line.match(/^(\d+)\.\s/);
        if (num) return (
          <div key={i} style={{ paddingLeft: 18, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, color: C.accent, fontWeight: 600, fontSize: 12 }}>{num[1]}.</span>
            {ib(line.slice(num[0].length))}
          </div>
        );
        return <div key={i}>{ib(line)}</div>;
      })}
    </div>
  );
}
