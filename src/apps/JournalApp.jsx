// Split out of App.jsx so this code only downloads when it is needed.
import { useState, useRef, useEffect } from "react";
import { aiFetch, tpSync } from "../shared.jsx";

// ─── Ace It Journal ──────────────────────────────────────────────────────────

const J_COLOR   = "#B060D0";

const J_LIGHT   = "#E8C4F0";

const J_DARK    = "#6A0090";

const J_BG      = "#F7F6F2";

const J_MOODS = [
  { id:"amazing",  emoji:"🤩", label:"Amazing",   color:"#F5C842" },
  { id:"good",     emoji:"😊", label:"Good",       color:"#2BAE7E" },
  { id:"okay",     emoji:"😐", label:"Okay",       color:"#90C8F8" },
  { id:"low",      emoji:"😔", label:"Low",        color:"#F0A8C0" },
  { id:"rough",    emoji:"😞", label:"Rough",      color:"#E85D3F" },
];

const J_PROMPTS = [
  "What's one thing that made you smile today?",
  "What's been on your mind lately?",
  "What are you grateful for right now?",
  "What challenged you today, and how did you handle it?",
  "What do you want tomorrow to look like?",
  "What's something you learned about yourself recently?",
  "How are you really feeling — not the surface answer?",
  "What would you tell your past self from a year ago?",
  "What's something you've been avoiding thinking about?",
  "What does your ideal life look like in 5 years?",
  "What relationships in your life need more attention?",
  "What are you proud of that nobody else knows about?",
];

const J_CATEGORIES = [
  { id:"all",         label:"All Entries",  emoji:"📖" },
  { id:"daily",       label:"Daily Life",   emoji:"☀️" },
  { id:"mental",      label:"Mental Health",emoji:"🧠" },
  { id:"gratitude",   label:"Gratitude",    emoji:"🙏" },
  { id:"goals",       label:"Goals",        emoji:"🎯" },
  { id:"reflection",  label:"Reflection",   emoji:"💭" },
  { id:"vent",        label:"Vent",         emoji:"💨" },
  { id:"creative",    label:"Creative",     emoji:"✨" },
];

function JournalApp({ onBack, user, openAuth, aiContext }) {
  const [view, setView]               = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entries, setEntries]   = useState(() => {
    try { const s = localStorage.getItem("tp_journal"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [activeEntry, setActiveEntry] = useState(null);
  const [filterCat, setFilterCat]     = useState("all");
  const [searchQ, setSearchQ]         = useState("");

  // Write state
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [mood, setMood]         = useState(null);
  const [category, setCategory] = useState("daily");
  const [showPrompt, setShowPrompt] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiReflection, setAiReflection] = useState("");
  const [showAiPanel, setShowAiPanel]   = useState(false);
  const [wordCount, setWordCount]   = useState(0);
  const [saveAnim, setSaveAnim]     = useState(false);
  const textareaRef = useRef(null);

  const journalMounted = useRef(false);
  useEffect(() => {
    if (!journalMounted.current) { journalMounted.current = true; return; }
    try { localStorage.setItem("tp_journal", JSON.stringify(entries)); } catch {}
    tpSync("tp_journal", entries);
  }, [entries]);

  useEffect(() => {
    setWordCount(body.trim() ? body.trim().split(/\s+/).length : 0);
  }, [body]);

  const newPrompt = () => {
    setCurrentPrompt(J_PROMPTS[Math.floor(Math.random() * J_PROMPTS.length)]);
    setShowPrompt(true);
  };

  const usePrompt = () => {
    const prefix = body.trim() ? body + "\n\n" : "";
    setBody(prefix + currentPrompt + "\n\n");
    setShowPrompt(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const saveEntry = () => {
    if (!body.trim()) return;
    const entry = {
      id: Date.now(),
      title: title.trim() || `Entry — ${new Date().toLocaleDateString([], { month:"long", day:"numeric" })}`,
      body: body.trim(),
      mood,
      category,
      wordCount,
      createdAt: new Date().toISOString(),
    };
    setEntries(prev => [entry, ...prev]);
    setSaveAnim(true);
    setTimeout(() => {
      setSaveAnim(false);
      setTitle(""); setBody(""); setMood(null); setCategory("daily");
      setAiReflection(""); setShowAiPanel(false);
      setView("home");
    }, 800);
  };

  const deleteEntry = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (activeEntry?.id === id) { setActiveEntry(null); setView("browse"); }
  };

  const getAiReflection = async () => {
    if (!body.trim() || aiLoading) return;
    setAiLoading(true);
    setShowAiPanel(true);
    setAiReflection("");
    try {
      const res = await aiFetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          system: `You are a warm, empathetic journal companion inside the Ace It Journal app. The user has shared a journal entry with you. Your role is to:
- Reflect back what you heard with genuine understanding — not just repeating their words but showing you truly understood what they were feeling
- Gently notice any patterns, emotions, or themes they may not have explicitly named
- Ask ONE thoughtful follow-up question that might help them go deeper
- Be human, warm, and non-judgmental. Never give unsolicited advice. Never tell them what they "should" do.
- Keep your response to 3-4 short paragraphs max.
${user?.name ? `The user's name is ${user.name}.` : ""}`,
          messages: [{ role: "user", content: `Here's my journal entry:\n\n${body}` }],
        }),
      });
      const data = await res.json();
      setAiReflection(data.content?.find(b => b.type === "text")?.text || "");
    } catch {
      setAiReflection("Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchCat  = filterCat === "all" || e.category === filterCat;
    const matchSearch = !searchQ.trim() || e.title.toLowerCase().includes(searchQ.toLowerCase()) || e.body.toLowerCase().includes(searchQ.toLowerCase());
    return matchCat && matchSearch;
  });

  const streakDays = (() => {
    if (!entries.length) return 0;
    const dates = [...new Set(entries.map(e => new Date(e.createdAt).toDateString()))];
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (dates.includes(d.toDateString())) streak++;
      else if (i > 0) break;
    }
    return streak;
  })();

  const totalWords = entries.reduce((a, e) => a + (e.wordCount || 0), 0);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:J_BG, minHeight:"100vh", color:"#1A1814" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${J_LIGHT}; border-radius: 3px; }
        @keyframes j-fade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes j-pop  { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
        @keyframes j-save { 0%{background:${J_COLOR}} 50%{background:#2BAE7E} 100%{background:#2BAE7E} }
        .j-entry-card:hover { transform:translateY(-3px) !important; box-shadow:0 10px 30px rgba(176,96,208,0.12) !important; }
        .j-entry-card { transition: transform 0.2s, box-shadow 0.2s; }
        .j-mood-btn:hover { transform:scale(1.1) !important; }
        .j-mood-btn { transition: transform 0.15s; }
        @media (max-width: 768px) {
          .j-layout { flex-direction: column !important; }
          .j-sidebar { width: 100% !important; min-width: unset !important; max-width: unset !important; position: relative !important; border-right: none !important; border-bottom: 1px solid rgba(176,96,208,0.15) !important; padding: 16px !important; }
          .j-main { padding: 20px 14px !important; }
          .j-prompts-grid { grid-template-columns: 1fr !important; }
          .j-entries-grid { grid-template-columns: 1fr !important; }
          .j-cats-grid { grid-template-columns: 1fr 1fr !important; }
          .j-moods-grid { flex-wrap: wrap !important; gap: 8px !important; }
          .j-nav-name { display: none !important; }
          .j-stats-strip { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(26,10,40,0.35)", backdropFilter:"blur(4px)" }} />}
      <div style={{ position:"fixed", left:0, top:0, bottom:0, width:272, background:"#fff", borderRight:`1px solid ${J_LIGHT}`, display:"flex", flexDirection:"column", zIndex:201, transform:sidebarOpen?"translateX(0)":"translateX(-100%)", transition:"transform 0.38s cubic-bezier(0.16,1,0.3,1)", boxShadow:sidebarOpen?"4px 0 32px rgba(26,10,40,0.12)":"none" }}>

        {/* Sidebar header */}
        <div style={{ padding:"18px 20px", borderBottom:`1px solid ${J_LIGHT}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg, ${J_COLOR}, ${J_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✍</div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:800, color:"#1A1814" }}>Ace It Journal</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background:"none", border:`1px solid ${J_LIGHT}`, borderRadius:5, width:28, height:28, cursor:"pointer", fontSize:13, color:"#6F6B63", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=J_COLOR;e.currentTarget.style.color=J_COLOR;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=J_LIGHT;e.currentTarget.style.color="#6F6B63";}}>✕</button>
        </div>

        {/* Sidebar body */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 12px 20px" }}>

          {/* User card */}
          <div style={{ background:`${J_COLOR}08`, border:`1px solid ${J_COLOR}25`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
            {user ? (
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg, ${J_COLOR}, ${J_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:16, fontWeight:800, color:"#fff" }}>
                  {user.name?.[0] || "U"}
                </div>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:800, color:"#1A1814" }}>{user.name}</div>
                  <div style={{ fontSize:11, color:"#8C8880" }}>Free Plan</div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1A1814", marginBottom:10 }}>Sign in to save your journal</div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { openAuth("login"); setSidebarOpen(false); }} style={{ flex:1, padding:"7px 0", borderRadius:7, border:`1px solid ${J_LIGHT}`, background:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", color:"#3A3830" }}>Log In</button>
                  <button onClick={() => { openAuth("signup"); setSidebarOpen(false); }} style={{ flex:1, padding:"7px 0", borderRadius:7, border:"none", background:J_COLOR, fontSize:11, fontWeight:700, cursor:"pointer", color:"#fff" }}>Sign Up</button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#8C8880", padding:"4px 8px 8px" }}>Navigation</div>
          {[
            { icon:"📖", label:"Home",           v:"home"   },
            { icon:"✍",  label:"Write Entry",    v:"write"  },
            { icon:"🗂",  label:"All Entries",    v:"browse" },
          ].map(({ icon, label, v }) => {
            const active = view === v;
            return (
              <button key={v} onClick={() => { setView(v); setSidebarOpen(false); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"9px 12px", borderRadius:8, border:"none", background:active?`${J_COLOR}15`:"transparent", cursor:"pointer", textAlign:"left", transition:"all 0.15s", marginBottom:2, fontFamily:"'DM Sans',sans-serif" }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background=`${J_COLOR}08`; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background="transparent"; }}>
                <span style={{ fontSize:15, width:20, textAlign:"center" }}>{icon}</span>
                <span style={{ fontSize:13, fontWeight:active?700:500, color:active?J_COLOR:"#3A3830" }}>{label}</span>
                {active && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:J_COLOR }} />}
              </button>
            );
          })}

          {/* Categories quick filter */}
          <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${J_LIGHT}66` }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#8C8880", padding:"4px 8px 8px" }}>Categories</div>
            {J_CATEGORIES.map(({ id, emoji, label }) => {
              const count = id === "all" ? entries.length : entries.filter(e => e.category === id).length;
              return (
                <button key={id} onClick={() => { setFilterCat(id); setView("browse"); setSidebarOpen(false); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:"none", background:"transparent", cursor:"pointer", transition:"all 0.15s", marginBottom:1, fontFamily:"'DM Sans',sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background=`${J_COLOR}08`}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <span style={{ fontSize:14 }}>{emoji}</span>
                  <span style={{ fontSize:12, fontWeight:500, color:"#3A3830", flex:1, textAlign:"left" }}>{label}</span>
                  <span style={{ fontSize:11, color:"#A8A59E", background:`${J_COLOR}10`, borderRadius:10, padding:"1px 7px", fontWeight:600 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Mood quick stats */}
          {entries.length > 0 && (
            <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${J_LIGHT}66` }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#8C8880", padding:"4px 8px 8px" }}>Mood History</div>
              <div style={{ display:"flex", gap:8, padding:"4px 8px", flexWrap:"wrap" }}>
                {J_MOODS.map(m => {
                  const count = entries.filter(e => e.mood === m.id).length;
                  if (!count) return null;
                  return (
                    <div key={m.id} title={`${m.label}: ${count}`} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <span style={{ fontSize:20 }}>{m.emoji}</span>
                      <span style={{ fontSize:10, color:"#8C8880", fontWeight:600 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding:"12px 12px", borderTop:`1px solid ${J_LIGHT}` }}>
          <button onClick={onBack} style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"9px 12px", borderRadius:8, border:"none", background:"transparent", cursor:"pointer", transition:"all 0.15s", fontFamily:"'DM Sans',sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background=`${J_COLOR}08`}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            <span style={{ fontSize:13, color:"#8C8880" }}>←</span>
            <span style={{ fontSize:13, fontWeight:500, color:"#6F6B63" }}>Back to Galaxy</span>
          </button>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{ background:"#fff", borderBottom:`1px solid ${J_LIGHT}55`, position:"sticky", top:0, zIndex:100, height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Hamburger */}
          <button onClick={() => setSidebarOpen(true)} style={{ background:"none", border:`1px solid ${J_LIGHT}`, borderRadius:7, width:36, height:36, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, transition:"all 0.18s", flexShrink:0 }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=J_COLOR;e.currentTarget.style.background=`${J_COLOR}08`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=J_LIGHT;e.currentTarget.style.background="none";}}>
            <div style={{ width:14, height:1.5, background:J_COLOR, borderRadius:1 }} />
            <div style={{ width:10, height:1.5, background:"#8C8880", borderRadius:1 }} />
            <div style={{ width:14, height:1.5, background:J_COLOR, borderRadius:1 }} />
          </button>
          <button onClick={onBack} style={{ background:"none", border:`1px solid ${J_LIGHT}`, borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#6F6B63", transition:"all 0.18s", whiteSpace:"nowrap", flexShrink:0 }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=J_COLOR;e.currentTarget.style.color=J_COLOR;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=J_LIGHT;e.currentTarget.style.color="#6F6B63";}}>← Galaxy</button>
          <div style={{ width:1, height:20, background:J_LIGHT, flexShrink:0 }} />
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg, ${J_COLOR}, ${J_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>✍</div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:800, color:"#1A1814" }}>
              <span style={{ color:J_COLOR }}>Ace It</span> Journal
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[["📖","home"],["✍","write"],["🗂","browse"]].map(([icon, v]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding:"7px 16px", borderRadius:8, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.18s", background: view===v ? J_COLOR : "transparent", color: view===v ? "#fff" : "#6F6B63" }}
              onKeyDown={e => { if (e.key===" ") e.preventDefault(); }}>
              {icon} {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>
        {user ? (
          <div style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }} onClick={() => setSidebarOpen(true)}>
            <span className="j-nav-name" style={{ fontSize:12, fontWeight:700, color:"#3A3830" }}>{user.name}</span>
            <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg, ${J_COLOR}, ${J_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff" }}>{user.name?.[0]||"U"}</div>
          </div>
        ) : (
          <button onClick={() => openAuth("signup")} style={{ background:J_COLOR, border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer", color:"#fff" }}>Sign Up Free</button>
        )}
      </nav>

      {/* ── HOME VIEW ── */}
      {view === "home" && (
        <div className="j-main" style={{ maxWidth:900, margin:"0 auto", padding:"48px 28px", animation:"j-fade 0.5s ease both" }}>

          {/* Welcome header */}
          <div style={{ marginBottom:40 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${J_COLOR}12`, border:`1px solid ${J_COLOR}30`, borderRadius:20, padding:"4px 14px", marginBottom:16 }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:J_COLOR, textTransform:"uppercase" }}>Your Private Space</span>
            </div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:900, letterSpacing:-1, color:"#1A1814", lineHeight:1.1, marginBottom:10 }}>
              Hey {user?.name?.split(" ")[0] || "there"} ✍<br/>
              <span style={{ color:J_COLOR }}>What's on your mind?</span>
            </h1>
            <p style={{ fontSize:15, color:"#6F6B63", lineHeight:1.7, maxWidth:500 }}>
              This is your private space. Write freely, reflect deeply, and track your journey — mental health, daily life, goals, and everything in between.
            </p>
          </div>

          {/* Stats bar */}
          <div className="j-stats-strip" style={{ display:"flex", gap:12, marginBottom:36 }}>
            {[
              { label:"Entries",    value:entries.length,       icon:"📝" },
              { label:"Day Streak", value:`${streakDays}d`,     icon:"🔥" },
              { label:"Words",      value:totalWords.toLocaleString(), icon:"✍" },
              { label:"This Week",  value:entries.filter(e => new Date(e.createdAt) > new Date(Date.now()-604800000)).length, icon:"📅" },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ flex:1, background:"#fff", border:`1px solid ${J_LIGHT}88`, borderRadius:14, padding:"18px 16px", textAlign:"center" }}>
                <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color:J_COLOR, marginBottom:3 }}>{value}</div>
                <div style={{ fontSize:10, fontWeight:700, color:"#8C8880", textTransform:"uppercase", letterSpacing:1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Quick write + today's prompt */}
          <div className="j-prompts-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:36 }}>
            <div onClick={() => setView("write")} style={{ background:`linear-gradient(135deg, ${J_COLOR}, ${J_DARK})`, borderRadius:16, padding:"28px 26px", cursor:"pointer", transition:"all 0.2s", color:"#fff" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 14px 40px ${J_COLOR}44`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
              <div style={{ fontSize:32, marginBottom:14 }}>✍</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:900, marginBottom:6 }}>Write Today's Entry</div>
              <div style={{ fontSize:13, opacity:0.8, lineHeight:1.5 }}>Start with a blank page or get a prompt to spark reflection.</div>
            </div>
            <div style={{ background:"#fff", border:`1.5px solid ${J_LIGHT}`, borderRadius:16, padding:"28px 26px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"#8C8880", textTransform:"uppercase", marginBottom:12 }}>Today's Prompt</div>
              <p style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:"#1A1814", lineHeight:1.6, marginBottom:18 }}>
                "{J_PROMPTS[new Date().getDay() % J_PROMPTS.length]}"
              </p>
              <button onClick={() => { setCurrentPrompt(J_PROMPTS[new Date().getDay() % J_PROMPTS.length]); setView("write"); setTimeout(() => usePrompt(), 100); }}
                style={{ background:`${J_COLOR}18`, border:`1px solid ${J_COLOR}44`, borderRadius:8, padding:"8px 18px", fontSize:12, fontWeight:700, cursor:"pointer", color:J_COLOR, transition:"all 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.background=J_COLOR;e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${J_COLOR}18`;e.currentTarget.style.color=J_COLOR;}}>
                Write With This Prompt →
              </button>
            </div>
          </div>

          {/* Recent entries */}
          {entries.length > 0 && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"#8C8880", textTransform:"uppercase" }}>Recent Entries</div>
                <button onClick={() => setView("browse")} style={{ background:"none", border:"none", fontSize:12, fontWeight:700, color:J_COLOR, cursor:"pointer" }}>See All →</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {entries.slice(0, 4).map(e => {
                  const moodObj = J_MOODS.find(m => m.id === e.mood);
                  const cat = J_CATEGORIES.find(c => c.id === e.category);
                  return (
                    <div key={e.id} className="j-entry-card" onClick={() => { setActiveEntry(e); setView("entry"); }}
                      style={{ background:"#fff", border:`1px solid ${J_LIGHT}88`, borderRadius:12, padding:"18px 20px", cursor:"pointer" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                            {moodObj && <span title={moodObj.label}>{moodObj.emoji}</span>}
                            {cat && <span style={{ fontSize:10, fontWeight:700, color:J_COLOR, background:`${J_COLOR}12`, padding:"2px 8px", borderRadius:10 }}>{cat.emoji} {cat.label}</span>}
                          </div>
                          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:800, color:"#1A1814", marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.title}</div>
                          <div style={{ fontSize:13, color:"#6F6B63", lineHeight:1.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.body.slice(0,120)}{e.body.length>120?"…":""}</div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0, marginLeft:16 }}>
                          <div style={{ fontSize:11, color:"#8C8880" }}>{new Date(e.createdAt).toLocaleDateString([],{month:"short",day:"numeric"})}</div>
                          <div style={{ fontSize:10, color:"#A8A59E", marginTop:2 }}>{e.wordCount} words</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {entries.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#8C8880" }}>
              <div style={{ fontSize:52, marginBottom:14 }}>📖</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:800, color:"#3A3830", marginBottom:8 }}>Your journal is waiting</div>
              <p style={{ fontSize:14, maxWidth:380, margin:"0 auto 24px", lineHeight:1.7 }}>Every journey starts with a single entry. Write your first one — it can be anything at all.</p>
              <button onClick={() => setView("write")} style={{ background:J_COLOR, border:"none", borderRadius:10, padding:"13px 30px", fontSize:14, fontWeight:700, cursor:"pointer", color:"#fff", boxShadow:`0 6px 20px ${J_COLOR}44` }}>Write Your First Entry →</button>
            </div>
          )}
        </div>
      )}

      {/* ── WRITE VIEW ── */}
      {view === "write" && (
        <div className="j-main" style={{ maxWidth:800, margin:"0 auto", padding:"40px 28px", animation:"j-fade 0.4s ease both" }}>

          {/* Writing prompt tooltip */}
          {showPrompt && (
            <div style={{ background:`${J_COLOR}10`, border:`1.5px solid ${J_COLOR}44`, borderRadius:14, padding:"18px 20px", marginBottom:20, position:"relative", animation:"j-fade 0.3s ease both" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:J_COLOR, textTransform:"uppercase", marginBottom:8 }}>Today's Prompt</div>
              <p style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:"#1A1814", lineHeight:1.65, marginBottom:14 }}>"{currentPrompt}"</p>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={usePrompt} style={{ padding:"7px 16px", borderRadius:8, border:"none", background:J_COLOR, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Use This Prompt</button>
                <button onClick={newPrompt} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${J_COLOR}44`, background:"transparent", color:J_COLOR, fontSize:12, cursor:"pointer" }}>New Prompt</button>
                <button onClick={() => setShowPrompt(false)} style={{ marginLeft:"auto", background:"none", border:"none", color:"#8C8880", cursor:"pointer", fontSize:13 }}>✕</button>
              </div>
            </div>
          )}

          {/* Entry meta row */}
          <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
            {/* Mood picker */}
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#8C8880", letterSpacing:1, textTransform:"uppercase", marginRight:4 }}>Mood</span>
              {J_MOODS.map(m => (
                <button key={m.id} className="j-mood-btn" onClick={() => setMood(mood === m.id ? null : m.id)} title={m.label}
                  style={{ width:34, height:34, borderRadius:"50%", border:`2px solid ${mood===m.id ? m.color : "transparent"}`, background: mood===m.id ? `${m.color}20` : "#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow: mood===m.id ? `0 0 0 3px ${m.color}30` : "none" }}>
                  {m.emoji}
                </button>
              ))}
            </div>
            {/* Category */}
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${J_LIGHT}`, background:"#fff", fontSize:12, fontWeight:600, color:"#3A3830", cursor:"pointer", outline:"none", fontFamily:"'DM Sans',sans-serif" }}>
              {J_CATEGORIES.filter(c => c.id !== "all").map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
            {/* Prompt button */}
            <button onClick={newPrompt}
              style={{ padding:"7px 14px", borderRadius:8, border:`1.5px solid ${J_LIGHT}`, background:"#fff", fontSize:12, fontWeight:600, color:"#6F6B63", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=J_COLOR;e.currentTarget.style.color=J_COLOR;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=J_LIGHT;e.currentTarget.style.color="#6F6B63";}}>
              💡 Get a Prompt
            </button>
            <div style={{ marginLeft:"auto", fontSize:12, color:"#8C8880" }}>{wordCount} {wordCount===1?"word":"words"}</div>
          </div>

          {/* Title */}
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
            style={{ width:"100%", padding:"14px 0", border:"none", borderBottom:`2px solid ${J_LIGHT}`, background:"transparent", fontSize:22, fontFamily:"'Playfair Display',serif", fontWeight:800, color:"#1A1814", outline:"none", marginBottom:20, transition:"border-color 0.18s" }}
            onFocus={e=>e.target.style.borderColor=J_COLOR}
            onBlur={e=>e.target.style.borderColor=J_LIGHT} />

          {/* Body */}
          <textarea ref={textareaRef} value={body} onChange={e => setBody(e.target.value)}
            placeholder="Start writing… There are no rules here. Just you and the page."
            style={{ width:"100%", minHeight:340, padding:"0", border:"none", background:"transparent", fontSize:16, fontFamily:"'DM Sans',sans-serif", fontWeight:400, color:"#1A1814", outline:"none", resize:"none", lineHeight:1.85, letterSpacing:0.2 }}
            onKeyDown={e => { if (e.key===" ") e.stopPropagation(); }} />

          {/* AI reflection panel */}
          {showAiPanel && (
            <div style={{ background:`${J_COLOR}08`, border:`1.5px solid ${J_COLOR}30`, borderRadius:14, padding:"22px 22px", marginTop:24, animation:"j-fade 0.4s ease both" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg, ${J_COLOR}, ${J_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⊕</div>
                <span style={{ fontSize:12, fontWeight:700, letterSpacing:1, color:J_COLOR, textTransform:"uppercase" }}>AI Reflection</span>
                <button onClick={() => setShowAiPanel(false)} style={{ marginLeft:"auto", background:"none", border:"none", color:"#8C8880", cursor:"pointer", fontSize:13 }}>✕</button>
              </div>
              {aiLoading ? (
                <div style={{ display:"flex", gap:8, alignItems:"center", color:"#8C8880" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:J_COLOR, animation:"j-pop 1s infinite" }} />
                  <div style={{ width:8, height:8, borderRadius:"50%", background:J_COLOR, animation:"j-pop 1s 0.2s infinite" }} />
                  <div style={{ width:8, height:8, borderRadius:"50%", background:J_COLOR, animation:"j-pop 1s 0.4s infinite" }} />
                  <span style={{ fontSize:13, marginLeft:4 }}>Reflecting on your entry…</span>
                </div>
              ) : (
                <p style={{ fontSize:14, color:"#3A3830", lineHeight:1.8, margin:0, whiteSpace:"pre-wrap" }}>{aiReflection}</p>
              )}
            </div>
          )}

          {/* Action bar */}
          <div style={{ display:"flex", gap:10, marginTop:28, paddingTop:20, borderTop:`1px solid ${J_LIGHT}66` }}>
            <button onClick={saveEntry} disabled={!body.trim()}
              style={{ flex:1, padding:"13px 0", borderRadius:10, border:"none", background: saveAnim ? "#2BAE7E" : body.trim() ? J_COLOR : "#ECEAE4", color: body.trim() ? "#fff" : "#8C8880", fontSize:14, fontWeight:800, cursor: body.trim() ? "pointer" : "default", transition:"all 0.3s", fontFamily:"'DM Sans',sans-serif" }}>
              {saveAnim ? "✓ Saved!" : "Save Entry"}
            </button>
            <button onClick={getAiReflection} disabled={!body.trim() || aiLoading}
              style={{ padding:"13px 20px", borderRadius:10, border:`1.5px solid ${J_COLOR}44`, background:"#fff", color: body.trim() ? J_COLOR : "#A8A59E", fontSize:13, fontWeight:700, cursor: body.trim() && !aiLoading ? "pointer" : "default", transition:"all 0.18s" }}
              onMouseEnter={e => { if (body.trim()) { e.currentTarget.style.background=`${J_COLOR}10`; e.currentTarget.style.borderColor=J_COLOR; } }}
              onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.borderColor=`${J_COLOR}44`; }}>
              ⊕ AI Reflect
            </button>
            <button onClick={() => setView("home")}
              style={{ padding:"13px 18px", borderRadius:10, border:`1px solid ${J_LIGHT}`, background:"transparent", color:"#6F6B63", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── ENTRY VIEW ── */}
      {view === "entry" && activeEntry && (
        <div style={{ maxWidth:740, margin:"0 auto", padding:"40px 28px", animation:"j-fade 0.4s ease both" }}>
          <button onClick={() => setView("browse")} style={{ background:"none", border:`1px solid ${J_LIGHT}`, borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#6F6B63", marginBottom:24, transition:"all 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=J_COLOR;e.currentTarget.style.color=J_COLOR;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=J_LIGHT;e.currentTarget.style.color="#6F6B63";}}>
            ← Back
          </button>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              {(() => { const m = J_MOODS.find(x => x.id === activeEntry.mood); return m ? <span style={{ fontSize:28, marginBottom:8, display:"block" }}>{m.emoji}</span> : null; })()}
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(22px,4vw,32px)", fontWeight:900, color:"#1A1814", lineHeight:1.2, marginBottom:8 }}>{activeEntry.title}</h1>
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:12, color:"#8C8880" }}>{new Date(activeEntry.createdAt).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</span>
                <span style={{ fontSize:10, color:"#A8A59E" }}>·</span>
                <span style={{ fontSize:12, color:"#8C8880" }}>{activeEntry.wordCount} words</span>
                {(() => { const c = J_CATEGORIES.find(x => x.id === activeEntry.category); return c ? <span style={{ fontSize:11, fontWeight:700, color:J_COLOR, background:`${J_COLOR}12`, padding:"2px 8px", borderRadius:10 }}>{c.emoji} {c.label}</span> : null; })()}
              </div>
            </div>
            <button onClick={() => { if (window.confirm("Delete this journal entry? This can't be undone.")) deleteEntry(activeEntry.id); }}
              style={{ background:"none", border:`1px solid #FECACA`, borderRadius:7, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#E85D3F", flexShrink:0 }}>
              🗑 Delete
            </button>
          </div>
          <div style={{ height:1, background:`${J_LIGHT}88`, marginBottom:28 }} />
          <div style={{ fontSize:16, color:"#1A1814", lineHeight:1.9, whiteSpace:"pre-wrap", fontFamily:"'DM Sans',sans-serif" }}>{activeEntry.body}</div>
        </div>
      )}

      {/* ── BROWSE VIEW ── */}
      {view === "browse" && (
        <div className="j-main" style={{ maxWidth:900, margin:"0 auto", padding:"40px 28px", animation:"j-fade 0.4s ease both" }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:900, color:"#1A1814", marginBottom:20 }}>All Entries</h2>

          {/* Search + filter */}
          <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
            <div style={{ position:"relative", flex:1, minWidth:200 }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#8C8880", pointerEvents:"none" }}>🔍</span>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search entries…"
                style={{ width:"100%", padding:"10px 14px 10px 36px", borderRadius:10, border:`1.5px solid ${J_LIGHT}`, background:"#fff", fontSize:13, color:"#1A1814", outline:"none", fontFamily:"'DM Sans',sans-serif", transition:"border-color 0.15s", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor=J_COLOR}
                onBlur={e=>e.target.style.borderColor=J_LIGHT}
                onKeyDown={e => { if (e.key===" ") e.stopPropagation(); }} />
            </div>
            <div className="j-cats-grid" style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {J_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setFilterCat(c.id)}
                  style={{ padding:"8px 14px", borderRadius:20, border:`1.5px solid ${filterCat===c.id ? J_COLOR : J_LIGHT}`, background: filterCat===c.id ? J_COLOR : "#fff", color: filterCat===c.id ? "#fff" : "#6F6B63", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#8C8880" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:800, color:"#3A3830", marginBottom:8 }}>No entries found</div>
              <button onClick={() => setView("write")} style={{ background:J_COLOR, border:"none", borderRadius:9, padding:"11px 24px", fontSize:13, fontWeight:700, cursor:"pointer", color:"#fff", marginTop:8 }}>Write Your First Entry</button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {filteredEntries.map(e => {
                const moodObj = J_MOODS.find(m => m.id === e.mood);
                const cat = J_CATEGORIES.find(c => c.id === e.category);
                return (
                  <div key={e.id} className="j-entry-card" onClick={() => { setActiveEntry(e); setView("entry"); }}
                    style={{ background:"#fff", border:`1.5px solid ${J_LIGHT}66`, borderLeft:`4px solid ${J_COLOR}`, borderRadius:12, padding:"20px 22px", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          {moodObj && <span>{moodObj.emoji}</span>}
                          {cat && <span style={{ fontSize:11, fontWeight:700, color:J_COLOR, background:`${J_COLOR}12`, padding:"2px 8px", borderRadius:10 }}>{cat.emoji} {cat.label}</span>}
                        </div>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:800, color:"#1A1814", marginBottom:5 }}>{e.title}</div>
                        <div style={{ fontSize:13, color:"#6F6B63", lineHeight:1.55, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.body.slice(0,160)}{e.body.length>160?"…":""}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0, marginLeft:16 }}>
                        <div style={{ fontSize:12, color:"#8C8880", fontWeight:600 }}>{new Date(e.createdAt).toLocaleDateString([],{month:"short",day:"numeric"})}</div>
                        <div style={{ fontSize:10, color:"#A8A59E", marginTop:2 }}>{e.wordCount} words</div>
                      </div>
                    </div>
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

export default JournalApp;
