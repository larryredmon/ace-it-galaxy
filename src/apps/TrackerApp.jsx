// Split out of App.jsx so this code only downloads when it is needed.
import { useState, useRef, useEffect } from "react";
import { aiFetch, tpSync } from "../shared.jsx";
import { Icon } from "../shared.jsx";

// ─── Tracker App ─────────────────────────────────────────────────────────────

function TrackerApp({ onBack, user, openAuth }) {
  const TR="#2BAE7E",TRL="#6ED9B8",TRD="#1A6B4A";
  const PC={high:"#E85D3F",medium:"#D4A830",low:"#2BAE7E"},PB={high:"#FEF2F2",medium:"#FFFBEB",low:"#F0FDF4"};
  const [tab,setTab]=useState("today");
  const [tasks,setTasks]=useState(()=>{try{return JSON.parse(localStorage.getItem("tp_tracker_tasks")||"[]");}catch{return [];}});
  const [courses,setCourses]=useState(()=>{try{return JSON.parse(localStorage.getItem("tp_courses")||"[]");}catch{return [];}});
  const [menuOpen,setMenuOpen]=useState(false);
  const [sortBy,setSortBy]=useState("date");
  const [showDone,setShowDone]=useState(true);
  const [filter,setFilter]=useState("all");
  const [newTask,setNewTask]=useState(""),[newDate,setNewDate]=useState(""),[newCourse,setNewCourse]=useState(""),[newPriority,setNewPriority]=useState("medium"),[newNotes,setNewNotes]=useState(""),[showAddForm,setShowAddForm]=useState(false);
  const [editingId,setEditingId]=useState(null),[editForm,setEditForm]=useState({});
  const [calMonth,setCalMonth]=useState(new Date()),[calDayModal,setCalDayModal]=useState(null);
  const [expandedTask,setExpandedTask]=useState(null),[newSubtask,setNewSubtask]=useState("");
  const [showAIImport,setShowAIImport]=useState(false),[aiImportImg,setAIImportImg]=useState(null),[aiImporting,setAIImporting]=useState(false),[aiImportResult,setAIImportResult]=useState(null);
  const trackerMounted=useRef(false);
  useEffect(()=>{if(!trackerMounted.current){trackerMounted.current=true;return;}try{localStorage.setItem("tp_tracker_tasks",JSON.stringify(tasks));}catch{}tpSync("tp_tracker_tasks",tasks);},[tasks]);
  const addTask=(o={})=>{const title=o.title||newTask.trim();if(!title)return;setTasks(p=>[{id:Date.now(),title,course:o.course||newCourse,courseColor:courses.find(c=>c.name===(o.course||newCourse))?.color||TR,date:o.date||newDate,priority:o.priority||newPriority,notes:o.notes||newNotes,done:false,subtasks:[],createdAt:new Date().toISOString()},...p]);setNewTask("");setNewDate("");setNewCourse("");setNewPriority("medium");setNewNotes("");setShowAddForm(false);};
  const toggleTask=id=>setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));
  const deleteTask=id=>setTasks(p=>p.filter(t=>t.id!==id));
  const startEdit=t=>{setEditingId(t.id);setEditForm({title:t.title,date:t.date||"",course:t.course||"",priority:t.priority,notes:t.notes||""});};
  const saveEdit=id=>{setTasks(p=>p.map(t=>t.id===id?{...t,...editForm,courseColor:courses.find(c=>c.name===editForm.course)?.color||TR}:t));setEditingId(null);};
  const addSubtask=tid=>{if(!newSubtask.trim())return;setTasks(p=>p.map(t=>t.id===tid?{...t,subtasks:[...(t.subtasks||[]),{id:Date.now(),text:newSubtask.trim(),done:false}]}:t));setNewSubtask("");};
  const toggleSubtask=(tid,sid)=>setTasks(p=>p.map(t=>t.id===tid?{...t,subtasks:(t.subtasks||[]).map(s=>s.id===sid?{...s,done:!s.done}:s)}:t));
  const deleteSubtask=(tid,sid)=>setTasks(p=>p.map(t=>t.id===tid?{...t,subtasks:(t.subtasks||[]).filter(s=>s.id!==sid)}:t));
  const downloadICS=task=>{const n=new Date(),ds=n.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z",dt=task.date?task.date.replace(/-/g,"")+"T090000Z":ds;const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Ace It//EN","BEGIN:VEVENT",`DTSTAMP:${ds}`,`DTSTART:${dt}`,`SUMMARY:${task.title}${task.course?` (${task.course})`:""}`,`DESCRIPTION:Priority: ${task.priority}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");const a=document.createElement("a");a.href="data:text/calendar;charset=utf-8,"+encodeURIComponent(ics);a.download=task.title.replace(/\s+/g,"-")+".ics";a.click();};
  const handleAIImport=async()=>{if(!aiImportImg)return;setAIImporting(true);setAIImportResult(null);try{const res=await aiFetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1500,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:aiImportImg.type,data:aiImportImg.data}},{type:"text",text:'Extract ALL tasks, assignments and deadlines. Respond ONLY with JSON: {"tasks":[{"title":"...","date":"YYYY-MM-DD or empty","priority":"high|medium|low","course":"or empty","notes":"extra details"}]}'}]}]})});const data=await res.json();const txt=data.content?.find(b=>b.type==="text")?.text||"";const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());setAIImportResult(parsed.tasks||[]);}catch(e){console.error(e);setAIImportResult([]);}setAIImporting(false);};
  const importAITasks=ts=>{ts.forEach(t=>addTask({title:t.title,date:t.date||"",course:t.course||"",priority:t.priority||"medium",notes:t.notes||""}));setShowAIImport(false);setAIImportImg(null);setAIImportResult(null);};
  const sortTasks=arr=>{const s=[...arr],p={high:0,medium:1,low:2};if(sortBy==="priority")s.sort((a,b)=>(p[a.priority]||1)-(p[b.priority]||1));else if(sortBy==="date")s.sort((a,b)=>!a.date&&!b.date?0:!a.date?1:!b.date?-1:new Date(a.date)-new Date(b.date));else if(sortBy==="course")s.sort((a,b)=>(a.course||"").localeCompare(b.course||""));else s.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));return s;};
  const todayStr=new Date().toISOString().split("T")[0];
  const getF=ex=>{let a=tasks;if(!showDone)a=a.filter(t=>!t.done);if(filter==="active")a=a.filter(t=>!t.done);else if(filter==="done")a=a.filter(t=>t.done);else if(filter!=="all")a=a.filter(t=>t.course===filter);if(ex)a=ex(a);return sortTasks(a);};
  const todayTasks=getF(a=>a.filter(t=>t.date===todayStr));
  const overdueTasks=getF(a=>a.filter(t=>!t.done&&t.date&&t.date<todayStr));
  const upcomingTasks=getF(a=>a.filter(t=>!t.done&&t.date&&t.date>todayStr));
  const allFiltered=getF();
  const getDIM=d=>new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const getFD=d=>new Date(d.getFullYear(),d.getMonth(),1).getDay();
  const tasksForDay=day=>{const ds=`${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;return tasks.filter(t=>t.date===ds);};
  const cp=courses.map(c=>{const ct=tasks.filter(t=>t.course===c.name),d=ct.filter(t=>t.done).length;return{...c,total:ct.length,done:d,pct:ct.length?Math.round(d/ct.length*100):0};});

  const TaskCard=({t})=>{
    const isEd=editingId===t.id,isEx=expandedTask===t.id,isOD=!t.done&&t.date&&t.date<todayStr;
    const sd=(t.subtasks||[]).filter(s=>s.done).length,st=(t.subtasks||[]).length;
    if(isEd)return(<div style={{background:"#fff",border:`2px solid ${TR}`,borderRadius:14,padding:"16px 18px",marginBottom:8}}>
      <input value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")saveEdit(t.id);e.stopPropagation();}} style={{width:"100%",padding:"8px 10px",border:`1.5px solid ${TRL}`,borderRadius:8,fontSize:14,fontWeight:600,color:"#1A1814",outline:"none",marginBottom:8,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}} onFocus={e=>e.target.style.borderColor=TR} onBlur={e=>e.target.style.borderColor=TRL}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
        <input type="date" value={editForm.date} onChange={e=>setEditForm(f=>({...f,date:e.target.value}))} style={{padding:"7px",border:`1.5px solid ${TRL}`,borderRadius:8,fontSize:12,color:"#1A1814",outline:"none"}}/>
        <select value={editForm.course} onChange={e=>setEditForm(f=>({...f,course:e.target.value}))} style={{padding:"7px",border:`1.5px solid ${TRL}`,borderRadius:8,fontSize:12,color:"#1A1814",outline:"none"}}><option value="">No Course</option>{courses.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
        <select value={editForm.priority} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))} style={{padding:"7px",border:`1.5px solid ${TRL}`,borderRadius:8,fontSize:12,color:"#1A1814",outline:"none"}}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      </div>
      <textarea value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} placeholder="Notes" onKeyDown={e=>e.stopPropagation()} style={{width:"100%",padding:"7px",border:`1.5px solid ${TRL}`,borderRadius:8,fontSize:12,resize:"none",minHeight:48,marginBottom:10,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
      <div style={{display:"flex",gap:8}}><button onClick={()=>saveEdit(t.id)} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:TR,fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff"}}>Save</button><button onClick={()=>setEditingId(null)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${TRL}`,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:"#5A5752"}}>Cancel</button></div>
    </div>);
    return(<div style={{background:"#fff",border:`1px solid ${isOD?"#FECACA":TRL}66`,borderRadius:12,borderLeft:`4px solid ${isOD?"#E85D3F":t.courseColor||TR}`,marginBottom:8,overflow:"hidden"}}>
      <div className="tr-task" style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px"}}>
        <div onClick={()=>toggleTask(t.id)} style={{width:22,height:22,borderRadius:7,border:`2px solid ${t.done?TR:TRL}`,background:t.done?TR:"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{t.done&&<span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:t.done?"#A8A59E":"#1A1814",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
          <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
            {t.course&&<span style={{fontSize:10,color:"#fff",background:t.courseColor||TR,borderRadius:10,padding:"1px 7px",fontWeight:700}}>{t.course}</span>}
            {t.date&&<span style={{fontSize:11,fontWeight:600,color:isOD?"#E85D3F":TR}}><Icon e="📅" /> {new Date(t.date+"T12:00:00").toLocaleDateString([],{month:"short",day:"numeric"})}{isOD?<Icon e="⚠️" />:""}</span>}
            <span style={{fontSize:10,fontWeight:700,color:PC[t.priority],background:PB[t.priority],borderRadius:6,padding:"1px 6px",textTransform:"uppercase"}}>{t.priority}</span>
            {st>0&&<span style={{fontSize:10,color:"#8C8880",fontWeight:600}}>{sd}/{st} ✓</span>}
          </div>
          {t.notes&&<div style={{fontSize:11,color:"#8C8880",marginTop:3}}>{t.notes}</div>}
        </div>
        <div style={{display:"flex",gap:3,flexShrink:0}}>
          <button onClick={()=>setExpandedTask(isEx?null:t.id)} style={{background:"none",border:`1px solid ${TRL}`,borderRadius:6,padding:"3px 7px",fontSize:11,cursor:"pointer",color:isEx?TR:"#5A5752",fontWeight:600}}>{isEx?"▲":"▼"}{st>0?" "+st:""}</button>
          <button onClick={()=>startEdit(t)} style={{background:"none",border:`1px solid ${TRL}`,borderRadius:6,padding:"3px 7px",fontSize:11,cursor:"pointer",color:"#5A5752"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=TR;e.currentTarget.style.color=TR;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=TRL;e.currentTarget.style.color="#5A5752";}}><Icon e="✎" /></button>
          {t.date&&<button onClick={()=>downloadICS(t)} style={{background:"none",border:`1px solid ${TRL}`,borderRadius:6,padding:"3px 7px",fontSize:11,cursor:"pointer",color:"#5A5752"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=TR;e.currentTarget.style.color=TR;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=TRL;e.currentTarget.style.color="#5A5752";}}><Icon e="📅" /></button>}
          <button onClick={()=>deleteTask(t.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:TRL,padding:"3px 5px"}} onMouseEnter={e=>e.currentTarget.style.color="#E85D3F"} onMouseLeave={e=>e.currentTarget.style.color=TRL}>✕</button>
        </div>
      </div>
      {isEx&&(<div style={{padding:"0 14px 12px 46px",borderTop:`1px solid ${TRL}30`}}>
        {(t.subtasks||[]).map(s=>(<div key={s.id} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 0"}}>
          <div onClick={()=>toggleSubtask(t.id,s.id)} style={{width:15,height:15,borderRadius:4,border:`2px solid ${s.done?TR:TRL}`,background:s.done?TR:"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{s.done&&<span style={{color:"#fff",fontSize:7,fontWeight:900}}>✓</span>}</div>
          <span style={{flex:1,fontSize:12,color:s.done?"#A8A59E":"#5A5752",textDecoration:s.done?"line-through":"none"}}>{s.text}</span>
          <button onClick={()=>deleteSubtask(t.id,s.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:TRL}} onMouseEnter={e=>e.currentTarget.style.color="#E85D3F"} onMouseLeave={e=>e.currentTarget.style.color=TRL}>✕</button>
        </div>))}
        <div style={{display:"flex",gap:5,marginTop:5}}>
          <input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} placeholder="Add subtask…" onKeyDown={e=>{if(e.key==="Enter")addSubtask(t.id);e.stopPropagation();}} style={{flex:1,padding:"5px 9px",border:`1.5px solid ${TRL}`,borderRadius:7,fontSize:12,color:"#1A1814",outline:"none",fontFamily:"'DM Sans',sans-serif"}} onFocus={e=>e.target.style.borderColor=TR} onBlur={e=>e.target.style.borderColor=TRL}/>
          <button onClick={()=>addSubtask(t.id)} style={{padding:"5px 11px",borderRadius:7,border:"none",background:TR,fontSize:12,fontWeight:700,cursor:"pointer",color:"#fff"}}>+</button>
        </div>
      </div>)}
    </div>);
  };

  return(<div style={{fontFamily:"'DM Sans',sans-serif",background:"#F7F6F2",minHeight:"100vh",color:"#1A1814"}}>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${TRL};border-radius:3px}@keyframes tr-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.tr-task:hover{background:#F1EFEA!important}.tr-task{transition:background 0.15s}@media(max-width:768px){.tr-nav{padding:0 12px!important}.tr-main{padding:16px 12px 60px!important}.tr-tabs button{padding:6px 8px!important;font-size:11px!important}}`}</style>

    <nav className="tr-nav" style={{background:"#fff",borderBottom:`1px solid ${TRL}66`,position:"sticky",top:0,zIndex:100,height:58,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <button onClick={()=>setMenuOpen(o=>!o)} style={{background:"none",border:`1px solid ${TRL}`,borderRadius:7,width:32,height:32,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.borderColor=TR} onMouseLeave={e=>e.currentTarget.style.borderColor=TRL}>
          <div style={{width:13,height:1.5,background:"#5A5752",borderRadius:1}}/><div style={{width:9,height:1.5,background:"#5A5752",borderRadius:1,alignSelf:"flex-start",marginLeft:2}}/><div style={{width:13,height:1.5,background:"#5A5752",borderRadius:1}}/>
        </button>
        <button onClick={onBack} style={{background:"none",border:`1px solid ${TRL}`,borderRadius:7,padding:"5px 11px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#5A5752",whiteSpace:"nowrap"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=TR;e.currentTarget.style.color=TR;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=TRL;e.currentTarget.style.color="#5A5752";}}>← Galaxy</button>
        <div style={{width:1,height:16,background:TRL}}/>
        <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${TR},${TRD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>◷</div><span style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:800,color:"#1A1814"}}><span style={{color:TR}}>Ace It</span> Tracker</span></div>
      </div>
      <div className="tr-tabs" style={{display:"flex",background:"#F1EFEA",borderRadius:9,padding:3,gap:2,overflowX:"auto",flexShrink:1}}>
        {[[<Icon e="📅" />,"today","Today"],[<Icon e="✅" />,"todo","All"],[<Icon e="🗓" />,"calendar","Calendar"],[<Icon e="📊" />,"progress","Progress"]].map(([icon,t,label])=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"6px 12px",borderRadius:7,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:tab===t?TR:"transparent",color:tab===t?"#fff":"#5A5752",whiteSpace:"nowrap"}}>{icon} {label}</button>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
        <button onClick={()=>setShowAIImport(true)} style={{padding:"6px 11px",borderRadius:8,border:`1.5px solid ${TRL}`,background:"#F1EFEA",fontSize:12,fontWeight:700,cursor:"pointer",color:TRD,whiteSpace:"nowrap"}} onMouseEnter={e=>{e.currentTarget.style.background=TR;e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background="#F1EFEA";e.currentTarget.style.color=TRD;}}><Icon e="📷" /> AI</button>
        <button onClick={()=>setShowAddForm(o=>!o)} style={{padding:"6px 13px",borderRadius:8,border:"none",background:TR,fontSize:12,fontWeight:700,cursor:"pointer",color:"#fff",whiteSpace:"nowrap"}}>+ Task</button>
        {user&&<div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${TR},${TRD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>{user.name?.[0]||"U"}</div>}
      </div>
    </nav>

    {menuOpen&&<div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(4px)"}}/>}
    <div style={{position:"fixed",left:0,top:0,bottom:0,width:248,zIndex:151,background:"#fff",borderRight:`1px solid ${TRL}`,transform:menuOpen?"translateX(0)":"translateX(-100%)",transition:"transform 0.3s cubic-bezier(0.16,1,0.3,1)",padding:"18px 12px",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${TRL}`}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:800,color:TRD}}>Tracker Menu</span>
        <button onClick={()=>setMenuOpen(false)} style={{background:"none",border:`1px solid ${TRL}`,borderRadius:5,width:24,height:24,cursor:"pointer",fontSize:11,color:"#5A5752",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:TRD,marginBottom:5}}>Sort By</div>
      {[["date","Due Date"],["priority","Priority"],["course","Course"],["created","Created"]].map(([val,label])=>(
        <button key={val} onClick={()=>{setSortBy(val);setMenuOpen(false);}} style={{display:"block",width:"100%",padding:"8px 11px",borderRadius:8,border:`1.5px solid ${sortBy===val?TR:TRL}`,background:sortBy===val?`${TR}15`:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",color:sortBy===val?TRD:"#5A5752",textAlign:"left",marginBottom:4}}>{label}{sortBy===val?" ✓":""}</button>
      ))}
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:TRD,margin:"12px 0 5px"}}>Filter</div>
      {[["all","All"],["active","⭕ Active"],["done","Done"],...courses.map(c=>[c.name,"● "+c.name])].map(([val,label])=>(
        <button key={val} onClick={()=>{setFilter(val);setMenuOpen(false);}} style={{display:"block",width:"100%",padding:"8px 11px",borderRadius:8,border:`1.5px solid ${filter===val?TR:TRL}`,background:filter===val?`${TR}15`:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",color:filter===val?TRD:"#5A5752",textAlign:"left",marginBottom:4}}>{label}{filter===val?" ✓":""}</button>
      ))}
      <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${TRL}`}}>
        <button onClick={()=>{setShowDone(s=>!s);setMenuOpen(false);}} style={{display:"block",width:"100%",padding:"8px 11px",borderRadius:8,border:`1.5px solid ${TRL}`,background:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",color:"#5A5752",textAlign:"left"}}>{showDone?"Hide completed":"Show completed"}</button>
      </div>
    </div>

    {showAIImport&&(
      <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)"}} onClick={()=>{setShowAIImport(false);setAIImportImg(null);setAIImportResult(null);}}>
        <div style={{background:"#fff",borderRadius:18,padding:"28px",width:460,maxWidth:"94vw"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:28,marginBottom:8}}><Icon e="📷" /></div>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:900,color:"#1A1814",marginBottom:6}}>AI Task Import</h3>
          <p style={{fontSize:13,color:"#5A5752",marginBottom:18,lineHeight:1.6}}>Photo your syllabus, assignment sheet, or notes — AI extracts all tasks automatically.</p>
          {!aiImportResult?(<>
            <label style={{display:"block",border:`2px dashed ${TRL}`,borderRadius:12,padding:"22px",textAlign:"center",cursor:"pointer",background:"#F7F6F2",marginBottom:14}} onMouseEnter={e=>e.currentTarget.style.borderColor=TR} onMouseLeave={e=>e.currentTarget.style.borderColor=TRL}>
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=ev=>{const d=ev.target.result.split(",")[1];setAIImportImg({data:d,type:file.type,preview:ev.target.result});};r.readAsDataURL(file);e.target.value="";}}/>
              {aiImportImg?<img src={aiImportImg.preview} alt="" style={{maxHeight:160,maxWidth:"100%",borderRadius:8}}/>:<><div style={{fontSize:36,marginBottom:6}}><Icon e="📸" /></div><div style={{fontSize:13,fontWeight:600,color:TRD}}>Tap to take photo or upload image</div><div style={{fontSize:11,color:TR,marginTop:3}}>Syllabus, assignment sheet, notes</div></>}
            </label>
            <div style={{display:"flex",gap:8}}><button onClick={()=>{setShowAIImport(false);setAIImportImg(null);}} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${TRL}`,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:"#5A5752"}}>Cancel</button><button onClick={handleAIImport} disabled={!aiImportImg||aiImporting} style={{flex:2,padding:"10px",borderRadius:9,border:"none",background:aiImportImg?TR:"#ECEAE4",fontSize:13,fontWeight:700,cursor:aiImportImg?"pointer":"default",color:aiImportImg?"#fff":"#8C8880",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>{aiImporting?<><span style={{width:13,height:13,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"qbSpin 0.6s linear infinite",display:"inline-block"}}/> Extracting…</>:"✦ Extract Tasks"}</button></div>
          </>):(<>
            <div style={{fontSize:13,fontWeight:700,color:TRD,marginBottom:8}}>Found {aiImportResult.length} task{aiImportResult.length!==1?"s":""}:</div>
            {aiImportResult.length===0?<div style={{textAlign:"center",padding:"16px 0",color:TRL}}>No tasks found. Try a clearer photo.</div>:(
              <div style={{maxHeight:240,overflowY:"auto",display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
                {aiImportResult.map((t,i)=>(<div key={i} style={{background:"#F7F6F2",border:`1px solid ${TRL}`,borderRadius:9,padding:"9px 12px"}}><div style={{fontSize:13,fontWeight:700,color:"#1A1814"}}>{t.title}</div><div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>{t.course&&<span style={{fontSize:10,color:"#fff",background:TR,borderRadius:8,padding:"1px 7px",fontWeight:600}}>{t.course}</span>}{t.date&&<span style={{fontSize:11,color:TR,fontWeight:600}}><Icon e="📅" /> {t.date}</span>}{t.priority&&<span style={{fontSize:10,fontWeight:700,color:PC[t.priority],textTransform:"uppercase"}}>{t.priority}</span>}</div></div>))}
              </div>
            )}
            <div style={{display:"flex",gap:8}}><button onClick={()=>{setAIImportResult(null);setAIImportImg(null);}} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${TRL}`,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:"#5A5752"}}>← Retake</button>{aiImportResult.length>0&&<button onClick={()=>importAITasks(aiImportResult)} style={{flex:2,padding:"10px",borderRadius:9,border:"none",background:TR,fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff"}}>✓ Add {aiImportResult.length} Tasks</button>}</div>
          </>)}
        </div>
      </div>
    )}

    {calDayModal&&(
      <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)",backdropFilter:"blur(6px)"}} onClick={()=>setCalDayModal(null)}>
        <div style={{background:"#fff",borderRadius:16,padding:"22px",width:360,maxWidth:"94vw"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:800,color:"#1A1814",marginBottom:12}}>{new Date(calDayModal.dateStr+"T12:00:00").toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</div>
          {calDayModal.tasks.map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#F7F6F2",borderRadius:8,marginBottom:5,borderLeft:`3px solid ${t.courseColor||TR}`}}><span style={{flex:1,fontSize:13,fontWeight:600,color:"#1A1814"}}>{t.title}</span><span style={{fontSize:10,color:PC[t.priority],fontWeight:700,textTransform:"uppercase"}}>{t.priority}</span></div>)}
          <div style={{borderTop:`1px solid ${TRL}`,paddingTop:10,marginTop:8}}>
            <input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="+ Add task for this day…" onKeyDown={e=>{if(e.key==="Enter"&&newTask.trim()){addTask({date:calDayModal.dateStr});setCalDayModal(null);}e.stopPropagation();}} style={{width:"100%",padding:"8px 11px",borderRadius:8,border:`1.5px solid ${TRL}`,fontSize:13,color:"#1A1814",outline:"none",marginBottom:7,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}} autoFocus onFocus={e=>e.target.style.borderColor=TR} onBlur={e=>e.target.style.borderColor=TRL}/>
            <div style={{display:"flex",gap:8}}><button onClick={()=>setCalDayModal(null)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${TRL}`,background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#5A5752"}}>Close</button><button onClick={()=>{if(newTask.trim()){addTask({date:calDayModal.dateStr});setCalDayModal(null);}}} disabled={!newTask.trim()} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:newTask.trim()?TR:"#ECEAE4",fontSize:12,fontWeight:700,cursor:newTask.trim()?"pointer":"default",color:newTask.trim()?"#fff":"#8C8880"}}>Add Task</button></div>
          </div>
        </div>
      </div>
    )}

    <div className="tr-main" style={{maxWidth:880,margin:"0 auto",padding:"24px 20px 80px",animation:"tr-fade 0.4s ease both"}}>
      {showAddForm&&(<div style={{background:"#fff",border:`1.5px solid ${TRL}`,borderRadius:14,padding:"16px 18px",marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:TRD,marginBottom:8}}>+ New Task</div>
        <input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Task or assignment…" onKeyDown={e=>{if(e.key==="Enter")addTask();if(e.key===" ")e.stopPropagation();}} style={{width:"100%",padding:"9px 11px",borderRadius:9,border:`1.5px solid ${TRL}`,background:"#F7F6F2",fontSize:14,color:"#1A1814",outline:"none",marginBottom:8,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}} autoFocus onFocus={e=>e.target.style.borderColor=TR} onBlur={e=>e.target.style.borderColor=TRL}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:8}}>
          <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{padding:"7px 9px",borderRadius:8,border:`1.5px solid ${TRL}`,background:"#F7F6F2",fontSize:12,color:"#1A1814",outline:"none"}}/>
          <select value={newCourse} onChange={e=>setNewCourse(e.target.value)} style={{padding:"7px 9px",borderRadius:8,border:`1.5px solid ${TRL}`,background:"#F7F6F2",fontSize:12,color:"#1A1814",outline:"none"}}><option value="">No Course</option>{courses.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
          <select value={newPriority} onChange={e=>setNewPriority(e.target.value)} style={{padding:"7px 9px",borderRadius:8,border:`1.5px solid ${TRL}`,background:"#F7F6F2",fontSize:12,color:"#1A1814",outline:"none"}}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        </div>
        <input value={newNotes} onChange={e=>setNewNotes(e.target.value)} placeholder="Notes (optional)" onKeyDown={e=>e.stopPropagation()} style={{width:"100%",padding:"7px 11px",borderRadius:8,border:`1.5px solid ${TRL}`,background:"#F7F6F2",fontSize:12,color:"#1A1814",outline:"none",marginBottom:8,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}} onFocus={e=>e.target.style.borderColor=TR} onBlur={e=>e.target.style.borderColor=TRL}/>
        <div style={{display:"flex",gap:7}}><button onClick={()=>addTask()} disabled={!newTask.trim()} style={{flex:2,padding:"9px",borderRadius:9,border:"none",background:newTask.trim()?TR:"#ECEAE4",color:newTask.trim()?"#fff":"#8C8880",fontSize:13,fontWeight:700,cursor:newTask.trim()?"pointer":"default"}}>Add Task</button><button onClick={()=>setShowAddForm(false)} style={{flex:1,padding:"9px",borderRadius:9,border:`1px solid ${TRL}`,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:"#5A5752"}}>Cancel</button></div>
      </div>)}

      {tab==="today"&&(<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:"#1A1814",marginBottom:3}}>Today</h2><div style={{fontSize:12,color:"#5A5752"}}>{new Date().toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</div></div>
          <div style={{display:"flex",gap:7}}>{overdueTasks.length>0&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:9,padding:"6px 11px",fontSize:12,fontWeight:700,color:"#E85D3F"}}><Icon e="⚠️" /> {overdueTasks.length} overdue</div>}<div style={{background:`${TR}15`,border:`1px solid ${TRL}`,borderRadius:9,padding:"6px 11px",fontSize:12,fontWeight:700,color:TRD}}>{todayTasks.filter(t=>t.done).length}/{todayTasks.length} done today</div></div>
        </div>
        {overdueTasks.length>0&&(<div style={{marginBottom:18}}><div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"#E85D3F",marginBottom:7}}><Icon e="⚠️" /> Overdue</div>{overdueTasks.map(t=><TaskCard key={t.id} t={t}/>)}</div>)}
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:TR,marginBottom:7}}><Icon e="📅" /> Due Today</div>
        {todayTasks.length===0?(<div style={{textAlign:"center",padding:"32px 0",color:TRL}}><div style={{fontSize:36,marginBottom:8}}><Icon e="✅" /></div><div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:800,color:TRD,marginBottom:4}}>Nothing due today!</div><p style={{fontSize:13,color:"#5A5752"}}>Get ahead on upcoming tasks below.</p></div>):todayTasks.map(t=><TaskCard key={t.id} t={t}/>)}
        {upcomingTasks.length>0&&(<div style={{marginTop:22}}><div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"#5A5752",marginBottom:7}}><Icon e="🔜" /> Coming Up</div>{upcomingTasks.slice(0,5).map(t=><TaskCard key={t.id} t={t}/>)}</div>)}
      </div>)}

      {tab==="todo"&&(<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:8}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:"#1A1814"}}>All Tasks</h2>
          <div style={{fontSize:12,color:"#5A5752",fontWeight:600}}>{allFiltered.filter(t=>!t.done).length} active · by {sortBy}</div>
        </div>
        {allFiltered.length===0?(<div style={{textAlign:"center",padding:"50px 0",color:TRL}}><div style={{fontSize:44,marginBottom:12}}><Icon e="📋" /></div><div style={{fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:800,color:TRD,marginBottom:6}}>No tasks yet</div><p style={{fontSize:13,lineHeight:1.7,color:"#5A5752"}}>Add a task or use <Icon e="📷" /> AI Import to scan your syllabus.</p></div>):allFiltered.map(t=><TaskCard key={t.id} t={t}/>)}
      </div>)}

      {tab==="calendar"&&(<div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:"#1A1814"}}>{calMonth.toLocaleDateString([],{month:"long",year:"numeric"})}</h2>
          <div style={{display:"flex",gap:7}}><button onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()-1))} style={{padding:"7px 13px",borderRadius:8,border:`1px solid ${TRL}`,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:TR}}>←</button><button onClick={()=>setCalMonth(new Date())} style={{padding:"7px 13px",borderRadius:8,border:`1px solid ${TRL}`,background:TR,fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff"}}>Today</button><button onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()+1))} style={{padding:"7px 13px",borderRadius:8,border:`1px solid ${TRL}`,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:TR}}>→</button></div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${TRL}`,borderRadius:14,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:`${TR}18`,borderBottom:`1px solid ${TRL}`}}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{padding:"9px 0",textAlign:"center",fontSize:10,fontWeight:700,color:TR,letterSpacing:1,textTransform:"uppercase"}}>{d}</div>)}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
            {Array.from({length:getFD(calMonth)}).map((_,i)=><div key={`e${i}`} style={{minHeight:84,padding:"7px",borderRight:`1px solid ${TRL}33`,borderBottom:`1px solid ${TRL}33`,background:"#FAFAFA"}}/>)}
            {Array.from({length:getDIM(calMonth)}).map((_,i)=>{
              const day=i+1,ds=`${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`,dt=tasksForDay(day),isT=new Date().getDate()===day&&new Date().getMonth()===calMonth.getMonth()&&new Date().getFullYear()===calMonth.getFullYear();
              return(<div key={day} onClick={()=>setCalDayModal({dateStr:ds,tasks:dt})} style={{minHeight:84,padding:"7px",borderRight:`1px solid ${TRL}33`,borderBottom:`1px solid ${TRL}33`,background:isT?`${TR}08`:"#fff",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=isT?`${TR}12`:"#F7F6F2"} onMouseLeave={e=>e.currentTarget.style.background=isT?`${TR}08`:"#fff"}>
                <div style={{width:24,height:24,borderRadius:"50%",background:isT?TR:"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2}}><span style={{fontSize:11,fontWeight:isT?700:400,color:isT?"#fff":"#1A1814"}}>{day}</span></div>
                {dt.slice(0,2).map(t=><div key={t.id} style={{fontSize:9,fontWeight:600,color:"#fff",background:t.courseColor||TR,borderRadius:3,padding:"2px 4px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>)}
                {dt.length>2&&<div style={{fontSize:9,color:TR,fontWeight:600}}>+{dt.length-2}</div>}
              </div>);
            })}
          </div>
        </div>
      </div>)}

      {tab==="progress"&&(<div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:"#1A1814",marginBottom:20}}>Progress</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
          {[{icon:<Icon e="✅" />,label:"Done",value:`${tasks.filter(t=>t.done).length}/${tasks.length}`,color:TR},{icon:<Icon e="🔥" />,label:"On Track",value:`${cp.filter(c=>c.pct>=50).length}/${courses.length}`,color:"#D4A830"},{icon:<Icon e="⚠️" />,label:"Overdue",value:overdueTasks.length,color:"#E85D3F"}].map(s=>(
            <div key={s.label} style={{background:"#fff",border:`1px solid ${TRL}`,borderRadius:13,padding:"18px",textAlign:"center"}}><div style={{fontSize:26,marginBottom:8}}>{s.icon}</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:s.color,marginBottom:3}}>{s.value}</div><div style={{fontSize:10,fontWeight:700,color:"#5A5752",textTransform:"uppercase",letterSpacing:1}}>{s.label}</div></div>
          ))}
        </div>
        {cp.length===0?(<div style={{textAlign:"center",padding:"36px 0",color:TRL}}><div style={{fontSize:36,marginBottom:10}}><Icon e="📚" /></div><p style={{fontSize:13,color:"#5A5752"}}>Create courses in Course Hub to see progress here.</p></div>):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {cp.map(c=><div key={c.id} style={{background:"#fff",border:`1px solid ${TRL}`,borderRadius:13,padding:"18px 20px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:6}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:"50%",background:c.color}}/><span style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:800,color:"#1A1814"}}>{c.name}</span></div><span style={{fontSize:12,fontWeight:700,color:c.color}}>{c.pct}% complete</span></div><div style={{height:8,background:`${c.color}18`,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${c.pct}%`,background:c.color,borderRadius:4,transition:"width 0.6s ease"}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"#5A5752",fontWeight:600}}><span>{c.done} done</span><span>{c.total-c.done} remaining</span></div></div>)}
          </div>
        )}
      </div>)}
    </div>
  </div>);
}

export default TrackerApp;
