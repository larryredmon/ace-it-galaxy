// Split out of App.jsx so this code only downloads when it is needed.
import { useState, useRef, useEffect } from "react";
import { aiFetch, tpSync } from "../shared.jsx";

function NotesApp({ onBack, user, openAuth, launchApp }) {
  const NC = "#D4A830";
  const NL = "#F0D080";
  const ND = "#8B6914";

  const [view, setView]           = useState("home"); // home | library | note | editor | upload | folders
  const [notes, setNotes]         = useState(() => {
    try { return JSON.parse(localStorage.getItem("tp_notes")||"[]"); } catch { return []; }
  });
  const [folders, setFolders]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("tp_note_folders")||"[]"); } catch { return []; }
  });
  const [activeNote, setActiveNote] = useState(null);
  const [filterFolder, setFilterFolder] = useState("all");
  const [searchQ, setSearchQ]     = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Editor state
  const [title, setTitle]         = useState("");
  const [content, setContent]     = useState("");
  const [folder, setFolder]       = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState("");
  const [aiMode, setAiMode]       = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [saveAnim, setSaveAnim]   = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);

  // Upload state
  const [uploadText, setUploadText]   = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadObjectives, setUploadObjectives] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadTab, setUploadTab]     = useState("file");
  const [uploadUrl, setUploadUrl]     = useState("");
  const [isDragging, setIsDragging]   = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat]       = useState(false);
  const [notesMsg, setNotesMsg]       = useState("");
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(false);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(null); // folder id

  const fileInputRef  = useRef(null);
  const recognitionRef = useRef(null);
  const editorRef     = useRef(null);

  // Stop recording on unmount
  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  const notesMounted = useRef(false);
  useEffect(() => { if (!notesMounted.current) { notesMounted.current = true; return; } try { localStorage.setItem("tp_notes", JSON.stringify(notes)); } catch {} tpSync("tp_notes", notes); }, [notes]);
  const noteFolderMounted = useRef(false);
  useEffect(() => { if (!noteFolderMounted.current) { noteFolderMounted.current = true; return; } try { localStorage.setItem("tp_note_folders", JSON.stringify(folders)); } catch {} tpSync("tp_note_folders", folders); }, [folders]);

  const newNote = (preTitle="", preContent="") => {
    setTitle(preTitle); setContent(preContent); setFolder("");
    setAiResult(""); setShowAiPanel(false); setShowChat(false);
    setChatMessages([]); setActiveNote(null); setView("editor");
  };

  const openNote = (note) => {
    setActiveNote(note); setView("note");
  };

  const openEditor = (note) => {
    setTitle(note.title); setContent(note.content||""); setFolder(note.folder||"");
    setAiResult(""); setShowAiPanel(false); setShowChat(false);
    setChatMessages([]); setActiveNote(note); setView("editor");
  };

  const saveNote = () => {
    if (!content.trim() && !title.trim()) return;
    const noteData = {
      id: activeNote?.id || Date.now(),
      title: title.trim() || `Note — ${new Date().toLocaleDateString([],{month:"long",day:"numeric"})}`,
      content, folder,
      wordCount: content.trim().split(/\s+/).filter(Boolean).length,
      updatedAt: new Date().toISOString(),
      createdAt: activeNote?.createdAt || new Date().toISOString(),
      aiGenerated: activeNote?.aiGenerated || false,
    };
    setNotes(prev => activeNote ? prev.map(n => n.id===activeNote.id ? noteData : n) : [noteData, ...prev]);
    setSaveAnim(true);
    setTimeout(() => { setSaveAnim(false); setActiveNote(noteData); setView("note"); }, 800);
  };

  const deleteNote = (id) => { setNotes(prev => prev.filter(n => n.id!==id)); setView("home"); };

  // Recording
  const toggleRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setNotesMsg("Recording not supported in this browser. Try Chrome."); return; }
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    let final = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setContent(prev => {
        const base = prev.replace(/\[Listening…[^\]]*\]/, "").trimEnd();
        return base + (base ? " " : "") + final + (interim ? `[Listening… ${interim}]` : "");
      });
    };
    rec.onend = () => { setIsRecording(false); setContent(prev => prev.replace(/\[Listening…[^\]]*\]/, "").trim()); };
    rec.start(); recognitionRef.current = rec; setIsRecording(true);
  };

  // Format toolbar
  const applyFormat = (type) => {
    const ta = editorRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = content.slice(s, e);
    let nc = content;
    if (type==="bold")      nc = content.slice(0,s) + `**${sel||"bold text"}**` + content.slice(e);
    if (type==="italic")    nc = content.slice(0,s) + `_${sel||"italic text"}_` + content.slice(e);
    if (type==="underline") nc = content.slice(0,s) + `__${sel||"underlined"}__` + content.slice(e);
    if (type==="h1")        nc = content.slice(0,s) + `\n# ${sel||"Heading 1"}\n` + content.slice(e);
    if (type==="h2")        nc = content.slice(0,s) + `\n## ${sel||"Heading 2"}\n` + content.slice(e);
    if (type==="h3")        nc = content.slice(0,s) + `\n### ${sel||"Heading 3"}\n` + content.slice(e);
    if (type==="ul")        nc = content.slice(0,s) + `\n- ${sel||"item"}\n` + content.slice(e);
    if (type==="ol")        nc = content.slice(0,s) + `\n1. ${sel||"item"}\n` + content.slice(e);
    if (type==="hr")        nc = content.slice(0,s) + `\n\n---\n\n` + content.slice(e);
    setContent(nc);
    setTimeout(() => ta.focus(), 30);
  };

  // Markdown preview
  const renderContent = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize:14, fontWeight:800, color:"#1A1814", margin:"10px 0 4px" }}>{line.slice(4)}</h3>;
      if (line.startsWith("## ")) return <h2 key={i} style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:800, color:"#1A1814", margin:"12px 0 5px" }}>{line.slice(3)}</h2>;
      if (line.startsWith("# "))  return <h1 key={i} style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color:"#1A1814", margin:"14px 0 6px" }}>{line.slice(2)}</h1>;
      if (line.startsWith("- "))  return <li key={i} style={{ fontSize:14, color:"#1A1814", lineHeight:1.8, marginLeft:18 }}>{line.slice(2)}</li>;
      if (/^\d+\.\s/.test(line)) return <li key={i} style={{ fontSize:14, color:"#1A1814", lineHeight:1.8, marginLeft:18, listStyleType:"decimal" }}>{line.replace(/^\d+\.\s/,"")}</li>;
      const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
      const rendered = parts.map((p,j) => {
        if (p.startsWith("**")&&p.endsWith("**")) return <strong key={j}>{p.slice(2,-2)}</strong>;
        if (p.startsWith("_")&&p.endsWith("_"))   return <em key={j}>{p.slice(1,-1)}</em>;
        return p;
      });
      return line.trim() ? <p key={i} style={{ fontSize:14, color:"#1A1814", lineHeight:1.85, margin:"3px 0" }}>{rendered}</p> : <br key={i}/>;
    });
  };

  // AI tools
  const runAI = async (mode) => {
    if (!content.trim() || aiLoading) return;
    setAiMode(mode); setAiLoading(true); setShowAiPanel(true); setAiResult("");
    const prompts = {
      summarize:  `Summarize these notes into a clear, scannable study guide with key takeaways:\n\n${content}`,
      improve:    `Rewrite and improve these notes — better structure, clearer language, proper headings, more comprehensive:\n\n${content}`,
      flashcards: `Create 10-15 high-quality flashcard Q&A pairs from these notes. Format:\nQ: [question]\nA: [answer]\n\n${content}`,
      quiz:       `Create a 10-question multiple choice quiz from these notes. Format:\n1. [Question]\na) b) c) d)\nAnswer: [letter] - [explanation]\n\n${content}`,
      objectives: `Based on these notes, identify:\n1. Learning Objectives\n2. Key Skills\n3. Likely Exam Topics\n4. Areas needing extra attention\n\n${content}`,
      explain:    `Explain the main concepts in these notes in plain, simple language with real-world examples. Make it click.\n\n${content}`,
    };
    try {
      const res = await aiFetch("/api/claude", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:2000,
          system:"You are an expert study coach helping students master their course material.",
          messages:[{role:"user", content:prompts[mode]}] }),
      });
      const data = await res.json();
      setAiResult(data.content?.find(b=>b.type==="text")?.text || "Something went wrong.");
    } catch { setAiResult("Something went wrong. Please try again."); }
    setAiLoading(false);
  };

  // AI note generation from upload
  const generateSmartNotes = async (text, imageData, titleHint, objectives) => {
    if ((!text?.trim() && !imageData) || uploadLoading) return;
    setUploadLoading(true);
    setUploadProgress("Reading your content…");
    const steps = ["Analyzing content structure…","Identifying key concepts…","Building your study notes…"];
    let si = 0;
    const interval = setInterval(() => { si++; if (si < steps.length) setUploadProgress(steps[si]); }, 2000);
    try {
      const userContent = imageData
        ? [{ type:"image", source:{ type:"base64", media_type:"image/jpeg", data:imageData } },
           { type:"text", text:`Create comprehensive study notes from this image${titleHint?` (Topic: ${titleHint})`:""}.${objectives?`\nObjectives: ${objectives}`:""}`}]
        : `Create comprehensive study notes from the following content${titleHint?` (Topic: ${titleHint})`:""}.\n${objectives?`Objectives: ${objectives}\n`:""}\nContent:\n\n${text?.slice(0,12000)}`;
      const res = await aiFetch("/api/claude", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:4000,
          system:`You are an expert academic note-taker. Create comprehensive study notes always including:\n# Chapter/Topic Overview\n## Learning Objectives\n## Key Concepts\n## Key Terms & Definitions\n## Detailed Notes\n## Summary\n## Study Tips\nUse clear headings, bullet points, bold key terms. Make it excellent.`,
          messages:[{ role:"user", content:userContent }] }),
      });
      const data = await res.json();
      const generated = data.content?.find(b=>b.type==="text")?.text || "Could not generate notes.";
      const noteTitle = titleHint || generated.match(/^#\s+(.+)/m)?.[1] || "AI Notes";
      const noteData = { id:Date.now(), title:noteTitle, content:generated, folder:"", wordCount:generated.trim().split(/\s+/).length, updatedAt:new Date().toISOString(), createdAt:new Date().toISOString(), aiGenerated:true };
      setNotes(prev => [noteData, ...prev]);
      setTitle(noteTitle); setContent(generated); setActiveNote(noteData);
      setUploadText(""); setUploadObjectives(""); setUploadTitle(""); setUploadUrl("");
      setView("editor");
    } catch { setUploadProgress("Something went wrong. Please try again."); }
    finally { clearInterval(interval); setUploadLoading(false); setUploadProgress(""); }
  };

  // File reading
  const readFile = (file) => new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = (e) => resolve({ text:null, imageData:e.target.result.split(",")[1], name:file.name, isImage:true });
      r.readAsDataURL(file); return;
    }
    const r = new FileReader();
    r.onload = (e) => resolve({ text:e.target.result, name:file.name });
    r.readAsText(file);
  });

  const handleFileDrop = async (e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    const result = await readFile(file);
    const cleanName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    setUploadTitle(cleanName);
    if (result.isImage) { setUploadText(`[Image: ${file.name}]`); generateSmartNotes(null, result.imageData, cleanName, uploadObjectives); }
    else setUploadText(result.text||"");
  };

  const fetchWebContent = async (url) => {
    setUploadLoading(true); setUploadProgress("Fetching page…");
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      const text = data.contents?.replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,12000)||"";
      setUploadText(text); if (!uploadTitle) setUploadTitle(new URL(url).hostname);
    } catch { setUploadText(`Source: ${url}\n\nCould not fetch automatically. Please paste content manually.`); }
    setUploadLoading(false); setUploadProgress("");
  };

  const fetchYouTube = (url) => {
    const videoId = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1];
    if (!videoId) { setNotesMsg("Invalid YouTube URL. Please paste a full YouTube link."); return; }
    setUploadText(`YouTube Video: ${url}\nVideo ID: ${videoId}\n\nGenerate comprehensive study notes based on this educational video.`);
    if (!uploadTitle) setUploadTitle("YouTube Notes");
  };

  // Chat with notes
  const sendChatMessage = async (msg) => {
    const text = msg || chatInput;
    if (!text.trim() || chatLoading || !content.trim()) return;
    const userMsg = { role:"user", content:text };
    setChatMessages(prev => [...prev, userMsg]); setChatInput(""); setChatLoading(true);
    try {
      const res = await aiFetch("/api/claude", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:800,
          system:`You are a helpful study tutor. Answer questions based on these notes plus your knowledge. Be concise.\n\n=== NOTES ===\n${content.slice(0,8000)}`,
          messages:[...chatMessages, userMsg].map(m=>({role:m.role,content:m.content})) }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role:"assistant", content:data.content?.find(b=>b.type==="text")?.text||"Try rephrasing." }]);
    } catch { setChatMessages(prev => [...prev, { role:"assistant", content:"Something went wrong." }]); }
    setChatLoading(false);
  };

  const filteredNotes = notes.filter(n => {
    const mf = filterFolder==="all" || (filterFolder==="__ai__" ? n.aiGenerated : n.folder===filterFolder);
    const ms = !searchQ.trim() || n.title?.toLowerCase().includes(searchQ.toLowerCase()) || n.content?.toLowerCase().includes(searchQ.toLowerCase());
    return mf && ms;
  });

  const EN_FORMATS = [
    {id:"h1",icon:"H₁"},{id:"h2",icon:"H₂"},{id:"bold",icon:"B"},{id:"italic",icon:"I"},{id:"ul",icon:"≡"},{id:"ol",icon:"1."},
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#FDFCF7", minHeight:"100vh", color:"#1A1814" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:${NL}; border-radius:3px; }
        @keyframes notes-fade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes notes-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .notes-card { transition:transform 0.2s,box-shadow 0.2s !important; }
        .notes-card:hover { transform:translateY(-3px) !important; box-shadow:0 10px 28px rgba(212,168,48,0.12) !important; }
        .notes-fmt-btn:hover { background:${NL}44 !important; }
        @media (max-width:768px) {
          .notes-nav-tabs { display:none !important; }
          .notes-main { padding:20px 14px !important; }
          .notes-quick-grid { grid-template-columns:1fr 1fr !important; }
          .notes-editor-split { grid-template-columns:1fr !important; }
          .notes-upload-grid { grid-template-columns:1fr !important; }
          .notes-folders-grid { grid-template-columns:1fr 1fr !important; }
        }
        @media (max-width:480px) {
          .notes-quick-grid { grid-template-columns:1fr !important; }
          .notes-folders-grid { grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      {sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(26,18,0,0.35)",backdropFilter:"blur(4px)" }} />}
      <div style={{ position:"fixed",left:0,top:0,bottom:0,width:268,background:"#fff",borderRight:`1px solid ${NL}`,display:"flex",flexDirection:"column",zIndex:201,transform:sidebarOpen?"translateX(0)":"translateX(-100%)",transition:"transform 0.38s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ padding:"18px 18px",borderBottom:`1px solid ${NL}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${NC},${ND})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>📝</div>
            <span style={{ fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:800,color:"#1A1814" }}>Ace It Notes</span>
          </div>
          <button onClick={()=>setSidebarOpen(false)} style={{ background:"none",border:`1px solid ${NL}`,borderRadius:5,width:28,height:28,cursor:"pointer",fontSize:13,color:"#8C7A4A",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"14px 12px" }}>
          {user ? (
            <div style={{ background:`${NC}10`,border:`1px solid ${NC}25`,borderRadius:10,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${NC},${ND})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff" }}>{user.name?.[0]||"U"}</div>
              <div><div style={{ fontSize:13,fontWeight:800,color:"#1A1814" }}>{user.name}</div></div>
            </div>
          ) : (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12,fontWeight:700,color:"#1A1814",marginBottom:8 }}>Sign in to save notes</div>
              <div style={{ display:"flex",gap:7 }}>
                <button onClick={()=>{openAuth("login");setSidebarOpen(false);}} style={{ flex:1,padding:"6px 0",borderRadius:7,border:`1px solid ${NL}`,background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#5A4A2A" }}>Log In</button>
                <button onClick={()=>{openAuth("signup");setSidebarOpen(false);}} style={{ flex:1,padding:"6px 0",borderRadius:7,border:"none",background:NC,fontSize:11,fontWeight:700,cursor:"pointer",color:"#fff" }}>Sign Up</button>
              </div>
            </div>
          )}
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#B8A06A",padding:"4px 8px 8px" }}>Navigation</div>
          {[["📝","All Notes","library"],["🤖","AI Upload","upload"],["📁","Folders","folders"]].map(([icon,label,v])=>(
            <button key={v} onClick={()=>{setView(v);setSidebarOpen(false);}}
              style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,border:"none",background:view===v?`${NC}15`:"transparent",cursor:"pointer",marginBottom:2,fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s" }}>
              <span style={{ fontSize:14 }}>{icon}</span>
              <span style={{ fontSize:13,fontWeight:view===v?700:500,color:view===v?NC:"#3A3020" }}>{label}</span>
              {view===v && <div style={{ marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:NC }} />}
            </button>
          ))}
          {folders.length>0 && (
            <div style={{ marginTop:14,paddingTop:12,borderTop:`1px solid ${NL}66` }}>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#B8A06A",padding:"4px 8px 8px" }}>Folders</div>
              {[{id:"all",name:"All Notes",count:notes.length},...folders.map(f=>({...f,count:notes.filter(n=>n.folder===f.id).length}))].map(f=>(
                <button key={f.id} onClick={()=>{setFilterFolder(f.id);setView("library");setSidebarOpen(false);}}
                  style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,border:"none",background:filterFolder===f.id?`${NC}12`:"transparent",cursor:"pointer",marginBottom:1,fontFamily:"'DM Sans',sans-serif" }}>
                  <span style={{ fontSize:13 }}>📁</span>
                  <span style={{ fontSize:12,fontWeight:500,color:"#3A3020",flex:1,textAlign:"left" }}>{f.name}</span>
                  <span style={{ fontSize:11,color:"#B8A06A",background:`${NC}10`,borderRadius:10,padding:"1px 7px",fontWeight:600 }}>{f.count}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop:14,paddingTop:12,borderTop:`1px solid ${NL}66` }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#B8A06A",padding:"4px 8px 8px" }}>Stats</div>
            {[["📝",notes.length,"Notes"],["📁",folders.length,"Folders"],["✍",notes.reduce((a,n)=>a+(n.wordCount||0),0).toLocaleString(),"Words"]].map(([icon,val,label])=>(
              <div key={label} style={{ display:"flex",alignItems:"center",gap:10,padding:"6px 10px" }}>
                <span style={{ fontSize:13 }}>{icon}</span>
                <span style={{ fontSize:13,fontWeight:700,color:NC }}>{val}</span>
                <span style={{ fontSize:12,color:"#8C7A4A" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding:"12px",borderTop:`1px solid ${NL}` }}>
          <button onClick={onBack} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,border:"none",background:"transparent",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}
            onMouseEnter={e=>e.currentTarget.style.background=`${NC}08`}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{ fontSize:13,color:"#B8A06A" }}>←</span>
            <span style={{ fontSize:13,fontWeight:500,color:"#8C7A4A" }}>Back to Galaxy</span>
          </button>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{ background:"#fff",borderBottom:`1px solid ${NL}66`,position:"sticky",top:0,zIndex:100,height:62,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={()=>setSidebarOpen(true)} style={{ background:"none",border:`1px solid ${NL}`,borderRadius:7,width:36,height:36,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.18s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=NC;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=NL;}}>
            <div style={{ width:14,height:1.5,background:NC,borderRadius:1 }} />
            <div style={{ width:10,height:1.5,background:"#B8A06A",borderRadius:1 }} />
            <div style={{ width:14,height:1.5,background:NC,borderRadius:1 }} />
          </button>
          <button onClick={onBack} style={{ background:"none",border:`1px solid ${NL}`,borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#8C7A4A",transition:"all 0.18s",whiteSpace:"nowrap",flexShrink:0 }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=NC;e.currentTarget.style.color=NC;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=NL;e.currentTarget.style.color="#8C7A4A";}}>← Galaxy</button>
          <div style={{ width:1,height:20,background:NL,flexShrink:0 }} />
          <div style={{ display:"flex",alignItems:"center",gap:9 }}>
            <div style={{ width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${NC},${ND})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>📝</div>
            <span style={{ fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:"#1A1814" }}>
              <span style={{ color:NC }}>Ace It</span> Notes
            </span>
          </div>
        </div>
        <div className="notes-nav-tabs" style={{ display:"flex",gap:6 }}>
          {[["📝","home","Notes"],["🤖","upload","AI Upload"],["📁","folders","Folders"]].map(([icon,v,label])=>(
            <button key={v} onClick={()=>setView(v)}
              style={{ padding:"7px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.18s",background:view===v?v==="upload"?"#4F6EF7":NC:"transparent",color:view===v?"#fff":"#8C7A4A" }}
              onKeyDown={e=>{if(e.key===" ")e.preventDefault();}}>
              {icon} {label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={()=>newNote()} style={{ background:NC,border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff",boxShadow:`0 4px 16px ${NC}44` }}>
            + New Note
          </button>
          {user ? (
            <div onClick={()=>setSidebarOpen(true)} style={{ width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${NC},${ND})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",cursor:"pointer" }}>{user.name?.[0]||"U"}</div>
          ) : (
            <button onClick={()=>openAuth("signup")} style={{ background:"none",border:`1px solid ${NL}`,borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#8C7A4A" }}>Sign In</button>
          )}
        </div>
      </nav>

      {/* ── HOME ── */}
      {view==="home" && (
        <div>
          <div style={{ background:"#1A1814",padding:"64px 24px 48px",textAlign:"center",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",inset:0,opacity:0.05,backgroundImage:`radial-gradient(circle at 20% 50%, ${NC} 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${NC} 0%, transparent 40%)` }}/>
            <div style={{ position:"relative",zIndex:1 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"rgba(212,168,48,0.15)",border:"1px solid rgba(212,168,48,0.3)",borderRadius:20,padding:"5px 16px",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:NC,marginBottom:20 }}>📝 ACE IT NOTES</div>
              <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:"clamp(32px,5vw,52px)",fontWeight:900,color:"#F7F6F2",lineHeight:1.1,marginBottom:16,letterSpacing:-1 }}>
                <span style={{ color:NC }}>Ace It</span> Notes
              </h1>
              <p style={{ fontSize:15,color:"#9A9690",maxWidth:480,margin:"0 auto 32px",lineHeight:1.7 }}>Write, record, and organize your ideas. Upload any material and AI turns it into structured study notes.</p>
              <div style={{ display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap" }}>
                <button onClick={()=>newNote()} style={{ background:NC,border:"none",borderRadius:9,padding:"12px 28px",fontSize:14,fontWeight:700,cursor:"pointer",color:"#1A1814" }}>✍ New Note</button>
                <button onClick={()=>setView("upload")} style={{ background:"none",border:"1px solid rgba(255,255,255,0.2)",borderRadius:9,padding:"12px 28px",fontSize:14,fontWeight:600,cursor:"pointer",color:"#F7F6F2" }}>🤖 AI Upload</button>
                {notes.length>0&&<button onClick={()=>setView("library")} style={{ background:"none",border:"1px solid rgba(255,255,255,0.2)",borderRadius:9,padding:"12px 28px",fontSize:14,fontWeight:600,cursor:"pointer",color:"#F7F6F2" }}>Browse All Notes</button>}
              </div>
            </div>
          </div>
          <div style={{ background:"#222",borderBottom:"1px solid #333",display:"grid",gridTemplateColumns:"repeat(4,1fr)" }}>
            {[["Notes",notes.length],["Folders",folders.length],["AI Generated",notes.filter(n=>n.aiGenerated).length],["Words",notes.reduce((a,n)=>a+(n.wordCount||0),0).toLocaleString()]].map(([label,val])=>(
              <div key={label} style={{ padding:"18px 24px",textAlign:"center",borderRight:"1px solid #333" }}>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:"#F7F6F2" }}>{val}</div>
                <div style={{ fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:"#6B6860",marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="notes-main" style={{ maxWidth:980,margin:"0 auto",padding:"36px 24px",animation:"notes-fade 0.4s ease both" }}>
          <div style={{ position:"relative",marginBottom:20 }}>
            <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#B8A06A",pointerEvents:"none" }}>🔍</span>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search notes…"
              onKeyDown={e=>{if(e.key===" ")e.stopPropagation();}}
              style={{ width:"100%",padding:"10px 14px 10px 36px",borderRadius:10,border:`1.5px solid ${NL}`,background:"#fff",fontSize:13,color:"#1A1814",outline:"none",fontFamily:"'DM Sans',sans-serif",transition:"border-color 0.15s",boxSizing:"border-box" }}
              onFocus={e=>e.target.style.borderColor=NC} onBlur={e=>e.target.style.borderColor=NL} />
          </div>
          {filteredNotes.length===0 ? (
            <div style={{ textAlign:"center",padding:"60px 0",color:"#B8A06A" }}>
              <div style={{ fontSize:48,marginBottom:14 }}>📝</div>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:"#5A4A2A",marginBottom:8 }}>No notes yet</div>
              <p style={{ fontSize:14,maxWidth:360,margin:"0 auto 20px",lineHeight:1.7 }}>Create your first note or upload any material and let AI turn it into structured study notes.</p>
              <button onClick={()=>newNote()} style={{ background:NC,border:"none",borderRadius:10,padding:"12px 28px",fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff",boxShadow:`0 6px 20px ${NC}44` }}>Create First Note →</button>
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14 }}>
              {filteredNotes.map(n => {
                const fld = folders.find(f=>f.id===n.folder);
                return (
                  <div key={n.id} className="notes-card" onClick={()=>openNote(n)}
                    style={{ background:"#fff",border:`1px solid ${NL}88`,borderLeft:`4px solid ${NC}`,borderRadius:12,padding:"18px 18px",cursor:"pointer" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:800,color:"#1A1814",lineHeight:1.3,flex:1,marginRight:8 }}>{n.title}</div>
                      <div style={{ fontSize:10,color:"#B8A06A",flexShrink:0 }}>{new Date(n.updatedAt).toLocaleDateString([],{month:"short",day:"numeric"})}</div>
                    </div>
                    {fld && <div style={{ fontSize:10,fontWeight:700,color:NC,background:`${NC}12`,borderRadius:10,padding:"2px 8px",display:"inline-block",marginBottom:8 }}>📁 {fld.name}</div>}
                    {n.aiGenerated && <div style={{ fontSize:10,fontWeight:700,color:"#4F6EF7",background:"#4F6EF715",borderRadius:10,padding:"2px 8px",display:"inline-block",marginBottom:8,marginLeft:4 }}>🤖 AI Generated</div>}
                    <div style={{ fontSize:12,color:"#8C7A4A",lineHeight:1.55,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical" }}>
                      {n.content?.replace(/[#*_]/g,"").slice(0,160)}{(n.content?.length||0)>160?"…":""}
                    </div>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10 }}>
                      <span style={{ fontSize:10,color:"#C8B88A" }}>{n.wordCount} words</span>
                      <button onClick={e=>{e.stopPropagation();setNotesMsg("Turn into Course coming soon! 🎓");setTimeout(()=>setNotesMsg(""),3000);}}
                        style={{ fontSize:10,fontWeight:700,color:NC,background:`${NC}10`,border:`1px solid ${NC}30`,borderRadius:10,padding:"3px 10px",cursor:"pointer",transition:"all 0.15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.background=NC;e.currentTarget.style.color="#fff";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=`${NC}10`;e.currentTarget.style.color=NC;}}>
                        🎓 Turn into Course
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}
      {/* ── LIBRARY VIEW ── */}
      {view==="library" && (
        <div style={{ display:"flex", height:"calc(100vh - 62px)", overflow:"hidden", animation:"notes-fade 0.4s ease both" }}>

          {/* ── LEFT SIDEBAR — folders tree ── */}
          <div style={{ width:240, flexShrink:0, borderRight:`1px solid ${NL}`, background:"#fff", display:"flex", flexDirection:"column", overflowY:"auto" }}>
            <div style={{ padding:"20px 16px 12px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"#B8A06A", textTransform:"uppercase", marginBottom:14 }}>My Library</div>

              {/* All Notes */}
              <button onClick={()=>setFilterFolder("all")}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:9, border:"none", background:filterFolder==="all"?`${NC}15`:"transparent", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:2, transition:"all 0.15s" }}
                onMouseEnter={e=>{if(filterFolder!=="all")e.currentTarget.style.background=`${NC}08`;}}
                onMouseLeave={e=>{if(filterFolder!=="all")e.currentTarget.style.background="transparent";}}>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <span style={{ fontSize:15 }}>📝</span>
                  <span style={{ fontSize:13, fontWeight:filterFolder==="all"?700:500, color:filterFolder==="all"?NC:"#3A3020" }}>All Notes</span>
                </div>
                <span style={{ fontSize:11, color:"#B8A06A", background:`${NC}10`, borderRadius:10, padding:"1px 8px", fontWeight:600 }}>{notes.length}</span>
              </button>

              {/* AI Generated */}
              <button onClick={()=>setFilterFolder("__ai__")}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:9, border:"none", background:filterFolder==="__ai__"?`${NC}15`:"transparent", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:2, transition:"all 0.15s" }}
                onMouseEnter={e=>{if(filterFolder!=="__ai__")e.currentTarget.style.background=`${NC}08`;}}
                onMouseLeave={e=>{if(filterFolder!=="__ai__")e.currentTarget.style.background="transparent";}}>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <span style={{ fontSize:15 }}>🤖</span>
                  <span style={{ fontSize:13, fontWeight:filterFolder==="__ai__"?700:500, color:filterFolder==="__ai__"?NC:"#3A3020" }}>AI Generated</span>
                </div>
                <span style={{ fontSize:11, color:"#4F6EF7", background:"#4F6EF715", borderRadius:10, padding:"1px 8px", fontWeight:600 }}>{notes.filter(n=>n.aiGenerated).length}</span>
              </button>

              {folders.length > 0 && (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#C8B88A", textTransform:"uppercase", padding:"4px 12px 8px" }}>Folders</div>
                  {folders.map(f => {
                    const count = notes.filter(n=>n.folder===f.id).length;
                    const isActive = filterFolder === f.id;
                    return (
                      <button key={f.id} onClick={()=>setFilterFolder(f.id)}
                        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:9, border:"none", background:isActive?`${NC}15`:"transparent", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:2, transition:"all 0.15s" }}
                        onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=`${NC}08`;}}
                        onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}>
                        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                          <span style={{ fontSize:15 }}>📁</span>
                          <span style={{ fontSize:13, fontWeight:isActive?700:500, color:isActive?NC:"#3A3020", textAlign:"left", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{f.name}</span>
                        </div>
                        <span style={{ fontSize:11, color:"#B8A06A", background:`${NC}10`, borderRadius:10, padding:"1px 8px", fontWeight:600 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* New folder */}
              <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${NL}66` }}>
                {confirmDeleteFolder && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setConfirmDeleteFolder(null)}>
            <div style={{background:"#fff",borderRadius:14,padding:"24px 28px",maxWidth:340,width:"90%",boxShadow:"0 16px 48px rgba(0,0,0,0.18)"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:16,fontWeight:800,color:"#1A1814",marginBottom:8}}>Delete folder?</div>
              <div style={{fontSize:13,color:"#5A5752",marginBottom:20}}>"{folders.find(f=>f.id===confirmDeleteFolder)?.name}" will be deleted. Notes inside will stay.</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setConfirmDeleteFolder(null)} style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #D8D5CE",background:"none",fontSize:13,fontWeight:600,cursor:"pointer",color:"#5A5752"}}>Cancel</button>
                <button onClick={()=>{const fid=confirmDeleteFolder;setFolders(prev=>prev.filter(f=>f.id!==fid));setNotes(prev=>prev.map(n=>n.folder===fid?{...n,folder:""}:n));if(filterFolder===fid)setFilterFolder("all");setConfirmDeleteFolder(null);}} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:"#E85D3F",fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff"}}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {addingFolder ? (
                  <input autoFocus value={newFolder} onChange={e=>setNewFolder(e.target.value)} placeholder="Folder name…"
                    onKeyDown={e=>{if(e.key===" ")e.stopPropagation();if(e.key==="Enter"&&newFolder.trim()){setFolders(prev=>[...prev,{id:`nf-${Date.now()}`,name:newFolder.trim()}]);setNewFolder("");setAddingFolder(false);}if(e.key==="Escape"){setAddingFolder(false);setNewFolder("");}}}
                    style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1.5px solid ${NC}`, background:"#FDFCF7", fontSize:12, color:"#1A1814", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" }} />
                ) : (
                  <button onClick={()=>setAddingFolder(true)}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:9, border:`1.5px dashed ${NL}`, background:"transparent", fontSize:12, fontWeight:600, cursor:"pointer", color:"#B8A06A", display:"flex", alignItems:"center", gap:8, transition:"all 0.15s", fontFamily:"'DM Sans',sans-serif" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=NC;e.currentTarget.style.color=NC;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=NL;e.currentTarget.style.color="#B8A06A";}}>
                    + New Folder
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL — notes grid ── */}
          <div style={{ flex:1, overflowY:"auto", padding:"28px 28px" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, color:"#1A1814", marginBottom:4 }}>
                  {filterFolder==="all" ? "All Notes" : filterFolder==="__ai__" ? "AI Generated Notes" : folders.find(f=>f.id===filterFolder)?.name || "Notes"}
                </h2>
                <div style={{ fontSize:12, color:"#B8A06A" }}>
                  {filteredNotes.length} {filteredNotes.length===1?"note":"notes"}
                  {filterFolder!=="all" && filterFolder!=="__ai__" && (
                    <button onClick={()=>setFilterFolder("all")} style={{ marginLeft:12, background:"none", border:"none", cursor:"pointer", fontSize:12, color:NC, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      ← All Notes
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {/* Search */}
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#B8A06A", pointerEvents:"none" }}>🔍</span>
                  <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search…"
                    onKeyDown={e=>{if(e.key===" ")e.stopPropagation();}}
                    style={{ padding:"8px 12px 8px 32px", borderRadius:9, border:`1.5px solid ${NL}`, background:"#fff", fontSize:13, color:"#1A1814", outline:"none", fontFamily:"'DM Sans',sans-serif", width:180, transition:"border-color 0.15s" }}
                    onFocus={e=>e.target.style.borderColor=NC} onBlur={e=>e.target.style.borderColor=NL} />
                </div>
                <button onClick={()=>newNote()} style={{ padding:"8px 18px", borderRadius:9, border:"none", background:NC, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 12px ${NC}44` }}>
                  + New Note
                </button>
              </div>
            </div>

            {/* Notes grid */}
            {filteredNotes.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#B8A06A" }}>
                <div style={{ fontSize:48, marginBottom:14 }}>
                  {filterFolder==="__ai__" ? "🤖" : "📝"}
                </div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:800, color:"#5A4A2A", marginBottom:8 }}>
                  {filterFolder==="__ai__" ? "No AI notes yet" : "No notes here"}
                </div>
                <p style={{ fontSize:14, lineHeight:1.7, maxWidth:300, margin:"0 auto 20px" }}>
                  {filterFolder==="__ai__" ? "Use AI Upload to generate structured notes from any content." : "Create a note or upload material to get started."}
                </p>
                <button onClick={filterFolder==="__ai__" ? ()=>setView("upload") : ()=>newNote()}
                  style={{ background:NC, border:"none", borderRadius:10, padding:"11px 24px", fontSize:13, fontWeight:700, cursor:"pointer", color:"#fff" }}>
                  {filterFolder==="__ai__" ? "🤖 AI Upload" : "+ New Note"}
                </button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
                {filteredNotes.map(n => {
                  const fld = folders.find(f=>f.id===n.folder);
                  return (
                    <div key={n.id} className="notes-card" onClick={()=>openNote(n)}
                      style={{ background:"#fff", border:`1px solid ${NL}88`, borderLeft:`4px solid ${NC}`, borderRadius:12, padding:"18px 18px", cursor:"pointer", position:"relative" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:800, color:"#1A1814", lineHeight:1.3, flex:1, marginRight:8 }}>{n.title}</div>
                        <div style={{ fontSize:10, color:"#B8A06A", flexShrink:0 }}>{new Date(n.updatedAt).toLocaleDateString([],{month:"short",day:"numeric"})}</div>
                      </div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
                        {fld && <span style={{ fontSize:10, fontWeight:700, color:NC, background:`${NC}12`, borderRadius:10, padding:"2px 8px" }}>📁 {fld.name}</span>}
                        {n.aiGenerated && <span style={{ fontSize:10, fontWeight:700, color:"#4F6EF7", background:"#4F6EF715", borderRadius:10, padding:"2px 8px" }}>🤖 AI</span>}
                      </div>
                      <div style={{ fontSize:12, color:"#8C7A4A", lineHeight:1.55, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical" }}>
                        {n.content?.replace(/[#*_\-]/g,"").slice(0,160)}{(n.content?.length||0)>160?"…":""}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10 }}>
                        <span style={{ fontSize:10, color:"#C8B88A" }}>{n.wordCount} words</span>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={e=>{e.stopPropagation();openEditor(n);}}
                            style={{ fontSize:10, fontWeight:700, color:"#8C7A4A", background:`${NL}22`, border:"none", borderRadius:8, padding:"3px 10px", cursor:"pointer" }}>
                            ✏️ Edit
                          </button>
                          <button onClick={e=>{e.stopPropagation();setNotesMsg("Turn into Course coming soon! 🎓"); setTimeout(()=>setNotesMsg(""),3000);}}
                            style={{ fontSize:10, fontWeight:700, color:NC, background:`${NC}10`, border:`1px solid ${NC}30`, borderRadius:8, padding:"3px 10px", cursor:"pointer" }}>
                            🎓 Course
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── UPLOAD VIEW ── */}
      {view==="upload" && (
        <div className="notes-main" style={{ maxWidth:760,margin:"0 auto",padding:"40px 24px",animation:"notes-fade 0.4s ease both" }}>
          <button onClick={()=>setView("home")} style={{ background:"none",border:`1px solid ${NL}`,borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#8C7A4A",marginBottom:24,transition:"all 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=NC;e.currentTarget.style.color=NC;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=NL;e.currentTarget.style.color="#8C7A4A";}}>← Back</button>
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:"#1A1814",marginBottom:6 }}>🤖 AI Note Builder</h2>
          <p style={{ fontSize:14,color:"#8C7A4A",lineHeight:1.7,marginBottom:24,maxWidth:520 }}>Give AI your content in any format — file, text, YouTube, or website. It reads everything and builds comprehensive study notes instantly.</p>
          <div style={{ display:"flex",gap:4,marginBottom:20,background:"#F5F3EC",borderRadius:10,padding:4 }}>
            {[["file","📄 File"],["paste","📋 Paste"],["youtube","▶ YouTube"],["website","🌐 Website"]].map(([t,label])=>(
              <button key={t} onClick={()=>setUploadTab(t)}
                style={{ flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:uploadTab===t?"#fff":"transparent",color:uploadTab===t?ND:"#8C7A4A",transition:"all 0.18s",boxShadow:uploadTab===t?"0 1px 6px rgba(0,0,0,0.08)":"none" }}>
                {label}
              </button>
            ))}
          </div>
          {uploadTab==="file" && (
            <div onDragOver={e=>{e.preventDefault();setIsDragging(true);}} onDragLeave={()=>setIsDragging(false)} onDrop={handleFileDrop}
              onClick={()=>fileInputRef.current?.click()}
              style={{ border:`2px dashed ${isDragging?NC:NL}`,borderRadius:16,padding:"52px 32px",textAlign:"center",cursor:"pointer",background:isDragging?`${NC}08`:`${NC}04`,transition:"all 0.2s",marginBottom:16 }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=NC;e.currentTarget.style.background=`${NC}08`;}}
              onMouseLeave={e=>{if(!isDragging){e.currentTarget.style.borderColor=NL;e.currentTarget.style.background=`${NC}04`;}}}>
              <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={handleFileDrop} />
              <div style={{ fontSize:52,marginBottom:14 }}>📄</div>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:"#1A1814",marginBottom:8 }}>Drop your file here</div>
              <p style={{ fontSize:13,color:"#8C7A4A",lineHeight:1.7,marginBottom:14 }}>PDF · Images · Text · Markdown</p>
              <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:NC,borderRadius:8,padding:"9px 22px",fontSize:13,fontWeight:700,color:"#fff" }}>📎 Choose File</div>
            </div>
          )}
          {uploadTab==="paste" && (
            <textarea value={uploadText} onChange={e=>setUploadText(e.target.value)} placeholder="Paste lecture notes, textbook content, syllabus, or any course material…"
              onKeyDown={e=>{if(e.key===" ")e.stopPropagation();}}
              style={{ width:"100%",minHeight:220,padding:"14px",borderRadius:12,border:`1.5px solid ${NL}`,background:"#fff",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#1A1814",outline:"none",resize:"vertical",lineHeight:1.7,transition:"border-color 0.18s",boxSizing:"border-box",marginBottom:16 }}
              onFocus={e=>e.target.style.borderColor=NC} onBlur={e=>e.target.style.borderColor=NL} />
          )}
          {uploadTab==="youtube" && (
            <div style={{ marginBottom:16 }}>
              <div style={{ background:"#fff",border:`1.5px solid ${NL}`,borderRadius:12,padding:"24px",marginBottom:12 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#5A4A2A",marginBottom:12 }}>▶ Paste a YouTube lecture or tutorial URL</div>
                <div style={{ display:"flex",gap:10 }}>
                  <input value={uploadUrl} onChange={e=>setUploadUrl(e.target.value)} onKeyDown={e=>{if(e.key===" ")e.stopPropagation();if(e.key==="Enter"&&uploadUrl.trim())fetchYouTube(uploadUrl);}} placeholder="https://youtube.com/watch?v=..."
                    style={{ flex:1,padding:"10px 14px",borderRadius:9,border:`1.5px solid ${NL}`,background:"#FDFCF7",fontSize:13,color:"#1A1814",outline:"none",fontFamily:"'DM Sans',sans-serif" }}
                    onFocus={e=>e.target.style.borderColor=NC} onBlur={e=>e.target.style.borderColor=NL} />
                  <button onClick={()=>fetchYouTube(uploadUrl)} disabled={!uploadUrl.trim()} style={{ padding:"10px 18px",borderRadius:9,border:"none",background:uploadUrl.trim()?NC:"#E8D8A0",color:uploadUrl.trim()?"#fff":"#B8A06A",fontSize:13,fontWeight:700,cursor:uploadUrl.trim()?"pointer":"default" }}>Load →</button>
                </div>
              </div>
              {uploadText && <div style={{ padding:"10px 14px",borderRadius:8,background:"#F0FFF4",border:"1px solid #86EFAC",fontSize:12,color:"#166534",fontWeight:600 }}>✓ Video loaded — ready to generate notes</div>}
            </div>
          )}
          {uploadTab==="website" && (
            <div style={{ marginBottom:16 }}>
              <div style={{ background:"#fff",border:`1.5px solid ${NL}`,borderRadius:12,padding:"24px",marginBottom:12 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#5A4A2A",marginBottom:12 }}>🌐 Paste a website or article URL</div>
                <div style={{ display:"flex",gap:10 }}>
                  <input value={uploadUrl} onChange={e=>setUploadUrl(e.target.value)} onKeyDown={e=>{if(e.key===" ")e.stopPropagation();if(e.key==="Enter"&&uploadUrl.trim())fetchWebContent(uploadUrl);}} placeholder="https://example.com/article"
                    style={{ flex:1,padding:"10px 14px",borderRadius:9,border:`1.5px solid ${NL}`,background:"#FDFCF7",fontSize:13,color:"#1A1814",outline:"none",fontFamily:"'DM Sans',sans-serif" }}
                    onFocus={e=>e.target.style.borderColor=NC} onBlur={e=>e.target.style.borderColor=NL} />
                  <button onClick={()=>fetchWebContent(uploadUrl)} disabled={!uploadUrl.trim()||uploadLoading} style={{ padding:"10px 18px",borderRadius:9,border:"none",background:uploadUrl.trim()?NC:"#E8D8A0",color:uploadUrl.trim()?"#fff":"#B8A06A",fontSize:13,fontWeight:700,cursor:uploadUrl.trim()?"pointer":"default" }}>{uploadLoading?"Fetching…":"Load →"}</button>
                </div>
              </div>
              {uploadText && <div style={{ padding:"10px 14px",borderRadius:8,background:"#F0FFF4",border:"1px solid #86EFAC",fontSize:12,color:"#166534",fontWeight:600 }}>✓ Page loaded — ready to generate notes</div>}
            </div>
          )}
          <div className="notes-upload-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
            <div>
              <label style={{ fontSize:12,fontWeight:700,color:"#8C7A4A",display:"block",marginBottom:6 }}>Topic / Title <span style={{ fontWeight:400,color:"#B8A06A" }}>(optional)</span></label>
              <input value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="e.g. Chapter 5 — Cell Biology"
                onKeyDown={e=>{if(e.key===" ")e.stopPropagation();}}
                style={{ width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${NL}`,background:"#fff",fontSize:13,color:"#1A1814",outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor=NC} onBlur={e=>e.target.style.borderColor=NL} />
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:700,color:"#8C7A4A",display:"block",marginBottom:6 }}>Learning Objectives <span style={{ fontWeight:400,color:"#B8A06A" }}>(optional)</span></label>
              <input value={uploadObjectives} onChange={e=>setUploadObjectives(e.target.value)} placeholder="e.g. Understand mitosis…"
                onKeyDown={e=>{if(e.key===" ")e.stopPropagation();}}
                style={{ width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${NL}`,background:"#fff",fontSize:13,color:"#1A1814",outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor=NC} onBlur={e=>e.target.style.borderColor=NL} />
            </div>
          </div>
          <div style={{ background:`${NC}08`,border:`1px solid ${NL}`,borderRadius:12,padding:"14px 18px",marginBottom:20 }}>
            <div style={{ fontSize:12,fontWeight:700,color:ND,marginBottom:8 }}>✦ AI generates automatically:</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:7 }}>
              {["📋 Overview","🎯 Objectives","💡 Key Concepts","📖 Key Terms","📝 Full Notes","📌 Summary","🧠 Study Tips"].map(item=>(
                <span key={item} style={{ fontSize:11,fontWeight:600,color:ND,background:"#fff",border:`1px solid ${NL}`,borderRadius:20,padding:"3px 10px" }}>{item}</span>
              ))}
            </div>
          </div>
          {uploadLoading && uploadProgress && (
            <div style={{ background:"#fff",border:`1.5px solid ${NC}`,borderRadius:12,padding:"24px",textAlign:"center",marginBottom:16 }}>
              <div style={{ display:"flex",justifyContent:"center",gap:8,marginBottom:14 }}>
                {[0,1,2].map(i=><div key={i} style={{ width:10,height:10,borderRadius:"50%",background:NC,animation:`notes-pulse 1s ${i*0.2}s infinite` }} />)}
              </div>
              <div style={{ fontSize:14,fontWeight:700,color:NC,marginBottom:4 }}>{uploadProgress}</div>
              <div style={{ fontSize:12,color:"#B8A06A" }}>Takes 10–20 seconds for longer content</div>
            </div>
          )}
          <button onClick={()=>generateSmartNotes(uploadText,null,uploadTitle,uploadObjectives)} disabled={!uploadText.trim()||uploadLoading}
            style={{ width:"100%",padding:"15px 0",borderRadius:11,border:"none",background:uploadText.trim()&&!uploadLoading?`linear-gradient(135deg,#4F6EF7,#7B5EE8)`:"#E8E5E0",color:uploadText.trim()&&!uploadLoading?"#fff":"#A8A59E",fontSize:15,fontWeight:800,cursor:uploadText.trim()&&!uploadLoading?"pointer":"default",transition:"all 0.2s",boxShadow:uploadText.trim()&&!uploadLoading?"0 8px 28px #4F6EF744":"none",fontFamily:"'DM Sans',sans-serif" }}>
            {uploadLoading?"Building your notes…":"🤖 Build My Notes with AI →"}
          </button>
        </div>
      )}

      {/* ── NOTE VIEW — clean reading page ── */}
      {view==="note" && activeNote && (
        <div className="notes-main" style={{ maxWidth:760, margin:"0 auto", padding:"48px 32px", animation:"notes-fade 0.4s ease both" }}>
          {/* Top bar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:40, flexWrap:"wrap", gap:12 }}>
            <button onClick={()=>setView("home")} style={{ background:"none", border:`1px solid ${NL}`, borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#8C7A4A", transition:"all 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=NC;e.currentTarget.style.color=NC;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=NL;e.currentTarget.style.color="#8C7A4A";}}>← Notes</button>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>openEditor(activeNote)}
                style={{ padding:"8px 18px", borderRadius:8, border:`1.5px solid ${NL}`, background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", color:"#8C7A4A", transition:"all 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=NC;e.currentTarget.style.color=NC;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=NL;e.currentTarget.style.color="#8C7A4A";}}>
                ✏️ Edit
              </button>
              {launchApp && <>
                <button id="note-fc-btn" onClick={async()=>{
                  if(!user){openAuth("login");return;}
                  const btn=document.getElementById("note-fc-btn");
                  if(btn){btn.textContent="Generating…";btn.disabled=true;}
                  try{
                    const res=await aiFetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:3000,messages:[{role:"user",content:"Create flashcards from these notes: \""+activeNote.title+"\". Extract every key term, definition, concept, fact.\nRespond ONLY with JSON: {\"cards\":[{\"term\":\"...\",\"definition\":\"...\",\"hint\":\"optional\"},...]}\n\nNotes:\n"+(activeNote.content?.slice(0,4000)||"")}]})});
                    const data=await res.json();
                    const txt=data.content?.find(b=>b.type==="text")?.text||"";
                    const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
                    if(parsed.cards?.length>0){
                      const deck={id:"deck_"+Date.now(),title:activeNote.title,subject:activeNote.subject||"Notes",color:"#C8B8FF",description:"Generated from note: "+activeNote.title,tags:["from-notes"],cards:parsed.cards.map((card,i)=>({id:i+1,...card,mastery:0,dueDate:null})),cardCount:parsed.cards.length,mastery:0,isPublic:false,author:user?.name||"You",createdAt:new Date().toISOString()};
                      const ex=JSON.parse(localStorage.getItem("tp_fc_decks")||"[]");
                      localStorage.setItem("tp_fc_decks",JSON.stringify([...ex,deck]));
                      launchApp("flashcards");
                    }
                  }catch(e){console.error(e);}
                  if(btn){btn.textContent="✦ → Flash Cards";btn.disabled=false;}
                }} style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #C8B8FF",background:"#F5F3FF",fontSize:13,fontWeight:600,cursor:"pointer",color:"#6B3FA0",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#C8B8FF";e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#F5F3FF";e.currentTarget.style.color="#6B3FA0";}}>
                  ✦ → Flash Cards
                </button>
                <button onClick={()=>{
                  const lines=(activeNote.content||"").split("\n").filter(l=>l.trim().startsWith("#")||l.trim().length>60).slice(0,8);
                  const pal=["#4F6EF7","#E85D3F","#2BAE7E","#9B59B6","#F5C842","#E67E22","#1DA1F2","#F0A8C0"];
                  const nodes=[{id:"root",label:(activeNote.title||"Note").slice(0,30),x:0,y:0,color:"#F0D080",parentId:null,deckIds:[],note:""}];
                  lines.forEach((line,i)=>{const angle=(i/Math.max(lines.length,1))*Math.PI*2-Math.PI/2;nodes.push({id:"n"+i,label:line.replace(/^#+\s*/,"").slice(0,30),x:Math.cos(angle)*220,y:Math.sin(angle)*220,color:pal[i%pal.length],parentId:"root",deckIds:[],note:line.slice(0,100)});});
                  const m={id:"map_"+Date.now(),title:activeNote.title||"Note Map",color:"#F0D080",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),nodes};
                  try{const ex=JSON.parse(localStorage.getItem("tp_bm_maps")||"[]");localStorage.setItem("tp_bm_maps",JSON.stringify([...ex,m]));}catch{}
                  launchApp("brainmap");
                }} style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #F0A8C0",background:"#FFF5F7",fontSize:13,fontWeight:600,cursor:"pointer",color:"#9B1446",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#F0A8C0";e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#FFF5F7";e.currentTarget.style.color="#9B1446";}}>
                  ✺ → Brain Map
                </button>
              </>}
              {!confirmDeleteNote
              ? <button onClick={()=>setConfirmDeleteNote(true)} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #FECACA", background:"transparent", color:"#E85D3F", fontSize:13, fontWeight:600, cursor:"pointer" }}>🗑</button>
              : <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ fontSize:11, color:"#E85D3F", fontWeight:600 }}>Delete?</span>
                  <button onClick={()=>{deleteNote(activeNote.id);setConfirmDeleteNote(false);}} style={{ padding:"5px 10px", borderRadius:6, border:"none", background:"#E85D3F", fontSize:11, fontWeight:700, cursor:"pointer", color:"#fff" }}>Yes</button>
                  <button onClick={()=>setConfirmDeleteNote(false)} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #ECEAE4", background:"transparent", fontSize:11, cursor:"pointer", color:"#8C8880" }}>No</button>
                </div>}
            </div>
          </div>

          {/* Note title — centered */}
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(24px,4vw,40px)", fontWeight:900, color:"#1A1814", lineHeight:1.15, marginBottom:12, letterSpacing:-0.5, textAlign:"center" }}>
            {activeNote.title}
          </h1>

          {/* Meta — centered */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:36, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:"#B8A06A" }}>
              {new Date(activeNote.updatedAt).toLocaleDateString([],{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </span>
            <span style={{ width:4, height:4, borderRadius:"50%", background:NL, display:"inline-block" }} />
            <span style={{ fontSize:12, color:"#B8A06A" }}>{activeNote.wordCount} words</span>
            {activeNote.aiGenerated && (
              <>
                <span style={{ width:4, height:4, borderRadius:"50%", background:NL, display:"inline-block" }} />
                <span style={{ fontSize:11, fontWeight:700, color:"#4F6EF7", background:"#4F6EF715", borderRadius:10, padding:"2px 10px" }}>🤖 AI Generated</span>
              </>
            )}
          </div>

          {/* Divider */}
          <div style={{ height:1, background:`linear-gradient(90deg, transparent, ${NC}50, transparent)`, marginBottom:36 }} />

          {/* Note content — left-aligned, clean rendering */}
          <div style={{ textAlign:"left" }}>
            {(() => {
              // Helper: parse inline bold/italic and strip leftover * _ symbols
              const parseInline = (text) => {
                // Replace **word** with bold, *word* with italic, _word_ with italic
                // Also handle partial bold like **O**bedience → Obedience (bold O)
                const parts = [];
                let remaining = text;
                let key = 0;

                // Process the text character by character using regex
                const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_)/g;
                let lastIndex = 0;
                let match;

                while ((match = regex.exec(remaining)) !== null) {
                  // Add plain text before match
                  if (match.index > lastIndex) {
                    parts.push(remaining.slice(lastIndex, match.index));
                  }
                  if (match[0].startsWith("**")) {
                    parts.push(<strong key={key++} style={{ fontWeight:700 }}>{match[2]}</strong>);
                  } else {
                    parts.push(<em key={key++}>{match[3] || match[4]}</em>);
                  }
                  lastIndex = regex.lastIndex;
                }
                // Remaining plain text
                if (lastIndex < remaining.length) {
                  parts.push(remaining.slice(lastIndex));
                }
                return parts.length > 0 ? parts : [text];
              };

              // Strip any remaining raw markdown symbols from plain lines
              const cleanLine = (line) => line.replace(/^#{1,6}\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/_(.+?)_/g, "$1").replace(/^[-*]\s/, "").replace(/^\d+\.\s/, "").replace(/^---+$/, "").trim();

              const lines = (activeNote.content || "").split("\n");
              const elements = [];
              let i = 0;

              while (i < lines.length) {
                const line = lines[i];
                const trimmed = line.trim();

                // Skip empty lines — add spacing
                if (!trimmed) { elements.push(<div key={i} style={{ height:10 }} />); i++; continue; }

                // Horizontal rule
                if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
                  elements.push(<hr key={i} style={{ border:"none", borderTop:`1px solid ${NL}`, margin:"20px 0" }} />);
                  i++; continue;
                }

                // H1 — # or ====
                if (/^#{1}\s/.test(line) && !/^#{2}/.test(line)) {
                  const text = line.replace(/^#+\s*/, "").trim();
                  elements.push(<h1 key={i} style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(20px,2.8vw,30px)", fontWeight:900, color:"#1A1814", margin:"32px 0 10px", lineHeight:1.2, borderBottom:`2px solid ${NL}`, paddingBottom:8 }}>{text}</h1>);
                  i++; continue;
                }

                // H2
                if (/^#{2}\s/.test(line) && !/^#{3}/.test(line)) {
                  const text = line.replace(/^#+\s*/, "").trim();
                  elements.push(<h2 key={i} style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(17px,2.3vw,24px)", fontWeight:800, color:"#1A1814", margin:"26px 0 8px", lineHeight:1.25 }}>{text}</h2>);
                  i++; continue;
                }

                // H3
                if (/^#{3}\s/.test(line) && !/^#{4}/.test(line)) {
                  const text = line.replace(/^#+\s*/, "").trim();
                  elements.push(<h3 key={i} style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(15px,2vw,19px)", fontWeight:800, color:"#5A4A2A", margin:"20px 0 6px" }}>{text}</h3>);
                  i++; continue;
                }

                // H4+ — render as bold label, not heading symbol
                if (/^#{4,}\s/.test(line)) {
                  const text = line.replace(/^#+\s*/, "").trim();
                  elements.push(<p key={i} style={{ fontSize:15, fontWeight:700, color:"#1A1814", margin:"16px 0 6px" }}>{text}</p>);
                  i++; continue;
                }

                // Bullet list item
                if (/^[-*+]\s/.test(trimmed)) {
                  const text = trimmed.replace(/^[-*+]\s/, "");
                  elements.push(
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, margin:"5px 0", paddingLeft:8 }}>
                      <span style={{ color:NC, fontSize:14, flexShrink:0, marginTop:5, lineHeight:1 }}>•</span>
                      <span style={{ flex:1, fontSize:15, lineHeight:1.85, color:"#1A1814" }}>{parseInline(text)}</span>
                    </div>
                  );
                  i++; continue;
                }

                // Numbered list
                if (/^\d+\.\s/.test(trimmed)) {
                  const num = trimmed.match(/^(\d+)\./)?.[1];
                  const text = trimmed.replace(/^\d+\.\s/, "");
                  elements.push(
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, margin:"5px 0", paddingLeft:8 }}>
                      <span style={{ color:NC, fontSize:13, fontWeight:700, flexShrink:0, minWidth:22, marginTop:4 }}>{num}.</span>
                      <span style={{ flex:1, fontSize:15, lineHeight:1.85, color:"#1A1814" }}>{parseInline(text)}</span>
                    </div>
                  );
                  i++; continue;
                }

                // Plain paragraph — parse inline styles, strip leftover symbols
                const stripped = trimmed
                  .replace(/^[-*+]\s/, "") // stray bullet
                  .replace(/^#+\s*/, "");  // stray heading symbols
                elements.push(
                  <p key={i} style={{ fontSize:15, lineHeight:1.9, color:"#1A1814", margin:"5px 0" }}>
                    {parseInline(stripped)}
                  </p>
                );
                i++;
              }

              return elements;
            })()}
          </div>

          {/* Bottom actions */}
          <div style={{ marginTop:60, paddingTop:28, borderTop:`1px solid ${NL}66`, display:"flex", gap:12, flexWrap:"wrap" }}>
            <button onClick={()=>openEditor(activeNote)}
              style={{ padding:"12px 28px", borderRadius:10, border:"none", background:NC, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 16px ${NC}44`, transition:"all 0.18s" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              ✏️ Edit This Note
            </button>
            <button onClick={()=>{setNotesMsg("Turn into Course coming soon! 🎓");setTimeout(()=>setNotesMsg(""),3000);}}
              style={{ padding:"12px 24px", borderRadius:10, border:`1.5px solid ${NC}30`, background:`${NC}10`, color:NC, fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.18s" }}
              onMouseEnter={e=>{e.currentTarget.style.background=NC;e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${NC}10`;e.currentTarget.style.color=NC;}}>
              🎓 Turn into Course
            </button>
          </div>
        </div>
      )}

      {/* ── EDITOR — Word doc style ── */}
      {view==="editor" && (
        <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 62px)", background:"#E8E6E0", animation:"notes-fade 0.3s ease both" }}>
          <style>{`
            .doc-toolbar-btn:hover { background: #D4C8A8 !important; }
            .doc-toolbar-btn.active { background: ${NC}33 !important; color: ${ND} !important; }
            .doc-page { box-shadow: 0 4px 24px rgba(0,0,0,0.13); }
            .doc-title:focus { outline: none; }
            .doc-body:focus { outline: none; }
            @media (max-width: 768px) {
              .doc-page-wrap { padding: 16px 8px !important; }
              .doc-page { padding: 32px 24px !important; }
              .doc-toolbar { padding: 0 10px !important; gap: 2px !important; }
              .doc-toolbar-group { gap: 1px !important; }
            }
          `}</style>

          {/* ── TOOLBAR ── */}
          <div className="doc-toolbar" style={{ background:"#F5F2EA", borderBottom:"1px solid #D8D0B8", padding:"0 20px", height:46, display:"flex", alignItems:"center", gap:6, flexShrink:0, overflowX:"auto" }}>

            {/* Back + Save */}
            <button onClick={()=>activeNote ? setView("note") : setView("home")}
              style={{ padding:"5px 12px", borderRadius:6, border:`1px solid #C8C0A0`, background:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", color:"#5A4A2A", whiteSpace:"nowrap", marginRight:4 }}>
              {activeNote ? "← Back" : "← Notes"}
            </button>
            <button onClick={saveNote} disabled={!content.trim()&&!title.trim()}
              style={{ padding:"5px 14px", borderRadius:6, border:"none", background:saveAnim?"#2BAE7E":content.trim()||title.trim()?NC:"#D8D0B8", color:content.trim()||title.trim()?"#fff":"#A8A090", fontSize:12, fontWeight:700, cursor:content.trim()||title.trim()?"pointer":"default", whiteSpace:"nowrap", marginRight:8, transition:"all 0.25s" }}>
              {saveAnim ? "✓ Saved!" : "Save"}
            </button>

            {/* Divider */}
            <div style={{ width:1, height:22, background:"#C8C0A0", flexShrink:0 }} />

            {/* Formatting group */}
            <div className="doc-toolbar-group" style={{ display:"flex", alignItems:"center", gap:2 }}>
              {[
                { id:"h1",    label:"H1",  title:"Heading 1" },
                { id:"h2",    label:"H2",  title:"Heading 2" },
                { id:"h3",    label:"H3",  title:"Heading 3" },
              ].map(f => (
                <button key={f.id} onClick={()=>applyFormat(f.id)} title={f.title} className="doc-toolbar-btn"
                  style={{ padding:"4px 8px", borderRadius:5, border:"none", background:"transparent", fontSize:12, fontWeight:800, cursor:"pointer", color:"#3A3020", minWidth:30, transition:"all 0.12s", fontFamily:"'DM Sans',sans-serif" }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ width:1, height:22, background:"#C8C0A0", flexShrink:0 }} />

            <div className="doc-toolbar-group" style={{ display:"flex", alignItems:"center", gap:2 }}>
              {[
                { id:"bold",      label:"B",    title:"Bold",          style:{ fontWeight:900 } },
                { id:"italic",    label:"I",    title:"Italic",        style:{ fontStyle:"italic" } },
                { id:"underline", label:"U",    title:"Underline",     style:{ textDecoration:"underline" } },
              ].map(f => (
                <button key={f.id} onClick={()=>applyFormat(f.id)} title={f.title} className="doc-toolbar-btn"
                  style={{ padding:"4px 9px", borderRadius:5, border:"none", background:"transparent", fontSize:13, cursor:"pointer", color:"#3A3020", minWidth:30, transition:"all 0.12s", fontFamily:"'DM Sans',sans-serif", ...f.style }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ width:1, height:22, background:"#C8C0A0", flexShrink:0 }} />

            <div className="doc-toolbar-group" style={{ display:"flex", alignItems:"center", gap:2 }}>
              {[
                { id:"ul",   label:"• List",    title:"Bullet List" },
                { id:"ol",   label:"1. List",   title:"Numbered List" },
                { id:"hr",   label:"― Line",    title:"Divider" },
              ].map(f => (
                <button key={f.id} onClick={()=>applyFormat(f.id)} title={f.title} className="doc-toolbar-btn"
                  style={{ padding:"4px 9px", borderRadius:5, border:"none", background:"transparent", fontSize:11, fontWeight:700, cursor:"pointer", color:"#3A3020", transition:"all 0.12s", whiteSpace:"nowrap" }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ width:1, height:22, background:"#C8C0A0", flexShrink:0 }} />

            {/* Folder selector */}
            <select value={folder} onChange={e=>setFolder(e.target.value)}
              style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #C8C0A0", background:"#fff", fontSize:11, fontWeight:600, color:"#5A4A2A", cursor:"pointer", outline:"none", fontFamily:"'DM Sans',sans-serif" }}>
              <option value="">📁 No Folder</option>
              {folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </select>

            {/* Record */}
            <button onClick={toggleRecording} className="doc-toolbar-btn"
              style={{ padding:"4px 10px", borderRadius:5, border:`1px solid ${isRecording?"#E85D3F":"#C8C0A0"}`, background:isRecording?"#FEF2F2":"transparent", fontSize:11, fontWeight:700, cursor:"pointer", color:isRecording?"#E85D3F":"#5A4A2A", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", transition:"all 0.18s" }}>
              {isRecording ? <><span style={{ width:7,height:7,borderRadius:"50%",background:"#E85D3F",animation:"notes-pulse 1s infinite",display:"inline-block" }} />Recording…</> : "🎙 Record"}
            </button>

            {/* Word count */}
            <div style={{ marginLeft:"auto", fontSize:11, color:"#8C7A4A", whiteSpace:"nowrap", flexShrink:0 }}>
              {content.trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </div>

          {/* ── PAGE ── */}
          <div className="doc-page-wrap" style={{ flex:1, overflowY:"auto", padding:"32px 48px", display:"flex", justifyContent:"center" }}>
            <div className="doc-page" style={{ width:"100%", maxWidth:760, background:"#fff", borderRadius:4, padding:"64px 72px", minHeight:900, position:"relative" }}>

              {/* Title field */}
              <input
                value={title}
                onChange={e=>setTitle(e.target.value)}
                onKeyDown={e=>{if(e.key===" ")e.stopPropagation();if(e.key==="Enter"){e.preventDefault();editorRef.current?.focus();}}}
                placeholder="Untitled Document"
                className="doc-title"
                style={{ width:"100%", border:"none", fontSize:32, fontFamily:"'Playfair Display',serif", fontWeight:900, color:"#1A1814", lineHeight:1.2, marginBottom:8, background:"transparent", boxSizing:"border-box", letterSpacing:-0.5 }}
              />

              {/* Meta row */}
              <div style={{ fontSize:11, color:"#B8A06A", marginBottom:32, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <span>{new Date().toLocaleDateString([],{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</span>
                {folder && <><span style={{ opacity:0.5 }}>·</span><span>📁 {folders.find(f=>f.id===folder)?.name}</span></>}
              </div>

              {/* Divider under title */}
              <div style={{ height:1, background:`linear-gradient(90deg,${NC}40,transparent)`, marginBottom:36 }} />

              {/* Body textarea */}
              <textarea
                ref={editorRef}
                value={content}
                onChange={e=>setContent(e.target.value)}
                onKeyDown={e=>{
                  if(e.key===" ") e.stopPropagation();
                  // Tab → indent
                  if(e.key==="Tab"){e.preventDefault();const s=e.target.selectionStart;const v=content.slice(0,s)+"    "+content.slice(e.target.selectionEnd);setContent(v);setTimeout(()=>{editorRef.current.selectionStart=editorRef.current.selectionEnd=s+4;},0);}
                }}
                placeholder="Start writing…"
                className="doc-body"
                style={{ width:"100%", minHeight:600, border:"none", background:"transparent", fontSize:15, fontFamily:"'DM Sans',sans-serif", color:"#1A1814", lineHeight:1.95, resize:"none", boxSizing:"border-box", letterSpacing:0.1 }}
              />
            </div>
          </div>

          {/* ── BOTTOM AI STRIP ── */}
          <div style={{ background:"#F5F2EA", borderTop:"1px solid #D8D0B8", padding:"8px 20px", display:"flex", alignItems:"center", gap:6, flexShrink:0, overflowX:"auto" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#8C7A4A", marginRight:4, whiteSpace:"nowrap" }}>AI:</span>
            {[["summarize","✦ Summarize"],["improve","✨ Improve"],["flashcards","📇 Flashcards"],["quiz","❓ Quiz"],["objectives","🎯 Objectives"],["explain","💬 Explain"]].map(([mode,label])=>(
              <button key={mode} onClick={()=>runAI(mode)} disabled={!content.trim()||aiLoading}
                style={{ padding:"5px 12px", borderRadius:6, border:`1px solid #C8C0A0`, background:"#fff", fontSize:11, fontWeight:700, cursor:content.trim()&&!aiLoading?"pointer":"default", color:content.trim()?ND:"#C8B890", whiteSpace:"nowrap", transition:"all 0.15s" }}
                onMouseEnter={e=>{if(content.trim()&&!aiLoading){e.currentTarget.style.background=NC;e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor=NC;}}}
                onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.color=content.trim()?ND:"#C8B890";e.currentTarget.style.borderColor="#C8C0A0";}}>
                {label}
              </button>
            ))}
            <button onClick={()=>setShowChat(c=>!c)}
              style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${showChat?NC:"#C8C0A0"}`, background:showChat?`${NC}15`:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", color:showChat?NC:ND, whiteSpace:"nowrap", marginLeft:4, transition:"all 0.15s" }}>
              💬 Chat
            </button>
            {activeNote && (
              <button onClick={()=>setConfirmDeleteNote(true)}
                style={{ marginLeft:"auto", padding:"5px 12px", borderRadius:6, border:"1px solid #FECACA", background:"transparent", fontSize:11, fontWeight:600, cursor:"pointer", color:"#E85D3F", whiteSpace:"nowrap" }}>
                🗑 Delete
              </button>
            )}
          </div>

          {/* ── AI RESULT PANEL ── */}
          {showAiPanel && (
            <div style={{ position:"fixed", bottom:52, right:20, width:380, maxHeight:"60vh", background:"#fff", border:`1.5px solid ${NC}`, borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", zIndex:200, display:"flex", flexDirection:"column", animation:"notes-fade 0.25s ease both" }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${NL}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:NC, textTransform:"uppercase", letterSpacing:1 }}>
                  {aiMode==="summarize"?"✦ Summary":aiMode==="improve"?"✨ Improved":aiMode==="flashcards"?"📇 Flashcards":aiMode==="quiz"?"❓ Quiz":aiMode==="objectives"?"🎯 Objectives":"💬 Explanation"}
                </div>
                <button onClick={()=>setShowAiPanel(false)} style={{ background:"none",border:"none",color:"#B8A06A",cursor:"pointer",fontSize:14,lineHeight:1 }}>✕</button>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
                {aiLoading ? (
                  <div style={{ display:"flex",gap:6,alignItems:"center",color:"#B8A06A",padding:"8px 0" }}>
                    {[0,1,2].map(i=><div key={i} style={{ width:8,height:8,borderRadius:"50%",background:NC,animation:`notes-pulse 1s ${i*0.2}s infinite` }} />)}
                    <span style={{ fontSize:13,marginLeft:4 }}>Working on it…</span>
                  </div>
                ) : (
                  <pre style={{ fontSize:13,color:"#3A2A10",lineHeight:1.8,whiteSpace:"pre-wrap",fontFamily:"'DM Sans',sans-serif",margin:0 }}>{aiResult}</pre>
                )}
              </div>
              {!aiLoading && aiMode==="improve" && (
                <div style={{ padding:"10px 14px", borderTop:`1px solid ${NL}`, flexShrink:0 }}>
                  <button onClick={()=>{setContent(aiResult);setShowAiPanel(false);}} style={{ width:"100%",padding:"9px",borderRadius:8,border:"none",background:NC,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>
                    Use Improved Version
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── CHAT PANEL ── */}
          {showChat && (
            <div style={{ position:"fixed", bottom:52, right:20, width:360, maxHeight:"55vh", background:"#fff", border:`1.5px solid ${NC}`, borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", zIndex:200, display:"flex", flexDirection:"column", animation:"notes-fade 0.25s ease both" }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${NL}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
                <span style={{ fontSize:13, fontWeight:700, color:ND }}>💬 Chat with Notes</span>
                <button onClick={()=>setShowChat(false)} style={{ background:"none",border:"none",color:"#B8A06A",cursor:"pointer",fontSize:14 }}>✕</button>
              </div>
              {chatMessages.length===0 && (
                <div style={{ padding:"10px 12px", display:"flex", gap:6, flexWrap:"wrap", borderBottom:`1px solid ${NL}66` }}>
                  {["Key terms?","What's testable?","Summarize simply","Hardest concept?"].map(q=>(
                    <button key={q} onClick={()=>sendChatMessage(q)}
                      style={{ padding:"4px 10px",borderRadius:14,border:`1px solid ${NL}`,background:`${NC}08`,fontSize:11,fontWeight:600,cursor:"pointer",color:ND,transition:"all 0.15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.background=NC;e.currentTarget.style.color="#fff";}}
                      onMouseLeave={e=>{e.currentTarget.style.background=`${NC}08`;e.currentTarget.style.color=ND;}}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
                {chatMessages.map((m,i)=>(
                  <div key={i} style={{ marginBottom:10,display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start" }}>
                    <div style={{ maxWidth:"88%",padding:"9px 13px",borderRadius:m.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",background:m.role==="user"?NC:"#F5F3EC",color:m.role==="user"?"#fff":"#1A1814",fontSize:13,lineHeight:1.6 }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && <div style={{ display:"flex",gap:5 }}>{[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:"50%",background:NC,animation:`notes-pulse 1s ${i*0.2}s infinite` }} />)}</div>}
              </div>
              <div style={{ padding:"8px 10px",borderTop:`1px solid ${NL}66`,display:"flex",gap:6,flexShrink:0 }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{if(e.key===" ")e.stopPropagation();if(e.key==="Enter")sendChatMessage();}}
                  placeholder="Ask about your notes…"
                  style={{ flex:1,padding:"8px 11px",borderRadius:8,border:`1.5px solid ${NL}`,background:"#FDFCF7",fontSize:12,color:"#1A1814",outline:"none",fontFamily:"'DM Sans',sans-serif" }}
                  onFocus={e=>e.target.style.borderColor=NC} onBlur={e=>e.target.style.borderColor=NL} />
                <button onClick={()=>sendChatMessage()} disabled={!chatInput.trim()||chatLoading}
                  style={{ padding:"8px 14px",borderRadius:8,border:"none",background:chatInput.trim()?NC:"#E8D8A0",color:chatInput.trim()?"#fff":"#B8A06A",fontSize:13,fontWeight:700,cursor:chatInput.trim()?"pointer":"default" }}>↑</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FOLDERS ── */}
      {view==="folders" && (
        <div className="notes-main" style={{ maxWidth:800,margin:"0 auto",padding:"40px 24px",animation:"notes-fade 0.4s ease both" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:"#1A1814" }}>Folders</h2>
            <button onClick={()=>setAddingFolder(true)} style={{ background:NC,border:"none",borderRadius:9,padding:"9px 20px",fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff" }}>+ New Folder</button>
          </div>
          {addingFolder && (
            <div style={{ background:"#fff",border:`1.5px solid ${NC}`,borderRadius:12,padding:"18px 20px",marginBottom:16,animation:"notes-fade 0.3s ease both" }}>
              <input autoFocus value={newFolder} onChange={e=>setNewFolder(e.target.value)} placeholder="Folder name…"
                onKeyDown={e=>{if(e.key===" ")e.stopPropagation();if(e.key==="Enter"&&newFolder.trim()){setFolders(prev=>[...prev,{id:`nf-${Date.now()}`,name:newFolder.trim()}]);setNewFolder("");setAddingFolder(false);}if(e.key==="Escape"){setAddingFolder(false);setNewFolder("");}}}
                style={{ width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${NL}`,background:"#FDFCF7",fontSize:14,color:"#1A1814",outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box" }} />
              <div style={{ fontSize:11,color:"#B8A06A",marginTop:6 }}>Enter to save · Esc to cancel</div>
            </div>
          )}
          {folders.length===0&&!addingFolder ? (
            <div style={{ textAlign:"center",padding:"50px 0",color:"#B8A06A" }}>
              <div style={{ fontSize:40,marginBottom:12 }}>📁</div>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:"#5A4A2A",marginBottom:8 }}>No folders yet</div>
              <p style={{ fontSize:14,lineHeight:1.7 }}>Create folders to organize notes by subject, class, or project.</p>
            </div>
          ) : (
            <div className="notes-folders-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12 }}>
              {folders.map(f => {
                const count = notes.filter(n=>n.folder===f.id).length;
                return (
                  <div key={f.id} onClick={()=>{setFilterFolder(f.id);setView("home");}}
                    style={{ background:"#fff",border:`1px solid ${NL}88`,borderTop:`3px solid ${NC}`,borderRadius:12,padding:"18px 18px",cursor:"pointer",transition:"all 0.2s",position:"relative" }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${NC}18`;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                    <div style={{ fontSize:28,marginBottom:8 }}>📁</div>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:800,color:"#1A1814",marginBottom:4 }}>{f.name}</div>
                    <div style={{ fontSize:12,color:"#8C7A4A" }}>{count} {count===1?"note":"notes"}</div>
                    <button onClick={e=>{e.stopPropagation();setConfirmDeleteFolder(f.id);}}
                      style={{ position:"absolute",top:10,right:10,background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#C8B88A",opacity:0,transition:"opacity 0.15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.color="#E85D3F";}}
                      onMouseLeave={e=>e.currentTarget.style.opacity="0"}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotesApp;
