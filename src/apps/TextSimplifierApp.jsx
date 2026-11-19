// Split out of App.jsx so this code only downloads when it is needed.
import { useState, useRef, useEffect } from "react";
import { aiFetch, tpSync } from "../shared.jsx";

// ─── Text Simplifier App ─────────────────────────────────────────────────────
const READING_LEVELS = [
  { id: "kid",      label: "Kid",       emoji: "🧒", desc: "Age 8–10 · Simple words, short sentences" },
  { id: "teen",     label: "Teen",      emoji: "🧑", desc: "Age 13–15 · Conversational and clear" },
  { id: "adult",    label: "Adult",     emoji: "🧑‍💼", desc: "Standard reading level · Plain language" },
  { id: "student",  label: "Student",   emoji: "🎓", desc: "College-ready · Concise and precise" },
];

const TS_TOOLS = [
  { id: "simplify",  label: "Simplify",   emoji: "✨", desc: "Make it easier to read" },
  { id: "explain",   label: "Explain",    emoji: "💡", desc: "Break it down step by step" },
  { id: "summarize", label: "Summarize",  emoji: "📝", desc: "Key points, fast" },
  { id: "define",    label: "Key Terms",  emoji: "📖", desc: "Glossary of hard words" },
];

const TS_MODES = [
  { id: "standard",  label: "Standard",      emoji: "📄", desc: "Default output" },
  { id: "dyslexia",  label: "Dyslexia",      emoji: "🔤", desc: "Wider spacing, serif-free" },
  { id: "adhd",      label: "ADHD Mode",     emoji: "⚡", desc: "Chunked, bullets, highlights" },
  { id: "audio",     label: "Audio",         emoji: "🔊", desc: "Read it aloud" },
];

const YT_DETAIL_LEVELS = [
  {
    id: "overview",
    icon: "🎯",
    label: "Main Topics",
    sublabel: "Important info only",
    desc: "The key topics, core arguments, and most important takeaways — fast and clean.",
    prompt: (meta, url) => `A user wants a summary of this YouTube video.

Video URL: ${url}
${meta.title ? `Video Title: ${meta.title}` : ""}
${meta.channel ? `Channel: ${meta.channel}` : ""}
${meta.description ? `Description: ${meta.description}` : ""}

You cannot access or watch the video directly. Using the title, channel name, and description above, produce a genuinely useful overview. If the title and channel give clear context, use that to give specific, relevant content — not generic filler.

Format your response as:

**🎯 What This Video Is About**
[2-3 sentences explaining the video's topic and purpose based on the title/channel]

**📌 Key Topics Covered**
[4-6 specific bullet points based on what the title/description suggests]

**💡 Most Important Takeaways**
[3-4 bullet points with the core insights a viewer would gain]

**👀 Worth Watching If...**
[1-2 sentences on who this video is most useful for]`,
  },
  {
    id: "detailed",
    icon: "📋",
    label: "More Detail",
    sublabel: "Full topic coverage",
    desc: "Everything the video covers, explained clearly. Each topic broken down so you understand the content without needing to watch the full video.",
    prompt: (meta, url) => `A user wants a detailed summary of this YouTube video.

Video URL: ${url}
${meta.title ? `Video Title: ${meta.title}` : ""}
${meta.channel ? `Channel: ${meta.channel}` : ""}
${meta.description ? `Description: ${meta.description}` : ""}

You cannot watch the video, but use the metadata above to give a detailed, specific response. Draw on your knowledge of the topic suggested by the title and channel. Be specific — not generic.

Format your response as:

**📹 About This Video**
[3-4 sentences on the topic, based on the title/channel/description]

**📚 Topics Covered In Detail**

[For each of 4-6 major topic areas you'd expect in this video:]
### [Topic Name]
[2-3 sentences explaining this topic specifically as it likely appears in this video]

**🔑 Key Points to Remember**
[5-7 specific bullet points]

**❓ Questions This Video Answers**
[3-4 specific questions the video likely addresses]`,
  },
  {
    id: "breakdown",
    icon: "📖",
    label: "Full Breakdown",
    sublabel: "Everything, organized",
    desc: "A complete, organized breakdown of everything talked about — structured like study notes.",
    prompt: (meta, url) => `A user wants a full study-guide breakdown of this YouTube video.

Video URL: ${url}
${meta.title ? `Video Title: ${meta.title}` : ""}
${meta.channel ? `Channel: ${meta.channel}` : ""}
${meta.description ? `Description: ${meta.description}` : ""}

You cannot watch the video, but use the metadata above to produce the most comprehensive study guide possible. Draw on your knowledge of this topic. Be specific and detailed — not generic.

Format as:

**📹 Video Overview**
[3-4 sentences on what this video covers, based on the title and channel]

**⏱ Likely Content Structure**
[List 5-7 sections this video probably covers with estimated timestamps like "0:00 – 2:30 · Introduction"]

**📖 Full Topic Breakdown**

[For each section:]
### Section [#]: [Section Title]
**What's covered:** [2-3 specific sentences]
**Key concepts:** [bullet points]
**Important details:** [specific points to remember]

**✅ Summary & Conclusions**
[What this video likely concludes or recommends]

**🎓 Study Notes**
[6-8 bullet points formatted as study notes a student would actually use]`,
  },
];

function getYoutubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]{11})/);
  return match ? match[1] : null;
}

function TextSimplifierApp({ onBack, user, openAuth, aiContext, onLevelChange }) {
  const [inputMode, setInputMode]     = useState("text");   // text | youtube
  const [inputText, setInputText]     = useState("");
  const [ytUrl, setYtUrl]             = useState("");
  const [ytDetailLevel, setYtDetailLevel] = useState("overview");
  const [ytLoadStep, setYtLoadStep]   = useState(0); // 0=idle, 1=fetching, 2=analyzing, 3=generating, 4=done
  const [outputText, setOutputText]   = useState("");
  const [loading, setLoading]         = useState(false);
  const [activeTool, setActiveTool]   = useState("simplify");
  const [level, setLevel]             = useState("adult");
  const [mode, setMode]               = useState("standard");
  const [history, setHistory]         = useState(()=>{try{return JSON.parse(localStorage.getItem("tp_simplifier_history")||"[]");}catch{return [];}});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [speaking, setSpeaking]       = useState(false);
  const [copied, setCopied]           = useState(false);
  const [error, setError]             = useState("");
  const [ytError, setYtError]         = useState("");
  const [tsMenuOpen, setTsMenuOpen]   = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
  const outputRef = useRef(null);
  useEffect(()=>{try{localStorage.setItem("tp_simplifier_history",JSON.stringify(history));}catch{}tpSync("tp_simplifier_history",history);},[history]);
  useEffect(()=>()=>{window.speechSynthesis?.cancel();},[]);

  const ytId = getYoutubeId(ytUrl);
  const isValidYt = !!ytId;

  const buildPrompt = () => {
    const levelLabel = READING_LEVELS.find(l => l.id === level)?.label;
    if (activeTool === "simplify")  return `Rewrite the following text so it is clear and easy to understand at a "${levelLabel}" reading level. Use plain language. Remove jargon. Keep the meaning exactly the same. Only return the rewritten text with no introduction or explanation.\n\nText:\n${inputText}`;
    if (activeTool === "explain")   return `Explain the following text at a "${levelLabel}" reading level. Break it down step by step in a way that is very easy to follow. Use simple language. Only return the explanation with no preamble.\n\nText:\n${inputText}`;
    if (activeTool === "summarize") return `Summarize the following text at a "${levelLabel}" reading level. Pull out only the most important points. Be concise. Return only the summary with no introduction.\n\nText:\n${inputText}`;
    if (activeTool === "define")    return `Identify the difficult or technical words and phrases in the text below. For each one, provide a simple plain-language definition written at a "${levelLabel}" reading level. Format as a clean list: **Word**: definition. Only return the glossary, no intro.\n\nText:\n${inputText}`;
  };

  const handleSimplify = async () => {
    if (!inputText.trim()) return;
    setLoading(true); setError(""); setOutputText("");
    if (onLevelChange) onLevelChange(level);
    try {
      const res = await aiFetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: aiContext || "You are a helpful text simplification assistant.",
          messages: [{ role: "user", content: buildPrompt() }],
        }),
      });
      const data = await res.json();
      const result = data.content?.find(b => b.type === "text")?.text || "";
      setOutputText(result);
      setHistory(h => [{id:Date.now(),tool:activeTool,level,mode,input:inputText,inputPreview:inputText.slice(0,80)+(inputText.length>80?"…":""),output:result,ts:new Date().toISOString(),type:"text"},...h.slice(0,19)]);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch YouTube title + channel via oEmbed (no API key needed)
  const fetchYoutubeMeta = async (url) => {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(oembedUrl);
      if (!res.ok) return {};
      const data = await res.json();
      return { title: data.title || "", channel: data.author_name || "", description: "" };
    } catch { return {}; }
  };

  const handleYoutubeProcessWithLevel = async (levelId) => {
    if (!isValidYt) { setYtError("Please paste a valid YouTube URL."); return; }
    setYtError(""); setError(""); setOutputText(""); setLoading(true);
    setYtLoadStep(1);
    const meta = await fetchYoutubeMeta(ytUrl);
    await new Promise(r => setTimeout(r, 400));
    setYtLoadStep(2);
    await new Promise(r => setTimeout(r, 600));
    setYtLoadStep(3);
    const cfg = YT_DETAIL_LEVELS.find(d => d.id === levelId);
    try {
      const res = await aiFetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, messages: [{ role: "user", content: cfg.prompt(meta, ytUrl) }] }),
      });
      const data = await res.json();
      const result = data.content?.find(b => b.type === "text")?.text || "";
      const preview = meta.title ? `${meta.title} — ${ytUrl}` : ytUrl;
      setOutputText(result);
      setHistory(h => [{id:Date.now(),tool:cfg.label,level:"video",input:ytUrl,inputPreview:preview,output:result,ts:new Date().toISOString(),type:"youtube"},...h.slice(0,19)]);
    } catch (e) { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); setYtLoadStep(4); setTimeout(() => setYtLoadStep(0), 500); }
  };

  const handleYoutubeProcess = async () => {
    if (!isValidYt) { setYtError("Please paste a valid YouTube URL."); return; }
    setYtError(""); setError(""); setOutputText(""); setLoading(true);

    setYtLoadStep(1);
    const meta = await fetchYoutubeMeta(ytUrl);
    await new Promise(r => setTimeout(r, 400));
    setYtLoadStep(2);
    await new Promise(r => setTimeout(r, 600));
    setYtLoadStep(3);

    const cfg = YT_DETAIL_LEVELS.find(d => d.id === ytDetailLevel);
    try {
      const res = await aiFetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{ role: "user", content: cfg.prompt(meta, ytUrl) }],
        }),
      });
      const data = await res.json();
      const result = data.content?.find(b => b.type === "text")?.text || "";
      const preview = meta.title ? `${meta.title} — ${ytUrl}` : ytUrl;
      setOutputText(result);
      setHistory(h => [{id:Date.now(),tool:cfg.label,level:"video",input:ytUrl,inputPreview:preview,output:result,ts:new Date().toISOString(),type:"youtube"},...h.slice(0,19)]);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setYtLoadStep(4);
      setTimeout(() => setYtLoadStep(0), 500);
    }
  };

  const handleSpeak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utt = new SpeechSynthesisUtterance(outputText);
    utt.rate = 0.9;
    utt.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
    setSpeaking(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Markdown-lite renderer for YouTube output
  const renderMarkdown = (text) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("### ")) return <h4 key={i} style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#1A1814", margin: "18px 0 6px", borderLeft: "3px solid #6ED9B8", paddingLeft: 10 }}>{line.replace("### ", "")}</h4>;
      if (line.startsWith("## ") || line.startsWith("**") && line.endsWith("**")) {
        const clean = line.replace(/\*\*/g, "").replace("## ", "");
        return <div key={i} style={{ fontSize: 13, fontWeight: 800, color: "#2BAE7E", letterSpacing: 1, textTransform: "uppercase", marginTop: 22, marginBottom: 8 }}>{clean}</div>;
      }
      if (line.startsWith("- ") || line.startsWith("• ")) return (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
          <span style={{ color: "#6ED9B8", fontSize: 14, flexShrink: 0, marginTop: 2 }}>◆</span>
          <span style={{ fontSize: 14, color: "#3A3830", lineHeight: 1.65 }}>{line.replace(/^[-•]\s/, "")}</span>
        </div>
      );
      if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
      // Bold inline
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} style={{ fontSize: 15, color: "#3A3830", lineHeight: 1.8, margin: "4px 0" }}>
          {parts.map((p, j) => p.startsWith("**") ? <strong key={j} style={{ color: "#1A1814" }}>{p.replace(/\*\*/g, "")}</strong> : p)}
        </p>
      );
    });
  };

  // Output formatting for accessibility modes
  const renderOutput = () => {
    if (!outputText) return null;
    if (inputMode === "youtube") return <div style={{ lineHeight: 1.8 }}>{renderMarkdown(outputText)}</div>;
    if (mode === "adhd") {
      const sentences = outputText.split(/(?<=[.!?])\s+/);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sentences.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderRadius: 10, background: i % 2 === 0 ? "#F0FDF8" : "#fff", border: "1px solid #E0F4ED" }}>
              <span style={{ color: "#2BAE7E", fontSize: 18, lineHeight: 1.4, flexShrink: 0 }}>→</span>
              <span style={{ fontSize: 16, lineHeight: 1.7, color: "#1A1814" }}>{s}</span>
            </div>
          ))}
        </div>
      );
    }
    const fontStyle = {
      standard: { fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.8, letterSpacing: 0 },
      dyslexia: { fontFamily: "Georgia, serif", fontSize: 18, lineHeight: 2.2, letterSpacing: "0.05em", wordSpacing: "0.2em" },
      audio:    { fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.9, letterSpacing: 0 },
    }[mode] || {};
    if (activeTool === "define") {
      const lines = outputText.split("\n").filter(Boolean);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {lines.map((line, i) => {
            const match = line.match(/\*\*(.+?)\*\*:?\s*(.*)/);
            if (match) return (
              <div key={i} style={{ padding: "14px 18px", background: "#F7F6F2", borderRadius: 10, borderLeft: "3px solid #6ED9B8" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1A1814", marginBottom: 4 }}>{match[1]}</div>
                <div style={{ fontSize: 14, color: "#5A5752", lineHeight: 1.6 }}>{match[2]}</div>
              </div>
            );
            return <div key={i} style={{ fontSize: 14, color: "#8C8880", paddingLeft: 4 }}>{line}</div>;
          })}
        </div>
      );
    }
    return <p style={{ margin: 0, color: "#1A1814", ...fontStyle }}>{outputText}</p>;
  };

  const accentColor = "#2BAE7E";
  const accentLight = "#6ED9B8";

  const YT_LOAD_STEPS = [
    { icon: "🔗", label: "Connecting to YouTube…" },
    { icon: "📝", label: "Fetching video transcript…" },
    { icon: "🧠", label: "AI analyzing content…" },
    { icon: "✍️", label: "Generating your summary…" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#F7F6F2", minHeight: "100vh", color: "#1A1814" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #D8D5CE; border-radius: 3px; }
        @keyframes ts-spin { to { transform: rotate(360deg); } }
        @keyframes ts-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ts-step { 0%{opacity:0;transform:translateX(-8px)} 100%{opacity:1;transform:translateX(0)} }
        @keyframes ts-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .ts-fade { animation: ts-fade 0.4s ease both; }
        .ts-chip:hover { border-color: #1A1814 !important; color: #1A1814 !important; }
        .yt-detail:hover { border-color: #2BAE7E !important; transform: translateY(-2px); }
        @media (max-width: 768px) {
          .ts-nav-name { display: none !important; }
          .ts-main { padding: 20px 14px !important; }
          .ts-tools-grid { flex-wrap: wrap !important; }
          .ts-levels-grid { flex-wrap: wrap !important; gap: 6px !important; }
          .ts-split { grid-template-columns: 1fr !important; }
          .ts-modes-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .ts-tools-grid { grid-template-columns: 1fr !important; }
          .ts-split { gap: 12px !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #ECEAE4", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={()=>setTsMenuOpen(o=>!o)} style={{background:"none",border:"1px solid #ECEAE4",borderRadius:7,width:34,height:34,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.borderColor="#1A1814"} onMouseLeave={e=>e.currentTarget.style.borderColor="#ECEAE4"}>
              <div style={{width:13,height:1.5,background:"#6B6860",borderRadius:1}}/><div style={{width:9,height:1.5,background:"#6B6860",borderRadius:1,alignSelf:"flex-start",marginLeft:2}}/><div style={{width:13,height:1.5,background:"#6B6860",borderRadius:1}}/>
            </button>
            <button onClick={onBack} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#8C8880", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#1A1814"} onMouseLeave={e => e.currentTarget.style.borderColor = "#ECEAE4"}>← Galaxy</button>
            <div style={{ width: 1, height: 20, background: "#ECEAE4" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>≋</div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#1A1814" }}><span style={{ color: "#2BAE7E" }}>Ace It</span> Text Simplifier</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => setHistoryOpen(o => !o)} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#8C8880", transition: "all 0.15s" }}>
              🕐 History {history.length > 0 && `(${history.length})`}
            </button>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="ts-nav-name" style={{ fontSize: 12, fontWeight: 700, color: "#1A1814" }}>{user.name}</span>
              </div>
            ) : (
              <>
                <button onClick={() => openAuth("login")} style={{ background: "none", border: "1px solid #D8D5CE", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#5A5752" }}>Log In</button>
                <button onClick={() => openAuth("signup")} style={{ background: "#1A1814", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#F7F6F2" }}>Sign Up Free</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero banner ── */}
      <div style={{ background: "#1A1814", padding: "52px 24px 44px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(110,217,184,0.12)", border: "1px solid rgba(110,217,184,0.25)", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: accentLight, marginBottom: 20 }}>
          ≋ Your Complex Text Translator
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 5vw, 58px)", fontWeight: 900, color: "#F7F6F2", lineHeight: 1.1, marginBottom: 16, letterSpacing: -1 }}>
          Hard text, made{" "}
          <em style={{ color: accentLight, fontStyle: "italic" }}>human.</em>
        </h1>
        <p style={{ fontSize: 16, fontWeight: 300, color: "rgba(247,246,242,0.5)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 0" }}>
          Paste complex text or drop a YouTube link — get a clear, organized version you can actually understand and use.
        </p>
      </div>

      {/* ── Input Mode Toggle ── */}
      <div style={{ background: "#1A1814", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", paddingBottom: 0 }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: "12px 12px 0 0", padding: "4px 4px 0", gap: 2 }}>
          {[
            { id: "text",    icon: "📄", label: "Paste Text" },
            { id: "youtube", icon: "▶️", label: "YouTube Video" },
          ].map(m => (
            <button key={m.id} onClick={() => { setInputMode(m.id); setOutputText(""); setError(""); setYtError(""); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 28px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.18s",
                background: inputMode === m.id ? "#F7F6F2" : "transparent",
                color: inputMode === m.id ? "#1A1814" : "rgba(247,246,242,0.45)",
              }}>
              <span style={{ fontSize: 15 }}>{m.icon}</span> {m.label}

            </button>
          ))}
        </div>
      </div>

      {/* ── Main workspace ── */}
      <div className="ts-main" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

        {/* ══ TEXT MODE ══ */}
        {inputMode === "text" && (
          <>
            {/* Tool + Level selectors */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 28, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", marginBottom: 10 }}>What should I do?</div>
                <div className="ts-tools-grid" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TS_TOOLS.map(t => (
                    <button key={t.id} onClick={() => { setActiveTool(t.id); setOutputText(""); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: `1.5px solid ${activeTool === t.id ? accentColor : "#ECEAE4"}`, background: activeTool === t.id ? accentColor : "#fff", fontSize: 13, fontWeight: activeTool === t.id ? 700 : 500, color: activeTool === t.id ? "#fff" : "#5A5752", cursor: "pointer", transition: "all 0.18s" }}>
                      <span>{t.emoji}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", marginBottom: 10 }}>Reading Level</div>
                <div className="ts-levels-grid" style={{ display: "flex", gap: 8 }}>
                  {READING_LEVELS.map(l => (
                    <button key={l.id} onClick={() => { setLevel(l.id); setOutputText(""); }} title={l.desc} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${level === l.id ? "#1A1814" : "#ECEAE4"}`, background: level === l.id ? "#1A1814" : "#fff", cursor: "pointer", transition: "all 0.18s" }}>
                      <span style={{ fontSize: 16 }}>{l.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: level === l.id ? "#F7F6F2" : "#5A5752" }}>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input / Output panels */}
            <div className="ts-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #ECEAE4", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F0EDE8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#A8A59E" }}>Input Text</span>
                  {inputText && <button onClick={() => setInputText("")} style={{ background: "none", border: "none", fontSize: 11, color: "#A8A59E", cursor: "pointer", padding: 0 }}>Clear</button>}
                </div>
                <textarea value={inputText} onChange={e => setInputText(e.target.value)}
                  placeholder="Paste your complex text here…&#10;&#10;Academic papers, legal documents, medical reports, technical manuals — anything confusing."
                  style={{ flex: 1, padding: "18px 20px", fontSize: 15, lineHeight: 1.7, color: "#1A1814", border: "none", outline: "none", resize: "none", fontFamily: "'DM Sans', sans-serif", background: "transparent", minHeight: 280 }} />
                <div style={{ padding: "12px 18px", background: "#FAFAF8", borderTop: "1px solid #F0EDE8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: wordCount > 800 ? "#E85D3F" : wordCount > 0 ? "#5A5752" : "#C8C5BE", fontWeight: 500 }}>{wordCount} word{wordCount !== 1 ? "s" : ""}{wordCount > 800 ? " · output may be cut short" : ""}</span>
                  <button onClick={handleSimplify} disabled={loading || !inputText.trim()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 22px", borderRadius: 8, border: "none", background: inputText.trim() ? accentColor : "#ECEAE4", color: inputText.trim() ? "#fff" : "#A8A59E", fontSize: 13, fontWeight: 700, cursor: inputText.trim() ? "pointer" : "default", transition: "all 0.2s" }}
                    onMouseEnter={e => { if (inputText.trim() && !loading) e.currentTarget.style.opacity = "0.88"; }}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                    {loading ? (<><span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "ts-spin 0.7s linear infinite" }} /> Processing…</>) : (<>{TS_TOOLS.find(t => t.id === activeTool)?.emoji} {TS_TOOLS.find(t => t.id === activeTool)?.label}</>)}
                  </button>
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${outputText ? accentColor + "50" : "#ECEAE4"}`, overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color 0.3s" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F0EDE8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: outputText ? accentColor : "#A8A59E" }}>
                    {outputText ? `${TS_TOOLS.find(t => t.id === activeTool)?.label} · ${READING_LEVELS.find(l => l.id === level)?.label} level` : "Output"}
                  </span>
                  {outputText && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleCopy} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: copied ? accentColor : "#8C8880", transition: "all 0.15s" }}>{copied ? "✓ Copied" : "Copy"}</button>
                      <button onClick={handleSpeak} style={{ background: speaking ? accentColor : "none", border: `1px solid ${speaking ? accentColor : "#ECEAE4"}`, borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: speaking ? "#fff" : "#8C8880", transition: "all 0.15s" }}>{speaking ? "⏹ Stop" : "🔊 Read"}</button>
                      <button onClick={()=>setOutputExpanded(o=>!o)} style={{ background: outputExpanded ? accentColor : "none", border: `1px solid ${outputExpanded ? accentColor : "#ECEAE4"}`, borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: outputExpanded ? "#fff" : "#8C8880", transition: "all 0.15s" }}>{outputExpanded ? "⊠ Collapse" : "⊞ Expand"}</button>
                    </div>
                  )}
                </div>
                <div ref={outputRef} style={{ flex: 1, padding: "18px 20px", minHeight: outputExpanded ? "70vh" : 280, maxHeight: outputExpanded ? "none" : 420, overflowY: "auto", transition: "min-height 0.3s ease" }}>
                  {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, opacity: 0.5 }}>
                      <div style={{ width: 36, height: 36, border: `3px solid ${accentColor}30`, borderTopColor: accentColor, borderRadius: "50%", animation: "ts-spin 0.8s linear infinite" }} />
                      <span style={{ fontSize: 13, color: "#8C8880" }}>Thinking…</span>
                    </div>
                  ) : outputText ? (
                    <div className="ts-fade">{renderOutput()}</div>
                  ) : error ? (
                    <div style={{ color: "#E85D3F", fontSize: 14, padding: "20px 0" }}>{error}</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#D8D5CE", textAlign: "center" }}>
                      <span style={{ fontSize: 40 }}>≋</span>
                      <span style={{ fontSize: 14 }}>Your simplified text will appear here</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Accessibility modes */}
            {outputText && (
              <div className="ts-fade" style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #ECEAE4", padding: "18px 22px", marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", marginBottom: 12 }}>Accessibility & Display Mode</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {TS_MODES.map(m => (
                    <button key={m.id} onClick={() => { if (m.id === "audio") { handleSpeak(); return; } setMode(m.id); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${mode === m.id && m.id !== "audio" ? "#1A1814" : "#ECEAE4"}`, background: mode === m.id && m.id !== "audio" ? "#1A1814" : "#fff", fontSize: 13, fontWeight: mode === m.id && m.id !== "audio" ? 700 : 500, color: mode === m.id && m.id !== "audio" ? "#F7F6F2" : "#5A5752", cursor: "pointer", transition: "all 0.18s" }}>
                      <span>{m.emoji}</span>
                      <div style={{ textAlign: "left" }}>
                        <div>{m.label}</div>
                        <div style={{ fontSize: 10, fontWeight: 400, color: mode === m.id && m.id !== "audio" ? "rgba(247,246,242,0.5)" : "#A8A59E", lineHeight: 1.3 }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ YOUTUBE MODE ══ */}
        {inputMode === "youtube" && (
          <div className="ts-fade">
            {/* URL input */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #ECEAE4", overflow: "hidden", marginBottom: 28, boxShadow: "0 2px 20px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #F0EDE8", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, background: "#FF0000", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>▶</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1814" }}>YouTube Video Summarizer</div>
                  <div style={{ fontSize: 12, color: "#8C8880" }}>Paste any YouTube link and choose how much detail you want</div>
                </div>
              </div>
              <div style={{ padding: "22px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", marginBottom: 10 }}>YouTube URL</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      value={ytUrl}
                      onChange={e => { setYtUrl(e.target.value); setYtError(""); setOutputText(""); }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      style={{ width: "100%", padding: "13px 16px 13px 44px", border: `1.5px solid ${ytError ? "#E85D3F" : isValidYt ? accentColor : "#ECEAE4"}`, borderRadius: 10, fontSize: 14, color: "#1A1814", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#fff", transition: "all 0.18s", boxSizing: "border-box" }}
                      onFocus={e => { if (!ytError) e.target.style.borderColor = accentColor; }}
                      onBlur={e => { if (!ytError && !isValidYt) e.target.style.borderColor = "#ECEAE4"; }}
                    />
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔗</span>
                    {isValidYt && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: accentColor, fontSize: 16 }}>✓</span>}
                  </div>
                  {ytUrl && <button onClick={() => { setYtUrl(""); setOutputText(""); setYtError(""); }} style={{ padding: "13px 16px", borderRadius: 10, border: "1px solid #ECEAE4", background: "#F7F6F2", fontSize: 12, color: "#8C8880", cursor: "pointer", whiteSpace: "nowrap" }}>Clear</button>}
                </div>
                {ytError && <div style={{ fontSize: 12, color: "#E85D3F", marginTop: 8 }}>⚠ {ytError}</div>}
                {isValidYt && (
                  <div className="ts-fade" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "10px 14px", background: "#F0FDF8", border: "1px solid #6ED9B844", borderRadius: 8 }}>
                    <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} alt="" style={{ width: 60, height: 45, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>✓ Valid YouTube video detected</div>
                      <div style={{ fontSize: 11, color: "#6B6860" }}>Video ID: {ytId}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detail Level selector */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", marginBottom: 14 }}>How much do you want from this video?</div>
              <div className="ts-modes-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {YT_DETAIL_LEVELS.map(dl => (
                  <div key={dl.id} className="yt-detail" onClick={() => setYtDetailLevel(dl.id)}
                    style={{ background: "#fff", border: `2px solid ${ytDetailLevel === dl.id ? accentColor : "#ECEAE4"}`, borderRadius: 14, padding: "20px 20px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}>
                    {ytDetailLevel === dl.id && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentColor }} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 24 }}>{dl.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: ytDetailLevel === dl.id ? "#1A1814" : "#3A3830" }}>{dl.label}</div>
                        <div style={{ fontSize: 11, color: ytDetailLevel === dl.id ? accentColor : "#8C8880", fontWeight: 600 }}>{dl.sublabel}</div>
                      </div>
                      {ytDetailLevel === dl.id && <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 10, fontWeight: 900 }}>✓</span></div>}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B6860", lineHeight: 1.6 }}>{dl.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Process button */}
            {ytLoadStep === 0 && (
              <button onClick={handleYoutubeProcess} disabled={!isValidYt || loading}
                style={{ width: "100%", padding: "16px", borderRadius: 12, border: "none", background: isValidYt ? `linear-gradient(135deg, ${accentColor}, #1BAE65)` : "#ECEAE4", color: isValidYt ? "#fff" : "#A8A59E", fontSize: 15, fontWeight: 800, cursor: isValidYt ? "pointer" : "default", transition: "all 0.2s", letterSpacing: 0.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "'Montserrat', sans-serif", boxShadow: isValidYt ? "0 4px 20px rgba(43,174,126,0.3)" : "none" }}
                onMouseEnter={e => { if (isValidYt) e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                <span style={{ fontSize: 18 }}>▶</span>
                Summarize This Video — {YT_DETAIL_LEVELS.find(d => d.id === ytDetailLevel)?.label}
              </button>
            )}

            {/* Loading steps */}
            {loading && ytLoadStep > 0 && (
              <div className="ts-fade" style={{ background: "#fff", border: "1.5px solid #ECEAE4", borderRadius: 16, padding: "32px 28px", textAlign: "center", marginBottom: 0 }}>
                <div style={{ width: 52, height: 52, border: `3px solid ${accentColor}20`, borderTopColor: accentColor, borderRadius: "50%", animation: "ts-spin 0.9s linear infinite", margin: "0 auto 20px" }} />
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>Processing Your Video…</div>
                <div style={{ fontSize: 13, color: "#8C8880", marginBottom: 28 }}>Hang tight — we're fetching the transcript and analyzing it</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 340, margin: "0 auto" }}>
                  {YT_LOAD_STEPS.map((step, i) => {
                    const stepNum = i + 1;
                    const done = ytLoadStep > stepNum;
                    const active = ytLoadStep === stepNum;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: active ? "#F0FDF8" : done ? "#fff" : "#FAFAF8", border: `1.5px solid ${active ? accentColor : done ? "#6ED9B844" : "#ECEAE4"}`, animation: active ? "ts-step 0.3s ease both" : "none", opacity: done || active ? 1 : 0.4, transition: "all 0.4s" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? accentColor : active ? `${accentColor}20` : "#F0EDE8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {done ? <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span> : active ? <span style={{ width: 12, height: 12, border: `2px solid ${accentColor}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "ts-spin 0.6s linear infinite" }} /> : <span style={{ fontSize: 13 }}>{step.icon}</span>}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#1A1814" : done ? "#6B6860" : "#A8A59E" }}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Output */}
            {outputText && !loading && (
              <div className="ts-fade" style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${accentColor}55`, overflow: "hidden", boxShadow: "0 4px 24px rgba(43,174,126,0.1)" }}>
                <div style={{ padding: "16px 22px", borderBottom: "1px solid #F0EDE8", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F0FDF8" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor, animation: "ts-pulse 2s infinite" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: accentColor }}>
                      {YT_DETAIL_LEVELS.find(d => d.id === ytDetailLevel)?.label} · Video Summary
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleCopy} style={{ background: "none", border: "1px solid #D8D5CE", borderRadius: 5, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: copied ? accentColor : "#8C8880" }}>{copied ? "✓ Copied" : "Copy"}</button>
                    <button onClick={handleSpeak} style={{ background: speaking ? accentColor : "none", border: `1px solid ${speaking ? accentColor : "#D8D5CE"}`, borderRadius: 5, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: speaking ? "#fff" : "#8C8880" }}>{speaking ? "⏹ Stop" : "🔊 Read Aloud"}</button>
                  </div>
                </div>
                <div style={{ padding: "28px 28px", maxHeight: 600, overflowY: "auto" }}>
                  {renderOutput()}
                </div>
                {/* Re-run at different level */}
                <div style={{ padding: "16px 22px", borderTop: "1px solid #F0EDE8", background: "#FAFAF8", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#8C8880", fontWeight: 600 }}>Try a different detail level:</span>
                  {YT_DETAIL_LEVELS.filter(d => d.id !== ytDetailLevel).map(dl => (
                    <button key={dl.id} onClick={() => { setYtDetailLevel(dl.id); setTimeout(() => handleYoutubeProcessWithLevel(dl.id), 0); }}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${accentColor}44`, background: "#fff", fontSize: 12, fontWeight: 700, color: accentColor, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#F0FDF8"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
                      {dl.icon} {dl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <div style={{ color: "#E85D3F", fontSize: 14, marginTop: 16, padding: "14px 18px", background: "#FEF2F2", borderRadius: 10, border: "1px solid #FECACA" }}>⚠ {error}</div>}
          </div>
        )}

        {/* ── Features strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 48 }}>
          {[
            { emoji: "▶️", title: "YouTube Summaries",   desc: "Paste any YouTube link. Get a clean summary of the full video in three detail levels." },
            { emoji: "🎓", title: "Academic to Plain",   desc: "Translates dense scholarly language into clear, everyday English." },
            { emoji: "⚖️", title: "Legal Language",      desc: "Turns contracts and legalese into something a human can actually parse." },
            { emoji: "🩺", title: "Medical Reports",     desc: "Decodes clinical summaries and diagnoses into plain language." },
            { emoji: "⚡", title: "ADHD Mode",           desc: "Breaks output into bite-sized bullets with visual anchors." },
            { emoji: "🔊", title: "Audio Playback",      desc: "Have your simplified text or video summary read aloud at a comfortable pace." },
          ].map(f => (
            <div key={f.title} style={{ background: "#fff", border: "1.5px solid #ECEAE4", borderRadius: 12, padding: "20px 22px" }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{f.emoji}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#8C8880", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── History drawer ── */}
      {historyOpen && (
        <>
          <div onClick={() => setHistoryOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 200 }} />
          <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: "#fff", zIndex: 201, borderLeft: "1px solid #ECEAE4", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.08)" }}>
            <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid #ECEAE4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, margin: 0 }}>Saved History</h3>
              <div style={{display:"flex",gap:8}}>
                {history.length>0&&(!confirmClear
  ? <button onClick={()=>setConfirmClear(true)} style={{background:"none",border:"1px solid #FECACA",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600,color:"#E85D3F"}}>Clear All</button>
  : <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <span style={{fontSize:11,color:"#E85D3F",fontWeight:600}}>Sure?</span>
      <button onClick={()=>{setHistory([]);setConfirmClear(false);}} style={{background:"#E85D3F",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700,color:"#fff"}}>Yes</button>
      <button onClick={()=>setConfirmClear(false)} style={{background:"none",border:"1px solid #ECEAE4",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600,color:"#8C8880"}}>No</button>
    </div>
)}
                <button onClick={() => setHistoryOpen(false)} style={{ background: "#F7F6F2", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 13, color: "#8C8880" }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              {history.length === 0 ? (
                <div style={{ textAlign: "center", color: "#A8A59E", fontSize: 13, marginTop: 40 }}>
                  <div style={{fontSize:32,marginBottom:12}}>🕐</div>
                  <div>No saved history yet.</div>
                  <div style={{marginTop:6,fontSize:12}}>Simplify some text to get started.</div>
                </div>
              ) : history.map((h, i) => (
                <div key={h.id||i} style={{ borderRadius: 12, border: "1.5px solid #ECEAE4", marginBottom: 12, overflow:"hidden" }}>
                  <div style={{padding:"12px 14px",background:"#F7F6F2",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}
                    onClick={() => { if (h.type === "youtube") { setInputMode("youtube"); setYtUrl(h.input); } else { setInputMode("text"); setInputText(h.input); setActiveTool(h.tool); if(h.mode) setMode(h.mode); } setOutputText(h.output); setHistoryOpen(false); }}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                        {h.type==="youtube"&&<span style={{fontSize:10,background:"#FF000015",color:"#CC0000",fontWeight:700,padding:"1px 6px",borderRadius:4}}>▶ YT</span>}
                        <span style={{fontSize:11,fontWeight:700,color:accentColor,textTransform:"uppercase",letterSpacing:0.8}}>{h.tool}</span>
                        <span style={{fontSize:10,color:"#A8A59E"}}>· {h.level}</span>
                      </div>
                      <div style={{fontSize:12,color:"#5A5752",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.inputPreview||h.input?.slice(0,60)}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:10}}>
                      <span style={{fontSize:10,color:"#A8A59E"}}>{new Date(h.ts).toLocaleDateString([],{month:"short",day:"numeric"})}</span>
                      <button onClick={e=>{e.stopPropagation();setHistory(prev=>prev.filter((_,j)=>j!==i));}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#D8D5CE"}} onMouseEnter={e=>e.currentTarget.style.color="#E85D3F"} onMouseLeave={e=>e.currentTarget.style.color="#D8D5CE"}>✕</button>
                    </div>
                  </div>
                  <div style={{padding:"12px 14px",fontSize:12,color:"#3A3530",lineHeight:1.6,maxHeight:120,overflowY:"auto",borderTop:"1px solid #ECEAE4",background:"#fff"}}>
                    {h.output?.slice(0,300)}{h.output?.length>300?"…":""}
                  </div>
                  <div style={{padding:"8px 14px",borderTop:"1px solid #F0EDE8",display:"flex",gap:8,background:"#FAFAFA"}}>
                    <button onClick={()=>{ if(h.type==="youtube"){setInputMode("youtube");setYtUrl(h.input);}else{setInputMode("text");setInputText(h.input);setActiveTool(h.tool);}setOutputText(h.output);setHistoryOpen(false);}} style={{flex:1,padding:"6px 0",borderRadius:7,border:"none",background:accentColor,fontSize:11,fontWeight:700,cursor:"pointer",color:"#fff"}}>↩ Restore</button>
                    <button onClick={()=>navigator.clipboard.writeText(h.output||"")} style={{flex:1,padding:"6px 0",borderRadius:7,border:"1px solid #ECEAE4",background:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",color:"#5A5752"}}>📋 Copy</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TextSimplifierApp;
