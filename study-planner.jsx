import { useState, useEffect, useRef } from "react";

const C = {accent:'#E85D26',bg:'#0A0A0D',surface:'#131316',surface2:'#1A1A1F',border:'#252530',text:'#EEEAE6',text2:'#7D7D8A',green:'#34D399',yellow:'#FBBF24',red:'#F87171',purple:'#A78BFA',blue:'#60A5FA'};
const mono="'Space Mono',monospace";

const COURSES=[{id:"lj111",n:"LJ111",f:"LJ111 — Language",c:"#F97316",i:"文",l:"PSY B41"},{id:"cs412",n:"CS412",f:"CS412 — Computer Science",c:"#818CF8",i:"⚡",l:"CDS B62"},{id:"ec204",n:"EC204",f:"EC204 — Economics",c:"#34D399",i:"$",l:"CAS 222"},{id:"cs391",n:"CS391",f:"CS391 — CS Seminar",c:"#F472B6",i:"◈",l:"SCI 113"},{id:"cds219",n:"CDS219",f:"CDS219 — Data Science",c:"#C084FC",i:"◉"},{id:"h4i",n:"H4I",f:"H4I — Infrastructure",c:"#FB923C",i:"⚙"}];
const CM={};COURSES.forEach(c=>CM[c.id]=c);

const SCHED={"Sun 3/8":[{t:"3:00 PM",l:"H4I Infrastructure Meeting",cid:"h4i",tp:"meeting"}],"Mon 3/9":[{t:"11:15 AM",l:"LJ111",cid:"lj111",tp:"class",loc:"PSY B41"}],"Tue 3/10":[{t:"11:00 AM",l:"CS412",cid:"cs412",tp:"class",loc:"CDS B62"},{t:"12:30 PM",l:"EC204",cid:"ec204",tp:"class",loc:"CAS 222"},{t:"3:30 PM",l:"CS391 A1",cid:"cs391",tp:"class",loc:"SCI 113"}],"Wed 3/11":[{t:"11:15 AM",l:"LJ111",cid:"lj111",tp:"class",loc:"PSY B41"},{t:"4:30 PM",l:"CDS219",cid:"cds219",tp:"class"}],"Thu 3/12":[{t:"11:00 AM",l:"CS412",cid:"cs412",tp:"class",loc:"CDS B62"},{t:"12:30 PM",l:"EC204",cid:"ec204",tp:"class",loc:"CAS 222"},{t:"3:30 PM",l:"CS391 A1",cid:"cs391",tp:"class",loc:"SCI 113"}],"Fri 3/13":[{t:"11:15 AM",l:"LJ111",cid:"lj111",tp:"class",loc:"PSY B41"},{t:"12:20 PM",l:"CS391 DIS",cid:"cs391",tp:"class",loc:"CAS218"}],"Sat 3/14":[]};
const DAYS=Object.keys(SCHED);

const INIT_TASKS=[
  {id:1,cid:"cs412",title:"Review lecture notes — Week 7",type:"review",diff:3,est:45,due:"Tue 3/10",done:false},
  {id:2,cid:"cs391",title:"Problem Set #5",type:"assignment",diff:5,est:180,due:"Thu 3/12",done:false},
  {id:3,cid:"ec204",title:"Read Ch. 11 — Market Structures",type:"reading",diff:3,est:60,due:"Tue 3/10",done:false},
  {id:4,cid:"lj111",title:"Vocab quiz prep — Unit 9",type:"review",diff:2,est:30,due:"Mon 3/9",done:false},
  {id:5,cid:"cds219",title:"Lab 4 — Data Wrangling",type:"assignment",diff:4,est:120,due:"Wed 3/11",done:false},
  {id:6,cid:"cs412",title:"Midterm study — Algorithms",type:"review",diff:5,est:150,due:"Fri 3/13",done:false},
  {id:7,cid:"ec204",title:"PS #4 — Supply & Demand",type:"assignment",diff:3,est:90,due:"Thu 3/12",done:false},
  {id:8,cid:"cs391",title:"Read: Ethics in AI paper",type:"reading",diff:2,est:40,due:"Fri 3/13",done:false},
  {id:9,cid:"lj111",title:"Essay draft — Cultural comparison",type:"assignment",diff:4,est:120,due:"Fri 3/13",done:false},
  {id:10,cid:"cds219",title:"Watch lecture — Regression",type:"lecture",diff:2,est:50,due:"Wed 3/11",done:false},
];

const INSIGHTS=[
  {tp:"danger",m:"⚠ Tue & Thu are packed — 3 classes each. Don't schedule deep work on those afternoons."},
  {tp:"tip",m:"💡 Monday is wide open. Front-load CS391 PS#5 before your busy Tue–Thu block."},
  {tp:"info",m:"📊 14.5 hrs study + 10.5 hrs classes this week. Start Sunday for breathing room."},
  {tp:"warn",m:"🔥 Friday deadline cluster — CS412 midterm, CS391 reading, LJ111 essay all due."},
];

const fmt=m=>{const h=Math.floor(m/60),mn=m%60;return h===0?`${mn}m`:mn===0?`${h}h`:`${h}h ${mn}m`;};
const Badge=({type})=>{const m={reading:{b:'#1a2744',c:'#60A5FA',l:'Read'},assignment:{b:'#3b1c1c',c:'#F87171',l:'HW'},lecture:{b:'#1a2e2a',c:'#34D399',l:'Lec'},review:{b:'#2a1a2e',c:'#C084FC',l:'Rev'}};const s=m[type]||m.reading;return<span style={{fontSize:9,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',background:s.b,color:s.c,padding:'2px 7px',borderRadius:4}}>{s.l}</span>;};
const Dots=({n})=><div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:5,height:5,borderRadius:'50%',background:i<=n?(n>=4?C.red:n>=3?C.yellow:C.green):C.border}}/>)}</div>;

// ─── Upload Modal ───
function UploadModal({onClose,onDone}){
  const[files,setFiles]=useState({syllabus:null,schedule:null,assignments:null});
  const[phase,setPhase]=useState('pick');
  const[prog,setProg]=useState(0);
  const go=()=>{setPhase('proc');let p=0;const iv=setInterval(()=>{p+=Math.random()*15+5;if(p>=100){p=100;clearInterval(iv);setTimeout(()=>onDone(),500);}setProg(Math.min(p,100));},250);};
  return(
    <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width:460,maxWidth:'90vw',animation:'slideUp .3s ease'}}>
        <h2 style={{fontSize:18,fontWeight:700,fontFamily:mono,color:C.text,margin:0}}>Upload Course Materials</h2>
        <p style={{color:C.text2,fontSize:12,marginTop:4}}>Upload your syllabus, schedule & assignments. AI parses and builds your study plan.</p>
        {phase==='pick'?(
          <>
            {['syllabus','schedule','assignments'].map(k=>(
              <div key={k} onClick={()=>setFiles(f=>({...f,[k]:k+'.pdf'}))} style={{marginTop:12,padding:14,borderRadius:10,border:`1px dashed ${files[k]?C.green:C.border}`,background:files[k]?'rgba(52,211,153,.05)':C.surface2,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><div style={{color:C.text,fontSize:13,fontWeight:600,textTransform:'capitalize'}}>{k}</div><div style={{color:C.text2,fontSize:11,marginTop:2}}>{files[k]?`✓ ${k}.pdf`:'Click to select PDF, DOCX, or TXT'}</div></div>
                  <div style={{fontSize:18}}>{files[k]?'✅':'📄'}</div>
                </div>
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={onClose} style={{flex:1,padding:'10px',borderRadius:8,border:`1px solid ${C.border}`,background:'none',color:C.text2,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:mono}}>Cancel</button>
              <button onClick={go} disabled={!Object.values(files).some(Boolean)} style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:Object.values(files).some(Boolean)?C.accent:C.border,color:Object.values(files).some(Boolean)?'#fff':C.text2,fontSize:12,fontWeight:700,cursor:Object.values(files).some(Boolean)?'pointer':'default',fontFamily:mono}}>Upload & Generate Plan →</button>
            </div>
          </>
        ):(
          <div style={{marginTop:20}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{color:C.text,fontSize:12,fontWeight:600}}>{prog<20?'Reading Google Calendar...':prog<40?'Parsing uploaded documents...':prog<60?'Estimating task difficulty...':prog<80?'Scheduling around your classes...':'Generating priority queue...'}</span>
              <span style={{color:C.accent,fontSize:12,fontWeight:700,fontFamily:mono}}>{Math.round(prog)}%</span>
            </div>
            <div style={{height:5,background:C.border,borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',background:`linear-gradient(90deg,${C.accent},#F97316)`,borderRadius:3,width:`${prog}%`,transition:'width .2s'}}/></div>
            <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:14}}>
              {['Connected to Google Calendar — 5 courses found','Parsed 3 documents — extracted assignments & deadlines','Mapped 10 tasks with difficulty & time estimates','Scheduled study blocks around Tue/Thu heavy days'].map((s,i)=>(
                <div key={i} style={{color:prog>(i+1)*22?C.green:C.text2,fontSize:11,opacity:prog>i*22?1:.3,transition:'all .3s',display:'flex',alignItems:'center',gap:5}}>
                  <span>{prog>(i+1)*22?'✓':'○'}</span>{s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Chat ───
function AIChat({tasks,onClose}){
  const[msgs,setMsgs]=useState([]);
  const[input,setInput]=useState('');
  const[loading,setLoading]=useState(false);
  const ref=useRef();
  useEffect(()=>{ref.current&&(ref.current.scrollTop=ref.current.scrollHeight);},[msgs]);

  const SYS=`You are StudyFlow AI, an expert study advisor. The student's real Google Calendar schedule:
- LJ111 (Language): MWF 11:15 AM @ PSY B41
- CS412 (Computer Science): TuTh 11:00 AM @ CDS B62
- EC204 (Economics): TuTh 12:30 PM @ CAS 222
- CS391 A1 (CS Seminar): TuTh 3:30 PM @ SCI 113
- CS391 DIS: Fri 12:20 PM @ CAS218
- CDS219 (Data Science): Wed 4:30 PM
- H4I Meeting: Sun 3:00 PM

Tasks: ${tasks.map(t=>`[${t.done?'DONE':'TODO'}] ${t.title} (diff ${t.diff}/5, ~${fmt(t.est)}, due ${t.due})`).join('; ')}

Help with study resources, strategies, time management, course help. Be concise and actionable.`;

  const suggestions=["What resources for CS412 midterm?","Help me plan this week's studying","Best order to tackle my tasks?","Recommend EC204 practice problems","Explain dynamic programming simply"];

  const send=async(text)=>{
    if(!text?.trim()||loading)return;
    const um={role:'user',content:text};const nm=[...msgs,um];setMsgs(nm);setInput('');setLoading(true);
    try{
      const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:SYS,messages:nm.map(m=>({role:m.role,content:m.content}))})});
      const d=await r.json();const t=d.content?.map(b=>b.text||'').join('')||'No response.';
      setMsgs([...nm,{role:'assistant',content:t}]);
    }catch(e){setMsgs([...nm,{role:'assistant',content:`Error: ${e.message}`}]);}
    setLoading(false);
  };

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:C.bg,borderLeft:`1px solid ${C.border}`}}>
      <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`,background:C.surface,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:24,height:24,borderRadius:6,background:`linear-gradient(135deg,${C.purple},${C.blue})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>✦</div>
          <div><div style={{fontSize:12,fontWeight:700,fontFamily:mono}}>Study AI</div><div style={{fontSize:9,color:C.green}}>Claude · Calendar + Uploads</div></div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:C.text2,fontSize:16,cursor:'pointer'}}>✕</button>
      </div>
      <div ref={ref} style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
        {msgs.length===0&&(
          <div style={{animation:'fadeIn .4s'}}>
            <div style={{padding:12,borderRadius:9,background:C.surface,border:`1px solid ${C.border}`,marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>👋 I'm your study assistant.</div>
              <div style={{fontSize:11,color:C.text2,lineHeight:1.5}}>I see your Google Calendar and uploaded materials. Ask for resources, strategies, or course help.</div>
            </div>
            <div style={{fontSize:9,fontWeight:700,color:C.text2,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:5}}>Try asking</div>
            {suggestions.map((q,i)=><button key={i} onClick={()=>send(q)} style={{display:'block',width:'100%',padding:'8px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,color:C.text,fontSize:11,cursor:'pointer',textAlign:'left',marginBottom:4}}>{q}</button>)}
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',animation:'slideUp .2s'}}>
            <div style={{maxWidth:'85%',padding:'8px 11px',borderRadius:9,fontSize:12,lineHeight:1.6,whiteSpace:'pre-wrap',background:m.role==='user'?C.accent:C.surface,border:m.role==='user'?'none':`1px solid ${C.border}`,borderBottomRightRadius:m.role==='user'?3:9,borderBottomLeftRadius:m.role==='user'?9:3}}>{m.content}</div>
          </div>
        ))}
        {loading&&<div style={{display:'flex',gap:5,padding:'5px 10px'}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:C.text2,animation:`pulse 1s ease ${i*.15}s infinite`}}/>)}</div>}
      </div>
      <div style={{padding:'9px 12px',borderTop:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
        <div style={{display:'flex',gap:6}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send(input)} placeholder="Ask about study resources..." style={{flex:1,padding:'8px 11px',borderRadius:7,border:`1px solid ${C.border}`,background:C.surface2,color:C.text,fontSize:12,outline:'none'}}/>
          <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{padding:'8px 13px',borderRadius:7,border:'none',background:input.trim()?C.accent:C.border,color:'#fff',fontSize:12,fontWeight:700,cursor:input.trim()?'pointer':'default',fontFamily:mono}}>→</button>
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN ═══
export default function App(){
  const[view,setView]=useState('dashboard');
  const[tasks,setTasks]=useState(INIT_TASKS);
  const[day,setDay]=useState('Mon 3/9');
  const[chat,setChat]=useState(false);
  const[upload,setUpload]=useState(false);
  const[uploaded,setUploaded]=useState(false);

  const toggle=id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));
  const tot=tasks.reduce((a,t)=>a+t.est,0);
  const done=tasks.filter(t=>t.done).reduce((a,t)=>a+t.est,0);
  const prog=tot>0?Math.round(done/tot*100):0;
  const evts=SCHED[day]||[];

  return(
    <div style={{display:'flex',height:'100vh',background:C.bg,color:C.text,fontFamily:"'DM Sans',-apple-system,sans-serif",overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideLeft{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
      `}</style>
      {upload&&<UploadModal onClose={()=>setUpload(false)} onDone={()=>{setUpload(false);setUploaded(true);}}/>}

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 18px',borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${C.accent},#F97316)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>⚙</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,fontFamily:mono}}>STUDYFLOW<span style={{color:C.accent}}>.ai</span></div>
              <div style={{fontSize:9,color:C.text2,display:'flex',alignItems:'center',gap:4}}>
                <span style={{width:5,height:5,borderRadius:'50%',background:C.green,display:'inline-block'}}/>
                GOOGLE CALENDAR SYNCED · 5 COURSES{uploaded?' · 3 UPLOADS':''}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:5}}>
            <button onClick={()=>setUpload(true)} style={{padding:'6px 10px',borderRadius:7,border:`1px solid ${C.border}`,background:C.surface2,color:C.text,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:mono}}>📄 Upload</button>
            <button onClick={()=>setChat(!chat)} style={{padding:'6px 10px',borderRadius:7,border:'none',background:chat?C.purple:C.accent,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:mono,transition:'all .2s'}}>{chat?'✕ Close AI':'✦ Study AI'}</button>
          </div>
        </header>

        <nav style={{display:'flex',padding:'0 18px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          {[{k:'dashboard',l:'Dashboard',i:'◉'},{k:'timeline',l:'Week',i:'▦'},{k:'tasks',l:'Tasks',i:'☰'}].map(t=>(
            <button key={t.k} onClick={()=>setView(t.k)} style={{padding:'10px 14px',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',background:'none',color:view===t.k?C.text:C.text2,borderBottom:view===t.k?`2px solid ${C.accent}`:'2px solid transparent',display:'flex',alignItems:'center',gap:5}}><span>{t.i}</span>{t.l}</button>
          ))}
        </nav>

        <main style={{flex:1,padding:'16px 18px',overflowY:'auto'}}>
          {view==='dashboard'&&(
            <div style={{animation:'fadeIn .3s',display:'flex',flexDirection:'column',gap:13}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {[{l:'Progress',v:`${prog}%`,s:`${tasks.filter(t=>t.done).length}/${tasks.length}`,c:C.accent},{l:'Study Left',v:fmt(tot-done),s:`of ${fmt(tot)}`,c:'#818CF8'},{l:'Classes',v:'11',s:'5 courses',c:C.green},{l:'Uploads',v:uploaded?'3':'0',s:uploaded?'syllabus, schedule, HW':'Upload materials →',c:C.yellow}].map((s,i)=>(
                  <div key={i} style={{padding:12,borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,animation:`slideUp .3s ease ${i*.05}s both`}}>
                    <div style={{fontSize:9,color:C.text2,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase'}}>{s.l}</div>
                    <div style={{fontSize:20,fontWeight:700,color:s.c,marginTop:3,fontFamily:mono}}>{s.v}</div>
                    <div style={{fontSize:10,color:C.text2,marginTop:1}}>{s.s}</div>
                  </div>
                ))}
              </div>

              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {COURSES.filter(c=>c.id!=='h4i').map(c=><span key={c.id} style={{padding:'3px 9px',borderRadius:14,fontSize:10,fontWeight:600,background:c.c+'15',color:c.c}}>{c.i} {c.n}</span>)}
                <span style={{padding:'3px 9px',borderRadius:14,fontSize:10,fontWeight:600,background:'rgba(52,211,153,.1)',color:C.green}}>📅 Calendar</span>
                {uploaded&&<span style={{padding:'3px 9px',borderRadius:14,fontSize:10,fontWeight:600,background:'rgba(167,139,250,.1)',color:C.purple}}>📎 3 files</span>}
              </div>

              {!uploaded&&(
                <button onClick={()=>setUpload(true)} style={{padding:'13px 14px',borderRadius:10,border:`1px dashed ${C.border}`,background:C.surface,color:C.text,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10,animation:'slideUp .3s ease .1s both'}}>
                  <div style={{fontSize:24}}>📄</div>
                  <div><div style={{fontSize:12,fontWeight:700}}>Upload syllabus & assignments</div><div style={{fontSize:11,color:C.text2,marginTop:2}}>AI parses them and builds a prioritized study plan around your calendar.</div></div>
                </button>
              )}

              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <div style={{fontSize:9,fontWeight:700,color:C.text2,letterSpacing:'.06em',textTransform:'uppercase'}}>AI Insights</div>
                {INSIGHTS.map((ins,i)=>(
                  <div key={i} style={{padding:'9px 12px',borderRadius:8,fontSize:12,color:C.text,lineHeight:1.5,background:ins.tp==='danger'?'rgba(248,113,113,.06)':ins.tp==='warn'?'rgba(251,191,36,.06)':ins.tp==='info'?'rgba(129,140,248,.06)':'rgba(52,211,153,.06)',border:`1px solid ${ins.tp==='danger'?'rgba(248,113,113,.12)':ins.tp==='warn'?'rgba(251,191,36,.12)':ins.tp==='info'?'rgba(129,140,248,.12)':'rgba(52,211,153,.12)'}`,animation:`slideUp .3s ease ${.15+i*.04}s both`}}>{ins.m}</div>
                ))}
              </div>

              {!chat&&(
                <button onClick={()=>setChat(true)} style={{padding:'12px 14px',borderRadius:10,border:'1px solid rgba(167,139,250,.2)',background:'linear-gradient(135deg,rgba(167,139,250,.08),rgba(96,165,250,.08))',color:C.text,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.purple},${C.blue})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>✦</div>
                  <div><div style={{fontSize:12,fontWeight:700}}>Ask Study AI</div><div style={{fontSize:11,color:C.text2,marginTop:1}}>Study resources, strategies, course help — powered by AI with your calendar + uploads</div></div>
                </button>
              )}

              <div>
                <div style={{fontSize:9,fontWeight:700,color:C.text2,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:6}}>Priority Queue</div>
                {tasks.filter(t=>!t.done).sort((a,b)=>b.diff-a.diff).slice(0,5).map((t,i)=>{const co=CM[t.cid];return(
                  <div key={t.id} onClick={()=>toggle(t.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:C.surface,border:`1px solid ${C.border}`,cursor:'pointer',marginBottom:4,animation:`slideUp .25s ease ${.3+i*.04}s both`}}>
                    <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${co.c}`,flexShrink:0}}/>
                    <div style={{width:18,height:18,borderRadius:5,background:co.c+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0}}>{co.i}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div><div style={{display:'flex',gap:6,alignItems:'center',marginTop:2}}><Badge type={t.type}/><span style={{fontSize:10,color:C.text2}}>Due {t.due}</span><span style={{fontSize:10,color:C.text2}}>~{fmt(t.est)}</span><Dots n={t.diff}/></div></div>
                    <div style={{width:22,height:22,borderRadius:5,background:C.surface2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.accent,fontFamily:mono,flexShrink:0}}>{i+1}</div>
                  </div>
                );})}
              </div>
            </div>
          )}

          {view==='timeline'&&(
            <div style={{animation:'fadeIn .3s'}}>
              <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
                {DAYS.map(d=><button key={d} onClick={()=>setDay(d)} style={{flex:1,minWidth:48,padding:'6px 3px',borderRadius:7,border:`1px solid ${day===d?C.accent:C.border}`,background:day===d?C.accent+'15':C.surface,color:day===d?C.accent:C.text2,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:mono,textAlign:'center'}}>{d.split(' ')[0]}<div style={{fontSize:8,color:C.text2,marginTop:1}}>{(SCHED[d]||[]).length}e</div></button>)}
              </div>
              <div style={{fontSize:14,fontWeight:700,fontFamily:mono,marginBottom:10}}>{day}<span style={{fontSize:11,color:C.text2,fontWeight:400,marginLeft:8}}>{evts.length} event{evts.length!==1?'s':''}</span></div>
              <div style={{display:'flex',flexDirection:'column',position:'relative',paddingLeft:70}}>
                <div style={{position:'absolute',left:50,top:0,bottom:0,width:2,background:`linear-gradient(180deg,${C.border},transparent)`}}/>
                {evts.length>0?evts.map((ev,i)=>{const co=ev.cid?CM[ev.cid]:null;return(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:8,position:'relative',animation:`slideUp .25s ease ${i*.04}s both`}}>
                    <div style={{position:'absolute',left:-24,width:16,height:16,borderRadius:'50%',background:co?.c||C.accent,border:`2px solid ${co?.c||C.accent}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#fff'}}>●</div>
                    <div style={{position:'absolute',left:-70,fontSize:9,color:C.text2,fontFamily:mono,fontWeight:600,width:38,textAlign:'right'}}>{ev.t.replace(' AM','a').replace(' PM','p')}</div>
                    <div style={{flex:1,padding:'10px 12px',borderRadius:8,background:(co?.c||C.accent)+'10',border:`1px solid ${(co?.c||C.accent)+'25'}`}}>
                      <div style={{fontSize:13,fontWeight:600}}>{ev.l}</div>
                      <div style={{display:'flex',gap:6,marginTop:2}}>{co&&<span style={{fontSize:10,color:co.c}}>{co.f}</span>}{ev.loc&&<span style={{fontSize:10,color:C.text2}}>📍 {ev.loc}</span>}</div>
                    </div>
                  </div>
                );}):<div style={{textAlign:'center',padding:30,color:C.text2,fontSize:13}}>Free day! 🎉</div>}
              </div>
            </div>
          )}

          {view==='tasks'&&(
            <div style={{animation:'fadeIn .3s'}}>
              <div style={{display:'flex',gap:4,marginBottom:10,flexWrap:'wrap'}}>
                {COURSES.filter(c=>c.id!=='h4i').map(c=><span key={c.id} style={{padding:'3px 9px',borderRadius:14,fontSize:10,fontWeight:600,background:c.c+'15',color:c.c}}>{c.i} {c.n}</span>)}
              </div>
              {tasks.sort((a,b)=>a.done-b.done||b.diff-a.diff).map((t,i)=>{const co=CM[t.cid];return(
                <div key={t.id} onClick={()=>toggle(t.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:t.done?C.bg:C.surface,border:`1px solid ${t.done?'transparent':C.border}`,cursor:'pointer',opacity:t.done?.35:1,marginBottom:4,animation:`slideUp .2s ease ${i*.02}s both`}}>
                  <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${t.done?C.green:co.c}`,background:t.done?C.green:'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',flexShrink:0}}>{t.done&&'✓'}</div>
                  <div style={{width:18,height:18,borderRadius:5,background:co.c+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0}}>{co.i}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,textDecoration:t.done?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div><div style={{display:'flex',gap:6,alignItems:'center',marginTop:2}}><Badge type={t.type}/><span style={{fontSize:10,color:C.text2}}>Due {t.due}</span><span style={{fontSize:10,color:C.text2}}>~{fmt(t.est)}</span><Dots n={t.diff}/></div></div>
                </div>
              );})}
            </div>
          )}
        </main>
      </div>

      {chat&&<div style={{width:360,flexShrink:0,animation:'slideLeft .3s',display:'flex',flexDirection:'column'}}><AIChat tasks={tasks} onClose={()=>setChat(false)}/></div>}
    </div>
  );
}
