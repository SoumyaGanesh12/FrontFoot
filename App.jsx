import { useState, useEffect, useRef, useCallback } from 'react';
import api from './api.js';

// ─── Theme ───
const C = {
  accent:'#E85D26',bg:'#0A0A0D',surface:'#131316',surface2:'#1A1A1F',
  border:'#252530',text:'#EEEAE6',text2:'#7D7D8A',green:'#34D399',
  yellow:'#FBBF24',red:'#F87171',purple:'#A78BFA',blue:'#60A5FA',
};
const mono = "'Space Mono',monospace";
const sans = "'DM Sans',-apple-system,sans-serif";

// ─── Utilities ───
const fmt = m => { const h=Math.floor(m/60),mn=m%60; return h===0?`${mn}m`:mn===0?`${h}h`:`${h}h ${mn}m`; };
const fmtTime = iso => { if(!iso)return''; const d=new Date(iso); return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}); };
const fmtDay = iso => { if(!iso)return''; return new Date(iso).toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric'}); };
const dayKey = iso => new Date(iso).toISOString().split('T')[0];

// ─── Small Components ───
const Badge = ({type}) => {
  const m={reading:{bg:'#1a2744',c:'#60A5FA',l:'Read'},assignment:{bg:'#3b1c1c',c:'#F87171',l:'HW'},lecture:{bg:'#1a2e2a',c:'#34D399',l:'Lec'},review:{bg:'#2a1a2e',c:'#C084FC',l:'Rev'}};
  const s=m[type]||m.reading;
  return <span style={{fontSize:9,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',background:s.bg,color:s.c,padding:'2px 7px',borderRadius:4}}>{s.l}</span>;
};
const Dots = ({n}) => <div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:5,height:5,borderRadius:'50%',background:i<=n?(n>=4?C.red:n>=3?C.yellow:C.green):C.border}}/>)}</div>;
const Spinner = ({text}) => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:50}}>
    <div style={{width:36,height:36,border:`3px solid ${C.border}`,borderTopColor:C.accent,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
    <div style={{color:C.text2,fontSize:12,marginTop:10}}>{text||'Loading...'}</div>
  </div>
);

// ─── Upload Modal ───
function UploadModal({ onClose, onUploaded }) {
  const [files, setFiles] = useState({ syllabus:null, schedule:null, assignments:null });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const refs = { syllabus:useRef(), schedule:useRef(), assignments:useRef() };

  const pick = (type) => refs[type].current?.click();

  const handleFile = (type, e) => {
    const f = e.target.files?.[0];
    if (f) setFiles(prev => ({...prev, [type]: f}));
  };

  const upload = async () => {
    setUploading(true);
    const results = {};
    for (const [type, file] of Object.entries(files)) {
      if (!file) continue;
      setProgress(p => ({...p, [type]: 'uploading'}));
      try {
        const res = await api.uploadFile(file, type);
        results[type] = res;
        setProgress(p => ({...p, [type]: res.success ? 'done' : 'error'}));
      } catch (e) {
        setProgress(p => ({...p, [type]: 'error'}));
      }
    }
    setTimeout(() => onUploaded(results), 600);
  };

  const anyFile = Object.values(files).some(Boolean);

  return (
    <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width:460,maxWidth:'90vw',animation:'slideUp .3s ease'}}>
        <h2 style={{fontSize:18,fontWeight:700,fontFamily:mono,color:C.text,margin:0}}>Upload Course Materials</h2>
        <p style={{color:C.text2,fontSize:12,marginTop:4}}>Upload your syllabus, schedule, and assignments. AI analyzes them to build your study plan.</p>

        {['syllabus','schedule','assignments'].map(type => (
          <div key={type}>
            <input ref={refs[type]} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" style={{display:'none'}} onChange={e=>handleFile(type,e)}/>
            <div onClick={()=>!uploading&&pick(type)} style={{
              marginTop:12,padding:14,borderRadius:10,cursor:uploading?'default':'pointer',
              border:`1px dashed ${files[type]?C.green:progress[type]==='error'?C.red:C.border}`,
              background:files[type]?'rgba(52,211,153,.05)':C.surface2,transition:'all .2s',
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{color:C.text,fontSize:13,fontWeight:600,textTransform:'capitalize'}}>{type}</div>
                  <div style={{color:C.text2,fontSize:11,marginTop:2}}>
                    {files[type] ? `✓ ${files[type].name}` : progress[type]==='error' ? 'Upload failed' : 'Click to select PDF, DOCX, or TXT'}
                  </div>
                </div>
                <div style={{fontSize:18}}>
                  {progress[type]==='done'?'✅':progress[type]==='uploading'?'⏳':progress[type]==='error'?'❌':files[type]?'📎':'📄'}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:'10px 0',borderRadius:8,border:`1px solid ${C.border}`,background:'none',color:C.text2,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:mono}}>Cancel</button>
          <button onClick={upload} disabled={!anyFile||uploading} style={{
            flex:2,padding:'10px 0',borderRadius:8,border:'none',
            background:anyFile&&!uploading?C.accent:C.border,color:anyFile&&!uploading?'#fff':C.text2,
            fontSize:12,fontWeight:700,cursor:anyFile&&!uploading?'pointer':'default',fontFamily:mono,
          }}>{uploading?'Uploading & Analyzing...':'Upload & Generate Plan →'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Chat Panel ───
function AIChat({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();
  const inputRef = useRef();

  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages]);

  const suggestions = [
    "What resources should I use for my CS midterm?",
    "Help me plan my study schedule this week",
    "Recommend practice problems for Economics",
    "What's the best order to tackle my tasks?",
    "Explain dynamic programming simply",
  ];

  const send = async (text) => {
    if (!text?.trim() || loading) return;
    const userMsg = { role:'user', content:text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const res = await api.chat(text, newMsgs.slice(0,-1));
      setMessages([...newMsgs, { role:'assistant', content: res.response || res.error || 'No response.' }]);
    } catch (e) {
      setMessages([...newMsgs, { role:'assistant', content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:C.bg,borderLeft:`1px solid ${C.border}`}}>
      <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`,background:C.surface,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:26,height:26,borderRadius:7,background:`linear-gradient(135deg,${C.purple},${C.blue})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>✦</div>
          <div>
            <div style={{fontSize:12,fontWeight:700,fontFamily:mono}}>Study AI</div>
            <div style={{fontSize:9,color:C.green}}>Gemini 2.0 · Calendar + Uploads</div>
          </div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:C.text2,fontSize:16,cursor:'pointer'}}>✕</button>
      </div>

      <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:10}}>
        {messages.length===0 && (
          <div style={{animation:'fadeIn .4s ease'}}>
            <div style={{padding:14,borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>👋 I'm your study assistant.</div>
              <div style={{fontSize:12,color:C.text2,lineHeight:1.5}}>I can see your Google Calendar and uploaded materials. Ask me for study resources, help planning, or course questions.</div>
            </div>
            <div style={{fontSize:9,fontWeight:700,color:C.text2,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:6}}>Suggestions</div>
            {suggestions.map((q,i) => (
              <button key={i} onClick={()=>send(q)} style={{
                display:'block',width:'100%',padding:'9px 11px',borderRadius:7,border:`1px solid ${C.border}`,
                background:C.surface2,color:C.text,fontSize:11,cursor:'pointer',textAlign:'left',marginBottom:5,lineHeight:1.3,
              }}>{q}</button>
            ))}
          </div>
        )}
        {messages.map((m,i) => (
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',animation:'slideUp .2s ease'}}>
            <div style={{
              maxWidth:'85%',padding:'9px 12px',borderRadius:10,fontSize:12,lineHeight:1.6,whiteSpace:'pre-wrap',
              background:m.role==='user'?C.accent:C.surface,
              border:m.role==='user'?'none':`1px solid ${C.border}`,
              borderBottomRightRadius:m.role==='user'?3:10,borderBottomLeftRadius:m.role==='user'?10:3,
            }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{display:'flex',gap:5,padding:'6px 12px'}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:C.text2,animation:`pulse 1s ease ${i*.15}s infinite`}}/>)}</div>}
      </div>

      <div style={{padding:'10px 14px',borderTop:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
        <div style={{display:'flex',gap:6}}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send(input)}
            placeholder="Ask about study resources, strategies..."
            style={{flex:1,padding:'9px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface2,color:C.text,fontSize:12,outline:'none',fontFamily:sans}}/>
          <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{
            padding:'9px 14px',borderRadius:8,border:'none',background:input.trim()?C.accent:C.border,
            color:'#fff',fontSize:12,fontWeight:700,cursor:input.trim()?'pointer':'default',fontFamily:mono,
          }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════
//  MAIN APP
// ═══════════════════════════
export default function App() {
  const [authed, setAuthed] = useState(null);
  const [view, setView] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [uploads, setUploads] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Check auth
  useEffect(() => { api.checkAuth().then(d=>setAuthed(d.authenticated)).catch(()=>setAuthed(false)); }, []);

  // Load data
  useEffect(() => { if(authed) loadData(); }, [authed]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now=new Date(), s=new Date(now); s.setDate(now.getDate()-now.getDay()); s.setHours(0,0,0,0);
      const e=new Date(s); e.setDate(s.getDate()+7); e.setHours(23,59,59);
      const [calData,evtData,upData] = await Promise.all([
        api.getCalendars(), api.getEvents(s.toISOString().split('.')[0], e.toISOString().split('.')[0]), api.getUploads(),
      ]);
      setCalendars(calData.calendars||[]);
      setEvents(evtData.events||[]);
      setUploads(upData.uploads||{});
      setSelectedDay(dayKey(now.toISOString()));

      // Auto-generate insights
      const dayLoad={};
      (evtData.events||[]).forEach(ev=>{ const d=dayKey(ev.start); dayLoad[d]=(dayLoad[d]||0)+1; });
      const days=Object.entries(dayLoad).sort((a,b)=>b[1]-a[1]);
      const ins=[];
      if(days.length>0) ins.push({type:'danger',msg:`⚠ ${fmtDay(days[0][0])} is your busiest day (${days[0][1]} events). Avoid deep work then.`});
      if(days.length>1){ const l=days[days.length-1]; ins.push({type:'tip',msg:`💡 ${fmtDay(l[0])} is lightest (${l[1]} event${l[1]!==1?'s':''}). Great for focused study.`}); }
      ins.push({type:'info',msg:`📊 ${evtData.events?.length||0} events across ${calData.calendars?.length||0} calendars this week.`});
      setInsights(ins);
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  const toggle = id => setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));

  const handleUploaded = async (results) => {
    setUploadOpen(false);
    loadData(); // Refresh uploads
    setGenerating(true);
    try {
      const res = await api.generatePlan(tasks);
      if (res.plan) {
        if(res.plan.tasks) setTasks(res.plan.tasks.map((t,i)=>({...t,id:i+1,diff:t.difficulty,est:t.estimatedMinutes,done:false})));
        if(res.plan.insights) setInsights(prev=>[...prev,...res.plan.insights.map(i=>({type:i.type,msg:i.message}))]);
      }
    } catch(e){ console.error('Plan generation failed:',e); }
    setGenerating(false);
  };

  // ─── Not loaded yet ───
  if(authed===null) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg}}><Spinner text="Checking auth..."/></div>;

  // ─── Login Screen ───
  if(!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,flexDirection:'column',gap:20,fontFamily:sans}}>
      <style>{globalCSS}</style>
      <div style={{width:56,height:56,borderRadius:14,background:`linear-gradient(135deg,${C.accent},#F97316)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>⚙</div>
      <div style={{textAlign:'center'}}>
        <h1 style={{fontSize:26,fontWeight:700,fontFamily:mono,color:C.text}}>STUDYFLOW<span style={{color:C.accent}}>.ai</span></h1>
        <p style={{color:C.text2,fontSize:13,marginTop:4}}>AI study planner synced with your Google Calendar</p>
      </div>
      <a href={api.loginUrl()} style={{
        padding:'12px 28px',borderRadius:10,background:C.accent,color:'#fff',fontSize:14,fontWeight:700,
        textDecoration:'none',fontFamily:mono,boxShadow:'0 4px 20px rgba(232,93,38,.3)',display:'flex',alignItems:'center',gap:8,
      }}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Sign in with Google
      </a>
      <p style={{color:C.text2,fontSize:11,maxWidth:320,textAlign:'center',lineHeight:1.5}}>Read-only calendar access. Your data stays private.</p>
    </div>
  );

  // ─── Derived ───
  const totalEst=tasks.reduce((a,t)=>a+(t.est||0),0);
  const doneEst=tasks.filter(t=>t.done).reduce((a,t)=>a+(t.est||0),0);
  const prog=totalEst>0?Math.round(doneEst/totalEst*100):0;
  const eventsByDay={}; events.forEach(e=>{ const d=dayKey(e.start); if(!eventsByDay[d])eventsByDay[d]=[]; eventsByDay[d].push(e); });
  const dayKeys=Object.keys(eventsByDay).sort();
  const selEvents=selectedDay?(eventsByDay[selectedDay]||[]):[];
  const courseNames=[...new Set(events.map(e=>e.summary))].filter(Boolean);
  const uploadCount=Object.keys(uploads).length;

  return (
    <div style={{display:'flex',height:'100vh',background:C.bg,color:C.text,fontFamily:sans,overflow:'hidden'}}>
      <style>{globalCSS}</style>

      {uploadOpen && <UploadModal onClose={()=>setUploadOpen(false)} onUploaded={handleUploaded}/>}

      {/* Left: Main App */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Header */}
        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 18px',borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${C.accent},#F97316)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>⚙</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,fontFamily:mono}}>STUDYFLOW<span style={{color:C.accent}}>.ai</span></div>
              <div style={{fontSize:9,color:C.text2,display:'flex',alignItems:'center',gap:4}}>
                <span style={{width:5,height:5,borderRadius:'50%',background:C.green,display:'inline-block'}}/>
                {calendars.length} calendars · {uploadCount} upload{uploadCount!==1?'s':''}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:5}}>
            <button onClick={()=>setUploadOpen(true)} style={{padding:'6px 10px',borderRadius:7,border:`1px solid ${C.border}`,background:C.surface2,color:C.text,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:mono,display:'flex',alignItems:'center',gap:4}}>📄 Upload</button>
            <button onClick={()=>setChatOpen(!chatOpen)} style={{
              padding:'6px 10px',borderRadius:7,border:'none',background:chatOpen?C.purple:C.accent,
              color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:mono,transition:'all .2s',
            }}>{chatOpen?'✕ Close AI':'✦ Study AI'}</button>
            <button onClick={async()=>{await api.logout();setAuthed(false);}} style={{padding:'6px 10px',borderRadius:7,border:`1px solid ${C.border}`,background:'none',color:C.red,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:mono}}>Logout</button>
          </div>
        </header>

        {/* Nav */}
        <nav style={{display:'flex',padding:'0 18px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          {[{k:'dashboard',l:'Dashboard',i:'◉'},{k:'timeline',l:'Week',i:'▦'},{k:'tasks',l:'Tasks',i:'☰'}].map(t=>(
            <button key={t.k} onClick={()=>setView(t.k)} style={{
              padding:'10px 14px',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',background:'none',
              color:view===t.k?C.text:C.text2,borderBottom:view===t.k?`2px solid ${C.accent}`:'2px solid transparent',
              display:'flex',alignItems:'center',gap:5,
            }}><span>{t.i}</span>{t.l}</button>
          ))}
        </nav>

        {/* Content */}
        <main style={{flex:1,padding:'16px 18px',overflowY:'auto'}}>
          {loading||generating ? <Spinner text={generating?'AI generating study plan...':'Loading calendar...'}/> : (
            <>
              {/* ═══ DASHBOARD ═══ */}
              {view==='dashboard' && (
                <div style={{animation:'fadeIn .3s',display:'flex',flexDirection:'column',gap:13}}>
                  {/* Stats */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                    {[
                      {l:'Progress',v:`${prog}%`,s:`${tasks.filter(t=>t.done).length}/${tasks.length}`,c:C.accent},
                      {l:'Study Left',v:fmt(totalEst-doneEst),s:`of ${fmt(totalEst)}`,c:'#818CF8'},
                      {l:'Events',v:String(events.length),s:`${calendars.length} calendars`,c:C.green},
                      {l:'Uploads',v:String(uploadCount),s:uploadCount?Object.keys(uploads).join(', '):'None yet',c:C.yellow},
                    ].map((s,i)=>(
                      <div key={i} style={{padding:12,borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,animation:`slideUp .3s ease ${i*.05}s both`}}>
                        <div style={{fontSize:9,color:C.text2,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase'}}>{s.l}</div>
                        <div style={{fontSize:20,fontWeight:700,color:s.c,marginTop:3,fontFamily:mono}}>{s.v}</div>
                        <div style={{fontSize:10,color:C.text2,marginTop:1}}>{s.s}</div>
                      </div>
                    ))}
                  </div>

                  {/* Course pills */}
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {courseNames.slice(0,8).map((n,i)=>{
                      const colors=['#F97316','#818CF8','#34D399','#F472B6','#C084FC','#FBBF24','#60A5FA','#FB923C'];
                      const c=colors[i%colors.length];
                      return <span key={n} style={{padding:'3px 9px',borderRadius:14,fontSize:10,fontWeight:600,background:c+'15',color:c}}>{n}</span>;
                    })}
                    <span style={{padding:'3px 9px',borderRadius:14,fontSize:10,fontWeight:600,background:'rgba(52,211,153,.1)',color:C.green}}>📅 Calendar</span>
                    {uploadCount>0 && <span style={{padding:'3px 9px',borderRadius:14,fontSize:10,fontWeight:600,background:'rgba(167,139,250,.1)',color:C.purple}}>📎 {uploadCount} file{uploadCount>1?'s':''}</span>}
                  </div>

                  {/* Upload CTA if no uploads */}
                  {uploadCount===0 && (
                    <button onClick={()=>setUploadOpen(true)} style={{
                      padding:'13px 14px',borderRadius:10,border:`1px dashed ${C.border}`,background:C.surface,
                      color:C.text,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10,
                      animation:'slideUp .3s ease .15s both',
                    }}>
                      <div style={{fontSize:24}}>📄</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700}}>Upload your syllabus & assignments</div>
                        <div style={{fontSize:11,color:C.text2,marginTop:2}}>AI will parse them, estimate difficulty, and build a prioritized study plan around your calendar.</div>
                      </div>
                    </button>
                  )}

                  {/* Insights */}
                  {insights.length>0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:5}}>
                      <div style={{fontSize:9,fontWeight:700,color:C.text2,letterSpacing:'.06em',textTransform:'uppercase'}}>AI Insights</div>
                      {insights.slice(0,5).map((ins,i)=>(
                        <div key={i} style={{
                          padding:'9px 12px',borderRadius:8,fontSize:12,color:C.text,lineHeight:1.5,
                          background:ins.type==='danger'?'rgba(248,113,113,.06)':ins.type==='warn'?'rgba(251,191,36,.06)':ins.type==='info'?'rgba(129,140,248,.06)':'rgba(52,211,153,.06)',
                          border:`1px solid ${ins.type==='danger'?'rgba(248,113,113,.12)':ins.type==='warn'?'rgba(251,191,36,.12)':ins.type==='info'?'rgba(129,140,248,.12)':'rgba(52,211,153,.12)'}`,
                          animation:`slideUp .3s ease ${.15+i*.04}s both`,
                        }}>{ins.msg}</div>
                      ))}
                    </div>
                  )}

                  {/* AI CTA */}
                  {!chatOpen && (
                    <button onClick={()=>setChatOpen(true)} style={{
                      padding:'12px 14px',borderRadius:10,border:`1px solid rgba(167,139,250,.2)`,
                      background:'linear-gradient(135deg,rgba(167,139,250,.08),rgba(96,165,250,.08))',
                      color:C.text,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10,
                    }}>
                      <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.purple},${C.blue})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>✦</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700}}>Ask Study AI</div>
                        <div style={{fontSize:11,color:C.text2,marginTop:1}}>Get study resources, strategies, and help — powered by Gemini with your calendar + uploads</div>
                      </div>
                    </button>
                  )}

                  {/* Task Queue */}
                  {tasks.length>0 && (
                    <div>
                      <div style={{fontSize:9,fontWeight:700,color:C.text2,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:6}}>Priority Queue</div>
                      {tasks.filter(t=>!t.done).sort((a,b)=>(b.diff||b.difficulty||0)-(a.diff||a.difficulty||0)).slice(0,5).map((t,i)=>(
                        <div key={t.id} onClick={()=>toggle(t.id)} style={{
                          display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,
                          background:C.surface,border:`1px solid ${C.border}`,cursor:'pointer',marginBottom:4,
                          animation:`slideUp .25s ease ${.3+i*.04}s both`,
                        }}>
                          <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${C.accent}`,flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>
                            <div style={{display:'flex',gap:6,alignItems:'center',marginTop:2}}>
                              <Badge type={t.type}/><span style={{fontSize:10,color:C.text2}}>~{fmt(t.est||t.estimatedMinutes||60)}</span><Dots n={t.diff||t.difficulty||3}/>
                            </div>
                          </div>
                          <div style={{width:22,height:22,borderRadius:5,background:C.surface2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.accent,fontFamily:mono,flexShrink:0}}>{i+1}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TIMELINE ═══ */}
              {view==='timeline' && (
                <div style={{animation:'fadeIn .3s'}}>
                  <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
                    {dayKeys.map(d=>{
                      const isToday=d===dayKey(new Date().toISOString());
                      return (
                        <button key={d} onClick={()=>setSelectedDay(d)} style={{
                          flex:1,minWidth:50,padding:'6px 3px',borderRadius:7,border:`1px solid ${selectedDay===d?C.accent:C.border}`,
                          background:selectedDay===d?C.accent+'15':C.surface,color:selectedDay===d?C.accent:C.text2,
                          fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:mono,textAlign:'center',position:'relative',
                        }}>
                          {fmtDay(d).split(',')[0]}<div style={{fontSize:8,color:C.text2,marginTop:1}}>{(eventsByDay[d]||[]).length}e</div>
                          {isToday&&<span style={{position:'absolute',top:-3,right:-3,width:6,height:6,borderRadius:'50%',background:C.green}}/>}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDay&&<div style={{fontSize:14,fontWeight:700,fontFamily:mono,marginBottom:10}}>{fmtDay(selectedDay)}<span style={{fontSize:11,color:C.text2,fontWeight:400,marginLeft:8}}>{selEvents.length} event{selEvents.length!==1?'s':''}</span></div>}
                  <div style={{display:'flex',flexDirection:'column',position:'relative',paddingLeft:70}}>
                    <div style={{position:'absolute',left:50,top:0,bottom:0,width:2,background:`linear-gradient(180deg,${C.border},transparent)`}}/>
                    {selEvents.length>0?selEvents.map((ev,i)=>(
                      <div key={ev.id||i} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:8,position:'relative',animation:`slideUp .25s ease ${i*.04}s both`}}>
                        <div style={{position:'absolute',left:-24,width:16,height:16,borderRadius:'50%',background:ev.calendarColor||C.accent,border:`2px solid ${ev.calendarColor||C.accent}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#fff'}}>●</div>
                        <div style={{position:'absolute',left:-70,fontSize:9,color:C.text2,fontFamily:mono,fontWeight:600,width:38,textAlign:'right'}}>{fmtTime(ev.start).replace(' AM','a').replace(' PM','p')}</div>
                        <div style={{flex:1,padding:'10px 12px',borderRadius:8,background:(ev.calendarColor||C.accent)+'10',border:`1px solid ${(ev.calendarColor||C.accent)+'25'}`}}>
                          <div style={{fontSize:13,fontWeight:600}}>{ev.summary}</div>
                          <div style={{display:'flex',gap:6,marginTop:2}}>
                            <span style={{fontSize:10,color:ev.calendarColor||C.text2}}>{ev.calendarName}</span>
                            {ev.location&&<span style={{fontSize:10,color:C.text2}}>📍 {ev.location}</span>}
                          </div>
                        </div>
                      </div>
                    )):<div style={{textAlign:'center',padding:30,color:C.text2,fontSize:13}}>No events this day.</div>}
                  </div>
                </div>
              )}

              {/* ═══ TASKS ═══ */}
              {view==='tasks' && (
                <div style={{animation:'fadeIn .3s'}}>
                  {tasks.length===0 ? (
                    <div style={{textAlign:'center',padding:40}}>
                      <div style={{fontSize:36,marginBottom:12}}>📄</div>
                      <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>No tasks yet</div>
                      <div style={{fontSize:12,color:C.text2,marginBottom:16}}>Upload your syllabus and assignments to generate AI-powered tasks.</div>
                      <button onClick={()=>setUploadOpen(true)} style={{padding:'10px 20px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:mono}}>Upload Materials</button>
                    </div>
                  ) : (
                    <>
                      <div style={{display:'flex',gap:4,marginBottom:10,flexWrap:'wrap'}}>
                        {[...new Set(tasks.map(t=>t.course||t.cid).filter(Boolean))].slice(0,6).map((n,i)=>{
                          const colors=['#F97316','#818CF8','#34D399','#F472B6','#C084FC','#FBBF24'];
                          return <span key={n} style={{padding:'3px 9px',borderRadius:14,fontSize:10,fontWeight:600,background:colors[i%colors.length]+'15',color:colors[i%colors.length]}}>{n}</span>;
                        })}
                      </div>
                      {tasks.sort((a,b)=>a.done-b.done||((b.diff||b.difficulty||0)-(a.diff||a.difficulty||0))).map((t,i)=>(
                        <div key={t.id} onClick={()=>toggle(t.id)} style={{
                          display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,
                          background:t.done?C.bg:C.surface,border:`1px solid ${t.done?'transparent':C.border}`,
                          cursor:'pointer',opacity:t.done?.35:1,marginBottom:4,animation:`slideUp .2s ease ${i*.02}s both`,
                        }}>
                          <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${t.done?C.green:C.accent}`,background:t.done?C.green:'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',flexShrink:0}}>{t.done&&'✓'}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,textDecoration:t.done?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>
                            <div style={{display:'flex',gap:6,alignItems:'center',marginTop:2,flexWrap:'wrap'}}>
                              <Badge type={t.type}/>{t.course&&<span style={{fontSize:10,color:C.text2}}>{t.course}</span>}<span style={{fontSize:10,color:C.text2}}>~{fmt(t.est||t.estimatedMinutes||60)}</span><Dots n={t.diff||t.difficulty||3}/>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Right: AI Chat */}
      {chatOpen && (
        <div style={{width:360,flexShrink:0,animation:'slideLeft .3s ease',display:'flex',flexDirection:'column'}}>
          <AIChat onClose={()=>setChatOpen(false)}/>
        </div>
      )}
    </div>
  );
}

const globalCSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg};color:${C.text};font-family:'DM Sans',-apple-system,sans-serif}
  @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideLeft{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes spin{to{transform:rotate(360deg)}}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
`;
