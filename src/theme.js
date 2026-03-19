// ═══ COLOUR PALETTE ═══
export const C = {
  bg: '#F8F6F2',          // warm cream
  surface: '#FFFFFF',      // cards
  surface2: '#F0EDE8',     // secondary surfaces, inputs
  border: '#E2DDD5',       // warm gray borders
  text: '#2D2A26',         // warm near-black
  text2: '#78736B',        // muted warm gray
  text3: '#B0AAA0',        // hint text
  accent: '#7C5CFC',       // vibrant purple — primary action
  accentLight: '#F0ECFF',  // purple tint
  accentDark: '#5B3FD4',   // deep purple
  green: '#2D9F6F',        // soft sage green
  greenLight: '#EEF8F2',
  greenBorder: '#C2E5D1',
  yellow: '#C49A2A',       // warm gold
  yellowLight: '#FDF8EC',
  yellowBorder: '#F0DFA0',
  red: '#D4513A',          // muted terracotta
  redLight: '#FDF0ED',
  redBorder: '#F5C9BF',
  purple: '#7C5CFC',       // matches accent
  purpleLight: '#F0ECFF',
  purpleBorder: '#D4C9FF',
  orange: '#D98A3B',       // warm amber
  orangeLight: '#FFF6EC',
  orangeBorder: '#F5D9AD',
  rose: '#C47A8A',         // muted rose for special accents
  roseLight: '#FDF2F4',
};

export const font = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const heading = "'Fraunces', Georgia, serif";

// ═══ SHARED FORM STYLES ═══
export const labelSt = {
  fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 5, display: 'block',
};
export const inputSt = {
  width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`,
  background: C.surface, color: C.text, fontSize: 13, outline: 'none',
  fontFamily: font, boxSizing: 'border-box', transition: 'border-color .15s',
};

// ═══ GLOBAL CSS ═══
export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg};color:${C.text};font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideLeft{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(124,92,252,.15)}50%{box-shadow:0 0 20px rgba(124,92,252,.3)}}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}::-webkit-scrollbar-thumb:hover{background:${C.text3}}
  input[type="range"]{-webkit-appearance:none;background:linear-gradient(90deg,${C.accentLight},${C.border});height:5px;border-radius:3px;outline:none}
  input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${C.accent};cursor:pointer;box-shadow:0 2px 8px rgba(124,92,252,.3);transition:transform .15s}
  input[type="range"]::-webkit-slider-thumb:hover{transform:scale(1.15)}
  button{font-family:inherit;transition:all .15s ease}
  button:hover{filter:brightness(1.05)}
  button:active{transform:scale(.98)}
  select{font-family:inherit}
  input:focus,textarea:focus,select:focus{border-color:${C.accent}!important;box-shadow:0 0 0 3px rgba(124,92,252,.1)}
`;
