// Split out of App.jsx so this code only downloads when it is needed.
import { createAvatar } from "@dicebear/core";
import * as toonHead from "@dicebear/toon-head";
import { useState, useRef, useEffect } from "react";
import { AceHead, PA_COLOR, PA_DARK, PA_GLOW, aceRemember, aiFetch, tpSync } from "../shared.jsx";

const AV_SKIN_COLORS = [
  { id:"f1c3a5", label:"Light" },
  { id:"e8b48a", label:"Light tan" },
  { id:"c68e7a", label:"Medium" },
  { id:"b98e6a", label:"Tan" },
  { id:"a36b4f", label:"Brown" },
  { id:"7a4a35", label:"Dark brown" },
  { id:"5c3829", label:"Deep" },
];

const AV_HAIR_COLORS = [
  { id:"2c1b18", label:"Black" },
  { id:"724133", label:"Dark brown" },
  { id:"a55728", label:"Brown" },
  { id:"b58143", label:"Auburn" },
  { id:"d6b370", label:"Blonde" },
  { id:"e8d5a3", label:"Light blonde" },
  { id:"888888", label:"Gray" },
  { id:"f0f0f0", label:"White" },
  { id:"c0392b", label:"Red" },
  { id:"8e44ad", label:"Purple" },
  { id:"2980b9", label:"Blue" },
];

const AV_FRONT_HAIR = [
  { id:"none",      label:"Bald"        },
  { id:"sideComed", label:"Side-combed" },
  { id:"undercut",  label:"Undercut"    },
  { id:"spiky",     label:"Spiky"       },
  { id:"bun",       label:"Bun"         },
];

const AV_REAR_HAIR = [
  { id:"none",          label:"None"      },
  { id:"longStraight",  label:"Straight"  },
  { id:"longWavy",      label:"Wavy"      },
  { id:"shoulderHigh",  label:"Shoulder"  },
  { id:"neckHigh",      label:"Neck"      },
];

const AV_EYEBROWS = [
  { id:"neutral", label:"Neutral" },
  { id:"raised",  label:"Raised"  },
  { id:"happy",   label:"Happy"   },
  { id:"angry",   label:"Angry"   },
  { id:"sad",     label:"Sad"     },
];

const AV_EYES = [
  { id:"happy",  label:"Happy"  },
  { id:"wide",   label:"Wide"   },
  { id:"bow",    label:"Bow"    },
  { id:"humble", label:"Humble" },
  { id:"wink",   label:"Wink"   },
];

const AV_MOUTH = [
  { id:"smile",  label:"Smile"  },
  { id:"laugh",  label:"Laugh"  },
  { id:"agape",  label:"Agape"  },
  { id:"sad",    label:"Sad"    },
  { id:"angry",  label:"Angry"  },
];

const AV_BEARD = [
  { id:"none",           label:"None"         },
  { id:"chin",           label:"Chin"         },
  { id:"fullBeard",      label:"Full beard"   },
  { id:"longBeard",      label:"Long beard"   },
  { id:"moustacheTwirl", label:"Moustache"    },
  { id:"chinMoustache",  label:"Chin + Moustache" },
];

const AV_CLOTHES = [
  { id:"tShirt",     label:"T-Shirt"      },
  { id:"shirt",      label:"Shirt"        },
  { id:"turtleNeck", label:"Turtleneck"   },
  { id:"openJacket", label:"Open jacket"  },
  { id:"dress",      label:"Dress"        },
];

const AV_CLOTHES_COLORS = [
  { id:"545454", label:"Charcoal"  },
  { id:"151613", label:"Black"     },
  { id:"e8e9e6", label:"White"     },
  { id:"b11f1f", label:"Red"       },
  { id:"0b3286", label:"Navy"      },
  { id:"147f3c", label:"Green"     },
  { id:"eab308", label:"Yellow"    },
  { id:"731ac3", label:"Purple"    },
  { id:"ec4899", label:"Pink"      },
  { id:"f97316", label:"Orange"    },
];

const AV_DEFAULT = {
  skinColor: "f1c3a5",
  hair: "sideComed",
  hairColor: "2c1b18",
  rearHair: "none",
  eyebrows: "neutral",
  eyes: "happy",
  mouth: "smile",
  beard: "none",
  clothes: "tShirt",
  clothesColor: "0b3286",
  displayName: "",
};

// ── AvatarHead — DiceBear Toon Head renderer ────────────────────────────────
function AvatarHead({ avatar = {}, size = 48 }) {
  const av = { ...AV_DEFAULT, ...avatar };
  const svgStr = createAvatar(toonHead, {
    seed: av.displayName || "default",
    skinColor:        [av.skinColor],
    hair:             av.hair === "none" ? [] : [av.hair],
    hairColor:        [av.hairColor],
    rearHair:         av.rearHair === "none" ? [] : [av.rearHair],
    rearHairProbability: av.rearHair === "none" ? 0 : 100,
    hairProbability:  av.hair === "none" ? 0 : 100,
    eyebrows:         [av.eyebrows],
    eyes:             [av.eyes],
    mouth:            [av.mouth],
    beard:            av.beard === "none" ? [] : [av.beard],
    beardProbability: av.beard === "none" ? 0 : 100,
    clothes:          [av.clothes],
    clothesColor:     [av.clothesColor],
  }).toString();
  return (
    <div
      style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: svgStr.replace(/<svg /, `<svg width="${size}" height="${size}" style="display:block" `) }}
    />
  );
}

const PA_SUGGESTED = [
  "Help me make a study plan for this week",
  "Explain a concept I'm struggling with",
  "Quiz me on what I've been studying",
  "I'm feeling overwhelmed — what should I do?",
  "What's the best way to memorize this?",
  "Help me break down a big topic",
];

function PASidebar({ isOpen, onClose, view, setView, onBack, user, openAuth, onLogout, avatar }) {
  const [profileOpen, setProfileOpen] = useState(true);

  const navItems = [
    { icon: "⌂",  label: "Home",          v: "home"     },
    { icon: "💬", label: "Chat",           v: "chat"     },
    { icon: "📅", label: "Study Planner",  v: "planner"  },
    { icon: "🎯", label: "Goals",          v: "goals"    },
    { icon: "📊", label: "My Progress",    v: "progress" },
    { icon: "🧑", label: "My Avatar",      v: "avatar"   },
    { icon: "⚙",  label: "Preferences",   v: "prefs"    },
  ];

  const navItem = (icon, label, v) => {
    const active = view === v;
    return (
      <button key={v} onClick={() => { setView(v); onClose(); }}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 8, border: "none", background: active ? `${PA_COLOR}18` : "transparent", cursor: "pointer", textAlign: "left", transition: "all 0.15s", marginBottom: 2 }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#F0F6FF"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? PA_GLOW : "#3A3830" }}>{label}</span>
        {active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: PA_GLOW }} />}
      </button>
    );
  };

  return (
    <>
      {isOpen && <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,22,40,0.35)", backdropFilter: "blur(4px)" }} />}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 272,
        background: "#fff", borderRight: "1px solid #E4EEF8",
        display: "flex", flexDirection: "column", zIndex: 201,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.38s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: isOpen ? "4px 0 32px rgba(10,22,40,0.10)" : "none",
      }}>

        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #E4EEF8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${PA_GLOW}, ${PA_COLOR})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AceHead size={30} />
            </div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#1A1814" }}>Ace</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #E4EEF8", borderRadius: 5, width: 28, height: 28, cursor: "pointer", fontSize: 13, color: "#8C8880", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#90C8F8"; e.currentTarget.style.color = PA_GLOW; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E4EEF8"; e.currentTarget.style.color = "#8C8880"; }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 20px" }}>

          {/* Account */}
          <div style={{ marginBottom: 6 }}>
            <button onClick={() => setProfileOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px", background: "none", border: "none", cursor: "pointer", borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = "#F0F6FF"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E" }}>Account</span>
              <span style={{ fontSize: 9, color: "#A8A59E", transform: profileOpen ? "rotate(180deg)" : "rotate(0)", display: "inline-block", transition: "transform 0.22s" }}>▾</span>
            </button>
            {profileOpen && (
              <div style={{ margin: "4px 0 8px", padding: "14px", background: "#F4F8FF", borderRadius: 10, border: "1px solid #D8ECFF" }}>
                {user ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: avatar?.skinColor ? "#fff" : `linear-gradient(135deg, ${PA_DARK}, ${PA_GLOW})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 0 3px #fff, 0 0 0 4px #D8ECFF`, overflow:"hidden" }}>
                        {avatar?.skinColor ? <AvatarHead avatar={avatar} size={42} /> : <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#fff" }}>{user.avatar}</span>}
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#1A1814" }}>{user.name}</div>
                        
                      </div>
                    </div>
                    <button onClick={() => { onLogout(); onClose(); }} style={{ width: "100%", padding: "8px 0", borderRadius: 6, background: "transparent", border: "1px solid #D8ECFF", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#8C8880", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#E85D3F"; e.currentTarget.style.color = "#E85D3F"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8ECFF"; e.currentTarget.style.color = "#8C8880"; }}>Sign Out</button>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E4EEF8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>👤</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1814" }}>Not signed in</div>
                        <div style={{ fontSize: 11, color: "#8C8880" }}>Sign in to save your chats</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { openAuth("login"); onClose(); }} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "1px solid #D8ECFF", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#5A5752" }}>Log In</button>
                      <button onClick={() => { openAuth("signup"); onClose(); }} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: PA_GLOW, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#fff" }}>Sign Up</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Nav */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", padding: "6px 8px 8px" }}>Navigation</div>
            {navItems.map(n => navItem(n.icon, n.label, n.v))}
          </div>

          {/* Back to Galaxy */}
          <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #E4EEF8" }}>
            <button onClick={onBack} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F0F6FF"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 13, color: "#A8A59E" }}>←</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#8C8880" }}>Back to Galaxy</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Home view input bar for PA
function HomeInputBar({ onSend, PA_GLOW, PA_COLOR }) {
  const [homeInput, setHomeInput] = useState("");
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 20, maxWidth: 580 }}>
      <input
        value={homeInput}
        onChange={e => setHomeInput(e.target.value)}
        onKeyDown={e => { if (e.key === " ") e.stopPropagation(); if (e.key === "Enter" && homeInput.trim()) { onSend(homeInput); setHomeInput(""); } }}
        placeholder="Ask me anything…"
        style={{ flex: 1, padding: "14px 18px", borderRadius: 12, border: "1.5px solid #D8ECFF", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", color: "#0A1628", background: "#F4F8FF", boxSizing: "border-box", transition: "border-color 0.18s" }}
        onFocus={e => { e.target.style.borderColor = PA_GLOW; e.target.style.background = "#fff"; }}
        onBlur={e => { e.target.style.borderColor = "#D8ECFF"; e.target.style.background = "#F4F8FF"; }}
      />
      <button onClick={() => { if (homeInput.trim()) { onSend(homeInput); setHomeInput(""); } }}
        style={{ padding: "14px 22px", borderRadius: 12, border: "none", background: homeInput.trim() ? `linear-gradient(135deg, ${PA_GLOW}, ${PA_COLOR})` : "#E4EEF8", color: homeInput.trim() ? "#fff" : "#A8B4C0", fontSize: 14, fontWeight: 700, cursor: homeInput.trim() ? "pointer" : "default", transition: "all 0.18s", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
        Send →
      </button>
    </div>
  );
}

// ── Stable chat input bar — lives outside PA so typing doesn't re-render the whole app
function ChatInputBar({ onSend, loading, PA_GLOW, PA_COLOR }) {
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input);
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div style={{ padding: "14px 20px 20px", borderTop: "1px solid #E4EEF8", flexShrink: 0, background: "#fff" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#F4F8FF", border: "1.5px solid #D8ECFF", borderRadius: 14, padding: "10px 12px", transition: "border-color 0.18s" }}
        onFocusCapture={e => { e.currentTarget.style.borderColor = PA_GLOW; e.currentTarget.style.boxShadow = `0 0 0 3px ${PA_GLOW}18`; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = "#D8ECFF"; e.currentTarget.style.boxShadow = "none"; }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === " ") e.stopPropagation();
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="Ask me anything…"
          rows={1}
          style={{ flex: 1, padding: "2px 0", fontSize: 14, color: "#1A1814", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "none", lineHeight: 1.6, background: "transparent", border: "none", maxHeight: 140, overflowY: "auto" }}
        />
        <button onClick={handleSend} disabled={!input.trim() || loading}
          style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: input.trim() && !loading ? `linear-gradient(135deg, ${PA_GLOW}, ${PA_COLOR})` : "#D8ECFF", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0, fontSize: 16, color: input.trim() && !loading ? "#fff" : "#A8B4C0" }}>
          {loading
            ? <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "pa-bounce 0.8s linear infinite" }} />
            : "↑"}
        </button>
      </div>
      <div style={{ fontSize: 10, color: "#C0CDD8", marginTop: 7, textAlign: "center" }}>Enter to send · Shift+Enter for new line · Powered by Claude</div>
    </div>
  );
}

function PersonalAssistantApp({ onBack, user, openAuth, onLogout, avatar, setAvatar, showFloating, setShowFloating, aiContext, userProfile, onGoalsChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView]               = useState("home");
  // ── Chat history system ──────────────────────────────────────────────────────
  const newConvo = () => ({ id: Date.now(), title: "New Chat", messages: [], createdAt: new Date() });
  const [conversations, setConversations] = useState(() => {
    try { const s = localStorage.getItem("tp_pa_convos"); if (s) { const p = JSON.parse(s); if (p.length) return p; } } catch {}
    return [newConvo()];
  });
  const [activeConvoId, setActiveConvoId] = useState(() => {
    try { const s = localStorage.getItem("tp_pa_active_convo"); if (s) return parseInt(s); } catch {}
    return null;
  });
  const [renamingId, setRenamingId]       = useState(null);
  const [renameVal, setRenameVal]         = useState("");
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery]     = useState("");

  const activeConvo = conversations.find(c => c.id === activeConvoId) || conversations[0];
  const messages    = activeConvo?.messages || [];

  const setMessages = (updater) => {
    setConversations(cs => cs.map(c =>
      c.id === activeConvoId
        ? { ...c, messages: typeof updater === "function" ? updater(c.messages) : updater }
        : c
    ));
  };

  const startNewChat = () => {
    const c = newConvo();
    setConversations(cs => [c, ...cs]);
    setActiveConvoId(c.id);
  };

  const deleteConvo = (id) => {
    setConversations(cs => {
      const remaining = cs.filter(c => c.id !== id);
      const final = remaining.length === 0 ? [newConvo()] : remaining;
      if (activeConvoId === id) setActiveConvoId(final[0].id);
      return final;
    });
  };

  const renameConvo = (id, title) => {
    setConversations(cs => cs.map(c => c.id === id ? { ...c, title } : c));
    setRenamingId(null);
  };

  const autoTitle = (text) => text.length > 40 ? text.slice(0, 38) + "…" : text;

  const groupConvos = (list) => {
    const now = new Date();
    const todayStart    = new Date(now); todayStart.setHours(0,0,0,0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate()-1);
    const weekStart     = new Date(todayStart); weekStart.setDate(weekStart.getDate()-7);
    const monthStart    = new Date(todayStart); monthStart.setDate(1);
    const groups = { Today:[], Yesterday:[], "Last 7 Days":[], "Last 30 Days":[], Older:[] };
    list.forEach(c => {
      const d = new Date(c.createdAt);
      if      (d >= todayStart)     groups["Today"].push(c);
      else if (d >= yesterdayStart) groups["Yesterday"].push(c);
      else if (d >= weekStart)      groups["Last 7 Days"].push(c);
      else if (d >= monthStart)     groups["Last 30 Days"].push(c);
      else                          groups["Older"].push(c);
    });
    return groups;
  };
  // ─────────────────────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(false);
  const PA_DEFAULT_GOALS = [
    { id: 1, text: "Complete my first flashcard deck",    done: false, priority: "high"   },
    { id: 2, text: "Try all three study modes",           done: false, priority: "medium" },
    { id: 3, text: "Study at least 30 min every day",    done: false, priority: "medium" },
  ];
  const PA_DEFAULT_PLAN = [
    { day:"Monday",    tasks:["Create your first deck", "Explore Flash Cards app"],  done:[false,false] },
    { day:"Tuesday",   tasks:["Try Quick Build mode", "Study your deck"],             done:[false,false] },
    { day:"Wednesday", tasks:["Build a Brain Map", "Link decks to nodes"],           done:[false,false] },
    { day:"Thursday",  tasks:["Use Text Simplifier", "Review your cards"],            done:[false,false] },
    { day:"Friday",    tasks:["Full deck review", "Practice test mode"],              done:[false,false] },
    { day:"Saturday",  tasks:["Rest or light review"],                               done:[false]       },
    { day:"Sunday",    tasks:["Plan your week ahead"],                               done:[false]       },
  ];
  const [goals, setGoals]             = useState(() => {
    try { const s = localStorage.getItem("tp_pa_goals"); if (s) return JSON.parse(s); } catch {}
    return PA_DEFAULT_GOALS;
  });
  const [newGoal, setNewGoal]         = useState("");
  const [newGoalPriority, setNewGoalPriority] = useState("medium");
  const [planDays, setPlanDays]       = useState(() => {
    try { const s = localStorage.getItem("tp_pa_plan"); if (s) return JSON.parse(s); } catch {}
    return PA_DEFAULT_PLAN;
  });
  const [addingTaskDay, setAddingTaskDay] = useState(null);
  const [newTask, setNewTask]             = useState("");
  // Local avatar draft (pending save)
  const [draftAvatar, setDraftAvatar] = useState(avatar && avatar.skinColor ? avatar : { ...AV_DEFAULT });
  const [avatarSaved, setAvatarSaved] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  useEffect(() => { setDraftAvatar(avatar && avatar.skinColor ? avatar : { ...AV_DEFAULT }); }, [avatar]);
  // Persist goals and plan
  const paGoalsMounted = useRef(false);
  useEffect(() => {
    if (!paGoalsMounted.current) { paGoalsMounted.current = true; return; }
    try { localStorage.setItem("tp_pa_goals", JSON.stringify(goals)); } catch {}
    tpSync("tp_pa_goals", goals);
  }, [goals]);
  const paPlanMounted = useRef(false);
  useEffect(() => {
    if (!paPlanMounted.current) { paPlanMounted.current = true; return; }
    try { localStorage.setItem("tp_pa_plan", JSON.stringify(planDays)); } catch {}
    tpSync("tp_pa_plan", planDays);
  }, [planDays]);
  // Persist conversations
  const paConvoMounted = useRef(false);
  useEffect(() => {
    if (!paConvoMounted.current) { paConvoMounted.current = true; return; }
    try { localStorage.setItem("tp_pa_convos", JSON.stringify(conversations.slice(0, 50))); } catch {}
    tpSync("tp_pa_convos", conversations.slice(0, 50));
  }, [conversations]);
  // Persist active convo id
  useEffect(() => {
    if (activeConvoId) try { localStorage.setItem("tp_pa_active_convo", String(activeConvoId)); } catch {}
  }, [activeConvoId]);

  const systemPrompt = aiContext || `The student's name is ${user?.name || "there"}.`;

  // Per-message intent detection — adds behavior block dynamically each call
  const buildSmartBehavior = (msg) => {
    const m = msg.toLowerCase();
    if (m.match(/quiz|test me|ask me|practice question/)) {
      return `\n\n═══ ACTIVE MODE: QUIZ ═══\nUser wants to be tested. Pick one of their weakest decks, ask ONE question at a time, wait for reply, give feedback, then next question. Be encouraging. Reference their actual card content.`;
    }
    if (m.match(/study plan|what should i study|plan my week|schedule/)) {
      return `\n\n═══ ACTIVE MODE: STUDY PLAN ═══\nBuild a specific day-by-day plan using the user's ACTUAL deck names from their profile. Assign decks to days. Include which study mode to use. Be concrete, not generic.`;
    }
    if (m.match(/struggling|confused|don.t understand|stuck|hard/)) {
      return `\n\n═══ ACTIVE MODE: STRUGGLING SUPPORT ═══\nUser is having difficulty. Be warm and specific. Reference their weakest decks by name. Break the problem into small steps. Remind them what they've already mastered to build confidence.`;
    }
    if (m.match(/connect|relate|link|how does .* relate|relationship between/)) {
      return `\n\n═══ ACTIVE MODE: KNOWLEDGE CONNECTION ═══\nHelp user see how their decks, maps, and subjects connect to each other. Suggest which brain maps could link to which flashcard decks. Show cross-subject relationships.`;
    }
    return "";
  };

  const sendMessage = async (text) => {
    const userText = typeof text === "string" ? text.trim() : "";
    if (!userText || loading) return;

    if (messages.length === 0) {
      setConversations(cs => cs.map(c => c.id === activeConvoId ? { ...c, title: autoTitle(userText) } : c));
    }

    const userMsg = { role: "user", content: userText, ts: new Date() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);

    // Inject behavior block based on what user is asking right now
    const behaviorAddOn = buildSmartBehavior(userText);
    const activePrompt  = systemPrompt + behaviorAddOn;

    try {
      const res = await aiFetch("/api/ace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "full",
          context: typeof activePrompt === "string" ? activePrompt.slice(0, 12000) : "",
          messages: newMsgs.map(m => ({ role: m.role, content: String(m.content) })),
        }),
      });
      const data  = await res.json();
      if (data.error) {
        console.error("Claude API error:", JSON.stringify(data.error));
      }
      const reply = data.content?.find(b => b.type === "text")?.text || data.error?.message || "Sorry, I couldn't respond. Please try again.";
      setMessages(m => [...m, { role: "assistant", content: reply, ts: new Date() }]);
      if (res.ok) aceRemember([...newMsgs, { role: "assistant", content: reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Something went wrong. Please try again.", ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("### ")) return <div key={i} style={{ fontWeight: 800, fontSize: 14, color: "#0A1628", margin: "14px 0 6px", borderLeft: `3px solid ${PA_COLOR}`, paddingLeft: 10 }}>{line.replace("### ", "")}</div>;
      if (line.startsWith("## "))  return <div key={i} style={{ fontWeight: 800, fontSize: 15, color: PA_GLOW,  margin: "16px 0 8px",  letterSpacing: 0.5 }}>{line.replace("## ", "")}</div>;
      if (line.startsWith("# "))   return <div key={i} style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 17, color: "#0A1628", margin: "18px 0 10px" }}>{line.replace("# ", "")}</div>;
      if (line.match(/^\d+\.\s/))  return <div key={i} style={{ display: "flex", gap: 10, marginBottom: 5 }}><span style={{ color: PA_GLOW, fontWeight: 700, flexShrink: 0 }}>{line.match(/^\d+/)[0]}.</span><span style={{ color: "#1A1814", fontSize: 14, lineHeight: 1.6 }}>{line.replace(/^\d+\.\s/, "")}</span></div>;
      if (line.startsWith("- ") || line.startsWith("• ")) return (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 5 }}>
          <span style={{ color: PA_COLOR, fontSize: 14, flexShrink: 0, marginTop: 3 }}>◆</span>
          <span style={{ fontSize: 14, color: "#1A1814", lineHeight: 1.6 }}>{line.replace(/^[-•]\s/, "")}</span>
        </div>
      );
      if (line.startsWith("**") && line.endsWith("**")) return <div key={i} style={{ fontWeight: 800, fontSize: 14, color: "#0A1628", margin: "12px 0 4px" }}>{line.replace(/\*\*/g, "")}</div>;
      if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return <p key={i} style={{ fontSize: 14, color: "#1A1814", lineHeight: 1.75, margin: "3px 0" }}>{parts.map((p, j) => p.startsWith("**") ? <strong key={j}>{p.replace(/\*\*/g, "")}</strong> : p)}</p>;
    });
  };

  // ── HOME VIEW ──
  const HomeView = () => (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 28px" }}>
      {/* Welcome header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${PA_COLOR}18`, border: `1px solid ${PA_COLOR}44`, borderRadius: 20, padding: "4px 14px", marginBottom: 18 }}>
          <AceHead size={18} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: PA_GLOW, textTransform: "uppercase" }}>Ace · Your study owl</span>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 900, color: "#0A1628", lineHeight: 1.1, marginBottom: 12, letterSpacing: -1 }}>
          Hey {user?.name?.split(" ")[0] || "there"} 👋<br />
          <span style={{ color: PA_GLOW }}>What are we</span> working on today?
        </h1>
        <p style={{ fontSize: 15, color: "#5A6878", lineHeight: 1.7, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
          Ask me anything — explain concepts, build study plans, quiz you, or just talk through what's on your mind.
        </p>

        {/* Inline chat bar — sends and opens chat view */}
        <HomeInputBar onSend={(text) => { setView("chat"); setTimeout(() => sendMessage(text), 80); }} PA_GLOW={PA_GLOW} PA_COLOR={PA_COLOR} />
      </div>

      {/* Quick start — suggested prompts */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8B4C0", marginBottom: 14 }}>Quick Start</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {PA_SUGGESTED.map((s, i) => (
            <button key={i} onClick={() => { setView("chat"); setTimeout(() => sendMessage(s), 100); }}
              style={{ textAlign: "left", padding: "14px 16px", borderRadius: 12, border: `1.5px solid #D8ECFF`, background: "#F4F8FF", cursor: "pointer", fontSize: 13, color: "#1A2030", fontWeight: 500, lineHeight: 1.5, transition: "all 0.18s", fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = PA_GLOW; e.currentTarget.style.background = `${PA_COLOR}18`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8ECFF"; e.currentTarget.style.background = "#F4F8FF"; }}>
              <span style={{ color: PA_GLOW, marginRight: 8, fontSize: 14 }}>→</span>{s}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {[
          { icon: "💬", title: "Start Chatting",    desc: "Ask me anything — concepts, study help, or just a question", action: () => setView("chat"),    color: PA_COLOR },
          { icon: "📅", title: "View Study Plan",   desc: "Your personalized weekly schedule and daily tasks",           action: () => setView("planner"), color: "#F0D080" },
          { icon: "🎯", title: "Track Your Goals",  desc: `${goals.filter(g => !g.done).length} active goals in progress`, action: () => setView("goals"), color: "#A8E6CF" },
        ].map(({ icon, title, desc, action, color }) => (
          <div key={title} onClick={action} style={{ background: "#fff", border: `1.5px solid #E4EEF8`, borderTop: `3px solid ${color}`, borderRadius: 14, padding: "22px 20px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(72,152,232,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#0A1628", marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#6A7888", lineHeight: 1.55 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── CHAT VIEW ──
  const ChatView = () => {
    const filtered = searchQuery.trim()
      ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())))
      : conversations;
    const grouped = groupConvos(filtered);

    return (
      <div className="pa-layout" style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
        <style>{`
          @keyframes pa-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
          @keyframes pa-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          .pa-convo-item:hover .pa-convo-actions { opacity: 1 !important; }
          .pa-convo-item:hover { background: #EEF5FF !important; }
          ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#D8ECFF;border-radius:2px}
        `}</style>

        {/* ── LEFT: Conversation History Sidebar ── */}
        <div style={{
          width: chatSidebarOpen ? 280 : 0,
          minWidth: chatSidebarOpen ? 280 : 0,
          background: "#F0F6FF",
          borderRight: "1px solid #E4EEF8",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.3s cubic-bezier(0.16,1,0.3,1), min-width 0.3s",
          flexShrink: 0,
        }}>
          {/* Sidebar header */}
          <div style={{ padding: "16px 14px 12px", flexShrink: 0 }}>
            <button onClick={startNewChat}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px dashed ${PA_GLOW}66`, background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: PA_GLOW, display: "flex", alignItems: "center", gap: 8, transition: "all 0.18s", fontFamily: "'DM Sans',sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.background = `${PA_COLOR}18`; e.currentTarget.style.borderStyle = "solid"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderStyle = "dashed"; }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Chat
            </button>

            {/* Search */}
            <div style={{ position: "relative", marginTop: 10 }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search chats…"
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1.5px solid #D8ECFF", borderRadius: 8, fontSize: 12, outline: "none", background: "#fff", fontFamily: "'DM Sans',sans-serif", color: "#1A1814", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = PA_GLOW} onBlur={e => e.target.style.borderColor = "#D8ECFF"} />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#A8B4C0" }}>🔍</span>
              {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#A8B4C0", lineHeight: 1 }}>✕</button>}
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
            {Object.entries(grouped).map(([label, items]) => {
              if (!items.length) return null;
              return (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8B4C0", padding: "12px 6px 6px" }}>{label}</div>
                  {items.map(c => {
                    const isActive   = c.id === activeConvoId;
                    const isRenaming = renamingId === c.id;
                    const preview    = c.messages.filter(m => m.role === "user").slice(-1)[0]?.content;
                    return (
                      <div key={c.id} className="pa-convo-item" onClick={() => { if (!isRenaming) setActiveConvoId(c.id); }}
                        style={{ position: "relative", padding: "9px 10px", borderRadius: 9, cursor: "pointer", marginBottom: 2, background: isActive ? `${PA_COLOR}28` : "transparent", border: isActive ? `1px solid ${PA_COLOR}55` : "1px solid transparent", transition: "all 0.15s" }}>
                        {isRenaming ? (
                          <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") renameConvo(c.id, renameVal || "Untitled"); if (e.key === "Escape") setRenamingId(null); }}
                            onBlur={() => renameConvo(c.id, renameVal || "Untitled")}
                            style={{ width: "100%", padding: "4px 6px", border: `1.5px solid ${PA_GLOW}`, borderRadius: 5, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", boxSizing: "border-box" }} />
                        ) : (
                          <>
                            <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? "#0A1628" : "#1A2030", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3, paddingRight: 44 }}>
                              {c.messages.length === 0 ? <span style={{ color: "#A8B4C0", fontStyle: "italic" }}>New Chat</span> : c.title}
                            </div>
                            {preview && <div style={{ fontSize: 11, color: "#8A9AAC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 44 }}>{preview}</div>}
                            {/* Action buttons — revealed on hover */}
                            <div className="pa-convo-actions" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 3, opacity: isActive ? 1 : 0, transition: "opacity 0.15s" }}>
                              <button onClick={e => { e.stopPropagation(); setRenamingId(c.id); setRenameVal(c.title); }}
                                style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "rgba(72,152,232,0.1)", cursor: "pointer", fontSize: 11, color: PA_GLOW, display: "flex", alignItems: "center", justifyContent: "center" }} title="Rename">✏</button>
                              <button onClick={e => { e.stopPropagation(); if (conversations.length > 1) deleteConvo(c.id); }}
                                style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "rgba(232,93,63,0.08)", cursor: conversations.length > 1 ? "pointer" : "default", fontSize: 11, color: conversations.length > 1 ? "#E85D3F" : "#D8ECFF", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">🗑</button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "#A8B4C0" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 12 }}>No chats match "{searchQuery}"</div>
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid #E4EEF8", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "#A8B4C0", textAlign: "center" }}>{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {/* ── RIGHT: Main chat area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#fff" }}>

          {/* Chat top bar */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #E4EEF8", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, background: "#fff" }}>


            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0A1628", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {messages.length === 0 ? "New Chat" : activeConvo.title}
              </div>
              {messages.length > 0 && <div style={{ fontSize: 11, color: "#A8B4C0" }}>{messages.length} message{messages.length !== 1 ? "s" : ""}</div>}
            </div>
            <button onClick={startNewChat}
              style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid #D8ECFF`, background: "#F4F8FF", cursor: "pointer", fontSize: 12, fontWeight: 700, color: PA_GLOW, whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = `${PA_COLOR}22`; e.currentTarget.style.borderColor = PA_GLOW; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#F4F8FF"; e.currentTarget.style.borderColor = "#D8ECFF"; }}>
              + New Chat
            </button>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
            {messages.length === 0 ? (
              <div style={{ maxWidth: 580, margin: "52px auto 0", textAlign: "center", animation: "pa-fadein 0.4s ease both" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${PA_GLOW}, ${PA_COLOR})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", boxShadow: `0 8px 32px ${PA_GLOW}33`, overflow: "hidden" }}>
                  <AceHead size={72} />
                </div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: "#0A1628", marginBottom: 10 }}>
                  Hi {user?.name?.split(" ")[0] || "there"} — what are we working on?
                </h2>
                <p style={{ fontSize: 14, color: "#6A7888", lineHeight: 1.7, marginBottom: 32 }}>
                  Ask me anything. I can explain concepts, quiz you, build study plans, help you navigate your apps, or just think through things with you.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, textAlign: "left" }}>
                  {PA_SUGGESTED.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)}
                      style={{ padding: "12px 14px", borderRadius: 12, border: "1.5px solid #D8ECFF", background: "#F4F8FF", cursor: "pointer", fontSize: 12, color: "#1A2030", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5, transition: "all 0.15s", textAlign: "left" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = PA_GLOW; e.currentTarget.style.background = `${PA_COLOR}18`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8ECFF"; e.currentTarget.style.background = "#F4F8FF"; }}>
                      <span style={{ color: PA_GLOW, marginRight: 6 }}>→</span>{s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0, paddingBottom: 24, paddingTop: 20 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ animation: i === messages.length - 1 ? "pa-fadein 0.3s ease both" : "none" }}>
                    {/* Date separator */}
                    {i === 0 || new Date(messages[i-1].ts).toDateString() !== new Date(m.ts).toDateString() ? (
                      <div style={{ textAlign: "center", margin: "20px 0 12px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#A8B4C0", background: "#F4F8FF", padding: "3px 10px", borderRadius: 10, letterSpacing: 1 }}>
                          {new Date(m.ts).toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" })}
                        </span>
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                      {/* Avatar */}
                      <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, background: m.role === "user" ? `linear-gradient(135deg, ${PA_DARK}, ${PA_GLOW})` : `linear-gradient(135deg, ${PA_GLOW}, ${PA_COLOR})`, boxShadow: `0 2px 8px ${PA_GLOW}22`, marginTop: 2 }}>
                        {m.role === "user"
                          ? (avatar?.skinColor ? <AvatarHead avatar={avatar} size={32}/> : <span style={{ color:"#fff" }}>{user?.avatar||"U"}</span>)
                          : <AceHead size={32} />
                        }
                      </div>

                      {/* Message block */}
                      <div style={{ flex: 1, maxWidth: "calc(100% - 44px)" }}>
                        {/* Name + time */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: m.role === "user" ? PA_GLOW : "#0A1628" }}>{m.role === "user" ? (user?.name || "You") : "Ace"}</span>
                          <span style={{ fontSize: 10, color: "#C0CDD8" }}>{m.ts ? new Date(m.ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : ""}</span>
                        </div>

                        {/* Bubble */}
                        <div style={{ padding: "13px 16px", borderRadius: m.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px", background: m.role === "user" ? `linear-gradient(135deg, ${PA_GLOW}, #2A70C8)` : "#F4F8FF", border: m.role === "user" ? "none" : "1.5px solid #E4EEF8", boxShadow: m.role === "user" ? `0 4px 20px ${PA_GLOW}33` : "0 2px 8px rgba(0,0,0,0.04)", display: "inline-block", maxWidth: m.role === "user" ? "100%" : "100%" }}>
                          {m.role === "user"
                            ? <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.65, margin: 0 }}>{m.content}</p>
                            : <div style={{ lineHeight: 1.8 }}>{renderMarkdown(m.content)}</div>
                          }
                        </div>

                        {/* Copy button for assistant messages */}
                        {m.role === "assistant" && (
                          <div style={{ marginTop: 5, display: "flex", gap: 6 }}>
                            <button onClick={() => { navigator.clipboard.writeText(m.content); }}
                              style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #E4EEF8", background: "transparent", fontSize: 10, color: "#A8B4C0", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}
                              onMouseEnter={e => { e.currentTarget.style.color = PA_GLOW; e.currentTarget.style.borderColor = PA_GLOW; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "#A8B4C0"; e.currentTarget.style.borderColor = "#E4EEF8"; }}>
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20, animation: "pa-fadein 0.2s ease both" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${PA_GLOW}, ${PA_COLOR})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}><AceHead size={32} /></div>
                    <div style={{ paddingTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0A1628", marginBottom: 6 }}>Ace</div>
                      <div style={{ padding: "12px 16px", borderRadius: "4px 18px 18px 18px", background: "#F4F8FF", border: "1.5px solid #E4EEF8", display: "flex", gap: 5, alignItems: "center" }}>
                        {[0, 0.18, 0.36].map((d, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: PA_COLOR, animation: `pa-bounce 1.2s ${d}s infinite` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* ── Input bar ── */}
          <ChatInputBar onSend={sendMessage} loading={loading} PA_GLOW={PA_GLOW} PA_COLOR={PA_COLOR} />
        </div>
      </div>
    );
  };

  const PlannerView = () => (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 28px" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8B4C0", marginBottom: 8 }}>This Week</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: "#0A1628", marginBottom: 6 }}>Study Planner</h2>
        <p style={{ fontSize: 14, color: "#6A7888" }}>Check off tasks, add new ones, and build your weekly rhythm.</p>
      </div>
      <div className="pa-planner-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {planDays.map((day, di) => {
          const allDone  = day.done.every(Boolean);
          const someDone = day.done.some(Boolean);
          const isAdding = addingTaskDay === di;
          return (
            <div key={day.day} style={{ background: "#fff", border: `1.5px solid ${allDone ? "#A8E6CF" : "#E4EEF8"}`, borderTop: `3px solid ${allDone ? "#2BAE7E" : someDone ? PA_COLOR : "#E4EEF8"}`, borderRadius: 14, padding: "18px 18px 14px", transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 800, color: "#0A1628" }}>{day.day}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {allDone && <span style={{ fontSize: 10, background: "#D1FAE5", color: "#059669", fontWeight: 700, padding: "2px 7px", borderRadius: 8 }}>Done ✓</span>}
                  <button onClick={() => setAddingTaskDay(isAdding ? null : di)} style={{ background: "none", border: `1px solid ${isAdding ? PA_GLOW : "#D8ECFF"}`, borderRadius: 5, width: 22, height: 22, fontSize: 13, cursor: "pointer", color: isAdding ? PA_GLOW : "#A8B4C0", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>{isAdding ? "✕" : "+"}</button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {day.tasks.map((task, ti) => (
                  <div key={ti} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div onClick={() => {
                      setPlanDays(ds => ds.map((d,i) => i===di ? {...d, done: d.done.map((v,j) => j===ti ? !v : v)} : d));
                    }} style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${day.done[ti] ? "#2BAE7E" : "#D8ECFF"}`, background: day.done[ti] ? "#2BAE7E" : "#fff", flexShrink: 0, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginTop:2, transition:"all 0.15s" }}>
                      {day.done[ti] && <span style={{ color:"#fff", fontSize:9, fontWeight:900 }}>✓</span>}
                    </div>
                    <span style={{ flex:1, fontSize: 12, color: day.done[ti] ? "#A8B4C0" : "#1A2030", textDecoration: day.done[ti] ? "line-through" : "none", lineHeight: 1.5, cursor:"pointer" }} onClick={() => {
                      setPlanDays(ds => ds.map((d,i) => i===di ? {...d, done: d.done.map((v,j) => j===ti ? !v : v)} : d));
                    }}>{task}</span>
                    <button onClick={() => setPlanDays(ds => ds.map((d,i) => i===di ? {...d, tasks: d.tasks.filter((_,j)=>j!==ti), done: d.done.filter((_,j)=>j!==ti)} : d))} style={{ background:"none", border:"none", fontSize:10, color:"#D8ECFF", cursor:"pointer", padding:2, lineHeight:1, flexShrink:0 }}
                      onMouseEnter={e=>e.currentTarget.style.color="#E85D3F"} onMouseLeave={e=>e.currentTarget.style.color="#D8ECFF"}>✕</button>
                  </div>
                ))}
                {/* Add task inline */}
                {isAdding && (
                  <div style={{ display:"flex", gap:6, marginTop:4 }}>
                    <input autoFocus value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>{
                      if(e.key==="Enter"&&newTask.trim()){
                        setPlanDays(ds=>ds.map((d,i)=>i===di?{...d,tasks:[...d.tasks,newTask.trim()],done:[...d.done,false]}:d));
                        setNewTask(""); setAddingTaskDay(null);
                      } else if(e.key==="Escape"){setAddingTaskDay(null);setNewTask("");}
                    }} placeholder="New task…"
                      style={{ flex:1, padding:"5px 8px", border:`1.5px solid ${PA_GLOW}`, borderRadius:6, fontSize:11, outline:"none", fontFamily:"'DM Sans',sans-serif" }}/>
                    <button onClick={()=>{
                      if(newTask.trim()){setPlanDays(ds=>ds.map((d,i)=>i===di?{...d,tasks:[...d.tasks,newTask.trim()],done:[...d.done,false]}:d)); setNewTask(""); setAddingTaskDay(null);}
                    }} style={{ padding:"5px 9px", borderRadius:6, border:"none", background:PA_GLOW, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Add</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 28, background: `${PA_COLOR}14`, border: `1px solid ${PA_COLOR}44`, borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 22 }}>💡</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0A1628", marginBottom: 3 }}>Want a custom plan?</div>
          <div style={{ fontSize: 12, color: "#6A7888" }}>Ask your assistant to build a study plan based on your goals or exam date.</div>
        </div>
        <button onClick={() => { setView("chat"); setTimeout(() => sendMessage("Build me a personalized study plan for this week"), 100); }} style={{ marginLeft: "auto", padding: "9px 18px", borderRadius: 9, border: "none", background: PA_GLOW, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Ask AI →</button>
      </div>
    </div>
  );

  const GoalsView = () => {
    const addGoal = () => {
      if (!newGoal.trim()) return;
      const updated = [...goals, { id: Date.now(), text: newGoal.trim(), done: false, priority: newGoalPriority }];
      setGoals(updated);
      if (onGoalsChange) onGoalsChange(updated);
      setNewGoal("");
    };
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 28px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8B4C0", marginBottom: 8 }}>Tracking</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: "#0A1628", marginBottom: 6 }}>My Goals</h2>
          <p style={{ fontSize: 14, color: "#6A7888" }}>{goals.filter(g => !g.done).length} active · {goals.filter(g => g.done).length} completed</p>
        </div>
        {/* Add goal */}
        <div style={{ background: "#fff", border: "1.5px solid #E4EEF8", borderRadius: 14, padding: "18px 18px", marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0A1628", marginBottom: 12 }}>Add a New Goal</div>
          <input value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === "Enter" && addGoal()} placeholder="What do you want to achieve?"
            style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${newGoal ? PA_GLOW : "#D8ECFF"}`, borderRadius: 9, fontSize: 14, color: "#1A1814", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#F9FCFF", marginBottom: 12, boxSizing: "border-box", transition: "border-color 0.18s" }}
            onFocus={e => e.target.style.borderColor = PA_GLOW} onBlur={e => { if (!newGoal) e.target.style.borderColor = "#D8ECFF"; }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6A7888", fontWeight: 600 }}>Priority:</span>
            {["high","medium","low"].map(p => (
              <button key={p} onClick={() => setNewGoalPriority(p)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${newGoalPriority===p ? (p==="high"?"#E85D3F":p==="medium"?PA_GLOW:"#2BAE7E") : "#D8ECFF"}`, background: newGoalPriority===p ? (p==="high"?"#FEF2F2":p==="medium"?`${PA_COLOR}22`:"#F0FDF4") : "#fff", color: p==="high"?"#E85D3F":p==="medium"?PA_GLOW:"#2BAE7E", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition:"all 0.15s", textTransform:"capitalize" }}>{p}</button>
            ))}
            <button onClick={addGoal} disabled={!newGoal.trim()} style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 9, border: "none", background: newGoal.trim() ? PA_GLOW : "#E4EEF8", color: newGoal.trim() ? "#fff" : "#A8B4C0", fontSize: 13, fontWeight: 700, cursor: newGoal.trim() ? "pointer" : "default", transition: "all 0.2s" }}>+ Add Goal</button>
          </div>
        </div>
        {/* Goals list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {["high","medium","low"].map(priority => {
            const items = goals.filter(g => g.priority === priority);
            if (!items.length) return null;
            const pColor = priority==="high"?"#E85D3F":priority==="medium"?PA_GLOW:"#2BAE7E";
            const pLabel = priority==="high"?"🔴 High":priority==="medium"?"🔵 Medium":"🟢 Low";
            return (
              <div key={priority}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: pColor, marginBottom: 8, paddingLeft: 4 }}>{pLabel} Priority</div>
                {items.map(g => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fff", border: `1.5px solid ${g.done ? "#D1FAE5" : "#E4EEF8"}`, borderRadius: 12, marginBottom: 7, transition: "all 0.2s" }}>
                    <div onClick={() => setGoals(gs => gs.map(x => x.id===g.id ? {...x,done:!x.done} : x))}
                      style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${g.done ? "#2BAE7E" : "#D8ECFF"}`, background: g.done ? "#2BAE7E" : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
                      {g.done && <span style={{ color:"#fff", fontSize:11, fontWeight:900 }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: g.done ? "#A8B4C0" : "#0A1628", textDecoration: g.done ? "line-through" : "none", transition:"all 0.2s" }}>{g.text}</span>
                    <select value={g.priority} onChange={e => setGoals(gs => gs.map(x => x.id===g.id ? {...x,priority:e.target.value} : x))} style={{ fontSize:11, border:"1px solid #D8ECFF", borderRadius:6, padding:"3px 6px", background:"#F9FCFF", color:"#6A7888", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <button onClick={() => setGoals(gs => gs.filter(x => x.id!==g.id))} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#D8ECFF", padding:4 }}
                      onMouseEnter={e=>e.currentTarget.style.color="#E85D3F"} onMouseLeave={e=>e.currentTarget.style.color="#D8ECFF"}>✕</button>
                  </div>
                ))}
              </div>
            );
          })}
          {goals.length === 0 && <div style={{ textAlign:"center", padding:"60px 0", color:"#A8B4C0" }}><div style={{ fontSize:40, marginBottom:12 }}>🎯</div><div style={{ fontSize:14 }}>Add your first goal above</div></div>}
        </div>
      </div>
    );
  };

  // ── PROGRESS VIEW ──
  const ProgressView = () => (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 28px" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8B4C0", marginBottom: 8 }}>Overview</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: "#0A1628" }}>My Progress</h2>
      </div>
      {/* Stats */}
      <div className="pa-progress-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {[
          { val: messages.length, label: "AI Conversations", icon: "💬" },
          { val: `${goals.filter(g => g.done).length}/${goals.length}`, label: "Goals Completed", icon: "🎯" },
          { val: planDays.reduce((a, d) => a + d.done.filter(Boolean).length, 0), label: "Tasks Done", icon: "✅" },
          { val: "7🔥", label: "Day Streak", icon: "🔥" },
        ].map(({ val, label, icon }) => (
          <div key={label} style={{ background: "#fff", border: "1.5px solid #E4EEF8", borderRadius: 14, padding: "20px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: "#0A1628", marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: 11, color: "#A8B4C0", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
          </div>
        ))}
      </div>
      {/* Weekly tasks bar chart */}
      <div style={{ background: "#fff", border: "1.5px solid #E4EEF8", borderRadius: 14, padding: "24px 24px" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800, color: "#0A1628", marginBottom: 20 }}>Weekly Task Completion</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
          {planDays.map(d => {
            const pct = d.done.length > 0 ? d.done.filter(Boolean).length / d.done.length : 0;
            return (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", height: 64, background: "#F4F8FF", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", height: `${pct * 100}%`, background: pct === 1 ? "#2BAE7E" : `linear-gradient(180deg, ${PA_COLOR}, ${PA_GLOW})`, borderRadius: 6, transition: "height 0.5s ease", minHeight: pct > 0 ? 8 : 0 }} />
                </div>
                <div style={{ fontSize: 10, color: "#A8B4C0", fontWeight: 600 }}>{d.day.slice(0, 3)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── AVATAR BUILDER VIEW ──
  const AvatarView = () => {
    const ColorSwatch = ({ item, current, onChange }) => (
      <div onClick={() => onChange(item.id)} title={item.label}
        style={{ width:32, height:32, borderRadius:"50%", background:`#${item.id}`, cursor:"pointer",
          border:`3px solid ${current===item.id?"#1A1814":"transparent"}`,
          outline: current===item.id?`2px solid #${item.id}`:"none",
          outlineOffset:2, transition:"all 0.15s", boxShadow:"0 1px 4px rgba(0,0,0,0.18)" }} />
    );
    const Chip = ({ item, current, onChange }) => (
      <button onClick={() => onChange(item.id)}
        style={{ padding:"7px 14px", borderRadius:20,
          border:`1.5px solid ${current===item.id?PA_GLOW:"#D8ECFF"}`,
          background:current===item.id?`${PA_COLOR}22`:"#fff",
          fontSize:12, fontWeight:current===item.id?700:500,
          color:current===item.id?PA_GLOW:"#5A6878",
          cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>
        {item.label}
      </button>
    );
    const Section = ({ title, children }) => (
      <div style={{ background:"#fff", border:"1.5px solid #E4EEF8", borderRadius:14, padding:"18px 20px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#A8B4C0", marginBottom:12, letterSpacing:1.5, textTransform:"uppercase" }}>{title}</div>
        {children}
      </div>
    );

    return (
      <div style={{ maxWidth:820, margin:"0 auto", padding:"40px 28px" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#A8B4C0", marginBottom:8 }}>Personalization</div>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:900, color:"#0A1628", marginBottom:6 }}>My Avatar</h2>
          <p style={{ fontSize:14, color:"#6A7888" }}>Build your look. Appears on your AI assistant button across the entire platform.</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:28, alignItems:"start" }}>
          {/* Left: Preview + Save */}
          <div style={{ background:"#fff", border:"1.5px solid #E4EEF8", borderRadius:20, padding:"28px 20px", textAlign:"center", position:"sticky", top:80 }}>
            <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:150, height:150, borderRadius:"50%", background:`${PA_COLOR}18`, border:`4px solid ${PA_COLOR}`, marginBottom:16, overflow:"hidden" }}>
              <AvatarHead avatar={draftAvatar} size={150} />
            </div>
            <input value={draftAvatar.displayName || ""} onChange={e => setDraftAvatar(a=>({...a, displayName:e.target.value}))}
              placeholder={user?.name || "Display name"}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E4EEF8", borderRadius:9, fontSize:14, fontWeight:700, textAlign:"center", fontFamily:"'Playfair Display',serif", color:"#0A1628", outline:"none", background:"#F9FCFF", marginBottom:16, boxSizing:"border-box" }}
              onFocus={e=>e.target.style.borderColor=PA_GLOW} onBlur={e=>e.target.style.borderColor="#E4EEF8"} />
            <button onClick={() => { setAvatar({...draftAvatar}); setAvatarSaved(true); setTimeout(()=>setAvatarSaved(false),2500); }}
              style={{ width:"100%", padding:"11px 0", borderRadius:10, border:"none", background:`linear-gradient(135deg,${PA_GLOW},${PA_COLOR})`, color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer", letterSpacing:0.5, transition:"all 0.2s" }}>
              {avatarSaved ? "✓ Saved!" : "Save Avatar"}
            </button>
            {avatar?.skinColor && <button onClick={() => { setDraftAvatar({...AV_DEFAULT}); setAvatar(null); }}
              style={{ width:"100%", padding:"8px 0", borderRadius:10, border:"1px solid #E4EEF8", background:"transparent", color:"#A8B4C0", fontSize:12, cursor:"pointer", marginTop:8, fontFamily:"'DM Sans',sans-serif" }}>
              Reset
            </button>}
          </div>

          {/* Right: All controls */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            <Section title="Skin Tone">
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {AV_SKIN_COLORS.map(t => <ColorSwatch key={t.id} item={t} current={draftAvatar.skinColor} onChange={v=>setDraftAvatar(a=>({...a,skinColor:v}))} />)}
              </div>
            </Section>

            <Section title="Hair Style">
              <div style={{ fontSize:11, fontWeight:600, color:"#A8B4C0", marginBottom:8, letterSpacing:1 }}>FRONT</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                {AV_FRONT_HAIR.map(h => <Chip key={h.id} item={h} current={draftAvatar.hair} onChange={v=>setDraftAvatar(a=>({...a,hair:v}))} />)}
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:"#A8B4C0", marginBottom:8, letterSpacing:1 }}>LONG / BACK</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {AV_REAR_HAIR.map(h => <Chip key={h.id} item={h} current={draftAvatar.rearHair} onChange={v=>setDraftAvatar(a=>({...a,rearHair:v}))} />)}
              </div>
            </Section>

            {(draftAvatar.hair !== "none" || draftAvatar.rearHair !== "none") && (
              <Section title="Hair Color">
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {AV_HAIR_COLORS.map(c => <ColorSwatch key={c.id} item={c} current={draftAvatar.hairColor} onChange={v=>setDraftAvatar(a=>({...a,hairColor:v}))} />)}
                </div>
              </Section>
            )}

            <Section title="Eyebrows">
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {AV_EYEBROWS.map(e => <Chip key={e.id} item={e} current={draftAvatar.eyebrows} onChange={v=>setDraftAvatar(a=>({...a,eyebrows:v}))} />)}
              </div>
            </Section>

            <Section title="Eyes">
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {AV_EYES.map(e => <Chip key={e.id} item={e} current={draftAvatar.eyes} onChange={v=>setDraftAvatar(a=>({...a,eyes:v}))} />)}
              </div>
            </Section>

            <Section title="Mouth">
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {AV_MOUTH.map(m => <Chip key={m.id} item={m} current={draftAvatar.mouth} onChange={v=>setDraftAvatar(a=>({...a,mouth:v}))} />)}
              </div>
            </Section>

            <Section title="Facial Hair">
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {AV_BEARD.map(b => <Chip key={b.id} item={b} current={draftAvatar.beard} onChange={v=>setDraftAvatar(a=>({...a,beard:v}))} />)}
              </div>
            </Section>

            <Section title="Clothes">
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                {AV_CLOTHES.map(cl => <Chip key={cl.id} item={cl} current={draftAvatar.clothes} onChange={v=>setDraftAvatar(a=>({...a,clothes:v}))} />)}
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:"#A8B4C0", marginBottom:10, letterSpacing:1 }}>COLOR</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {AV_CLOTHES_COLORS.map(c => <ColorSwatch key={c.id} item={c} current={draftAvatar.clothesColor} onChange={v=>setDraftAvatar(a=>({...a,clothesColor:v}))} />)}
              </div>
            </Section>

          </div>
        </div>
      </div>
    );
  };

  // ── PREFERENCES VIEW ──
  const PrefsView = () => (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 28px" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8B4C0", marginBottom: 8 }}>Configuration</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: "#0A1628", marginBottom: 6 }}>Preferences</h2>
        <p style={{ fontSize: 14, color: "#6A7888" }}>Control how the assistant behaves and appears across Ace It.</p>
      </div>

      {/* Floating assistant toggle */}
      <div style={{ background:"#fff", border:"1.5px solid #E4EEF8", borderRadius:14, overflow:"hidden", marginBottom:16 }}>
        <div style={{ padding:"20px 22px", display:"flex", alignItems:"center", gap:14, borderBottom:"1px solid #F0F6FF" }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`${PA_COLOR}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>⊕</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#0A1628", marginBottom:3 }}>Floating Assistant Button</div>
            <div style={{ fontSize:12, color:"#6A7888" }}>Show the AI assistant button across all Ace It apps so you can get help from anywhere.</div>
          </div>
          <div onClick={() => setShowFloating(s => !s)} style={{ width:48, height:26, borderRadius:13, background:showFloating?PA_GLOW:"#D8ECFF", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:3, left:showFloating?24:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
          </div>
        </div>
        {showFloating && (
          <div style={{ padding:"14px 22px", background:"#F4F8FF" }}>
            <div style={{ fontSize:11, color:"#6A7888", lineHeight:1.6 }}>
              💡 <strong>Tip:</strong> You can drag the button anywhere on screen. Click it to open a quick chat panel. You can also hide it from inside any app's sidebar.
            </div>
          </div>
        )}
      </div>

      {/* Avatar quick access */}
      <div onClick={() => setView("avatar")} style={{ background:"#fff", border:"1.5px solid #E4EEF8", borderRadius:14, padding:"20px 22px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", marginBottom:16, transition:"all 0.2s" }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=PA_GLOW} onMouseLeave={e=>e.currentTarget.style.borderColor="#E4EEF8"}>
        <div style={{ width:44, height:44, borderRadius:"50%", border:`2px solid ${PA_COLOR}`, overflow:"hidden", flexShrink:0, background:"#F4F8FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {avatar?.skinColor ? <AvatarHead avatar={avatar} size={44}/> : <span style={{fontSize:22}}>🧑</span>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0A1628", marginBottom:3 }}>{avatar?.skinColor ? "Edit My Avatar" : "Create My Avatar"}</div>
          <div style={{ fontSize:12, color:"#6A7888" }}>{avatar?.skinColor ? "Your avatar appears next to your messages and on your profile" : "Build your personal avatar — it appears next to your messages"}</div>
        </div>
        <span style={{ fontSize:16, color:"#A8B4C0" }}>→</span>
      </div>

      {/* Assistant personality */}
      <div style={{ background:"#fff", border:"1.5px solid #E4EEF8", borderRadius:14, padding:"20px 22px" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0A1628", marginBottom:4 }}>Assistant Style</div>
        <div style={{ fontSize:12, color:"#6A7888", marginBottom:16 }}>How should your assistant communicate with you?</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[
            { id:"friendly",     label:"Friendly & Encouraging",  desc:"Warm, upbeat, lots of positive reinforcement" },
            { id:"direct",       label:"Direct & Concise",        desc:"Straight to the point, no fluff" },
            { id:"academic",     label:"Academic & Thorough",      desc:"Detailed explanations, references, depth" },
          ].map(style => (
            <div key={style.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", border:"1.5px solid #E4EEF8", borderRadius:10, cursor:"pointer", background:"#F9FCFF" }}>
              <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${PA_GLOW}`, background:"#fff", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {style.id==="friendly" && <div style={{ width:9, height:9, borderRadius:"50%", background:PA_GLOW }} />}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#0A1628" }}>{style.label}</div>
                <div style={{ fontSize:11, color:"#6A7888" }}>{style.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const VIEW_TITLES = { home:"Home", chat:"Chat", planner:"Study Planner", goals:"Goals", progress:"Progress", avatar:"My Avatar", prefs:"Preferences" };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#F4F8FF", minHeight: "100vh", color: "#1A1814" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&family=Montserrat:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#D8ECFF;border-radius:3px}
        @media (max-width: 768px) {
          .pa-layout { flex-direction: column !important; }
          .pa-sidebar { width: 100% !important; min-width: unset !important; max-width: unset !important; height: auto !important; border-right: none !important; border-bottom: 1px solid #E4EEF8 !important; }
          .pa-sidebar-list { max-height: 120px !important; overflow-y: auto !important; }
          .pa-main { flex: 1 !important; min-height: 60vh !important; }
          .pa-nav { padding: 0 14px !important; }
          .pa-nav-tabs { gap: 4px !important; }
          .pa-nav-tabs button { padding: 6px 10px !important; font-size: 11px !important; }
          .pa-nav-name { display: none !important; }
          .pa-goals-grid { grid-template-columns: 1fr !important; }
          .pa-prefs-grid { grid-template-columns: 1fr !important; }
          .pa-progress-grid { grid-template-columns: 1fr 1fr !important; }
          .pa-planner-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .pa-progress-grid { grid-template-columns: 1fr !important; }
          .pa-nav-tabs { display: none !important; }
        }
      `}</style>

      <PASidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} view={view} setView={setView} onBack={onBack} user={user} openAuth={openAuth} onLogout={onLogout} avatar={avatar} />

      {/* Top nav */}
      <nav className="pa-nav" style={{ background: "#fff", borderBottom: "1px solid #E4EEF8", position: "sticky", top: 0, zIndex: 100, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "1px solid #E4EEF8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: "#5A6878", fontSize: 16, transition: "all 0.15s", lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = PA_GLOW; e.currentTarget.style.color = PA_GLOW; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E4EEF8"; e.currentTarget.style.color = "#5A6878"; }}>☰</button>
          <button onClick={onBack} style={{background:"none",border:"1px solid #D8ECFF",borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#8A9AAC",whiteSpace:"nowrap"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=PA_GLOW;e.currentTarget.style.color=PA_GLOW;}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#D8ECFF";e.currentTarget.style.color="#8A9AAC";}}>← Galaxy</button>
          <div style={{ width: 1, height: 20, background: "#E4EEF8" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${PA_GLOW}, ${PA_COLOR})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}><AceHead size={32} /></div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#0A1628" }}>
              <span style={{ color: PA_GLOW }}>Ace</span> · Personal Assistant
            </span>
          </div>
        </div>

        {/* View tabs */}
        <div className="pa-nav-tabs" style={{ display: "flex", background: "#F0F6FF", borderRadius: 9, padding: 3, gap: 2 }}>
          {[["⌂","home"],["💬","chat"],["📅","planner"],["🎯","goals"],["📊","progress"],["🧑","avatar"],["⚙","prefs"]].map(([icon, v]) => (
            <button key={v} onClick={() => setView(v)} title={VIEW_TITLES[v]}
              onKeyDown={e => { if (e.key === " ") e.preventDefault(); }}
              style={{ padding: "7px 12px", borderRadius: 6, border: "none", fontSize: 14, cursor: "pointer", transition: "all 0.18s", background: view === v ? "#fff" : "transparent", color: view === v ? PA_GLOW : "#8A9AAC", boxShadow: view === v ? "0 1px 6px rgba(72,152,232,0.15)" : "none" }}>
              {icon}
            </button>
          ))}
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span className="pa-nav-name" style={{ fontSize: 12, fontWeight: 700, color: "#3A4858" }}>{user.name}</span>
              <div style={{ width: 34, height: 34, borderRadius: "50%", overflow:"hidden", background: avatar?.skinColor ? "#fff" : `linear-gradient(135deg, ${PA_DARK}, ${PA_GLOW})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", border:`2px solid ${PA_COLOR}` }}>
                {avatar?.skinColor ? <AvatarHead avatar={avatar} size={34}/> : user.avatar}
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => openAuth("login")}  style={{ background: "none", border: "1px solid #D8ECFF", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#5A6878" }}>Log In</button>
              <button onClick={() => openAuth("signup")} style={{ background: PA_GLOW,  border: "none",             borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#fff"    }}>Sign Up</button>
            </>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="pa-main" style={{ overflowY: view === "chat" ? "hidden" : "auto" }}>
        {view === "home"     && HomeView()}
        {view === "chat"     && ChatView()}
        {view === "planner"  && PlannerView()}
        {view === "goals"    && GoalsView()}
        {view === "progress" && ProgressView()}
        {view === "avatar"   && AvatarView()}
        {view === "prefs"    && PrefsView()}
      </main>
    </div>
  );
}

export default PersonalAssistantApp;
