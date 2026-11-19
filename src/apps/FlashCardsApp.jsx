// Split out of App.jsx so this code only downloads when it is needed.
import { useState, useRef, useEffect } from "react";
import { FC_DECKS, aiFetch, tpSync } from "../shared.jsx";
import { auth } from "../firebase";

// ── Public decks: talk to /api/decks (signed-in actions send the login token) ──
async function deckApi(body) {
  try {
    const headers = { "Content-Type": "application/json" };
    const u = auth.currentUser;
    if (u) headers.Authorization = `Bearer ${await u.getIdToken()}`;
    const res = await fetch("/api/decks", { method: "POST", headers, body: JSON.stringify(body) });
    let data = {}; try { data = await res.json(); } catch { /* empty */ }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: { message: "You're offline. Try again in a moment." } } };
  }
}
function deckHash(d) {
  const str = JSON.stringify([d.title, d.subject, d.description, d.color, (d.cards || []).map(c => [c.term, c.definition])]);
  let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return String(h);
}

// ── Study streak: consecutive days with at least one card reviewed ──
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function readStreak() {
  try {
    const v = JSON.parse(localStorage.getItem("tp_fc_streak") || "null");
    if (!v || typeof v !== "object") return { count: 0, last: null };
    return { count: Number(v.count) || 0, last: v.last || null };
  } catch { return { count: 0, last: null }; }
}

function currentStreak() {
  const { count, last } = readStreak();
  if (!last) return 0;
  const y = new Date(); y.setDate(y.getDate() - 1);
  return (last === localDay() || last === localDay(y)) ? count : 0; // a missed day resets it
}

function recordStudyDay() {
  const today = localDay();
  const { count, last } = readStreak();
  if (last === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const next = { count: last === localDay(y) ? count + 1 : 1, last: today };
  try { localStorage.setItem("tp_fc_streak", JSON.stringify(next)); } catch {}
  tpSync("tp_fc_streak", next);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function FCSidebar({ isOpen, onClose, decks, view, setView, onBack, user, openAuth, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(true);
  const [decksOpen,   setDecksOpen]   = useState(true);

  const navItems = [
    { icon: "⌂", label: "Home",       v: "home"    },
    { icon: "▦", label: "My Library", v: "library" },
  ];

  const accountItems = [
    { icon: "◎", label: "Settings"       },
    { icon: "✦", label: "Upgrade to Pro" },
    { icon: "⟡", label: "Help & Support" },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,24,20,0.35)", backdropFilter: "blur(4px)", animation: "fcFadeIn 0.2s ease both" }} />
      )}

      {/* Panel */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 272,
        background: "#fff", borderRight: "1px solid #ECEAE4",
        display: "flex", flexDirection: "column", overflow: "hidden",
        zIndex: 201,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.38s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: isOpen ? "4px 0 32px rgba(26,24,20,0.08)" : "none",
      }}>

        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #ECEAE4", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: "#1A1814", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#F7F6F2", fontSize: 14, fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>A</span>
            </div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800, color: "#1A1814", letterSpacing: -0.3 }}>Ace It</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 5, width: 28, height: 28, cursor: "pointer", fontSize: 13, color: "#8C8880", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.color = "#1A1814"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#ECEAE4"; e.currentTarget.style.color = "#8C8880"; }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 20px" }}>

          {/* User profile */}
          <div style={{ marginBottom: 6 }}>
            <button onClick={() => setProfileOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px", background: "none", border: "none", cursor: "pointer", borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E" }}>Account</span>
              <span style={{ fontSize: 9, color: "#A8A59E", display: "inline-block", transform: profileOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.22s" }}>▾</span>
            </button>

            {profileOpen && (
              <div style={{ margin: "4px 0 8px", padding: "14px 14px", background: "#F7F6F2", borderRadius: 10, border: "1px solid #ECEAE4" }}>
                {user ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #1A1814, #4F6EF7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 3px #fff, 0 0 0 4px #ECEAE4" }}>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#F7F6F2" }}>{user.avatar}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#1A1814" }}>{user.name}</div>
                        
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#A8A59E", marginBottom: 5 }}>
                        <span>XP Progress</span><span style={{ color: "#4F6EF7", fontWeight: 600 }}>1,240 / 2,000</span>
                      </div>
                      <div style={{ height: 4, background: "#ECEAE4", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: "62%", background: "linear-gradient(90deg, #1A1814, #4F6EF7)", borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", borderTop: "1px solid #ECEAE4", paddingTop: 12, marginBottom: 12 }}>
                      {[{ val: "7🔥", lbl: "Streak" }, { val: "4", lbl: "Decks" }, { val: "64%", lbl: "Mastery" }].map(({ val, lbl }, i) => (
                        <div key={lbl} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid #ECEAE4" : "none" }}>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 800, color: "#1A1814" }}>{val}</div>
                          <div style={{ fontSize: 9, color: "#A8A59E", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { onLogout(); onClose(); }} style={{ width: "100%", padding: "8px 0", borderRadius: 6, background: "transparent", border: "1px solid #E8E5E0", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#8C8880", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#E85D3F"; e.currentTarget.style.color = "#E85D3F"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8E5E0"; e.currentTarget.style.color = "#8C8880"; }}>Sign Out</button>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#ECEAE4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>👤</div>
                      <div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 800, color: "#8C8880" }}>Guest</div>
                        <div style={{ fontSize: 11, color: "#A8A59E", marginTop: 1 }}>Not signed in</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { openAuth("login"); onClose(); }} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1.5px solid #1A1814", background: "#1A1814", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>Log In</button>
                      <button onClick={() => { openAuth("signup"); onClose(); }} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1.5px solid #1A1814", background: "transparent", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#1A1814", transition: "all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Sign Up</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#ECEAE4", margin: "6px 8px 12px" }} />

          {/* Navigation */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", padding: "0 8px", marginBottom: 4 }}>Navigate</div>
            {navItems.map(({ icon, label, v }) => {
              const active = view === v;
              return (
                <div key={v} onClick={() => setView(v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: active ? "#1A1814" : "transparent", borderLeft: active ? "none" : "2px solid transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#F7F6F2"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ fontSize: 14, color: active ? "#F7F6F2" : "#8C8880", width: 18, textAlign: "center" }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? "#F7F6F2" : "#5A5752" }}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#ECEAE4", margin: "6px 8px 12px" }} />

          {/* Recent Decks */}
          <div style={{ marginBottom: 6 }}>
            <button onClick={() => setDecksOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px", background: "none", border: "none", cursor: "pointer", borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E" }}>Recent Decks</span>
              <span style={{ fontSize: 9, color: "#A8A59E", display: "inline-block", transform: decksOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.22s" }}>▾</span>
            </button>

            {decksOpen && (
              <div style={{ marginTop: 4 }}>
                {decks.map(deck => (
                  <div key={deck.id} onClick={() => setView("library")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2, transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {/* Color dot */}
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: deck.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1814", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.title}</div>
                      <div style={{ fontSize: 10, color: "#A8A59E", marginTop: 1 }}>{deck.cardCount} cards · {deck.mastery}% mastered</div>
                    </div>
                    {/* Mini mastery bar */}
                    <div style={{ width: 36, height: 3, background: "#ECEAE4", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ height: "100%", width: `${deck.mastery}%`, background: deck.mastery === 100 ? "#2BAE7E" : deck.color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
                <div onClick={() => setView("library")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", borderRadius: 8, marginTop: 2, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 11, color: "#4F6EF7", fontWeight: 600 }}>+ View all decks →</span>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#ECEAE4", margin: "6px 8px 12px" }} />

          {/* Account links */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", padding: "0 8px", marginBottom: 4 }}>Account</div>
            {accountItems.map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 13, color: "#8C8880", width: 18, textAlign: "center" }}>{icon}</span>
                <span style={{ fontSize: 13, color: "#5A5752" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — Upgrade CTA + back to Galaxy */}
        <div style={{ flexShrink: 0, borderTop: "1px solid #ECEAE4" }}>
          {/* Upgrade strip */}
          <div style={{ margin: "12px 12px 8px", padding: "14px 16px", background: "#1A1814", borderRadius: 10 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 800, color: "#F5C842", marginBottom: 4 }}>✦ Go Pro</div>
            <div style={{ fontSize: 11, color: "rgba(247,246,242,0.5)", lineHeight: 1.5, marginBottom: 12 }}>Unlimited decks, AI card generation & more</div>
            <div style={{ background: "#F5C842", borderRadius: 6, padding: "8px 0", textAlign: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#1A1814", cursor: "pointer", letterSpacing: 0.5 }}>Upgrade — $9/mo</div>
          </div>
          {/* Galaxy link */}
          <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span style={{ fontSize: 13, color: "#8C8880" }}>←</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#8C8880" }}>Back to Ace It</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root wrapper — receives onBack from Galaxy ────────────────────────────────
function FlashCardsApp({ onBack, user, openAuth, onLogout, onDeckCreated, launchApp }) {
  const [view, setView]             = useState("home");
  const [activeDeck, setActiveDeck] = useState(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [activeSubject, setActiveSubject] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studyConfig, setStudyConfig] = useState(null);
  const [drafts, setDrafts] = useState(() => { try { return JSON.parse(localStorage.getItem("tp_fc_drafts") || "[]"); } catch { return []; } });
  const fcDraftsMounted = useRef(false);
  useEffect(() => {
    if (!fcDraftsMounted.current) { fcDraftsMounted.current = true; return; }
    try { localStorage.setItem("tp_fc_drafts", JSON.stringify(drafts)); } catch {}
    tpSync("tp_fc_drafts", drafts);
  }, [drafts]);
  const [createTab, setCreateTab] = useState("cards");

  // Navigate within FC — pushes to browser history
  const fcNavigate = (newView, deckRef = null) => {
    setView(newView);
    if (deckRef) setActiveDeck(deckRef);
    window.history.pushState(
      { screen: "app", app: "flashcards", fcView: newView, deckId: deckRef?.id || null },
      "",
      "/flashcards"
    );
  };

  // Handle browser back/forward within FC
  useEffect(() => {
    const handlePop = (e) => {
      const state = e.state;
      if (!state || state.app !== "flashcards") return; // let parent handle it
      setView(state.fcView || "home");
      // Note: activeDeck can't be fully restored from just id without a deck lookup
      // so for simplicity we fall back to library on back if no deck in state
      if (!state.deckId) setActiveDeck(null);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // ── Deck state — initialized from localStorage, falls back to sample decks ──
  const [decks, setDecks] = useState(() => {
    try {
      const saved = localStorage.getItem("tp_fc_decks");
      if (saved) return JSON.parse(saved);
    } catch {}
    return FC_DECKS;
  });

  // ── User-created folders — persisted separately ────────────────────────────
  const [userFolders, setUserFolders] = useState(() => {
    try {
      const saved = localStorage.getItem("tp_fc_folders");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const fcMounted = useRef(false);
  useEffect(() => {
    if (!fcMounted.current) { fcMounted.current = true; return; }
    try { localStorage.setItem("tp_fc_decks", JSON.stringify(decks)); } catch {}
    tpSync("tp_fc_decks", decks);
  }, [decks]);

  const fcFolderMounted = useRef(false);
  useEffect(() => {
    if (!fcFolderMounted.current) { fcFolderMounted.current = true; return; }
    try { localStorage.setItem("tp_fc_folders", JSON.stringify(userFolders)); } catch {}
    tpSync("tp_fc_folders", userFolders);
  }, [userFolders]);

  const saveDeck = (deckData) => {
    const newDeck = {
      id: Date.now(),
      title: deckData.title,
      subject: deckData.subject || "Other",
      description: deckData.description || "",
      color: deckData.color || "#4F6EF7",
      cardCount: deckData.cards.filter(c => c.term.trim() || c.definition.trim()).length,
      lastStudied: "Just now",
      mastery: 0,
      folderKey: deckData.folderKey || null,
      isPublic: deckData.isPublic || false,
      author: deckData.author || "Anonymous",
      ratings: [],   // array of { userId, stars }
      createdAt: new Date().toISOString(),
      cards: deckData.cards.filter(c => c.term.trim() || c.definition.trim()).map((c, i) => ({
        id: i + 1,
        term: c.term.trim(),
        definition: c.definition.trim(),
      })),
    };
    setDecks(prev => [newDeck, ...prev]);
    return newDeck;
  };

  const deleteDeck = (id) => setDecks(prev => prev.filter(d => d.id !== id));

  const updateDeck = (id, changes) => setDecks(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d));

  // Keep shared (public) decks in sync with their public pages: share, update, or stop sharing.
  const prevDecksRef = useRef(decks);
  const toUnpublish = useRef(new Set());
  useEffect(() => {
    const ids = new Set(decks.map(d => d.id));
    prevDecksRef.current.forEach(d => { if (d.publicId && !ids.has(d.id)) toUnpublish.current.add(String(d.id)); });
    prevDecksRef.current = decks;
    if (!user) return;
    const t = setTimeout(async () => {
      for (const deckId of [...toUnpublish.current]) {
        const r = await deckApi({ action: "unpublish", deckId });
        if (r.ok) toUnpublish.current.delete(deckId);
      }
      for (const d of decks) {
        if (d.isPublic) {
          const h = deckHash(d);
          if (d.publicId && d.publishedHash === h) continue;
          const r = await deckApi({ action: "publish", deck: { id: String(d.id), title: d.title, subject: d.subject, description: d.description, color: d.color, cards: (d.cards || []).map(c => ({ term: c.term, definition: c.definition })) } });
          if (r.ok) updateDeck(d.id, { publicId: r.data.id, publicUrl: r.data.url, publishedHash: h, publishError: null });
          else if (r.status === 400 || r.status === 403) updateDeck(d.id, { isPublic: false, publishedHash: null, publishError: r.data?.error?.message || "Couldn't share this deck." });
        } else if (d.publicId) {
          const r = await deckApi({ action: "unpublish", deckId: String(d.id) });
          if (r.ok) updateDeck(d.id, { publicId: null, publicUrl: null, publishedHash: null });
        }
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [decks, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // A public deck opened from its Google page (/flashcards?public=…)
  const [incoming, setIncomingState] = useState(null);
  const setIncoming = (d) => { setIncomingState(d); if (!d) { try { sessionStorage.removeItem("tp_open_public"); } catch { /* ignore */ } } };
  useEffect(() => {
    let id = null;
    // Kept in sessionStorage until the student chooses, so a screen refresh after sign-in doesn't lose it.
    try { id = new URLSearchParams(window.location.search).get("public") || sessionStorage.getItem("tp_open_public"); if (id) sessionStorage.setItem("tp_open_public", id); } catch { /* ignore */ }
    if (!id || !/^[0-9a-f]{12}$/.test(id)) return;
    if (window.location.search) window.history.replaceState(window.history.state, "", "/flashcards");
    fetch(`/api/decks?id=${id}`).then(r => r.ok ? r.json() : null).then(j => { if (j?.deck) { setIncoming(j.deck); setView("public"); } else setIncoming(null); }).catch(() => {});
  }, []);

  // After a student finishes a good private deck, ask once whether to share it publicly.
  const SHARE_PROMPT_MIN_CARDS = 10;
  const [sharePrompt, setSharePrompt] = useState(null);   // deck id or null
  const maybeAskToShare = (deck) => {
    try { if (localStorage.getItem("tp_share_prompt_off")) return; } catch { /* ignore */ }
    if (!user || !deck || deck.isPublic || deck.sharePromptAsked) return;
    const good = (deck.cards || []).filter(c => (c.term || "").trim() && (c.definition || "").trim()).length;
    if (good < SHARE_PROMPT_MIN_CARDS) return;
    updateDeck(deck.id, { sharePromptAsked: true });
    setSharePrompt(deck.id);
  };
  const answerSharePrompt = (share, dontAskAgain) => {
    if (share && sharePrompt != null) updateDeck(sharePrompt, { isPublic: true, publishError: null });
    if (dontAskAgain) { try { localStorage.setItem("tp_share_prompt_off", "1"); } catch { /* ignore */ } }
    setSharePrompt(null);
  };

  // Copy a public deck into the student's own decks (once) and start studying it.
  const savePublicDeck = (pub) => {
    const have = decks.find(d => d.sourcePublicId === pub.id);
    setIncoming(null);
    if (have) { startStudy(have); return have; }
    const created = saveDeck({ title: pub.title, subject: pub.subject, description: pub.description, color: pub.color, cards: pub.cards, author: pub.authorName, isPublic: false });
    const withSource = { ...created, sourcePublicId: pub.id };
    setDecks(prev => prev.map(d => d.id === created.id ? withSource : d));
    deckApi({ action: "save", id: pub.id });
    startStudy(withSource);
    return withSource;
  };

  const saveDraft = (draft) => {
    setDrafts(prev => {
      const filtered = prev.filter(d => d.id !== draft.id);
      return [{ ...draft, id: draft.id || `draft-${Date.now()}` }, ...filtered].slice(0, 20);
    });
  };

  const openDeck       = (deck) => { setActiveDeck(deck); fcNavigate("deck", deck); };
  const startStudy     = (deck) => { setActiveDeck(deck); fcNavigate("setup", deck); };
  const goHome         = ()     => { fcNavigate("home"); setActiveDeck(null); };
  const openCreate     = ()     => { setActiveDeck(null); setCreateTab("cards");      fcNavigate("create"); };
  const openQuickBuild = ()     => { setActiveDeck(null); setCreateTab("quickbuild"); fcNavigate("create"); };

  const filteredDecks = decks.filter(d => {
    const matchSubject = activeSubject === "All" || d.subject === activeSubject;
    const matchSearch  = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubject && matchSearch;
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#F7F6F2", minHeight: "100vh", color: "#1A1814" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #D8D5CE; border-radius: 3px; }
        @keyframes fcFadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fcFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes fcSlideIn { from { transform:translateX(-100%); } to { transform:translateX(0); } }
        .fc-fade-up { animation: fcFadeUp 0.5s ease both; }
        .fc-fade-in { animation: fcFadeIn 0.3s ease both; }
        .fc-deck-card { transition: all 0.22s; }
        .fc-deck-card:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.1) !important; }
        .fc-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .fc-nav-link { transition: color 0.18s; }
        .fc-nav-link:hover { color: #1A1814 !important; }
        @media (max-width: 768px) {
          .fc-nav-links { display: none !important; }
          .fc-nav-inner { padding: 0 16px !important; }
          .fc-main { padding: 24px 16px !important; }
          .fc-grid { grid-template-columns: 1fr !important; }
          .fc-study-grid { grid-template-columns: 1fr 1fr !important; }
          .fc-editor-split { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .fc-study-grid { grid-template-columns: 1fr !important; }
          .fc-nav-user-name { display: none !important; }
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #ECEAE4", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Hamburger + Back + Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 6, width: 36, height: 36, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.18s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.background = "#F7F6F2"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#ECEAE4"; e.currentTarget.style.background = "none"; }}>
              <div style={{ width: 14, height: 1.5, background: "#1A1814", borderRadius: 1 }} />
              <div style={{ width: 10, height: 1.5, background: "#8C8880", borderRadius: 1 }} />
              <div style={{ width: 14, height: 1.5, background: "#1A1814", borderRadius: 1 }} />
            </button>
            <button onClick={onBack} style={{ background:"none", border:"1px solid #D8D5CE", borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#8C8880", transition:"all 0.18s", whiteSpace:"nowrap", flexShrink:0 }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#1A1814";e.currentTarget.style.color="#1A1814";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#D8D5CE";e.currentTarget.style.color="#8C8880";}}>← Galaxy</button>
            <div style={{ width:1, height:20, background:"#ECEAE4", flexShrink:0 }} />
            <div onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 32, height: 32, background: "#F5C842", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#1A1814" }}>✦</div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#1A1814" }}><span style={{ color: "#C8900A" }}>Ace It</span> Flash Cards</span>
            </div>
          </div>

          {/* Nav links */}
          <div className="fc-nav-links" style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {[["Home", "home"], ["My Library", "library"], ["🌐 Public Library", "public"]].map(([label, v]) => (
              <span key={v} className="fc-nav-link" onClick={() => setView(v)} style={{ fontSize: 14, fontWeight: 500, color: view === v ? "#1A1814" : "#8C8880", cursor: "pointer", borderBottom: view === v ? "2px solid #1A1814" : "2px solid transparent", paddingBottom: 2, whiteSpace:"nowrap" }}>{label}</span>
            ))}
          </div>

          {/* Right — user only */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1814" }}>{user.name}</div>
                  
                </div>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #1A1814, #4F6EF7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 800, color: "#F7F6F2", cursor: "pointer" }}
                  onClick={() => setSidebarOpen(true)}>{user.avatar}</div>
              </div>
            ) : (
              <>
                <button onClick={() => openAuth("login")} style={{ background: "none", border: "1px solid #D8D5CE", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#5A5752", transition: "all 0.18s" }}>Log In</button>
                <button className="fc-btn" onClick={() => openAuth("signup")} style={{ background: "#1A1814", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#F7F6F2", transition: "all 0.18s" }}>Sign Up Free</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <FCSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} decks={decks} view={view} setView={(v) => { fcNavigate(v); setSidebarOpen(false); setActiveDeck(null); }} onBack={onBack} user={user} openAuth={openAuth} onLogout={onLogout} />

      {/* ── VIEWS ────────────────────────────────────────────────────────── */}
      {sharePrompt != null && <FCSharePrompt deck={decks.find(d => d.id === sharePrompt)} onAnswer={answerSharePrompt} />}
      {view === "home"    && <FCHomeView    user={user} decks={decks} onOpenDeck={openDeck} onStartStudy={startStudy} onGoLibrary={() => fcNavigate("library")} onNewDeck={openCreate} onQuickBuild={openQuickBuild} />}
      {view === "library" && <FCLibraryView allDecks={decks} onOpenDeck={openDeck} onStartStudy={startStudy} onNewDeck={openCreate} drafts={drafts} onDeleteDeck={deleteDeck} userFolders={userFolders} setUserFolders={setUserFolders} />}
      {view === "deck"    && activeDeck && <FCDeckView   deck={decks.find(d => d.id === activeDeck.id) || activeDeck} onBack={() => fcNavigate("library")} onStudy={() => startStudy(activeDeck)} onDelete={(id) => { deleteDeck(id); fcNavigate("library"); }} onTogglePublic={(id) => { const cur = decks.find(d => d.id === id); updateDeck(id, { isPublic: !(cur || activeDeck).isPublic, publishError: null }); }} onRate={(id, stars, userId) => { updateDeck(id, { ratings: [...(activeDeck.ratings||[]).filter(r=>r.userId!==userId), { userId, stars }] }); setActiveDeck(d => d ? { ...d, ratings: [...(d.ratings||[]).filter(r=>r.userId!==userId), { userId, stars }] } : d); }} onEdit={(deck) => { setActiveDeck(deck); setCreateTab("cards"); fcNavigate("edit"); }} onMoveFolder={(id, folderId) => { updateDeck(id, { folderKey: folderId || null }); setActiveDeck(d => d ? { ...d, folderKey: folderId || null } : d); }} onImprove={(id, newCards) => { updateDeck(id, { cards: newCards, cardCount: newCards.length }); setActiveDeck(d => d ? { ...d, cards: newCards, cardCount: newCards.length } : d); }} user={user} userFolders={userFolders} launchApp={launchApp} />}
      {view === "create"  && <FCCreateDeck onBack={() => fcNavigate("library")} onSave={(deckData) => { const newDeck = saveDeck({ ...deckData, author: user?.name || "Anonymous" }); if (onDeckCreated) onDeckCreated(newDeck); fcNavigate("library"); maybeAskToShare(newDeck); }} onSaveDraft={saveDraft} userFolders={userFolders} setUserFolders={setUserFolders} initialTab={createTab} />}
      {view === "edit"    && activeDeck && <FCCreateDeck onBack={() => fcNavigate("deck")} onSave={(deckData) => { updateDeck(deckData.id, { title:deckData.title, subject:deckData.subject, description:deckData.description, color:deckData.color, cards:deckData.cards, cardCount:deckData.cards.length, folderKey:deckData.folderKey, isPublic:deckData.isPublic }); setActiveDeck(d => d ? { ...d, ...deckData, cardCount:deckData.cards.length } : d); fcNavigate("deck"); const cur = decks.find(d => d.id === deckData.id); if (cur) maybeAskToShare({ ...cur, ...deckData }); }} onSaveDraft={saveDraft} userFolders={userFolders} setUserFolders={setUserFolders} initialTab="cards" initialDeck={activeDeck} />}
      {view === "public"  && <FCPublicLibrary user={user} openAuth={openAuth} onBack={() => fcNavigate("home")} onSave={savePublicDeck} incoming={incoming} clearIncoming={() => setIncoming(null)} />}
      {view === "setup"   && activeDeck && <FCStudySetup deck={activeDeck} onBack={() => fcNavigate("deck")} onStart={(cfg) => { setStudyConfig(cfg); fcNavigate("study"); }} />}
      {view === "study"   && activeDeck && studyConfig && <FCStudyView deck={activeDeck} config={studyConfig} onBack={() => fcNavigate("setup")} onBackToLibrary={() => fcNavigate("library")} onUpdateCards={(deckId, newCards) => { const mastered = newCards.filter(c=>(c.timesCorrect||0)>0&&(c.timesCorrect||0)/((c.timesCorrect||0)+(c.timesWrong||0))>=0.8).length;
const mastery = newCards.length > 0 ? Math.round(mastered/newCards.length*100) : 0; updateDeck(deckId, { cards: newCards, mastery }); if (activeDeck.id===deckId) setActiveDeck(d=>d?{...d,cards:newCards,mastery}:d); }} />}
    </div>
  );
}

// ── Home View ─────────────────────────────────────────────────────────────────
function FCHomeView({ decks, onOpenDeck, onStartStudy, onGoLibrary, onNewDeck, onQuickBuild, user }) {
  return (
    <div>
      {/* Hero */}
      <section style={{ background: "#1A1814", color: "#F7F6F2", padding: "80px 24px 72px" }}>
        <div style={{ maxWidth: 740, margin: "0 auto", textAlign: "center" }}>
          <div className="fc-fade-up" style={{ animationDelay: "0s", display: "inline-block", background: "rgba(247,246,242,0.1)", border: "1px solid rgba(247,246,242,0.15)", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "rgba(247,246,242,0.6)", marginBottom: 24 }}>
            Ace It Flash Cards
          </div>
          {typeof user !== "undefined" && user?.name && <div className="fc-fade-up" style={{ animationDelay:"0.04s", fontSize:14, color:"rgba(247,246,242,0.45)", marginBottom:8 }}>Welcome back, <span style={{ color:"#F7F6F2", fontWeight:600 }}>{user.name.split(" ")[0]}</span> 👋</div>}
          <h1 className="fc-fade-up" style={{ animationDelay: "0.08s", fontFamily: "'Playfair Display', serif", fontSize: "clamp(42px, 6vw, 68px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -1.5, marginBottom: 22, color: "#F7F6F2" }}>
            <span style={{ color: "#F5C842" }}>Ace It</span> Flash Cards
          </h1>
          <p className="fc-fade-up" style={{ animationDelay: "0.16s", fontSize: 17, fontWeight: 300, color: "rgba(247,246,242,0.55)", lineHeight: 1.7, marginBottom: 36, maxWidth: 520, margin: "0 auto 36px" }}>
            Build flash card decks, flip through terms, and track your mastery — built for students who are serious about passing.
          </p>
          <div className="fc-fade-up" style={{ animationDelay: "0.24s", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="fc-btn" onClick={onGoLibrary} style={{ background: "#F5C842", border: "none", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#1A1814", transition: "all 0.2s" }}>Browse My Decks</button>
            <button style={{ background: "transparent", border: "1px solid rgba(247,246,242,0.2)", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "rgba(247,246,242,0.7)" }} onClick={onNewDeck}>Create a Deck</button>
            <button style={{ background: "transparent", border: "1px solid #F5C84255", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#F5C842" }} onClick={onQuickBuild}>⚡ Quick Build</button>
          </div>
        </div>
      </section>



      {/* Due today CTA */}
      {(()=>{const now=Date.now();const decks=(()=>{try{return JSON.parse(localStorage.getItem("tp_fc_decks")||"[]");}catch{return[];}})();const due=decks.reduce((a,d)=>a+(d.cards||[]).filter(c=>!c.dueDate||new Date(c.dueDate).getTime()<=now).length,0);if(due===0)return null;return(
        <div style={{ background:"#F5C84215", borderBottom:"1px solid #F5C84230", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>⏰</span>
          <span style={{ fontSize:13, fontWeight:700, color:"#1A1814" }}>You have <span style={{ color:"#C8900A" }}>{due} card{due!==1?"s":""}</span> due for review today</span>
          <a href="#my-library" style={{ background:"#F5C842", border:"none", borderRadius:7, padding:"6px 16px", fontSize:12, fontWeight:700, cursor:"pointer", color:"#1A1814", textDecoration:"none" }}>Study Now →</a>
        </div>
      );})()}
      {/* Stats strip */}
      <div style={{ background: "#ECEAE4", borderBottom: "1px solid #D8D5CE" }}>
        {(()=>{
              const decks=(()=>{try{return JSON.parse(localStorage.getItem("tp_fc_decks")||"[]");}catch{return[];}})();
              const totalCards=decks.reduce((a,d)=>a+(d.cards?.length||0),0);
              const avgMastery=decks.length?Math.round(decks.reduce((a,x)=>a+(x.mastery||0),0)/decks.length):null;
              const streak=currentStreak();
              const items=[[decks.length.toString(),"Study Decks"],[totalCards.toString(),"Total Cards"]];
              if(avgMastery!==null&&avgMastery>0) items.push([avgMastery+"%","Avg Mastery"]);
              if(streak>0) items.push([streak.toString(),"Day Streak"]);
              return (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
          {items.map(([val, lbl], i) => (
            <div key={lbl} style={{ padding: "20px 0", textAlign: "center", borderRight: i < items.length - 1 ? "1px solid #D8D5CE" : "none" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#1A1814" }}>{val}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#8C8880", letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>{lbl}</div>
            </div>
          ))}
        </div>
              );
            })()}
      </div>

      {/* Recent Decks */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#8C8880", marginBottom: 8 }}>Continue Studying</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Your Recent Decks</h2>
          </div>
          <span onClick={onGoLibrary} style={{ fontSize: 13, fontWeight: 600, color: "#1A1814", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>View all →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {decks.map((deck, i) => <FCDeckCard key={deck.id} deck={deck} index={i} onOpen={onOpenDeck} onStudy={onStartStudy} />)}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "#fff", borderTop: "1px solid #ECEAE4", borderBottom: "1px solid #ECEAE4", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#8C8880", marginBottom: 8 }}>Simple by design</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>How it works</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48 }}>
            {[
              { num: "01", title: "Create a Deck",  desc: "Add terms and definitions. Organize by subject, topic, or exam section." },
              { num: "02", title: "Flip & Study",   desc: "Go through your cards one by one. Flip to reveal the answer and mark what you know." },
              { num: "03", title: "Track Mastery",  desc: "Watch your progress bar fill up as you master each card in the deck." },
            ].map(({ num, title, desc }) => (
              <div key={num}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: "#D8D5CE", letterSpacing: 2, marginBottom: 14 }}>{num}</div>
                <div style={{ width: 40, height: 40, background: "#1A1814", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <span style={{ color: "#F7F6F2", fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{num[1]}</span>
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6B6860", lineHeight: 1.65, fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 24px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: "#A8A59E" }}>© 2026 Ace It · Part of Ace It</span>
      </footer>
    </div>
  );
}

// ── Library — folder tree data ────────────────────────────────────────────────
// Structure: Year > Semester > Class > Chapter  (add more levels as needed)
const FC_TREE = [];

// Folder type display config — add or rename levels here
const FC_TYPE_META = {
  year:     { icon: "📅", label: "Year"     },
  semester: { icon: "📆", label: "Semester" },
  class:    { icon: "📚", label: "Class"    },
  chapter:  { icon: "📖", label: "Chapter"  },
  section:  { icon: "📄", label: "Section"  },
};

const FC_ORG_LEVELS = ["year", "semester", "class", "chapter", "section"];

// Tree helpers
function fcFindNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const f = fcFindNode(n.children, id); if (f) return f; }
  }
  return null;
}

function fcGetAllDeckIds(node) {
  let ids = node.deckIds ? [...node.deckIds] : [];
  if (node.children) for (const c of node.children) ids = ids.concat(fcGetAllDeckIds(c));
  return ids;
}

// ── Organize / New-Deck Wizard ────────────────────────────────────────────────
function FCOrganizeModal({ onClose, allDecks, tree }) {
  const [step, setStep]           = useState(0);
  const [choices, setChoices]     = useState({});  // { year: "y2025", ... }
  const [newNames, setNewNames]   = useState({});  // { year: "2026-2027", ... }
  const [creating, setCreating]   = useState({});  // { year: true }
  const [deckName, setDeckName]   = useState("");

  const isNameStep = step === FC_ORG_LEVELS.length;
  const currentLevel = FC_ORG_LEVELS[step];

  const getOptions = (s) => {
    if (s === 0) return tree;
    const parentId = choices[FC_ORG_LEVELS[s - 1]];
    if (!parentId) return [];
    return fcFindNode(tree, parentId)?.children || [];
  };
  const options = getOptions(step);

  const choose = (id) => { setChoices(c => ({ ...c, [currentLevel]: id })); setCreating(c => ({ ...c, [currentLevel]: false })); };
  const skip   = ()   => { const n = { ...choices }; delete n[currentLevel]; setChoices(n); setCreating(c => ({ ...c, [currentLevel]: false })); setStep(s => s + 1); };
  const next   = ()   => setStep(s => s + 1);
  const back   = ()   => setStep(s => Math.max(0, s - 1));

  const canContinue = !!choices[currentLevel] || (creating[currentLevel] && newNames[currentLevel]?.trim());

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(26,24,20,0.55)", backdropFilter: "blur(6px)" }} />
      <div className="fc-fade-in" onClick={e => e.stopPropagation()} style={{ position: "relative", background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "#1A1814", padding: "22px 28px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#F7F6F2" }}>
              {isNameStep ? "Name Your Deck" : "Organize Your Deck"}
            </span>
            <button onClick={onClose} style={{ background: "rgba(247,246,242,0.1)", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "#F7F6F2", fontSize: 13 }}>✕</button>
          </div>
          {/* Progress bar */}
          <div style={{ display: "flex", gap: 4 }}>
            {[...FC_ORG_LEVELS, "name"].map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "#F5C842" : "rgba(247,246,242,0.15)", transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(247,246,242,0.4)" }}>
              {isNameStep ? "Final step" : `Step ${step + 1} of ${FC_ORG_LEVELS.length + 1} — ${FC_TYPE_META[currentLevel]?.label}`}
            </span>
            {!isNameStep && <span onClick={skip} style={{ fontSize: 11, color: "#F5C842", cursor: "pointer", fontWeight: 600 }}>Skip →</span>}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px 28px" }}>
          {isNameStep ? (
            <div>
              <p style={{ fontSize: 13, color: "#6B6860", marginBottom: 16, lineHeight: 1.6 }}>Give your deck a name. You can always rename it later.</p>

              {/* Path summary */}
              <div style={{ background: "#F7F6F2", border: "1px solid #ECEAE4", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", marginBottom: 8 }}>Saved to</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {FC_ORG_LEVELS.map(lvl => {
                    const id = choices[lvl]; const nm = newNames[lvl];
                    if (!id && !nm) return null;
                    const node = id ? fcFindNode(tree, id) : null;
                    const m = FC_TYPE_META[lvl];
                    return (
                      <span key={lvl} style={{ fontSize: 11, fontWeight: 600, color: m.color || "#4F6EF7", background: `${m.color || "#4F6EF7"}15`, padding: "3px 10px", borderRadius: 20 }}>
                        {m.icon} {node ? node.label : nm}
                      </span>
                    );
                  })}
                  {!Object.values(choices).some(Boolean) && !Object.values(newNames).some(Boolean) && (
                    <span style={{ fontSize: 11, color: "#A8A59E" }}>Uncategorized</span>
                  )}
                </div>
              </div>

              <input autoFocus type="text" value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="e.g. Chapter 4 – Agency Law" style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #D8D5CE", borderRadius: 8, fontSize: 15, color: "#1A1814", outline: "none", fontFamily: "'DM Sans', sans-serif", background: "#F7F6F2" }}
                onKeyDown={e => e.key === "Enter" && deckName.trim() && onClose()} />
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "#6B6860", marginBottom: 16, lineHeight: 1.6 }}>
                {options.length > 0 ? `Choose an existing ${FC_TYPE_META[currentLevel]?.label.toLowerCase()} or create a new one.` : `No ${FC_TYPE_META[currentLevel]?.label.toLowerCase()}s yet — create one or skip.`}
              </p>

              {/* Option list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {options.map(opt => {
                  const selected = choices[currentLevel] === opt.id;
                  return (
                    <div key={opt.id} onClick={() => choose(opt.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${selected ? opt.color : "#ECEAE4"}`, background: selected ? `${opt.color}08` : "#F7F6F2", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = "#D8D5CE"; }}
                      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "#ECEAE4"; }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: "#1A1814", flex: 1 }}>{opt.label}</span>
                      {selected && <span style={{ fontSize: 13, color: opt.color }}>✓</span>}
                    </div>
                  );
                })}
              </div>

              {/* Create new */}
              {!creating[currentLevel] ? (
                <div onClick={() => { setCreating(c => ({ ...c, [currentLevel]: true })); setChoices(c => { const n = { ...c }; delete n[currentLevel]; return n; }); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 10, border: "1.5px dashed #D8D5CE", cursor: "pointer", color: "#8C8880", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.color = "#1A1814"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8D5CE"; e.currentTarget.style.color = "#8C8880"; }}>
                  <span>+</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Create new {FC_TYPE_META[currentLevel]?.label.toLowerCase()}…</span>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input autoFocus type="text" value={newNames[currentLevel] || ""} onChange={e => setNewNames(n => ({ ...n, [currentLevel]: e.target.value }))} placeholder={`Name your ${FC_TYPE_META[currentLevel]?.label.toLowerCase()}…`} style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #4F6EF7", borderRadius: 8, fontSize: 13, color: "#1A1814", outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
                  <button onClick={() => { setCreating(c => ({ ...c, [currentLevel]: false })); setNewNames(n => { const x = { ...n }; delete x[currentLevel]; return x; }); }} style={{ background: "#F7F6F2", border: "1px solid #D8D5CE", borderRadius: 8, padding: "0 12px", cursor: "pointer", fontSize: 12, color: "#8C8880" }}>✕</button>
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 24, gap: 10 }}>
            {step > 0 && <button onClick={back} style={{ background: "#F7F6F2", border: "1px solid #ECEAE4", borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer", color: "#5A5752" }}>← Back</button>}
            <div style={{ flex: 1 }} />
            {!isNameStep ? (
              <button onClick={next} disabled={!canContinue} style={{ background: "#1A1814", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: canContinue ? "pointer" : "default", color: "#F7F6F2", opacity: canContinue ? 1 : 0.4, transition: "opacity 0.2s" }}>Continue →</button>
            ) : (
              <button onClick={() => { if (deckName.trim()) onClose(); }} disabled={!deckName.trim()} style={{ background: "#1A1814", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: deckName.trim() ? "pointer" : "default", color: "#F7F6F2", opacity: deckName.trim() ? 1 : 0.4, transition: "opacity 0.2s" }}>Create Deck ✓</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Deck ───────────────────────────────────────────────────────────────
function FCCreateDeck({ onBack, onSave, onSaveDraft, userFolders = [], setUserFolders, initialTab = "cards", initialDeck = null }) {
  const [tab, setTab]           = useState(initialDeck ? "cards" : initialTab);
  const [title, setTitle]       = useState(initialDeck?.title || "");
  const [description, setDesc]  = useState(initialDeck?.description || "");
  const [subject, setSubject]   = useState(initialDeck?.subject || "");
  const [color, setColor]       = useState(initialDeck?.color || "#4F6EF7");
  const [isPublic, setIsPublic] = useState(initialDeck?.isPublic || false);
  const [tags, setTags]         = useState(initialDeck?.tags || []);
  const isEditing = !!initialDeck;
  // Quick Build
  const [qbText, setQbText]         = useState("");
  const [qbGenerating, setQbGenerating] = useState(false);
  const [qbGenerated, setQbGenerated]   = useState(false);
  const [qbSubMode, setQbSubMode]       = useState("ai");
  const [qbDocOpen, setQbDocOpen]       = useState(false);
  const [qbAiCards, setQbAiCards]       = useState([]);
  const [qbAiStep, setQbAiStep]         = useState("input"); // input | generating | review | organize
  const [qbError, setQbError]           = useState("");
  const [qbChunkProgress, setQbChunkProgress] = useState({ current: 0, total: 0, step: "" });
  const [qbDuplicates, setQbDuplicates] = useState(new Set()); // set of card ids that are duplicates
  const [qbOrgChoice, setQbOrgChoice]   = useState(null); // null | "one" | "organized"
  const [qbTopics, setQbTopics]         = useState([]); // [{topic, folderName, cards:[]}]
  const [qbSource, setQbSource]         = useState(""); // "Lecture Notes" | "Textbook" | etc.
  const [qbImages, setQbImages]         = useState([]); // [{base64, name, preview}]
  const qbFileInputRef = useRef(null);
  const qbImageInputRef = useRef(null);
  // Manual / post-AI highlight editor
  const [pendingTerm, setPendingTerm]   = useState("");
  const [pendingDef, setPendingDef]     = useState("");
  const [pendingCardNum, setPendingCardNum] = useState(1);
  const [qbPairs, setQbPairs]           = useState([]);        // manually built pairs
  const [selMode, setSelMode]           = useState(null);      // "term" | "def" | null
  const [toolbar, setToolbar]           = useState(null);      // {x,y,text} floating toolbar
  const docRef = useRef(null);
  const [cards, setCards]       = useState(
    initialDeck?.cards?.length
      ? initialDeck.cards.map((c,i) => ({ id: c.id || i+1, term: c.term||"", definition: c.definition||"" }))
      : [{ id:1, term:"", definition:"" }, { id:2, term:"", definition:"" }, { id:3, term:"", definition:"" }]
  );
  const [activeCard, setActiveCard] = useState(initialDeck?.cards?.[0]?.id || 1);
  // Organize — flexible: any level is optional, user can add custom options at any level
  const [orgPath, setOrgPath] = useState({ year: "", semester: "", class: "", chapter: "" });
  const [orgOptions, setOrgOptions] = useState({
    year:     [],
    semester: [],
    class:    [],
    chapter:  [],
  });
  const [addingTo, setAddingTo]   = useState(null);   // which level is showing new-input
  const [newOrgVal, setNewOrgVal] = useState("");
  // Custom free-form folders
  const [customFolders, setCustomFolders]   = useState([]);
  const [selectedCustom, setSelectedCustom] = useState("");
  const [addingCustom, setAddingCustom]     = useState(false);
  const [newCustomVal, setNewCustomVal]     = useState("");

  const commitNewOrgOpt = (level) => {
    const v = newOrgVal.trim();
    if (!v) { setAddingTo(null); return; }
    setOrgOptions(o => ({ ...o, [level]: [...o[level], v] }));
    setOrgPath(p => ({ ...p, [level]: v }));
    setAddingTo(null); setNewOrgVal("");
  };

  const commitNewCustom = () => {
    const v = newCustomVal.trim();
    if (!v) { setAddingCustom(false); return; }
    setCustomFolders(f => [...f, v]);
    setSelectedCustom(v);
    setAddingCustom(false); setNewCustomVal("");
  };

  const anyOrgSelected = Object.values(orgPath).some(Boolean) || selectedCustom;
  const nextId = Math.max(...cards.map(c => c.id)) + 1;

  const updateCard = (id, field, val) =>
    setCards(cs => cs.map(c => c.id === id ? { ...c, [field]: val } : c));

  const addCard = () => {
    const id = Date.now();
    setCards(cs => [...cs, { id, term: "", definition: "" }]);
    setActiveCard(id);
    setTimeout(() => document.getElementById(`term-${id}`)?.focus(), 60);
  };

  const removeCard = (id) => {
    if (cards.length <= 1) return;
    const idx = cards.findIndex(c => c.id === id);
    setCards(cs => cs.filter(c => c.id !== id));
    setActiveCard(cards[Math.max(0, idx - 1)]?.id ?? cards[0].id);
  };

  const filledCards = cards.filter(c => c.term.trim() || c.definition.trim()).length;
  const canSave = title.trim() && filledCards > 0;
  const [needsTitle, setNeedsTitle] = useState(false);

  const COLORS = ["#4F6EF7","#E85D3F","#2BAE7E","#9B59B6","#F5C842","#E67E22","#1ABC9C","#E91E8C"];
  const SUBJECTS = ["Science","History","Math","Biology","Chemistry","English","Technology","Art","Music","Other"];

  const handleQuickBuild = async () => {
    if (!qbText.trim() && qbImages.length === 0) return;
    setQbAiStep("generating"); setQbError("");
    setQbChunkProgress({ current: 0, total: 0, step: "Analyzing content…" });

    try {
      // ── Extract text from images via vision ────────────────────────
      let extractedFromImages = "";
      if (qbImages.length > 0) {
        setQbChunkProgress({ current: 0, total: qbImages.length, step: `Reading ${qbImages.length} image${qbImages.length>1?"s":""}…` });
        for (let i = 0; i < qbImages.length; i++) {
          setQbChunkProgress({ current: i+1, total: qbImages.length, step: `Reading image ${i+1} of ${qbImages.length}…` });
          const img = qbImages[i];
          const res = await aiFetch("/api/claude", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-6", max_tokens: 3000,
              messages: [{ role: "user", content: [
                { type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } },
                { type: "text", text: "Extract ALL content from this image. Preserve structure: use | to separate table columns, keep bullet points with their symbols, keep formulas in their original notation. Include every word, number, formula, heading, bullet, and definition. Output only the extracted content, no commentary." }
              ]}],
            }),
          });
          const data = await res.json();
          const text = data.content?.find(b => b.type === "text")?.text || "";
          extractedFromImages += `\n\n[Image ${i+1}: ${img.name}]\n${text}`;
        }
      }

      const fullText = [qbText.trim(), extractedFromImages.trim()].filter(Boolean).join("\n\n");
      if (!fullText.trim()) { setQbAiStep("input"); return; }

      // ── CHUNK ──────────────────────────────────────────────────────
      const words = fullText.trim().split(/\s+/);
      const CHUNK_SIZE = 2500;
      const chunks = [];
      for (let i = 0; i < words.length; i += CHUNK_SIZE) {
        chunks.push(words.slice(i, i + CHUNK_SIZE).join(" "));
      }
      const totalChunks = chunks.length;
      setQbChunkProgress({ current: 0, total: totalChunks, step: `Processing ${totalChunks} section${totalChunks > 1 ? "s" : ""}…` });

      // ── Topic categories ───────────────────────────────────────────
      let topicCategories = ["General"];
      if (totalChunks >= 1) {
        setQbChunkProgress(p => ({ ...p, step: "Identifying topics and categories…" }));
        const summaryChunk = words.slice(0, 1500).join(" ");
        const catRes = await aiFetch("/api/claude", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 400,
            messages: [{ role: "user", content: `Identify 3-8 main topic categories for organizing flashcards from this material. Respond ONLY with JSON: {"topics":["Topic 1","Topic 2"]}\n\nMaterial:\n${summaryChunk}` }] }),
        });
        const catData = await catRes.json();
        const catText = catData.content?.find(b => b.type === "text")?.text || "";
        try { topicCategories = JSON.parse(catText.replace(/```json|```/g,"").trim()).topics || ["General"]; } catch {}
      }

      // ── Process each chunk ─────────────────────────────────────────
      const allCards = [];
      let lastAiError = "";
      for (let ci = 0; ci < chunks.length; ci++) {
        setQbChunkProgress({ current: ci + 1, total: totalChunks, step: `Reading section ${ci + 1} of ${totalChunks}…` });
        const res = await aiFetch("/api/claude", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000,
            messages: [{ role: "user", content: `You are an expert flashcard creator for a ${qbSource || "study"} source. Extract EVERY testable piece of information as flashcards.

RULES:
- Create a card for EVERY definition, term, concept, fact, process, date, name, formula, rule, or principle
- Do NOT skip anything testable
- Do NOT create cards for structural text ("This chapter covers...", "See figure...")
- Assign each card to one of these topics: ${topicCategories.join(", ")}
- NO maximum card limit — create as many as the content requires
- Respond ONLY with valid JSON, no markdown

Format: {"cards":[{"term":"...","definition":"...","topic":"category name"},...]}

Material (Section ${ci + 1}/${totalChunks}):
${chunks[ci]}` }] }),
        });
        const data = await res.json();
        if (!res.ok) { lastAiError = data?.error?.message || "The AI request failed."; continue; }
        const raw = data.content?.find(b => b.type === "text")?.text || "";
        const clean = raw.replace(/```json|```/g, "").trim();
        try {
          const parsedRaw = JSON.parse(clean);
          const parsed = Array.isArray(parsedRaw) ? { cards: parsedRaw } : parsedRaw; // accept a bare list of cards too
          const chunkCards = (parsed.cards || []).filter(c => c && (c.term || c.definition)).map((c, i) => ({
            id: Date.now() + ci * 100000 + i * 7 + Math.floor(Math.random() * 100),
            term: c.term || "", definition: c.definition || "",
            topic: c.topic || topicCategories[0] || "General",
            isDuplicate: false,
          }));
          allCards.push(...chunkCards);
        } catch {}
      }

      // Nothing usable came back: go back to the text (kept as is) and say why, instead of a blank page
      if (allCards.length === 0) {
        setQbError(lastAiError || "The AI couldn't find anything to turn into flash cards. Try adding more text, or try again in a moment.");
        setQbAiStep("input");
        return;
      }

      // ── Duplicate detection ────────────────────────────────────────
      setQbChunkProgress(p => ({ ...p, step: "Detecting duplicate concepts…" }));
      const duplicateIds = new Set();
      const termsSeen = new Map();
      for (const card of allCards) {
        const normalized = card.term.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
        if (termsSeen.has(normalized)) { duplicateIds.add(card.id); duplicateIds.add(termsSeen.get(normalized)); }
        else termsSeen.set(normalized, card.id);
        // Only flag near-exact normalized matches to avoid false positives
        if (normalized.length > 15) {
          const exactKey = normalized.replace(/\s+/g, " ").trim();
          if (termsSeen.has(exactKey) && exactKey === normalized) duplicateIds.add(card.id);
        }
      }

      // ── Organize by topic ──────────────────────────────────────────
      const topicData = {};
      for (const card of allCards) {
        const t = card.topic || "General";
        if (!topicData[t]) topicData[t] = [];
        topicData[t].push(card);
      }
      const topicsList = Object.entries(topicData).map(([topic, cards]) => ({ topic, folderName: topic, cards }));

      setQbAiCards(allCards);
      setQbDuplicates(duplicateIds);
      setQbTopics(topicsList);
      setQbAiStep("review");
      if (!title.trim()) {
        const firstLine = fullText.split("\n").find(l => l.trim().length > 5)?.trim().slice(0, 50) || "Quick Build Deck";
        setTitle(qbSource ? `${firstLine} — ${qbSource}` : firstLine);
      }
    } catch (err) {
      console.error(err);
      const sentences = qbText.split(/[.!\n]+/).map(s => s.trim()).filter(s => s.length > 20).slice(0, 20);
      const generated = sentences.map((s, i) => ({ id: Date.now() + i, term: s.split(" ").slice(0, 6).join(" "), definition: s, topic: "General", isDuplicate: false }));
      if (generated.length === 0) {
        setQbError("Something went wrong while making your cards. Please try again.");
        setQbAiStep("input");
        return;
      }
      setQbAiCards(generated);
      setQbDuplicates(new Set());
      setQbAiStep("review");
      if (!title.trim()) setTitle("Quick Build Deck");
    }
  };

  const confirmAiCards = (keepCards, orgChoice) => {
    if (keepCards) {
      const finalCards = qbAiCards.map((c, i) => ({ ...c, id: Date.now() + i }));
      setCards(finalCards);
      setActiveCard(finalCards[0]?.id || Date.now());

      // If organized, create subfolders per topic
      if (orgChoice === "organized" && qbTopics.length > 0 && setUserFolders) {
        const deckFolderName = title.trim() || "Quick Build Deck";
        const deckFolder = { id: `qb-${Date.now()}`, name: deckFolderName, parentId: null };
        const subFolders = qbTopics.map((t, i) => ({
          id: `qb-sub-${Date.now()}-${i}`,
          name: t.folderName,
          parentId: deckFolder.id,
        }));
        setUserFolders(prev => [...prev, deckFolder, ...subFolders]);
      }
    }
    setQbAiStep("input"); setQbAiCards([]); setQbDuplicates(new Set()); setQbTopics([]);
    setQbChunkProgress({ current: 0, total: 0, step: "" }); setQbOrgChoice(null);
    setQbGenerated(true);
    setTimeout(() => { setTab("cards"); setQbGenerated(false); }, 800);
  };

  const confirmAiAndOpenDoc = () => {
    setCards(qbAiCards.map((c, i) => ({ ...c, id: Date.now() + i })));
    setActiveCard(qbAiCards[0]?.id || Date.now());
    setQbAiStep("input");
    setQbAiCards([]);
    setQbDocOpen(true);
    setPendingCardNum(qbAiCards.length + 1);
  };

  const handleDocMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { setToolbar(null); return; }
    const text = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect  = range.getBoundingClientRect();
    const docRect = docRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    setToolbar({ x: rect.left - docRect.left + rect.width / 2, y: rect.top - docRect.top - 8, text });
  };

  const applySelection = (type) => {
    if (!toolbar?.text) return;
    if (type === "term") {
      setPendingTerm(toolbar.text);
      setSelMode("term_set");
    } else {
      setPendingDef(toolbar.text);
      setSelMode("def_set");
    }
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  // Auto-card: AI reads highlighted text and generates both term + definition
  const [autoCardLoading, setAutoCardLoading] = useState(false);
  const handleAutoCard = async () => {
    if (!toolbar?.text) return;
    const text = toolbar.text;
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
    setAutoCardLoading(true);
    try {
      const res = await aiFetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `You are a flashcard expert. Convert this text into ONE high-quality flashcard.

Rules:
- The TERM should be a clear question, fill-in-the-blank, or concept label — NOT just a copied phrase
- For fill-in-the-blank: replace the key answer with "___" (e.g. "It takes ___ to form an agency relationship")
- The DEFINITION should be the precise answer or explanation
- Keep both concise
- Respond ONLY with JSON, no explanation: {"term":"...","definition":"..."}

Text: "${text}"`,
          }],
        }),
      });
      const data = await res.json();
      const raw  = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setPendingTermPrev(pendingTerm);
      setPendingDefPrev(pendingDef);
      setPendingTerm(parsed.term || text);
      setPendingDef(parsed.definition || "");
      setSelMode("auto");
    } catch {
      // Fallback: just set the text as term
      setPendingTerm(text);
    }
    setAutoCardLoading(false);
  };

  // Improve term/definition
  const [improvingTerm, setImprovingTerm]   = useState(false);
  const [improvingDef,  setImprovingDef]    = useState(false);
  const [pendingTermPrev, setPendingTermPrev] = useState(""); // undo buffer
  const [pendingDefPrev,  setPendingDefPrev]  = useState("");

  const handleImproveTerm = async () => {
    if (!pendingTerm.trim()) return;
    setImprovingTerm(true);
    setPendingTermPrev(pendingTerm);
    try {
      const res = await aiFetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 150,
          messages: [{
            role: "user",
            content: `Improve this flashcard TERM to make it a clearer, more testable question or fill-in-the-blank. The definition is: "${pendingDef}".

Current term: "${pendingTerm}"

Rules:
- Use fill-in-the-blank with ___ if appropriate
- Keep it concise and specific
- Make it clearly testable
- Respond with ONLY the improved term text, nothing else`,
          }],
        }),
      });
      const data = await res.json();
      const improved = data.content?.find(b => b.type === "text")?.text?.trim() || pendingTerm;
      setPendingTerm(improved.replace(/^["']|["']$/g, ""));
    } catch { /* keep original */ }
    setImprovingTerm(false);
  };

  const handleImproveDef = async () => {
    if (!pendingDef.trim()) return;
    setImprovingDef(true);
    setPendingDefPrev(pendingDef);
    try {
      const res = await aiFetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 200,
          messages: [{
            role: "user",
            content: `Improve this flashcard DEFINITION to make it clearer, more accurate, and more complete. The term is: "${pendingTerm}".

Current definition: "${pendingDef}"

Rules:
- Be precise and complete but concise
- Use plain language
- Avoid restating the term
- Respond with ONLY the improved definition text, nothing else`,
          }],
        }),
      });
      const data = await res.json();
      const improved = data.content?.find(b => b.type === "text")?.text?.trim() || pendingDef;
      setPendingDef(improved.replace(/^["']|["']$/g, ""));
    } catch { /* keep original */ }
    setImprovingDef(false);
  };

  const commitPair = () => {
    if (!pendingTerm.trim() || !pendingDef.trim()) return;
    const newCard = { id: Date.now(), term: pendingTerm.trim(), definition: pendingDef.trim() };
    setCards(cs => {
      const filtered = cs.filter(c => c.term.trim() || c.definition.trim());
      return [...filtered, newCard];
    });
    setQbPairs(p => [...p, { ...newCard, cardNum: pendingCardNum }]);
    setPendingCardNum(n => n + 1);
    setPendingTerm("");
    setPendingDef("");
    setPendingTermPrev("");
    setPendingDefPrev("");
    setSelMode(null);
    setActiveCard(newCard.id);
  };

  const tabStyle = (t) => ({
    padding: "9px 20px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600,
    cursor: "pointer", transition: "all 0.18s",
    background: tab === t ? "#1A1814" : "transparent",
    color: tab === t ? "#F7F6F2" : "#8C8880",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F7F6F2" }}>
      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ECEAE4", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => {
                const hasContent = title.trim() || filledCards > 0;
                if (hasContent && onSaveDraft) {
                  onSaveDraft({ title: title || "Untitled Draft", cards, color, subject, description, savedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
                }
                onBack();
              }} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#8C8880", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#1A1814"} onMouseLeave={e => e.currentTarget.style.borderColor = "#ECEAE4"}>
              ← Back
            </button>
            <div style={{ width: 1, height: 20, background: "#ECEAE4" }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#1A1814", margin: 0 }}>New Deck</h2>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "#F7F6F2", borderRadius: 9, padding: 3, gap: 2 }}>
            {[["quickbuild","⚡ Quick Build"], ["cards","📇 Cards"], ["details","✏️ Details"], ["organize","📁 Organize"]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{label}</button>
            ))}
          </div>

          {/* Save */}
          <button onClick={() => {
            // Cards filled but no deck name yet: take the student to the name field instead of doing nothing
            if (filledCards > 0 && !title.trim()) { setTab("details"); setNeedsTitle(true); return; }
            if (!canSave) return;
            const folderKey = selectedCustom
              ? selectedCustom
              : Object.values(orgPath).filter(Boolean).join(" › ") || (initialDeck?.folderKey || null);
            onSave({ id: initialDeck?.id, title, subject, description, color, cards, folderKey, isPublic, tags });
          }} disabled={filledCards === 0} title={filledCards > 0 && !title.trim() ? "Give your deck a name first" : ""} style={{ background: filledCards > 0 ? "#1A1814" : "#ECEAE4", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: filledCards > 0 ? "pointer" : "default", color: filledCards > 0 ? "#F7F6F2" : "#A8A59E", transition: "all 0.2s" }}
            onMouseEnter={e => { if (canSave) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            {isEditing ? `Save Changes (${filledCards} card${filledCards!==1?"s":""})` : `Save Deck ${filledCards > 0 ? `(${filledCards} card${filledCards !== 1 ? "s" : ""})` : ""}`}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>

        {/* ══ QUICK BUILD TAB ══ */}
        {tab === "quickbuild" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <style>{`
              @keyframes qbSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
              @keyframes qbFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
              .qb-fade{animation:qbFade 0.3s ease both}
              .qb-doc-text::selection{background:#F5C84255}
              .qb-doc-text *::selection{background:#F5C84255}
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FFF8E8", border: "1px solid #F5C84244", borderRadius: 20, padding: "4px 14px", marginBottom: 14 }}>
                <span style={{ fontSize: 11 }}>⚡</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#D4A830", textTransform: "uppercase" }}>Quick Build Mode</span>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>Paste Text → Instant Cards</h3>
              <p style={{ fontSize: 14, color: "#8C8880", lineHeight: 1.6 }}>Paste any study material and choose how to build your deck.</p>
            </div>

            {/* MODE SELECTOR */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {[
                { id:"ai",     icon:"🤖", title:"Let AI Build",  desc:"Paste your text and AI instantly extracts key concepts and creates accurate flashcards for you." },
                { id:"manual", icon:"✏️", title:"I'll Choose",  desc:"Paste your text, then highlight exactly which parts become terms and which become definitions." },
              ].map(m => (
                <div key={m.id} onClick={() => { setQbSubMode(m.id); setQbAiStep("input"); setQbDocOpen(false); }}
                  style={{ border: `2px solid ${qbSubMode===m.id ? "#1A1814" : "#ECEAE4"}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", background: qbSubMode===m.id ? "#1A1814" : "#fff", transition: "all 0.18s" }}
                  onMouseEnter={e => { if (qbSubMode!==m.id) e.currentTarget.style.borderColor="#A8A59E"; }}
                  onMouseLeave={e => { if (qbSubMode!==m.id) e.currentTarget.style.borderColor="#ECEAE4"; }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>{m.icon}</span>
                    <span style={{ fontSize:14, fontWeight:700, color: qbSubMode===m.id?"#F7F6F2":"#1A1814" }}>{m.title}</span>
                    {qbSubMode===m.id && <span style={{ marginLeft:"auto", fontSize:12, color:"#F5C842", fontWeight:800 }}>✓</span>}
                  </div>
                  <div style={{ fontSize:12, color: qbSubMode===m.id?"rgba(247,246,242,0.55)":"#8C8880", lineHeight:1.55 }}>{m.desc}</div>
                </div>
              ))}
            </div>

            {/* ── AI MODE ── */}
            {qbSubMode === "ai" && (
              <div className="qb-fade">
                {qbAiStep === "input" && (
                  <>
                    {qbError && <div role="alert" style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#B42318", fontWeight:500 }}>{qbError}</div>}
                    <div style={{ background:"#fff", border:"1.5px solid #ECEAE4", borderRadius:14, overflow:"hidden", marginBottom:12 }}>
                      <div style={{ padding:"12px 16px", borderBottom:"1px solid #F0EDE8", display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:"#A8A59E", textTransform:"uppercase" }}>Your Study Material</span>
                        {qbText.length > 0 && <span style={{ marginLeft:"auto", fontSize:11, color:"#8C8880" }}>{qbText.split(/\s+/).filter(Boolean).length} words</span>}
                      </div>
                      <textarea value={qbText} onChange={e => setQbText(e.target.value)}
                        placeholder={"Paste your lecture notes, textbook chapter, study guide, or any text here…\n\nAI will read and understand the full context — just like asking Claude to make flashcards for you."}
                        style={{ width:"100%", minHeight:180, padding:"16px", fontSize:14, color:"#3A3830", fontFamily:"'DM Sans',sans-serif", border:"none", outline:"none", resize:"vertical", lineHeight:1.7, background:"transparent", boxSizing:"border-box" }} />
                    </div>

                    {/* Image upload area */}
                    <input ref={qbImageInputRef} type="file" accept="image/*" multiple style={{ display:"none" }}
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const dataUrl = ev.target.result;
                            const base64 = dataUrl.split(",")[1];
                            const mediaType = file.type || "image/jpeg";
                            const preview = dataUrl;
                            setQbImages(prev => [...prev, { base64, mediaType, preview, name: file.name, id: Date.now() + Math.random() }]);
                          };
                          reader.readAsDataURL(file);
                        });
                        e.target.value = "";
                      }} />

                    {/* Image drop zone / thumbnails */}
                    <div style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:"#A8A59E", textTransform:"uppercase" }}>Photos & Screenshots</span>
                        <span style={{ fontSize:11, color:"#C8C5BE" }}>(optional)</span>
                      </div>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-start" }}>
                        {/* Thumbnails */}
                        {qbImages.map(img => (
                          <div key={img.id} style={{ position:"relative", width:80, height:80, borderRadius:8, overflow:"hidden", border:"1.5px solid #ECEAE4", flexShrink:0 }}>
                            <img src={img.preview} alt={img.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                            <button onClick={() => setQbImages(prev => prev.filter(x => x.id !== img.id))}
                              style={{ position:"absolute", top:3, right:3, width:18, height:18, borderRadius:"50%", background:"rgba(0,0,0,0.65)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", lineHeight:1 }}>✕</button>
                          </div>
                        ))}
                        {/* Add button */}
                        <div onClick={() => qbImageInputRef.current?.click()}
                          style={{ width:80, height:80, borderRadius:8, border:"2px dashed #D8D5CE", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", gap:4, transition:"all 0.15s", flexShrink:0 }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor="#F5C842";e.currentTarget.style.background="#FFF8E8";}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor="#D8D5CE";e.currentTarget.style.background="transparent";}}>
                          <span style={{ fontSize:22 }}>📷</span>
                          <span style={{ fontSize:9, fontWeight:700, color:"#A8A59E", textAlign:"center", lineHeight:1.3 }}>Add Photo</span>
                        </div>
                      </div>
                      {qbImages.length > 0 && (
                        <div style={{ fontSize:11, color:"#8C8880", marginTop:6 }}>
                          {qbImages.length} image{qbImages.length>1?"s":""} · AI will extract all text automatically
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:"#8C8880", alignSelf:"center" }}>Source:</span>
                      {["Lecture Notes","Textbook","Study Guide","My Notes","Article"].map(t => (
                        <button key={t} onClick={()=>setQbSource(s=>s===t?"":t)}
                          style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${qbSource===t?"#1A1814":"#ECEAE4"}`, background:qbSource===t?"#1A1814":"#fff", fontSize:11, color:qbSource===t?"#F7F6F2":"#5A5752", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s", fontWeight:qbSource===t?700:400 }}
                          onMouseEnter={e=>{if(qbSource!==t){e.currentTarget.style.borderColor="#1A1814";e.currentTarget.style.color="#1A1814";}}}
                          onMouseLeave={e=>{if(qbSource!==t){e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#5A5752";}}}>
                          {qbSource===t?"✓ ":""}{t}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleQuickBuild} disabled={qbText.trim().length < 20 && qbImages.length === 0}
                      style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:(qbText.trim().length>=20||qbImages.length>0)?"#F5C842":"#ECEAE4", color:(qbText.trim().length>=20||qbImages.length>0)?"#1A1814":"#A8A59E", fontSize:15, fontWeight:800, fontFamily:"'Montserrat',sans-serif", cursor:(qbText.trim().length>=20||qbImages.length>0)?"pointer":"default", transition:"all 0.2s" }}>
                      🤖 Generate Flashcards with AI {qbImages.length > 0 && `(${qbImages.length} image${qbImages.length>1?"s":""})`}
                    </button>
                  </>
                )}

                {qbAiStep === "generating" && (
                  <div className="qb-fade" style={{ background:"#fff", border:"1.5px solid #F5C84244", borderRadius:16, padding:"40px 28px", textAlign:"center" }}>
                    <div style={{ width:48, height:48, borderRadius:"50%", border:"3px solid #F0EDE8", borderTopColor:"#F5C842", animation:"qbSpin 0.8s linear infinite", margin:"0 auto 18px" }} />
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:800, color:"#1A1814", marginBottom:8 }}>
                      {qbChunkProgress.step || "Reading your material…"}
                    </div>
                    {qbChunkProgress.total > 1 && (
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:13, color:"#8C8880", marginBottom:10 }}>
                          Section {qbChunkProgress.current} of {qbChunkProgress.total}
                        </div>
                        <div style={{ height:6, background:"#F0EDE8", borderRadius:3, overflow:"hidden", maxWidth:280, margin:"0 auto" }}>
                          <div style={{ height:"100%", width:`${qbChunkProgress.total > 0 ? (qbChunkProgress.current/qbChunkProgress.total)*100 : 0}%`, background:"#F5C842", borderRadius:3, transition:"width 0.4s ease" }} />
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize:13, color:"#8C8880", marginBottom:16 }}>AI is reading every section and extracting all testable content</div>
                    <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
                      {["Reading all content","Extracting every concept","Building complete deck","Detecting duplicates"].map((s,i) => (
                        <div key={i} style={{ fontSize:11, color:"#F5C842", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", background:"#F5C842", display:"inline-block" }} />{s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qbAiStep === "review" && qbAiCards.length > 0 && (
                  <div className="qb-fade">
                    {/* Summary banner */}
                    <div style={{ background:"#F0FDF4", border:"1.5px solid #2BAE7E44", borderRadius:14, padding:"16px 20px", marginBottom:16, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                      <div style={{ fontSize:28 }}>✅</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:800, color:"#1A1814" }}>
                          {qbAiCards.length} cards generated
                        </div>
                        <div style={{ fontSize:12, color:"#6B6860", marginTop:3 }}>
                          {qbTopics.length > 1 ? `Across ${qbTopics.length} topics` : ""}
                          {qbDuplicates.size > 0 ? ` · ${Math.floor(qbDuplicates.size/2)} possible duplicate concept${Math.floor(qbDuplicates.size/2)>1?"s":""} flagged` : ""}
                        </div>
                      </div>
                      {qbDuplicates.size > 0 && (
                        <div style={{ display:"flex", alignItems:"center", gap:6, background:"#FFF8E8", border:"1px solid #F5C84244", borderRadius:8, padding:"6px 12px" }}>
                          <span style={{ fontSize:14 }}>⚠️</span>
                          <span style={{ fontSize:11, fontWeight:700, color:"#D4A830" }}>Duplicates highlighted</span>
                        </div>
                      )}
                    </div>

                    {/* Organization choice — only show if multiple topics */}
                    {qbTopics.length > 1 && !qbOrgChoice && (
                      <div style={{ background:"#fff", border:"1.5px solid #ECEAE4", borderRadius:14, padding:"18px 20px", marginBottom:16 }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:800, color:"#1A1814", marginBottom:6 }}>How would you like to organize this deck?</div>
                        <div style={{ fontSize:12, color:"#8C8880", marginBottom:14 }}>AI found {qbTopics.length} topics in your material and can organize them into subfolders automatically.</div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          <div onClick={()=>setQbOrgChoice("one")}
                            style={{ padding:"14px 16px", borderRadius:12, border:"2px solid #ECEAE4", cursor:"pointer", transition:"all 0.18s", background:"#fff" }}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor="#1A1814";}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";}}>
                            <div style={{ fontSize:22, marginBottom:8 }}>📦</div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#1A1814", marginBottom:3 }}>One big deck</div>
                            <div style={{ fontSize:11, color:"#8C8880" }}>All {qbAiCards.length} cards in a single deck</div>
                          </div>
                          <div onClick={()=>setQbOrgChoice("organized")}
                            style={{ padding:"14px 16px", borderRadius:12, border:"2px solid #ECEAE4", cursor:"pointer", transition:"all 0.18s", background:"#fff" }}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor="#1A1814";}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";}}>
                            <div style={{ fontSize:22, marginBottom:8 }}>📂</div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#1A1814", marginBottom:3 }}>Organized by topic</div>
                            <div style={{ fontSize:11, color:"#8C8880" }}>{qbTopics.length} subfolders created automatically</div>
                          </div>
                        </div>
                        {qbOrgChoice === "organized" && (
                          <div style={{ marginTop:12, padding:"10px 14px", background:"#F7F6F2", borderRadius:8 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:"#5A5752", marginBottom:6 }}>Folders that will be created:</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                              {qbTopics.map(t => (
                                <span key={t.topic} style={{ fontSize:11, color:"#1A1814", background:"#fff", border:"1px solid #ECEAE4", borderRadius:20, padding:"3px 10px", fontWeight:600 }}>
                                  📁 {t.folderName} ({t.cards.length})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Topic breakdown if organized */}
                    {qbOrgChoice === "organized" && qbTopics.length > 1 && (
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#A8A59E", marginBottom:10 }}>Topic Folders</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                          {qbTopics.map(t => (
                            <div key={t.topic} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:"#F7F6F2", border:"1px solid #ECEAE4", borderRadius:20 }}>
                              <span style={{ fontSize:12 }}>📁</span>
                              <span style={{ fontSize:12, fontWeight:700, color:"#1A1814" }}>{t.folderName}</span>
                              <span style={{ fontSize:11, color:"#8C8880" }}>({t.cards.length})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cards list */}
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#A8A59E", marginBottom:10 }}>
                      Review Cards {qbDuplicates.size > 0 && <span style={{ color:"#D4A830", marginLeft:8 }}>⚠️ Yellow = possible duplicate</span>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18, maxHeight:480, overflowY:"auto" }}>
                      {qbAiCards.map((c, i) => {
                        const isDup = qbDuplicates.has(c.id);
                        return (
                          <div key={c.id} style={{ background: isDup ? "#FFFBEB" : "#fff", border:`1.5px solid ${isDup ? "#F5C84288" : "#ECEAE4"}`, borderRadius:12, padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start", position:"relative" }}>
                            {/* Duplicate badge */}
                            {isDup && (
                              <div style={{ position:"absolute", top:-8, right:32, display:"flex", gap:-4 }}>
                                <div style={{ width:14, height:18, borderRadius:3, background:"#F5C842", border:"2px solid #fff", transform:"translateX(3px)" }} />
                                <div style={{ width:14, height:18, borderRadius:3, background:"#E8A82A", border:"2px solid #fff" }} />
                              </div>
                            )}
                            <div style={{ width:22, height:22, borderRadius:5, background: isDup ? "#F5C842" : "#1A1814", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                              <span style={{ fontSize:9, fontWeight:800, color: isDup ? "#1A1814" : "#F7F6F2" }}>{i+1}</span>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              {c.topic && c.topic !== "General" && (
                                <div style={{ fontSize:10, fontWeight:700, color:"#8C8880", letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>{c.topic}</div>
                              )}
                              <div style={{ fontSize:13, fontWeight:700, color:"#1A1814", marginBottom:3 }}>{c.term}</div>
                              <div style={{ fontSize:12, color:"#6B6860", lineHeight:1.55 }}>{c.definition}</div>
                              {isDup && <div style={{ fontSize:10, color:"#D4A830", fontWeight:600, marginTop:4 }}>⚠️ Similar concept may already exist in deck</div>}
                            </div>
                            <button onClick={() => { setQbAiCards(cs => cs.filter(x => x.id !== c.id)); setQbDuplicates(ds => { const n = new Set(ds); n.delete(c.id); return n; }); }}
                              style={{ background:"none", border:"1px solid #ECEAE4", borderRadius:6, width:24, height:24, cursor:"pointer", fontSize:10, color:"#A8A59E", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}
                              onMouseEnter={e=>{e.currentTarget.style.borderColor="#E85D3F";e.currentTarget.style.color="#E85D3F";}}
                              onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#A8A59E";}}>✕</button>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                      <button onClick={() => confirmAiCards(true, qbOrgChoice || "one")}
                        style={{ padding:"13px", borderRadius:10, border:"none", background:"#1A1814", color:"#F7F6F2", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}
                        onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                        ✓ Use All {qbAiCards.length} Cards →
                      </button>
                      <button onClick={confirmAiAndOpenDoc}
                        style={{ padding:"13px", borderRadius:10, border:"2px solid #1A1814", background:"transparent", color:"#1A1814", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", transition:"all 0.2s" }}
                        onMouseEnter={e=>{e.currentTarget.style.background="#1A1814";e.currentTarget.style.color="#F7F6F2";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#1A1814";}}>
                        ✏️ Keep + Add More
                      </button>
                    </div>
                    <button onClick={() => { setQbAiStep("input"); setQbAiCards([]); setQbDuplicates(new Set()); setQbTopics([]); setQbOrgChoice(null); setQbSource(""); }}
                      style={{ width:"100%", padding:"10px", borderRadius:10, border:"1px solid #ECEAE4", background:"transparent", color:"#8C8880", fontSize:12, cursor:"pointer" }}>
                      ← Start Over
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── MANUAL MODE: Text Input ── */}
            {qbSubMode === "manual" && !qbDocOpen && (
              <div className="qb-fade">
                <div style={{ background:"#fff", border:"1.5px solid #ECEAE4", borderRadius:14, overflow:"hidden", marginBottom:14 }}>
                  <div style={{ padding:"12px 16px", borderBottom:"1px solid #F0EDE8", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:"#A8A59E", textTransform:"uppercase" }}>Your Study Material</span>
                    {qbText.length > 0 && <span style={{ marginLeft:"auto", fontSize:11, color:"#8C8880" }}>{qbText.split(/\s+/).filter(Boolean).length} words</span>}
                  </div>
                  <textarea value={qbText} onChange={e => setQbText(e.target.value)}
                    placeholder={"Paste your study material here, then click Open Editor to start highlighting…"}
                    style={{ width:"100%", minHeight:220, padding:"16px", fontSize:14, color:"#3A3830", fontFamily:"'DM Sans',sans-serif", border:"none", outline:"none", resize:"vertical", lineHeight:1.7, background:"transparent", boxSizing:"border-box" }} />
                </div>
                <div style={{ background:"#F7F6F2", borderRadius:12, padding:"14px 16px", marginBottom:18, display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ fontSize:18 }}>💡</span>
                  <div style={{ fontSize:12, color:"#5A5752", lineHeight:1.6 }}>
                    Once you open the editor, <strong>highlight any text</strong> → a toolbar appears →
                    click <strong style={{color:"#4F6EF7"}}>Set as Term</strong> or <strong style={{color:"#2BAE7E"}}>Set as Definition</strong> →
                    pair them up to create a card. Simple and fast.
                  </div>
                </div>
                <button onClick={() => { if (qbText.trim().length >= 20) { setQbDocOpen(true); setPendingCardNum(1); } }}
                  disabled={qbText.trim().length < 20}
                  style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:qbText.trim().length>=20?"#1A1814":"#ECEAE4", color:qbText.trim().length>=20?"#F7F6F2":"#A8A59E", fontSize:15, fontWeight:800, fontFamily:"'Montserrat',sans-serif", cursor:qbText.trim().length>=20?"pointer":"default", transition:"all 0.2s" }}>
                  ✏️ Open Editor →
                </button>
              </div>
            )}

            {/* ══ WORD DOC EDITOR ══ */}
            {qbDocOpen && (
              <div className="qb-fade" style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" }}>

                {/* LEFT: document */}
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1A1814" }}>
                      {qbSubMode==="ai" ? "Your Text — Add More Cards" : "Highlight to Build Cards"}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, background:"#F7F6F2", borderRadius:20, padding:"5px 14px", border:"1px solid #ECEAE4" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background: selMode==="term_set"?"#4F6EF7": selMode==="def_set"?"#2BAE7E":"#D8D5CE", transition:"background 0.2s" }} />
                      <span style={{ fontSize:11, fontWeight:600, color:"#5A5752" }}>
                        {selMode==="term_set" ? "✓ Term set — now select the definition" :
                         selMode==="def_set"  ? "✓ Definition set — now select the term" :
                         "Highlight any text to start"}
                      </span>
                    </div>
                  </div>

                  <div style={{ position:"relative" }}>
                    <div ref={docRef} onMouseUp={handleDocMouseUp}
                      style={{ background:"#fff", border:"1.5px solid #ECEAE4", borderRadius:14, padding:"28px 32px", minHeight:380, boxShadow:"0 4px 24px rgba(0,0,0,0.06)", lineHeight:1.85, fontSize:15, color:"#1A1814", fontFamily:"Georgia, serif", cursor:"text", userSelect:"text", position:"relative", whiteSpace:"pre-wrap", wordBreak:"break-word" }}
                      className="qb-doc-text">
                      {qbText}
                    </div>

                    {/* Floating toolbar */}
                    {toolbar && (
                      <div style={{ position:"absolute", left:Math.max(4, Math.min(toolbar.x - 160, 380)), top:Math.max(0, toolbar.y - 52), zIndex:200, background:"#1A1814", borderRadius:10, padding:"6px 8px", display:"flex", gap:6, boxShadow:"0 6px 24px rgba(0,0,0,0.22)", whiteSpace:"nowrap" }}>
                        <div style={{ position:"absolute", bottom:-6, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", borderTop:"6px solid #1A1814" }} />
                        <button onClick={() => applySelection("term")}
                          style={{ padding:"6px 12px", borderRadius:7, border:"none", background:"#4F6EF7", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                          📌 Term
                        </button>
                        <button onClick={() => applySelection("def")}
                          style={{ padding:"6px 12px", borderRadius:7, border:"none", background:"#2BAE7E", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                          📖 Definition
                        </button>
                        <button onClick={handleAutoCard} disabled={autoCardLoading}
                          style={{ padding:"6px 12px", borderRadius:7, border:"none", background:"#F5C842", color:"#1A1814", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:5 }}>
                          {autoCardLoading
                            ? <><span style={{ width:10, height:10, border:"2px solid rgba(26,24,20,0.3)", borderTopColor:"#1A1814", borderRadius:"50%", display:"inline-block", animation:"qbSpin 0.7s linear infinite" }} /> Making…</>
                            : <>✨ Auto Card</>
                          }
                        </button>
                        <button onClick={() => setToolbar(null)}
                          style={{ padding:"6px 8px", borderRadius:7, border:"none", background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer" }}>✕</button>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop:8, fontSize:11, color:"#A8A59E", textAlign:"center" }}>Highlight text → choose Term or Definition → pair them in the panel →</div>
                </div>

                {/* RIGHT: builder */}
                <div style={{ position:"sticky", top:80 }}>
                  {/* Current pair */}
                  <div style={{ background:"#fff", border:"1.5px solid #ECEAE4", borderRadius:14, padding:"18px", marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#A8A59E" }}>Card #{pendingCardNum}</div>
                      {selMode === "auto" && (
                        <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#FFF8E8", border:"1px solid #F5C84255", borderRadius:12, padding:"3px 10px" }}>
                          <span style={{ fontSize:11 }}>✨</span>
                          <span style={{ fontSize:10, fontWeight:700, color:"#D4A830", letterSpacing:1 }}>AI Generated</span>
                        </div>
                      )}
                    </div>

                    {/* TERM */}
                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#4F6EF7" }}>📌 Term</div>
                        <div style={{ display:"flex", gap:5 }}>
                          {pendingTermPrev && pendingTermPrev !== pendingTerm && (
                            <button onClick={() => { setPendingTerm(pendingTermPrev); setPendingTermPrev(""); }}
                              style={{ padding:"3px 9px", borderRadius:6, border:"1px solid #D8D5CE", background:"#F7F6F2", fontSize:10, fontWeight:600, color:"#8C8880", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:4 }}
                              title="Undo">
                              ↩ Undo
                            </button>
                          )}
                          <button onClick={handleImproveTerm} disabled={!pendingTerm.trim() || improvingTerm}
                            style={{ padding:"3px 9px", borderRadius:6, border:`1px solid ${pendingTerm.trim()?"#4F6EF755":"#ECEAE4"}`, background:pendingTerm.trim()?"#EEF1FF":"#F7F6F2", fontSize:10, fontWeight:700, color:pendingTerm.trim()?"#4F6EF7":"#A8A59E", cursor:pendingTerm.trim()&&!improvingTerm?"pointer":"default", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:4, transition:"all 0.15s" }}
                            title="Let AI improve this term">
                            {improvingTerm
                              ? <><span style={{ width:8, height:8, border:"1.5px solid #4F6EF755", borderTopColor:"#4F6EF7", borderRadius:"50%", display:"inline-block", animation:"qbSpin 0.7s linear infinite" }} /> Improving…</>
                              : <>✦ Improve Term</>
                            }
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={pendingTerm}
                        onChange={e => setPendingTerm(e.target.value)}
                        placeholder="Highlight text and click Term, or type directly here…&#10;Tip: Use ___ for fill-in-the-blank (e.g. 'It takes ___ to form an agency relationship')"
                        style={{ width:"100%", minHeight:60, padding:"10px 12px", borderRadius:9, border:`1.5px solid ${pendingTerm?"#4F6EF7":"#ECEAE4"}`, background:pendingTerm?"#EEF1FF":"#FAFAF8", fontSize:13, color:"#1A1814", lineHeight:1.55, outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif", transition:"border-color 0.15s", boxSizing:"border-box" }}
                        onFocus={e => e.target.style.borderColor="#4F6EF7"}
                        onBlur={e => e.target.style.borderColor=pendingTerm?"#4F6EF7":"#ECEAE4"}
                      />
                    </div>

                    {/* DEFINITION */}
                    <div style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#2BAE7E" }}>📖 Definition</div>
                        <div style={{ display:"flex", gap:5 }}>
                          {pendingDefPrev && pendingDefPrev !== pendingDef && (
                            <button onClick={() => { setPendingDef(pendingDefPrev); setPendingDefPrev(""); }}
                              style={{ padding:"3px 9px", borderRadius:6, border:"1px solid #D8D5CE", background:"#F7F6F2", fontSize:10, fontWeight:600, color:"#8C8880", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:4 }}
                              title="Undo">
                              ↩ Undo
                            </button>
                          )}
                          <button onClick={handleImproveDef} disabled={!pendingDef.trim() || improvingDef}
                            style={{ padding:"3px 9px", borderRadius:6, border:`1px solid ${pendingDef.trim()?"#2BAE7E55":"#ECEAE4"}`, background:pendingDef.trim()?"#F0FDF8":"#F7F6F2", fontSize:10, fontWeight:700, color:pendingDef.trim()?"#2BAE7E":"#A8A59E", cursor:pendingDef.trim()&&!improvingDef?"pointer":"default", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:4, transition:"all 0.15s" }}
                            title="Let AI improve this definition">
                            {improvingDef
                              ? <><span style={{ width:8, height:8, border:"1.5px solid #2BAE7E55", borderTopColor:"#2BAE7E", borderRadius:"50%", display:"inline-block", animation:"qbSpin 0.7s linear infinite" }} /> Improving…</>
                              : <>✦ Improve Definition</>
                            }
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={pendingDef}
                        onChange={e => setPendingDef(e.target.value)}
                        placeholder="Highlight text and click Definition, or type directly here…"
                        style={{ width:"100%", minHeight:72, padding:"10px 12px", borderRadius:9, border:`1.5px solid ${pendingDef?"#2BAE7E":"#ECEAE4"}`, background:pendingDef?"#F0FDF8":"#FAFAF8", fontSize:13, color:"#1A1814", lineHeight:1.55, outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif", transition:"border-color 0.15s", boxSizing:"border-box" }}
                        onFocus={e => e.target.style.borderColor="#2BAE7E"}
                        onBlur={e => e.target.style.borderColor=pendingDef?"#2BAE7E":"#ECEAE4"}
                      />
                    </div>

                    <button onClick={commitPair} disabled={!pendingTerm.trim() || !pendingDef.trim()}
                      style={{ width:"100%", padding:"11px", borderRadius:9, border:"none", background:pendingTerm&&pendingDef?"#1A1814":"#ECEAE4", color:pendingTerm&&pendingDef?"#F7F6F2":"#A8A59E", fontSize:13, fontWeight:700, cursor:pendingTerm&&pendingDef?"pointer":"default", transition:"all 0.2s", fontFamily:"'Montserrat',sans-serif" }}>
                      {pendingTerm && pendingDef ? `+ Add as Card #${pendingCardNum}` : "Fill both fields above"}
                    </button>
                  </div>

                  {/* Cards built */}
                  {qbPairs.length > 0 && (
                    <div style={{ background:"#F7F6F2", border:"1.5px solid #ECEAE4", borderRadius:14, padding:"14px" }}>
                      <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#A8A59E", marginBottom:10 }}>{qbPairs.length} card{qbPairs.length!==1?"s":""} added</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:200, overflowY:"auto" }}>
                        {qbPairs.map(p => (
                          <div key={p.id} style={{ background:"#fff", borderRadius:8, padding:"9px 11px", border:"1px solid #ECEAE4", display:"flex", gap:8, alignItems:"flex-start" }}>
                            <div style={{ width:19, height:19, borderRadius:4, background:"#1A1814", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <span style={{ fontSize:9, fontWeight:800, color:"#F7F6F2" }}>{p.cardNum}</span>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:11, fontWeight:700, color:"#1A1814", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.term}</div>
                              <div style={{ fontSize:10, color:"#8C8880", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.definition}</div>
                            </div>
                            <button onClick={() => { setQbPairs(ps => ps.filter(x => x.id!==p.id)); setCards(cs => cs.filter(c => c.id!==p.id)); }}
                              style={{ background:"none", border:"none", fontSize:10, color:"#D8D5CE", cursor:"pointer", flexShrink:0 }}
                              onMouseEnter={e=>e.currentTarget.style.color="#E85D3F"} onMouseLeave={e=>e.currentTarget.style.color="#D8D5CE"}>✕</button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => { setQbDocOpen(false); setTab("cards"); }}
                        style={{ width:"100%", marginTop:10, padding:"11px", borderRadius:9, border:"none", background:"#2BAE7E", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                        ✓ Done — Review All Cards →
                      </button>
                    </div>
                  )}

                  <button onClick={() => { setQbDocOpen(false); if (qbSubMode==="ai") setQbAiStep("review"); }}
                    style={{ width:"100%", marginTop:8, padding:"10px", borderRadius:10, border:"1px solid #ECEAE4", background:"transparent", color:"#8C8880", fontSize:12, cursor:"pointer" }}>
                    ← Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ══ CARDS TAB ══ */}
        {tab === "cards" && (
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>

            {/* Left — card list */}
            <div style={{ position: "sticky", top: 80 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", marginBottom: 10 }}>Cards — {cards.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {cards.map((c, i) => (
                  <div key={c.id} onClick={() => { setActiveCard(c.id); setTimeout(() => document.getElementById(`term-${c.id}`)?.focus(), 30); }}
                    style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${activeCard === c.id ? "#1A1814" : "#ECEAE4"}`, background: activeCard === c.id ? "#1A1814" : "#fff", transition: "all 0.15s", position: "relative", overflow: "hidden" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: activeCard === c.id ? "rgba(247,246,242,0.4)" : "#A8A59E", marginBottom: 3 }}>#{i + 1}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: activeCard === c.id ? "#F7F6F2" : "#1A1814", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.term || <span style={{ opacity: 0.4 }}>Empty term</span>}
                    </div>
                    {c.definition && <div style={{ fontSize: 11, color: activeCard === c.id ? "rgba(247,246,242,0.5)" : "#8C8880", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{c.definition}</div>}
                  </div>
                ))}
              </div>
              <button onClick={addCard} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1.5px dashed #D8D5CE", background: "none", fontSize: 13, fontWeight: 600, color: "#8C8880", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.color = "#1A1814"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8D5CE"; e.currentTarget.style.color = "#8C8880"; }}>
                + Add Card
              </button>
            </div>

            {/* Right — active card editor */}
            <div>
              {cards.map((c) => c.id === activeCard ? (
                <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #ECEAE4", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
                  {/* Card header */}
                  <div style={{ padding: "18px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#A8A59E", letterSpacing: 1, textTransform: "uppercase" }}>Card #{cards.findIndex(x => x.id === c.id) + 1}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {cards.findIndex(x => x.id === c.id) > 0 && (
                        <button onClick={() => { const i = cards.findIndex(x => x.id === c.id); setActiveCard(cards[i-1].id); }} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#8C8880" }}>↑ Prev</button>
                      )}
                      {cards.findIndex(x => x.id === c.id) < cards.length - 1 && (
                        <button onClick={() => { const i = cards.findIndex(x => x.id === c.id); setActiveCard(cards[i+1].id); }} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#8C8880" }}>↓ Next</button>
                      )}
                      {cards.length > 1 && (
                        <button onClick={() => removeCard(c.id)} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#E85D3F", transition: "all 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = "#E85D3F"} onMouseLeave={e => e.currentTarget.style.borderColor = "#ECEAE4"}>✕ Remove</button>
                      )}
                    </div>
                  </div>

                  {/* Term */}
                  <div style={{ padding: "16px 24px", borderBottom: "1px solid #F7F6F2" }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", display: "block", marginBottom: 8 }}>Term</label>
                    <textarea id={`term-${c.id}`} value={c.term} onChange={e => updateCard(c.id, "term", e.target.value)} placeholder="Enter the term or question…"
                      style={{ width: "100%", minHeight: 90, padding: "12px 0", fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#1A1814", border: "none", outline: "none", resize: "none", background: "transparent", lineHeight: 1.4 }} />
                  </div>

                  {/* Definition */}
                  <div style={{ padding: "16px 24px" }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", display: "block", marginBottom: 8 }}>Definition</label>
                    <textarea value={c.definition} onChange={e => updateCard(c.id, "definition", e.target.value)} placeholder="Enter the definition or answer…"
                      style={{ width: "100%", minHeight: 120, padding: "12px 0", fontSize: 16, fontWeight: 400, fontFamily: "'DM Sans', sans-serif", color: "#3A3830", border: "none", outline: "none", resize: "none", background: "transparent", lineHeight: 1.7 }} />
                  </div>
                  {/* Hint */}
                  <div style={{ padding: "10px 24px", borderTop: "1px solid #F7F6F2" }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", display: "block", marginBottom: 5 }}>Hint <span style={{ fontWeight:400, textTransform:"none", color:"#C8C5BE" }}>(optional — shown on demand during study)</span></label>
                    <input value={c.hint||""} onChange={e => updateCard(c.id, "hint", e.target.value)} placeholder="e.g. Think about Chapter 4, or starts with the letter P…"
                      style={{ width:"100%", padding:"7px 0", fontSize:13, fontFamily:"'DM Sans',sans-serif", color:"#6B6860", border:"none", borderBottom:"1px dashed #ECEAE4", outline:"none", background:"transparent", fontStyle:"italic" }} />
                  </div>

                  {/* Card image */}
                  {c.image && (
                    <div style={{ padding:"0 24px 12px", display:"flex", alignItems:"center", gap:10 }}>
                      <img src={c.image} alt="card" style={{ height:60, maxWidth:160, borderRadius:8, objectFit:"cover", border:"1px solid #ECEAE4" }} />
                      <button onClick={()=>updateCard(c.id,"image",null)} style={{ background:"none", border:"1px solid #FECACA", borderRadius:6, padding:"4px 10px", fontSize:11, color:"#E85D3F", cursor:"pointer" }}>Remove</button>
                    </div>
                  )}

                  {/* Footer hint */}
                  <div style={{ padding: "12px 24px", background: "#FAFAF8", borderTop: "1px solid #F0EDE8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize: 11, color: "#C8C5BE" }}>Tab to jump • Enter to add card</span>
                      <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"#8C8880", cursor:"pointer", padding:"3px 8px", borderRadius:6, border:"1px solid #ECEAE4", background:"#fff", transition:"all 0.15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="#1A1814";e.currentTarget.style.color="#1A1814";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#8C8880";}}>
                        <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
                          const file=e.target.files?.[0]; if(!file) return;
                          const reader=new FileReader();
                          reader.onload=ev=>updateCard(c.id,"image",ev.target.result);
                          reader.readAsDataURL(file); e.target.value="";
                        }} />
                        📷 Add Image
                      </label>
                    </div>
                    <button onClick={addCard} style={{ background: "none", border: "none", fontSize: 12, fontWeight: 600, color: "#4F6EF7", cursor: "pointer", padding: 0 }}>+ Add next card →</button>
                  </div>
                </div>
              ) : null)}

              {/* Keyboard nav hint when no card selected — shouldn't happen but safety */}
              <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 12, color: "#C8C5BE" }}>{filledCards} of {cards.length} cards filled</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ DETAILS TAB ══ */}
        {tab === "details" && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>Deck Details</h3>
              <p style={{ fontSize: 14, color: "#8C8880" }}>Give your deck a name and a little context so you can find it easily later.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Deck Title *</label>
                {needsTitle && !title.trim() && <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: "#E85D3F", marginBottom: 6 }}>Give your deck a name to save it.</div>}
                <input value={title} autoFocus={needsTitle} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology Chapter 3 — Cell Division"
                  style={{ width: "100%", padding: "13px 16px", border: "1.5px solid #ECEAE4", borderRadius: 9, fontSize: 16, fontWeight: 600, color: "#1A1814", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#fff", transition: "border-color 0.18s" }}
                  onFocus={e => e.target.style.borderColor = "#1A1814"} onBlur={e => e.target.style.borderColor = "#ECEAE4"} />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Description <span style={{ fontWeight: 400, textTransform: "none", color: "#A8A59E" }}>(optional)</span></label>
                <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="What does this deck cover? Any tips for studying it?"
                  style={{ width: "100%", padding: "13px 16px", border: "1.5px solid #ECEAE4", borderRadius: 9, fontSize: 14, color: "#3A3830", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", minHeight: 100, lineHeight: 1.6, background: "#fff", transition: "border-color 0.18s" }}
                  onFocus={e => e.target.style.borderColor = "#1A1814"} onBlur={e => e.target.style.borderColor = "#ECEAE4"} />
              </div>

              {/* Subject */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Subject</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => setSubject(s === subject ? "" : s)}
                      style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${subject === s ? "#1A1814" : "#ECEAE4"}`, background: subject === s ? "#1A1814" : "#fff", fontSize: 13, fontWeight: subject === s ? 700 : 400, color: subject === s ? "#F7F6F2" : "#5A5752", cursor: "pointer", transition: "all 0.15s" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Deck Color</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      style={{ width: 34, height: 34, borderRadius: "50%", background: c, border: `3px solid ${color === c ? "#1A1814" : "transparent"}`, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2, cursor: "pointer", transition: "all 0.15s" }} />
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Tags <span style={{ fontWeight:400, textTransform:"none", color:"#A8A59E" }}>(optional)</span></label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                  {(tags||[]).map(t=>(<div key={t} style={{ display:"flex", alignItems:"center", gap:4, background:"#F0EDE8", borderRadius:20, padding:"4px 10px", fontSize:12, fontWeight:600, color:"#5A5752" }}>#{t}<button onClick={()=>setTags(ts=>ts.filter(x=>x!==t))} style={{ background:"none", border:"none", cursor:"pointer", color:"#A8A59E", fontSize:11, padding:0 }}>✕</button></div>))}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <input id="tag-input" placeholder="Add a tag e.g. midterm, chapter3…"
                    style={{ flex:1, padding:"8px 12px", border:"1.5px solid #ECEAE4", borderRadius:8, fontSize:13, color:"#1A1814", fontFamily:"'DM Sans',sans-serif", outline:"none" }}
                    onFocus={e=>e.target.style.borderColor="#1A1814"} onBlur={e=>e.target.style.borderColor="#ECEAE4"}
                    onKeyDown={e=>{ if(e.key==="Enter"||e.key===","){ e.preventDefault(); const v=e.target.value.trim().replace(/^#/,""); if(v&&!(tags||[]).includes(v)){setTags(ts=>[...(ts||[]),v]);} e.target.value=""; }}} />
                  <button onClick={()=>{ const el=document.getElementById("tag-input"); const v=el.value.trim().replace(/^#/,""); if(v&&!(tags||[]).includes(v)){setTags(ts=>[...(ts||[]),v]);el.value="";}}}
                    style={{ padding:"8px 14px", borderRadius:8, border:"1.5px solid #ECEAE4", background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", color:"#5A5752" }}>Add</button>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Visibility</label>
                <div style={{ display:"flex", gap:10 }}>
                  {[false, true].map(pub => (
                    <button key={String(pub)} onClick={() => setIsPublic(pub)}
                      style={{ flex:1, padding:"12px 16px", borderRadius:10, border:`1.5px solid ${isPublic===pub ? (pub?"#2BAE7E":"#4F6EF7") : "#ECEAE4"}`, background: isPublic===pub ? (pub?"#2BAE7E18":"#4F6EF718") : "#fff", cursor:"pointer", transition:"all 0.18s", textAlign:"left" }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>{pub ? "🌐" : "🔒"}</div>
                      <div style={{ fontSize:13, fontWeight:700, color: isPublic===pub ? (pub?"#1A6B4A":"#1A1877") : "#5A5752" }}>{pub ? "Public" : "Private"}</div>
                      <div style={{ fontSize:11, color:"#8C8880", marginTop:2 }}>{pub ? "Anyone can find and study it (shows your first name)" : "Only you can see this deck"}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview card */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 10 }}>Preview</label>
                <div style={{ background: "#fff", border: "1.5px solid #ECEAE4", borderTop: `3px solid ${color}`, borderRadius: 10, padding: "20px 22px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: color, marginBottom: 6 }}>{subject || "No subject"}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#1A1814", marginBottom: 8 }}>{title || "Untitled Deck"}</div>
                  {description && <div style={{ fontSize: 12, color: "#8C8880", lineHeight: 1.5 }}>{description}</div>}
                  <div style={{ marginTop: 14, height: 3, background: "#ECEAE4", borderRadius: 2 }}><div style={{ height: "100%", width: "0%", background: color, borderRadius: 2 }} /></div>
                  <div style={{ fontSize: 11, color: "#A8A59E", marginTop: 6 }}>{filledCards} card{filledCards !== 1 ? "s" : ""} · 0% mastery</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ ORGANIZE TAB ══ */}
        {tab === "organize" && (
          <div style={{ maxWidth: 580, margin: "0 auto" }}>
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>Organize</h3>
              <p style={{ fontSize: 14, color: "#8C8880" }}>Place this deck in a folder. Use the structured levels, pick an existing folder, or create a new one — all in one place.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Structured levels */}
              {[
                { key: "year",     label: "Year",     emoji: "📅" },
                { key: "semester", label: "Semester", emoji: "🗓" },
                { key: "class",    label: "Class",    emoji: "📚" },
                { key: "chapter",  label: "Chapter",  emoji: "📖" },
              ].map(({ key, label, emoji }) => (
                <div key={key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>{emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752" }}>{label}</span>
                    {orgPath[key] && (
                      <button onClick={() => setOrgPath(p => ({ ...p, [key]: "" }))}
                        style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 11, color: "#A8A59E", cursor: "pointer", padding: 0 }}>✕ Clear</button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {orgOptions[key].map(opt => (
                      <button key={opt} onClick={() => { setOrgPath(p => ({ ...p, [key]: p[key] === opt ? "" : opt })); setSelectedCustom(""); }}
                        style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${orgPath[key] === opt ? "#1A1814" : "#ECEAE4"}`, background: orgPath[key] === opt ? "#1A1814" : "#fff", fontSize: 13, fontWeight: orgPath[key] === opt ? 700 : 400, color: orgPath[key] === opt ? "#F7F6F2" : "#5A5752", cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { if (orgPath[key] !== opt) e.currentTarget.style.borderColor = "#A8A59E"; }}
                        onMouseLeave={e => { if (orgPath[key] !== opt) e.currentTarget.style.borderColor = "#ECEAE4"; }}>
                        {opt}
                      </button>
                    ))}
                    {addingTo === key ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input autoFocus value={newOrgVal} onChange={e => setNewOrgVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") commitNewOrgOpt(key); if (e.key === "Escape") { setAddingTo(null); setNewOrgVal(""); } }}
                          placeholder={`New ${label}…`}
                          style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #4F6EF7", fontSize: 13, outline: "none", width: 160, fontFamily: "'DM Sans', sans-serif" }} />
                        <button onClick={() => commitNewOrgOpt(key)} style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: "#1A1814", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#F7F6F2" }}>Add</button>
                        <button onClick={() => { setAddingTo(null); setNewOrgVal(""); }} style={{ background: "none", border: "none", fontSize: 13, color: "#A8A59E", cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingTo(key); setNewOrgVal(""); }}
                        style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px dashed #D8D5CE", background: "none", fontSize: 12, fontWeight: 500, color: "#A8A59E", cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#8C8880"; e.currentTarget.style.color = "#5A5752"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8D5CE"; e.currentTarget.style.color = "#A8A59E"; }}>
                        + New {label}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Custom / user folders — same section, no divider */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 14 }}>📁</span>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752" }}>Custom Folder</span>
                  {selectedCustom && (
                    <button onClick={() => setSelectedCustom("")}
                      style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 11, color: "#A8A59E", cursor: "pointer", padding: 0 }}>✕ Clear</button>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {/* Existing user folders from shared state */}
                  {userFolders.map(f => (
                    <button key={f.id} onClick={() => { setSelectedCustom(c => c === f.id ? "" : f.id); setOrgPath({ year:"", semester:"", class:"", chapter:"" }); }}
                      style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${selectedCustom === f.id ? "#1A1814" : "#ECEAE4"}`, background: selectedCustom === f.id ? "#1A1814" : "#fff", fontSize: 13, fontWeight: selectedCustom === f.id ? 700 : 400, color: selectedCustom === f.id ? "#F7F6F2" : "#5A5752", cursor: "pointer", transition: "all 0.15s" }}>
                      📁 {f.name}
                    </button>
                  ))}
                  {/* Inline create */}
                  {addingTo === "__custom__" ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input autoFocus value={newOrgVal} onChange={e => setNewOrgVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && newOrgVal.trim()) {
                            const name = newOrgVal.trim();
                            const newFolder = { id: `uf-${Date.now()}`, name, parentId: null };
                            setUserFolders && setUserFolders(fs => [...fs, newFolder]);
                            setSelectedCustom(newFolder.id);
                            setOrgPath({ year:"", semester:"", class:"", chapter:"" });
                            setAddingTo(null); setNewOrgVal("");
                          }
                          if (e.key === "Escape") { setAddingTo(null); setNewOrgVal(""); }
                        }}
                        placeholder="Folder name…"
                        style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #4F6EF7", fontSize: 13, outline: "none", width: 180, fontFamily: "'DM Sans', sans-serif" }} />
                      <button onClick={() => {
                        if (!newOrgVal.trim()) return;
                        const name = newOrgVal.trim();
                        const newFolder = { id: `uf-${Date.now()}`, name, parentId: null };
                        setUserFolders && setUserFolders(fs => [...fs, newFolder]);
                        setSelectedCustom(newFolder.id);
                        setOrgPath({ year:"", semester:"", class:"", chapter:"" });
                        setAddingTo(null); setNewOrgVal("");
                      }} style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: "#1A1814", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#F7F6F2" }}>Create</button>
                      <button onClick={() => { setAddingTo(null); setNewOrgVal(""); }} style={{ background: "none", border: "none", fontSize: 13, color: "#A8A59E", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingTo("__custom__"); setNewOrgVal(""); }}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px dashed #D8D5CE", background: "none", fontSize: 12, fontWeight: 500, color: "#A8A59E", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#4F6EF7"; e.currentTarget.style.color = "#4F6EF7"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8D5CE"; e.currentTarget.style.color = "#A8A59E"; }}>
                      + New Folder
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Path summary */}
            {anyOrgSelected ? (
              <div style={{ marginTop: 28, padding: "16px 20px", background: "#fff", borderRadius: 10, border: "1.5px solid #ECEAE4" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", marginBottom: 10 }}>Saved To</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {selectedCustom ? (
                    <span style={{ background: "#F7F6F2", border: "1px solid #ECEAE4", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#3A3830" }}>📁 {userFolders?.find(f => f.id === selectedCustom)?.name || selectedCustom}</span>
                  ) : (
                    ["year","semester","class","chapter"].filter(k => orgPath[k]).map((k, i, arr) => (
                      <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ background: "#F7F6F2", border: "1px solid #ECEAE4", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#3A3830" }}>{orgPath[k]}</span>
                        {i < arr.length - 1 && <span style={{ color: "#D8D5CE" }}>›</span>}
                      </span>
                    ))
                  )}
                  <span style={{ color: "#D8D5CE" }}>›</span>
                  <span style={{ background: "#1A1814", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#F7F6F2" }}>{title || "This Deck"}</span>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 28, padding: "24px", background: "#fff", borderRadius: 10, border: "1.5px dashed #D8D5CE", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#8C8880", marginBottom: 4 }}>No folder selected</div>
                <div style={{ fontSize: 12, color: "#A8A59E" }}>This deck will appear under All Folders. You can move it any time.</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Library View (hierarchical) ───────────────────────────────────────────────
// ─── Public Library ────────────────────────────────────────────────────────────
function FCSharePrompt({ deck, onAnswer }) {
  const [dontAsk, setDontAsk] = useState(false);
  if (!deck) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="fc-share-title" onClick={() => onAnswer(false, dontAsk)}
      style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(26,24,20,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"min(440px, 100%)", background:"#fff", borderRadius:16, padding:"24px 22px", boxShadow:"0 20px 60px rgba(0,0,0,0.25)", textAlign:"left" }}>
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
          <img src="/mascots/ace-head.webp" alt="" width={44} height={44} />
          <div id="fc-share-title" style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:800, color:"#1A1814", lineHeight:1.25 }}>Nice deck! Share it with other students?</div>
        </div>
        <p style={{ fontSize:14, color:"#5A5752", lineHeight:1.6, margin:"0 0 6px" }}>
          <strong>{deck.title}</strong> has {deck.cards?.length || 0} cards. If you share it, anyone can find and study it — including on Google — and save their own copy.
        </p>
        <p style={{ fontSize:12, color:"#8C8880", lineHeight:1.5, margin:"0 0 16px" }}>It shows your first name only. You can make it private again anytime from the deck page.</p>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#6F6B63", marginBottom:16, cursor:"pointer" }}>
          <input type="checkbox" checked={dontAsk} onChange={e => setDontAsk(e.target.checked)} /> Don't ask me again
        </label>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button onClick={() => onAnswer(false, dontAsk)} style={{ background:"#fff", border:"1px solid #DAD6CE", borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:600, color:"#1A1814", cursor:"pointer" }}>Keep private</button>
          <button onClick={() => onAnswer(true, dontAsk)} style={{ background:"#2BAE7E", border:"none", borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer" }}>🌐 Share publicly</button>
        </div>
      </div>
    </div>
  );
}

function FCPublicLibrary({ user, openAuth, onBack, onSave, incoming, clearIncoming }) {
  const [decks, setDecks] = useState(null);       // null = loading
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("rating"); // rating | newest | saves | cards
  const [hoveredStars, setHoveredStars] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/decks?list=1").then(r => r.ok ? r.json() : Promise.reject()).then(j => { if (alive) setDecks(j.decks || []); })
      .catch(() => { if (alive) { setDecks([]); setLoadError("Couldn't load public decks right now. Check your connection and try again."); } });
    return () => { alive = false; };
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = (decks || [])
    .filter(d => !q || `${d.title} ${d.subject} ${d.description} ${d.authorName}`.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sortBy === "rating") return (b.ratingAvg - a.ratingAvg) || (b.ratingCount - a.ratingCount);
      if (sortBy === "newest") return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      if (sortBy === "saves") return (b.saves || 0) - (a.saves || 0);
      if (sortBy === "cards") return (b.cardCount || 0) - (a.cardCount || 0);
      return 0;
    });

  const saveAndStudy = async (d) => {
    setBusyId(d.id);
    try {
      const full = d.cards ? d : (await (await fetch(`/api/decks?id=${d.id}`)).json()).deck;
      if (!full?.cards?.length) throw new Error();
      onSave(full);
      clearIncoming && clearIncoming();
    } catch { setNote("Couldn't open that deck. It may have been removed."); }
    setBusyId(null);
  };

  const rate = async (d, stars) => {
    if (!user) { openAuth && openAuth("login"); return; }
    const r = await deckApi({ action: "rate", id: d.id, stars });
    if (r.ok) setDecks(list => list.map(x => x.id === d.id ? { ...x, ratingAvg: r.data.ratingAvg, ratingCount: r.data.ratingCount, myStars: stars } : x));
    else setNote(r.data?.error?.message || "Couldn't save your rating.");
  };

  const report = async (d) => {
    if (!user) { openAuth && openAuth("login"); return; }
    const reason = window.prompt("What's wrong with this deck? (spam, wrong answers, inappropriate…)");
    if (reason === null) return;
    const r = await deckApi({ action: "report", id: d.id, reason });
    setNote(r.ok ? "Thanks — we'll take a look." : (r.data?.error?.message || "Couldn't send the report."));
  };

  const Stars = ({ d }) => {
    const hovered = hoveredStars[d.id] || 0;
    const shown = hovered || d.myStars || d.ratingAvg;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ display:"flex", gap:2 }} aria-label={`Rated ${d.ratingAvg || 0} out of 5`}>
          {[1,2,3,4,5].map(s => (
            <button key={s} aria-label={`Rate ${s} star${s>1?"s":""}`}
              onMouseEnter={() => setHoveredStars(h=>({...h,[d.id]:s}))}
              onMouseLeave={() => setHoveredStars(h=>({...h,[d.id]:0}))}
              onClick={e => { e.stopPropagation(); rate(d, s); }}
              style={{ background:"none", border:"none", padding:0, fontSize:16, cursor:"pointer", color: s <= Math.round(shown) ? "#F5C842" : "#D8D5CE" }}>★</button>
          ))}
        </div>
        <span style={{ fontSize:11, color:"#8C8880" }}>{d.ratingCount ? `${d.ratingAvg.toFixed(1)} (${d.ratingCount})` : "No ratings yet"}</span>
      </div>
    );
  };

  return (
    <div style={{ maxWidth:1000, margin:"0 auto", padding:"40px 24px" }}>
      <div style={{ marginBottom:28 }}>
        <button onClick={onBack} style={{ background:"none", border:"1px solid #ECEAE4", borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#8C8880", marginBottom:20 }}>← Back</button>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:900, letterSpacing:-0.8, marginBottom:8, color:"#1A1814" }}>Public Library</h1>
        <p style={{ fontSize:14, color:"#6F6B63", lineHeight:1.7 }}>Decks shared by students. Save one to your library to study it — your copy is private. To share your own, open a deck and click 🔒 Private → 🌐 Public.</p>
      </div>

      {incoming && (
        <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", background:"#fff", border:"1px solid #2BAE7E55", borderLeft:"4px solid #2BAE7E", borderRadius:12, padding:"16px 18px", marginBottom:24 }}>
          <img src="/mascots/ace-head.webp" alt="" width={40} height={40} />
          <div style={{ flex:"1 1 220px" }}>
            <div style={{ fontWeight:700, color:"#1A1814" }}>{incoming.title}</div>
            <div style={{ fontSize:12, color:"#6F6B63" }}>{incoming.cardCount} cards · shared by {incoming.authorName}</div>
          </div>
          <button onClick={() => saveAndStudy(incoming)} disabled={busyId===incoming.id} style={{ background:"#1A1814", color:"#F7F6F2", border:"none", borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>Save &amp; study</button>
          <button onClick={clearIncoming} style={{ background:"none", border:"1px solid #ECEAE4", borderRadius:8, padding:"10px 14px", fontSize:13, fontWeight:600, cursor:"pointer", color:"#5A5752" }}>Not now</button>
        </div>
      )}

      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search decks, subjects, students…" aria-label="Search public decks"
          style={{ flex:"1 1 220px", padding:"10px 14px", borderRadius:10, border:"1.5px solid #ECEAE4", background:"#fff", fontSize:13, color:"#1A1814", outline:"none", fontFamily:"'DM Sans',sans-serif" }}
          onKeyDown={e=>{if(e.key===" ")e.stopPropagation();}} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[["rating","Top rated"],["saves","Most saved"],["newest","Newest"],["cards","Most cards"]].map(([v,label])=>(
            <button key={v} onClick={()=>setSortBy(v)}
              style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${sortBy===v?"#1A1814":"#ECEAE4"}`, background:sortBy===v?"#1A1814":"#fff", color:sortBy===v?"#F7F6F2":"#5A5752", fontSize:12, fontWeight:600, cursor:"pointer" }}>{label}</button>
          ))}
        </div>
      </div>
      {note && <div role="status" style={{ fontSize:13, color:"#5A5752", background:"#FFF6DD", border:"1px solid #F5C84266", borderRadius:8, padding:"8px 12px", marginBottom:16 }}>{note}</div>}

      {decks === null ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#8C8880" }}>Loading decks…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#8C8880" }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:800, color:"#5A5752", marginBottom:8 }}>
            {loadError ? "Couldn't load decks" : (decks.length === 0 ? "No public decks yet" : "No results found")}
          </div>
          <p style={{ fontSize:14, maxWidth:380, margin:"0 auto", lineHeight:1.7 }}>
            {loadError || (decks.length === 0 ? "Be the first to share one! Open any deck and click 🔒 Private to make it public." : "Try a different search.")}
          </p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:16 }}>
          {filtered.map(d => (
            <div key={d.id} style={{ background:"#fff", border:"1px solid #ECEAE4", borderTop:`3px solid ${d.color}`, borderRadius:14, padding:"20px", display:"flex", flexDirection:"column" }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#6F6B63", marginBottom:8 }}>{d.subject}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:800, color:"#1A1814", marginBottom:6, lineHeight:1.3 }}>{d.title}</div>
              {d.description && <div style={{ fontSize:12, color:"#6F6B63", marginBottom:10, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{d.description}</div>}
              <div style={{ fontSize:11, color:"#8C8880", marginBottom:10 }}>{d.cardCount} cards · by {d.authorName}{d.saves ? ` · saved ${d.saves}×` : ""}</div>
              <Stars d={d} />
              <div style={{ flex:1 }} />
              <button onClick={() => saveAndStudy(d)} disabled={busyId===d.id}
                style={{ width:"100%", marginTop:14, padding:"9px 0", borderRadius:8, border:"none", background:"#1A1814", color:"#F7F6F2", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {busyId===d.id ? "Opening…" : "Save & study →"}
              </button>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:10 }}>
                <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#5A5752" }}>Preview ↗</a>
                <button onClick={() => report(d)} style={{ background:"none", border:"none", fontSize:11, color:"#A8A59E", cursor:"pointer", padding:0 }}>Report</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FCLibraryView({ allDecks, onOpenDeck, onStartStudy, onNewDeck, drafts = [], onDeleteDeck, userFolders = [], setUserFolders }) {
  const [folderPath, setFolderPath]     = useState([]);
  const [searchQuery, setSearchQuery]   = useState("");
  const [treeExpanded, setTreeExpanded] = useState({ y2025: true, fall25: true });
  const [addingFolder, setAddingFolder] = useState(false);
  const [addingSubFolder, setAddingSubFolder] = useState(null); // folder id to add subfolder to
  const [newFolderName, setNewFolderName] = useState("");

  const isUserFolder   = folderPath[0] === "__uf__";
  const isDraftsFolder = folderPath[0] === "__drafts__";
  const isUncategorized = folderPath[0] === "__uncategorized__";
  const activeFolderId = isUserFolder ? folderPath[1] : null;
  const activeFolder   = userFolders.find(f => f.id === activeFolderId);
  const activeFolderName = activeFolder?.name || null;

  const currentNode = (!isUserFolder && !isDraftsFolder && folderPath.length > 0)
    ? fcFindNode(FC_TREE, folderPath[folderPath.length - 1])
    : null;
  const currentChildren = currentNode ? (currentNode.children || []) : (isUserFolder || isDraftsFolder) ? [] : FC_TREE;

  // Get all deck ids in a user folder including subfolders recursively
  const getAllDeckIdsInUserFolder = (folderId) => {
    const folder = userFolders.find(f => f.id === folderId);
    if (!folder) return [];
    const direct = allDecks.filter(d => d.folderKey === folder.id).map(d => d.id);
    const children = userFolders.filter(f => f.parentId === folderId);
    return [...direct, ...children.flatMap(c => getAllDeckIdsInUserFolder(c.id))];
  };

  // Which decks to show in the right panel
  const currentDecks = isUncategorized
    ? (() => {
        const allFolderKeys = new Set([...userFolders.map(f=>f.id),...userFolders.map(f=>f.name)]);
        return allDecks.filter(d => !d.folderKey || (!allFolderKeys.has(d.folderKey) && !d.folderKey?.includes("›")));
      })()
    : isUserFolder && activeFolderId
      ? allDecks.filter(d => d.folderKey === activeFolderId)
      : isDraftsFolder
        ? []
        : currentNode
          ? allDecks.filter(d => fcGetAllDeckIds(currentNode).includes(d.id))
          : allDecks;

  const allHere = currentDecks;

  const searchResults = searchQuery.trim()
    ? allDecks.filter(d => {
        const q = searchQuery.toLowerCase();
        return d.title.toLowerCase().includes(q)
          || (d.subject||"").toLowerCase().includes(q)
          || (d.tags||[]).some(t=>t.toLowerCase().includes(q))
          || (d.cards||[]).some(c=>c.term?.toLowerCase().includes(q)||c.definition?.toLowerCase().includes(q));
      })
    : [];

  const enterFolder  = (id) => setFolderPath(p => [...p, id]);
  const navToIndex   = (i)  => setFolderPath(p => p.slice(0, i + 1));
  const goRoot       = ()   => setFolderPath([]);
  const toggleTree   = (id) => setTreeExpanded(e => ({ ...e, [id]: !e[id] }));

  const createUserFolder = (parentId = null) => {
    const name = newFolderName.trim();
    if (!name) { setAddingFolder(false); setAddingSubFolder(null); return; }
    const newFolder = { id: `uf-${Date.now()}`, name, parentId };
    setUserFolders && setUserFolders(fs => [...fs, newFolder]);
    setAddingFolder(false); setAddingSubFolder(null); setNewFolderName("");
    // Navigate into the new subfolder if it has a parent
    if (parentId) setFolderPath(["__uf__", newFolder.id]);
  };

  // Recursive renderer for user folders
  const renderUserFolder = (folder, depth = 0) => {
    const isActive = isUserFolder && folderPath[1] === folder.id;
    const subFolders = userFolders.filter(f => f.parentId === folder.id);
    const deckCount = allDecks.filter(d => d.folderKey === folder.id).length;
    const expanded = treeExpanded[folder.id];
    const hasKids = subFolders.length > 0;
    return (
      <div key={folder.id}>
        <div style={{ position:"relative", marginBottom:1 }}
          onMouseEnter={e => e.currentTarget.querySelector(".uf-del")?.style && (e.currentTarget.querySelector(".uf-del").style.opacity = "1")}
          onMouseLeave={e => e.currentTarget.querySelector(".uf-del")?.style && (e.currentTarget.querySelector(".uf-del").style.opacity = "0")}>
          <div onClick={() => { if (hasKids) setTreeExpanded(e => ({ ...e, [folder.id]: !e[folder.id] })); setFolderPath(["__uf__", folder.id]); }}
            style={{ display:"flex", alignItems:"center", gap:7, padding:`7px 8px 7px ${8+depth*14}px`, borderRadius:7, cursor:"pointer", background:isActive?"#1A1814":"transparent", transition:"background 0.15s" }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background="#F7F6F2"; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}>
            <span style={{ fontSize:8, color:isActive?"rgba(247,246,242,0.4)":"#C8C5BE", width:10, flexShrink:0, display:"inline-block", transform:hasKids&&expanded?"rotate(90deg)":"rotate(0)", transition:"transform 0.2s" }}>{hasKids?"▶":" "}</span>
            <span style={{ fontSize:11 }}>📁</span>
            <span style={{ fontSize:12, fontWeight:isActive?700:500, color:isActive?"#F7F6F2":"#3A3830", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{folder.name}</span>
            <span style={{ fontSize:10, color:isActive?"rgba(247,246,242,0.35)":"#C8C5BE", marginRight:16 }}>{deckCount}</span>
          </div>
          <button className="uf-del"
            onClick={e => {
              e.stopPropagation();
              if (window.confirm(`Delete folder "${folder.name}"? Decks inside will move to All Folders.`)) {
                setUserFolders && setUserFolders(fs => fs.filter(x => x.id !== folder.id && x.parentId !== folder.id));
                if (isActive) setFolderPath([]);
              }
            }}
            style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", fontSize:10, color:"#A8A59E", cursor:"pointer", opacity:0, transition:"opacity 0.15s", padding:"2px 4px", lineHeight:1, zIndex:2 }}
            title="Delete folder">✕</button>
        </div>
        {/* Subfolder creation input */}
        {addingSubFolder === folder.id && (
          <div style={{ padding:`4px 8px 8px ${8+(depth+1)*14}px` }}>
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter") createUserFolder(folder.id); if (e.key==="Escape") { setAddingSubFolder(null); setNewFolderName(""); } }}
              placeholder="Subfolder name…"
              style={{ width:"100%", padding:"6px 10px", borderRadius:7, border:"1.5px solid #4F6EF7", fontSize:12, outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" }} />
            <div style={{ fontSize:10, color:"#A8A59E", marginTop:3 }}>Enter to confirm · Esc to cancel</div>
          </div>
        )}
        {/* Subfolders */}
        {hasKids && expanded && subFolders.map(sub => renderUserFolder(sub, depth + 1))}
      </div>
    );
  };

  // Recursive left-panel tree renderer for FC_TREE
  const renderTreeNode = (node, depth = 0) => {
    const expanded   = treeExpanded[node.id];
    const hasKids    = node.children?.length > 0;
    const isActive   = folderPath[folderPath.length - 1] === node.id;
    const meta       = FC_TYPE_META[node.type] || {};
    const deckCount  = fcGetAllDeckIds(node).length;
    return (
      <div key={node.id}>
        <div onClick={() => { if (hasKids) toggleTree(node.id); enterFolder(node.id); }}
          style={{ display:"flex", alignItems:"center", gap:7, padding:`7px 8px 7px ${8+depth*14}px`, borderRadius:7, cursor:"pointer", background:isActive?"#1A1814":"transparent", transition:"background 0.15s", marginBottom:1 }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background="#F7F6F2"; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}>
          <span style={{ fontSize:8, color:isActive?"rgba(247,246,242,0.4)":"#C8C5BE", width:10, flexShrink:0, display:"inline-block", transform:hasKids&&expanded?"rotate(90deg)":"rotate(0)", transition:"transform 0.2s" }}>{hasKids?"▶":" "}</span>
          <span style={{ fontSize:11, flexShrink:0 }}>{meta.icon}</span>
          <span style={{ fontSize:12, fontWeight:isActive?700:500, color:isActive?"#F7F6F2":"#3A3830", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{node.label}</span>
          <span style={{ fontSize:10, color:isActive?"rgba(247,246,242,0.35)":"#C8C5BE", flexShrink:0 }}>{deckCount}</span>
        </div>
        {hasKids && expanded && node.children.map(c => renderTreeNode(c, depth+1))}
      </div>
    );
  };

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 60px)" }}>

      {/* ── LEFT TREE ─────────────────────────────────────────────────── */}
      <div style={{ width:232, flexShrink:0, background:"#fff", borderRight:"1px solid #ECEAE4", display:"flex", flexDirection:"column", position:"sticky", top:60, height:"calc(100vh - 60px)", overflowY:"auto" }}>
        <div style={{ padding:"20px 10px 0", flex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#A8A59E", padding:"0 8px", marginBottom:10 }}>My Library</div>

          {/* All Folders root */}
          <div onClick={goRoot}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:7, cursor:"pointer", background:folderPath.length===0?"#1A1814":"transparent", marginBottom:4, transition:"background 0.15s" }}
            onMouseEnter={e => { if (folderPath.length>0) e.currentTarget.style.background="#F7F6F2"; }}
            onMouseLeave={e => { if (folderPath.length>0) e.currentTarget.style.background="transparent"; }}>
            <span style={{ fontSize:13 }}>🗂</span>
            <span style={{ fontSize:13, fontWeight:700, color:folderPath.length===0?"#F7F6F2":"#1A1814" }}>All Folders</span>
            <span style={{ marginLeft:"auto", fontSize:10, color:folderPath.length===0?"rgba(247,246,242,0.4)":"#C8C5BE" }}>{allDecks.length}</span>
          </div>

          {/* FC_TREE structured folders */}
          {FC_TREE.map(n => renderTreeNode(n, 0))}

          {/* ── User folders — recursive tree ── */}
          {userFolders.filter(f => !f.parentId).map(f => renderUserFolder(f, 0))}

          {/* Uncategorized — only shows when homeless decks exist */}
          {(() => {
            const allFolderKeys = new Set([...userFolders.map(f=>f.id),...userFolders.map(f=>f.name)]);
            const count = allDecks.filter(d => !d.folderKey || (!allFolderKeys.has(d.folderKey) && !d.folderKey?.includes("›"))).length;
            if (count === 0) return null;
            const isActive = isUncategorized;
            return (
              <div onClick={() => setFolderPath(["__uncategorized__"])}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 10px", borderRadius:7, cursor:"pointer", background:isActive?"#1A1814":"transparent", transition:"background 0.15s", marginTop:2 }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background="#F7F6F2"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background="transparent"; }}>
                <span style={{ fontSize:13 }}>📂</span>
                <span style={{ fontSize:12, fontWeight:isActive?700:400, color:isActive?"#F7F6F2":"#3A3830", flex:1 }}>Uncategorized</span>
                <span style={{ fontSize:10, background:"#E8E5DF", color:"#8C8880", borderRadius:10, padding:"1px 6px", fontWeight:600 }}>{count}</span>
              </div>
            );
          })()}

          {/* Inline new folder input — appears right in the tree */}
          {addingFolder && (
            <div style={{ padding:"4px 8px 8px" }}>
              <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter") createUserFolder(null); if (e.key==="Escape") { setAddingFolder(false); setNewFolderName(""); } }}
                placeholder="Folder name…"
                style={{ width:"100%", padding:"6px 10px", borderRadius:7, border:"1.5px solid #4F6EF7", fontSize:12, outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" }} />
              <div style={{ fontSize:10, color:"#A8A59E", marginTop:3 }}>Enter to confirm · Esc to cancel</div>
            </div>
          )}

          {/* Drafts */}
          {drafts.length > 0 && (
            <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #ECEAE4" }}>
              <div onClick={() => setFolderPath(["__drafts__"])}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 10px", borderRadius:7, cursor:"pointer", background:isDraftsFolder?"#1A1814":"transparent", transition:"background 0.15s" }}
                onMouseEnter={e => { if (!isDraftsFolder) e.currentTarget.style.background="#F7F6F2"; }}
                onMouseLeave={e => { if (!isDraftsFolder) e.currentTarget.style.background="transparent"; }}>
                <span style={{ fontSize:11 }}>📝</span>
                <span style={{ fontSize:12, fontWeight:isDraftsFolder?700:500, color:isDraftsFolder?"#F7F6F2":"#3A3830", flex:1 }}>Drafts</span>
                <span style={{ fontSize:10, background:"#F5C842", color:"#1A1814", borderRadius:10, padding:"1px 6px", fontWeight:700 }}>{drafts.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div style={{ padding:"12px 10px", borderTop:"1px solid #ECEAE4", display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={() => { setAddingFolder(true); setAddingSubFolder(null); setNewFolderName(""); setFolderPath([]); }}
            style={{ width:"100%", background:"none", border:"1.5px dashed #D8D5CE", borderRadius:8, padding:"8px 12px", fontSize:11, fontWeight:600, color:"#8C8880", cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#4F6EF7"; e.currentTarget.style.color="#4F6EF7"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#D8D5CE"; e.currentTarget.style.color="#8C8880"; }}>
            📁 New Folder
          </button>
          <button onClick={onNewDeck}
            style={{ width:"100%", background:"none", border:"1.5px dashed #D8D5CE", borderRadius:8, padding:"9px 12px", fontSize:11, fontWeight:600, color:"#8C8880", cursor:"pointer", transition:"all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#1A1814"; e.currentTarget.style.color="#1A1814"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#D8D5CE"; e.currentTarget.style.color="#8C8880"; }}>
            + New Deck
          </button>
        </div>
      </div>

      {/* ── RIGHT CONTENT ─────────────────────────────────────────────── */}
      <div style={{ flex:1, padding:"28px 32px", overflowY:"auto" }}>

        {/* Search */}
        <div style={{ position:"relative", marginBottom:28 }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#A8A59E", pointerEvents:"none" }}>⌕</span>
          <input type="text" placeholder="Search all decks…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width:"100%", padding:"11px 16px 11px 38px", border:"1px solid #D8D5CE", borderRadius:10, fontSize:14, background:"#fff", color:"#1A1814", outline:"none", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }} />
          {searchQuery && <span onClick={() => setSearchQuery("")} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", cursor:"pointer", fontSize:13, color:"#A8A59E" }}>✕</span>}
        </div>

        {/* SEARCH RESULTS */}
        {searchQuery.trim() ? (
          <div>
            <div style={{ fontSize:12, color:"#8C8880", marginBottom:16 }}>{searchResults.length} result{searchResults.length!==1?"s":""} for "<strong>{searchQuery}</strong>"</div>
            {searchResults.length === 0
              ? <div style={{ textAlign:"center", padding:"48px 0", color:"#8C8880" }}><div style={{ fontSize:36, marginBottom:12 }}>🔍</div><div style={{ fontSize:15, fontWeight:500 }}>No decks match</div></div>
              : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:14 }}>{searchResults.map((d,i) => <FCDeckCard key={d.id} deck={d} index={i} onOpen={onOpenDeck} onStudy={onStartStudy} onDelete={onDeleteDeck} />)}</div>
            }
          </div>

        ) : isDraftsFolder ? (
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, color:"#1A1814", marginBottom:20 }}>📝 Drafts</h1>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {drafts.map(d => (
                <div key={d.id} style={{ background:"#fff", border:"1.5px solid #ECEAE4", borderLeft:`3px solid ${d.color||"#F5C842"}`, borderRadius:10, padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#1A1814", marginBottom:3 }}>{d.title}</div>
                    <div style={{ fontSize:11, color:"#A8A59E" }}>{d.cards?.filter(c=>c.term).length||0} cards · Saved {d.savedAt}</div>
                  </div>
                  <span style={{ fontSize:11, background:"#FFF7D6", color:"#8C6800", borderRadius:6, padding:"3px 10px", fontWeight:600 }}>Draft</span>
                </div>
              ))}
            </div>
          </div>

        ) : (
          <div>
            {/* Breadcrumb */}
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:20 }}>
              <span onClick={goRoot} style={{ fontSize:13, color:folderPath.length===0?"#1A1814":"#8C8880", cursor:"pointer", fontWeight:folderPath.length===0?700:400 }}>All Folders</span>
              {isUserFolder && <><span style={{ color:"#D8D5CE" }}>›</span><span style={{ fontSize:13, color:"#1A1814", fontWeight:700 }}>📁 {activeFolderName}</span></>}
              {!isUserFolder && folderPath.map((id, i) => {
                const n = fcFindNode(FC_TREE, id);
                if (!n) return null;
                const isLast = i === folderPath.length - 1;
                return <span key={id} style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ color:"#D8D5CE" }}>›</span><span onClick={() => navToIndex(i)} style={{ fontSize:13, color:isLast?"#1A1814":"#8C8880", fontWeight:isLast?700:400, cursor:"pointer" }}>{n.label}</span></span>;
              })}
            </div>

            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <div>
                {isUserFolder ? (
                  <><div style={{ display:"inline-block", fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#4F6EF7", background:"#EEF1FF", padding:"2px 10px", borderRadius:20, marginBottom:6 }}>Your Folder</div>
                  <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, letterSpacing:-0.5, color:"#1A1814", marginBottom:4 }}>📁 {activeFolderName}</h1>
                  <div style={{ fontSize:12, color:"#8C8880" }}>{currentDecks.length} deck{currentDecks.length!==1?"s":""}</div></>
                ) : isUncategorized ? (
                  <><div style={{ display:"inline-block", fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#8C8880", background:"#F0EDE8", padding:"2px 10px", borderRadius:20, marginBottom:6 }}>Unsorted</div>
                  <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, letterSpacing:-0.5, color:"#1A1814", marginBottom:4 }}>📂 Uncategorized</h1>
                  <div style={{ fontSize:12, color:"#8C8880" }}>{currentDecks.length} deck{currentDecks.length!==1?"s":""} without a folder</div></>
                ) : currentNode ? (
                  <><div style={{ display:"inline-block", fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:currentNode.color, background:`${currentNode.color}18`, padding:"2px 10px", borderRadius:20, marginBottom:6 }}>{FC_TYPE_META[currentNode.type]?.label}</div>
                  <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, letterSpacing:-0.5, color:"#1A1814", marginBottom:4 }}>{currentNode.label}</h1>
                  <div style={{ fontSize:12, color:"#8C8880" }}>{allHere.length} deck{allHere.length!==1?"s":""}</div></>
                ) : (
                  <><h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:900, letterSpacing:-0.5, color:"#1A1814", marginBottom:4 }}>All Folders</h1>
                  <div style={{ fontSize:12, color:"#8C8880" }}>{allDecks.length} total deck{allDecks.length!==1?"s":""}</div></>
                )}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {isUserFolder && activeFolderId && (
                  <button onClick={() => { setAddingSubFolder(activeFolderId); setAddingFolder(false); setNewFolderName(""); }}
                    style={{ background:"none", border:"1.5px solid #D8D5CE", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, color:"#8C8880", cursor:"pointer", transition:"all 0.15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#4F6EF7";e.currentTarget.style.color="#4F6EF7";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#D8D5CE";e.currentTarget.style.color="#8C8880";}}>
                    📂 New Subfolder
                  </button>
                )}
                <button onClick={onNewDeck} className="fc-btn" style={{ background:"#1A1814", border:"none", borderRadius:8, padding:"9px 16px", fontSize:13, fontWeight:700, cursor:"pointer", color:"#F7F6F2", transition:"all 0.2s" }}>+ New Deck</button>
              </div>
            </div>

            {/* ── Subfolders inside a user folder — show in main panel ── */}
            {isUserFolder && activeFolderId && (() => {
              const subFolders = userFolders.filter(f => f.parentId === activeFolderId);
              if (subFolders.length === 0) return null;
              return (
                <div style={{ marginBottom:32 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#A8A59E", marginBottom:12 }}>Subfolders</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:12 }}>
                    {subFolders.map((sub, i) => {
                      const subCount = allDecks.filter(d => d.folderKey === sub.id).length;
                      const subSubs = userFolders.filter(f => f.parentId === sub.id).length;
                      return (
                        <div key={sub.id} className="fc-fade-up"
                          style={{ animationDelay:`${i*0.05}s`, background:"#fff", border:"1px solid #ECEAE4", borderLeft:"3px solid #4F6EF7", borderRadius:10, padding:"16px 18px", cursor:"pointer", transition:"all 0.18s", position:"relative" }}
                          onClick={() => setFolderPath(["__uf__", sub.id])}
                          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.08)";}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                            <span style={{ fontSize:18 }}>📂</span>
                            <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#4F6EF7", background:"#EEF1FF", padding:"2px 8px", borderRadius:20 }}>Subfolder</span>
                          </div>
                          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:800, color:"#1A1814", marginBottom:6 }}>{sub.name}</div>
                          <div style={{ fontSize:11, color:"#A8A59E" }}>
                            {subCount} deck{subCount!==1?"s":""}
                            {subSubs > 0 && ` · ${subSubs} subfolder${subSubs!==1?"s":""}`}
                          </div>
                          <button onClick={e=>{e.stopPropagation();if(window.confirm(`Delete "${sub.name}"?`)){setUserFolders&&setUserFolders(fs=>fs.filter(x=>x.id!==sub.id&&x.parentId!==sub.id));}}}
                            style={{ position:"absolute", top:10, right:10, background:"none", border:"none", fontSize:11, color:"#D8D5CE", cursor:"pointer" }}
                            onMouseEnter={e=>e.currentTarget.style.color="#E85D3F"}
                            onMouseLeave={e=>e.currentTarget.style.color="#D8D5CE"}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Stats bar */}
            {allHere.length > 0 && (
              <div style={{ display:"flex", gap:10, marginBottom:28 }}>
                {[
                  { label:"Decks",      value:allHere.length },
                  { label:"Cards",      value:allHere.reduce((a,d)=>a+(d.cardCount||d.cards?.length||0),0) },
                  { label:"Avg Mastery",value:`${Math.round(allHere.reduce((a,d)=>a+(d.mastery||0),0)/allHere.length)}%` },
                  { label:"Mastered",   value:allHere.filter(d=>d.mastery===100).length },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background:"#fff", border:"1px solid #ECEAE4", borderRadius:10, padding:"12px 14px", flex:1, textAlign:"center" }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:800, color:"#1A1814" }}>{value}</div>
                    <div style={{ fontSize:10, color:"#8C8880", marginTop:2, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Subfolder grid — FC_TREE children PLUS user folders at root ── */}
            {!isUserFolder && (currentChildren.length > 0 || (folderPath.length === 0 && userFolders.length > 0)) && (
              <div style={{ marginBottom:32 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#A8A59E", marginBottom:12 }}>Folders</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:12 }}>
                  {/* Structured tree children */}
                  {currentChildren.map((child, i) => {
                    const childIds   = fcGetAllDeckIds(child);
                    const meta       = FC_TYPE_META[child.type] || {};
                    return (
                      <div key={child.id} className="fc-fade-up" style={{ animationDelay:`${i*0.05}s`, background:"#fff", border:"1px solid #ECEAE4", borderLeft:`3px solid ${child.color}`, borderRadius:10, padding:"16px 18px", cursor:"pointer", transition:"all 0.18s" }}
                        onClick={() => enterFolder(child.id)}
                        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontSize:18 }}>{meta.icon}</span>
                          <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:child.color, background:`${child.color}15`, padding:"2px 8px", borderRadius:20 }}>{meta.label}</span>
                        </div>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:800, color:"#1A1814", marginBottom:6 }}>{child.label}</div>
                        <div style={{ fontSize:11, color:"#A8A59E" }}>{childIds.length} deck{childIds.length!==1?"s":""}</div>
                      </div>
                    );
                  })}
                  {/* User folders — shown inline at root, same grid */}
                  {folderPath.length === 0 && userFolders.filter(f=>!f.parentId).map((f, i) => {
                    const count = allDecks.filter(d => d.folderKey === f.id).length;
                    return (
                      <div key={f.id} className="fc-fade-up" style={{ animationDelay:`${(currentChildren.length+i)*0.05}s`, background:"#fff", border:"1px solid #ECEAE4", borderLeft:"3px solid #4F6EF7", borderRadius:10, padding:"16px 18px", cursor:"pointer", transition:"all 0.18s", position:"relative" }}
                        onClick={() => setFolderPath(["__uf__", f.id])}
                        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontSize:18 }}>📁</span>
                          <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#4F6EF7", background:"#EEF1FF", padding:"2px 8px", borderRadius:20 }}>My Folder</span>
                        </div>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:800, color:"#1A1814", marginBottom:6 }}>{f.name}</div>
                        <div style={{ fontSize:11, color:"#A8A59E" }}>{count} deck{count!==1?"s":""}</div>
                        <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete folder "${f.name}"? Decks inside will move to All Folders.`)) { setUserFolders && setUserFolders(fs => fs.filter(x => x.id !== f.id)); } }}
                          style={{ position:"absolute", top:10, right:10, background:"none", border:"none", fontSize:11, color:"#D8D5CE", cursor:"pointer" }}
                          onMouseEnter={e=>e.currentTarget.style.color="#E85D3F"} onMouseLeave={e=>e.currentTarget.style.color="#D8D5CE"}>✕</button>
                      </div>
                    );
                  })}
                  {/* Uncategorized auto-folder — only appears when decks exist without a folder */}
                  {folderPath.length === 0 && (() => {
                    const allFolderKeys = new Set([
                      ...userFolders.map(f => f.id),
                      ...userFolders.map(f => f.name),
                    ]);
                    const uncategorized = allDecks.filter(d => !d.folderKey || (!allFolderKeys.has(d.folderKey) && !d.folderKey.includes("›")));
                    if (uncategorized.length === 0) return null;
                    return (
                      <div className="fc-fade-up" style={{ background:"#fff", border:"1px solid #ECEAE4", borderLeft:"3px solid #A8A59E", borderRadius:10, padding:"16px 18px", cursor:"pointer", transition:"all 0.18s" }}
                        onClick={() => setFolderPath(["__uncategorized__"])}
                        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.08)";}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontSize:18 }}>📂</span>
                          <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#8C8880", background:"#F0EDE8", padding:"2px 8px", borderRadius:20 }}>Unsorted</span>
                        </div>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:800, color:"#1A1814", marginBottom:6 }}>Uncategorized</div>
                        <div style={{ fontSize:11, color:"#A8A59E" }}>{uncategorized.length} deck{uncategorized.length!==1?"s":""} without a folder</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Deck grid */}
            {currentDecks.length > 0 ? (
              <div>
                {(currentChildren.length > 0 || (folderPath.length === 0 && userFolders.length > 0)) && !isUserFolder && (
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#A8A59E", marginBottom:12 }}>Decks</div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:14 }}>
                  {currentDecks.map((d, i) => <FCDeckCard key={d.id} deck={d} index={i} onOpen={onOpenDeck} onStudy={onStartStudy} onDelete={onDeleteDeck} />)}
                </div>
              </div>
            ) : (
              !isDraftsFolder && (currentNode || isUserFolder) && (
                <div style={{ textAlign:"center", padding:"60px 0", color:"#8C8880" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
                  <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>No decks in this folder yet</div>
                  <div style={{ fontSize:13, marginBottom:20 }}>When you create a deck and assign it here, it'll appear in this folder.</div>
                  <button onClick={onNewDeck} style={{ background:"#1A1814", border:"none", borderRadius:8, padding:"10px 22px", fontSize:13, fontWeight:700, cursor:"pointer", color:"#F7F6F2" }}>+ Create a Deck</button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Deck Card (shared) ────────────────────────────────────────────────────────
function FCDeckCard({ deck, index, onOpen, onStudy, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const dueCount = (() => {
    const now = Date.now();
    return (deck.cards||[]).filter(c => !c.dueDate || new Date(c.dueDate).getTime() <= now).length;
  })();
  return (
    <div className="fc-deck-card fc-fade-up" style={{ animationDelay: `${index * 0.06}s`, background: "#fff", border: "1px solid #ECEAE4", borderTop: `3px solid ${deck.color}`, borderRadius: 12, padding: "22px 22px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position:"relative" }}
      onClick={() => !confirmDel && onOpen(deck)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: deck.color, background: `${deck.color}18`, padding: "3px 10px", borderRadius: 20 }}>{deck.subject}</div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {dueCount > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#fff", background:"#F5C842", borderRadius:10, padding:"2px 7px" }}>{dueCount} due</span>}
          <span style={{ fontSize: 11, color: "#A8A59E" }}>{deck.cardCount || deck.cards?.length || 0} cards</span>
          {onDelete && !confirmDel && (
            <button onClick={e => { e.stopPropagation(); setConfirmDel(true); }}
              style={{ background:"none", border:"none", fontSize:12, color:"#D8D5CE", cursor:"pointer", lineHeight:1, padding:"2px 3px", transition:"color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color="#E85D3F"}
              onMouseLeave={e => e.currentTarget.style.color="#D8D5CE"}
              title="Delete deck">✕</button>
          )}
        </div>
      </div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#1A1814", marginBottom: 16, lineHeight: 1.3 }}>{deck.title}</h3>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A8A59E", marginBottom: 6 }}>
          <span>Mastery</span>
          <span style={{ color: deck.mastery === 100 ? "#2BAE7E" : "#1A1814", fontWeight: 600 }}>{deck.mastery || 0}%</span>
        </div>
        <div style={{ height: 4, background: "#ECEAE4", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${deck.mastery || 0}%`, background: deck.mastery === 100 ? "#2BAE7E" : deck.color, borderRadius: 2 }} />
        </div>
      </div>
      {confirmDel ? (
        <div onClick={e => e.stopPropagation()} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 0" }}>
          <span style={{ fontSize:12, color:"#E85D3F", fontWeight:600, flex:1 }}>Delete this deck?</span>
          <button onClick={e => { e.stopPropagation(); onDelete(deck.id); }}
            style={{ padding:"5px 12px", borderRadius:6, border:"none", background:"#E85D3F", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Delete</button>
          <button onClick={e => { e.stopPropagation(); setConfirmDel(false); }}
            style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #ECEAE4", background:"#fff", color:"#8C8880", fontSize:11, cursor:"pointer" }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#A8A59E" }}>Last: {deck.lastStudied || "Never"}</span>
          <button onClick={e => { e.stopPropagation(); onStudy(deck); }} style={{ background: "#1A1814", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.15s" }}
            onMouseEnter={e => e.target.style.opacity = "0.8"} onMouseLeave={e => e.target.style.opacity = "1"}>Study</button>
        </div>
      )}
    </div>
  );
}

// ── Deck View (overview + card list) ─────────────────────────────────────────
function FCDeckView({ deck, onBack, onStudy, onDelete, onTogglePublic, onRate, onEdit, onMoveFolder, onImprove, user, userFolders = [], launchApp }) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [previewCard, setPreviewCard]   = useState(null);
  const [flipped, setFlipped]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [improving, setImproving]       = useState(false);
  const [improveResult, setImproveResult] = useState(null);
  const [confirmApply, setConfirmApply]   = useState(false);


  // Struggling cards — lowest correct rate
  const strugglingCards = [...(deck.cards||[])].filter(c=>(c.timesWrong||0)>0)
    .sort((a,b)=>((b.timesWrong||0)/Math.max(1,(b.timesCorrect||0)+(b.timesWrong||0)))-((a.timesWrong||0)/Math.max(1,(a.timesCorrect||0)+(a.timesWrong||0))))
    .slice(0,5);

  const handleImprove = async () => {
    if (improving) return;
    setImproving(true);
    try {
      const res = await aiFetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:4000,
          messages:[{role:"user",content:`Review these flashcards and improve them. Fix vague definitions, split cards that cover two concepts, combine cards that are too similar, and make terms more precise.\nRespond ONLY with JSON: {"cards":[{"id":"original_id_or_new","term":"...","definition":"...","change":"improved|split|merged|new|unchanged"},...]}\nCards:\n${JSON.stringify(deck.cards.map(c=>({id:c.id,term:c.term,definition:c.definition})))}`}]})});
      const data = await res.json();
      const txt = data.content?.find(b=>b.type==="text")?.text||"";
      const parsed = JSON.parse(txt.replace(/```json|```/g,"").trim());
      setImproveResult(parsed.cards);
    } catch { setImproveResult("error"); }
    setImproving(false);
  };

  const applyImproved = () => {
    if (!improveResult||!onImprove) return;
    const newCards = improveResult.map((c,i)=>({...deck.cards.find(x=>x.id===c.id)||{}, id:c.id||Date.now()+i, term:c.term, definition:c.definition}));
    onImprove(deck.id, newCards);
    setImproveResult(null);
  };

  const handlePrint = () => {
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${deck.title} — Flashcards</title>
<style>
body{font-family:Georgia,serif;margin:0;padding:20px;background:#fff}
h1{font-size:22px;color:#1A1814;margin-bottom:4px}
.sub{font-size:13px;color:#888;margin-bottom:28px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.card{border:1px solid #ddd;border-top:3px solid ${deck.color};border-radius:8px;padding:16px;page-break-inside:avoid}
.label{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin-bottom:8px}
.term{font-size:15px;font-weight:800;color:#1A1814;margin-bottom:10px;min-height:40px}
.divider{border:none;border-top:1px solid #eee;margin:10px 0}
.def{font-size:13px;color:#444;line-height:1.6;min-height:40px;word-break:break-word;overflow-wrap:break-word}
@media print{.card{break-inside:avoid}}
</style></head><body>
<h1>${deck.title}</h1>
<div class="sub">${deck.cards.length} cards · ${deck.subject||""} · Printed from Ace It</div>
<div class="grid">
${deck.cards.map(c=>`<div class="card"><div class="label">Term</div><div class="term">${c.term}</div><hr class="divider"><div class="label">Definition</div><div class="def">${c.definition}</div></div>`).join("")}
</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(),300);
  };

  // Share = copy the public page link (makes the deck public first if needed).
  const handleShare = () => {
    if (deck.publicUrl) {
      try { navigator.clipboard.writeText(window.location.origin + deck.publicUrl); } catch { /* ignore */ }
      setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1600);
    } else if (!deck.isPublic) {
      onTogglePublic && onTogglePublic(deck.id);
    }
  };

  // Build a brain map from this deck's cards and open Brain Map.
  const sendToBrainMap = () => {
          const bmPalette=["#4F6EF7","#E85D3F","#2BAE7E","#9B59B6","#F5C842","#E67E22","#1DA1F2"];
          const nodes=[{id:"root",label:deck.title,x:0,y:0,color:deck.color,parentId:null,deckIds:[deck.id],note:""}];
          const groups={};
          deck.cards.forEach(card=>{const k=card.topic||"General";if(!groups[k])groups[k]=[];groups[k].push(card);});
          Object.entries(groups).forEach(([topic,cards],gi)=>{
            const angle=(gi/Math.max(Object.keys(groups).length,1))*Math.PI*2-Math.PI/2;
            const col=bmPalette[gi%bmPalette.length];
            const bx=Math.cos(angle)*240,by=Math.sin(angle)*240,bid="b"+gi;
            nodes.push({id:bid,label:topic,x:bx,y:by,color:col,parentId:"root",deckIds:[deck.id],note:""});
            cards.slice(0,5).forEach((card,ci)=>{const ca=angle+(ci-(Math.min(cards.length,5)-1)/2)*0.5;nodes.push({id:bid+"c"+ci,label:card.term.slice(0,28),x:bx+Math.cos(ca)*175,y:by+Math.sin(ca)*175,color:col,parentId:bid,deckIds:[],note:card.definition?.slice(0,100)||""});});
          });
          const m={id:"map_"+Date.now(),title:deck.title,color:deck.color,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),nodes};
          try{const ex=JSON.parse(localStorage.getItem("tp_bm_maps")||"[]");localStorage.setItem("tp_bm_maps",JSON.stringify([...ex,m]));}catch{}
          launchApp("brainmap");
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
        <span onClick={onBack} className="fc-nav-link" style={{ fontSize: 13, color: "#8C8880", cursor: "pointer" }}>← My Library</span>
        <span style={{ color: "#D8D5CE" }}>/</span>
        <span style={{ fontSize: 13, color: "#1A1814", fontWeight: 500 }}>{deck.title}</span>
      </div>

      {/* ── HERO ── */}
      <div style={{ background:"#1A1814", borderRadius:16, padding:"36px 32px 28px", marginBottom:24, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.06, backgroundImage:`radial-gradient(circle at 80% 20%, ${deck.color} 0%, transparent 50%)` }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:0 }}>
              {deck.subject && <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:deck.color, marginBottom:10 }}>{deck.subject}</div>}
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(22px,3vw,34px)", fontWeight:900, color:"#F7F6F2", lineHeight:1.2, marginBottom:16, letterSpacing:-0.5 }}>{deck.title}</h1>
              <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:16 }}>
                {[
                  [`${deck.cardCount||deck.cards?.length||0}`, "Cards"],
                  [`${deck.mastery||0}%`, "Mastered"],
                  [""+ (()=>{const now=Date.now();return (deck.cards||[]).filter(c=>!c.dueDate||new Date(c.dueDate).getTime()<=now).length;})(), "Due Today"],
                ].map(([val,label])=>(
                  <div key={label} style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color: label==="Due Today" && (()=>{const now=Date.now();return (deck.cards||[]).filter(c=>!c.dueDate||new Date(c.dueDate).getTime()<=now).length;})()>0 ? "#F5C842" : "#F7F6F2" }}>{val}</div>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"rgba(255,255,255,0.35)", marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
              
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
              <button onClick={onStudy} style={{ background:deck.color, border:"none", borderRadius:10, padding:"13px 28px", fontSize:14, fontWeight:800, cursor:"pointer", color:"#1A1814", whiteSpace:"nowrap", boxShadow:`0 4px 20px ${deck.color}50` }}>Study Now →</button>
              <button onClick={()=>onEdit&&onEdit(deck)} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"10px 20px", fontSize:13, fontWeight:600, cursor:"pointer", color:"rgba(255,255,255,0.7)" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.14)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>✏️ Edit Deck</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION ROW ── */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative" }}>
          <button onClick={()=>setShowFolderPicker(f=>!f)}
            style={{ background:"#fff", border:"1px solid #ECEAE4", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#5A5752", display:"flex", alignItems:"center", gap:6, transition:"all 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#4F6EF7";e.currentTarget.style.color="#4F6EF7";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#5A5752";}}>
            📁 {(userFolders.find(f=>f.id===deck.folderKey)?.name||null)||"Add to Folder"}
          </button>
          {showFolderPicker&&(
            <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, background:"#fff", border:"1.5px solid #ECEAE4", borderRadius:12, padding:"8px", minWidth:200, zIndex:100, boxShadow:"0 8px 24px rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:"#A8A59E", textTransform:"uppercase", padding:"4px 8px 8px" }}>Move to Folder</div>
              <button onClick={()=>{onMoveFolder&&onMoveFolder(deck.id,null);setShowFolderPicker(false);}} style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"none",background:!deck.folderKey?"#F0F0F0":"transparent",cursor:"pointer",textAlign:"left",fontSize:13,color:"#1A1814",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:8 }}>
                <span>📂</span> No Folder
              </button>
              {userFolders.filter(f=>!f.parentId).map(f=>(
                <button key={f.id} onClick={()=>{onMoveFolder&&onMoveFolder(deck.id,f.id,f.name);setShowFolderPicker(false);}} style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"none",background:deck.folderKey===f.id?"#EEF1FF":"transparent",cursor:"pointer",textAlign:"left",fontSize:13,color:"#1A1814",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:8 }}>
                  <span>📁</span> {f.name}
                </button>
              ))}
              {userFolders.length===0&&<div style={{ padding:"8px 10px",fontSize:12,color:"#A8A59E" }}>No folders yet — create one in My Library</div>}
            </div>
          )}
        </div>
        <button onClick={()=>onTogglePublic&&onTogglePublic(deck.id)}
          style={{ background:deck.isPublic?"#2BAE7E":"#fff", border:`1px solid ${deck.isPublic?"#2BAE7E":"#ECEAE4"}`, borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:deck.isPublic?"#fff":"#5A5752", transition:"all 0.2s", display:"flex", alignItems:"center", gap:6 }}
          title={deck.isPublic?"Click to make private":"Click to make public"}>
          {deck.isPublic?"🌐 Public":"🔒 Private"}
        </button>
        {deck.isPublic && deck.publicUrl && <>
          <button onClick={()=>{ try { navigator.clipboard.writeText(window.location.origin + deck.publicUrl); } catch { /* ignore */ } setLinkCopied(true); setTimeout(()=>setLinkCopied(false),1600); }}
            style={{ background:"#fff", border:"1px solid #2BAE7E", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#1A6B4A" }}>{linkCopied?"✓ Link copied":"🔗 Copy link"}</button>
          <a href={deck.publicUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, fontWeight:600, color:"#1A6B4A", padding:"8px 4px" }}>View page ↗</a>
        </>}
        {deck.isPublic && !deck.publicUrl && <span style={{ fontSize:12, color:"#8C8880", padding:"8px 4px" }}>{user ? "Sharing…" : "Log in to share"}</span>}
        {deck.publishError && <span role="alert" style={{ fontSize:12, color:"#B42318", padding:"8px 4px" }}>{deck.publishError}</span>}
        <div style={{ height:20, width:1, background:"#ECEAE4", margin:"0 4px" }}/>
        <button onClick={handleImprove} disabled={improving}
          style={{ background:"#fff", border:"1px solid #ECEAE4", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:improving?"default":"pointer", color:improving?"#A8A59E":"#5A5752", display:"flex", alignItems:"center", gap:6, transition:"all 0.15s" }}
          onMouseEnter={e=>{if(!improving){e.currentTarget.style.borderColor="#9B59B6";e.currentTarget.style.color="#9B59B6";}}}
          onMouseLeave={e=>{if(!improving){e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#5A5752";}}}>
          {improving?<><span style={{ width:10,height:10,borderRadius:"50%",border:"2px solid #9B59B6",borderTopColor:"transparent",animation:"qbSpin 0.6s linear infinite",display:"inline-block" }}/>Improving…</>:"✨ Improve with AI"}
        </button>
        <button onClick={()=>{const txt=deck.cards.map((c,i)=>`${i+1},${JSON.stringify(c.term)},${JSON.stringify(c.definition)}`).join("\n");const blob=new Blob([`Term,Definition\n${txt}`],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${deck.title}.csv`;a.click();}}
          style={{ background:"#fff", border:"1px solid #ECEAE4", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#5A5752", transition:"all 0.15s" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#2BAE7E";e.currentTarget.style.color="#2BAE7E";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#5A5752";}}>
          ↓ Export CSV
        </button>
        <button onClick={handlePrint} style={{ background:"#fff", border:"1px solid #ECEAE4", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#5A5752", transition:"all 0.15s" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#5A5752";e.currentTarget.style.color="#1A1814";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#5A5752";}}>
          🖨 Print
        </button>
        {!deck.isPublic && <button onClick={handleShare} title="Make this deck public and get a link" style={{ background:"#fff", border:"1px solid #ECEAE4", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#5A5752", transition:"all 0.15s" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#4F6EF7";e.currentTarget.style.color="#4F6EF7";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#5A5752";}}>
          🔗 Share
        </button>}
        {launchApp&&<button onClick={sendToBrainMap} style={{ background:"#fff", border:"1px solid #F0A8C0", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#9B1446", transition:"all 0.15s" }}
          onMouseEnter={e=>e.currentTarget.style.background="#FFF5F8"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
          🧠 Brain Map
        </button>}
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          {!confirmDelete?(
            <button onClick={()=>setConfirmDelete(true)} style={{ background:"#fff", border:"1px solid #ECEAE4", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#C8C5BE", transition:"all 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#E85D3F";e.currentTarget.style.color="#E85D3F";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#C8C5BE";}}>🗑 Delete</button>
          ):(
            <div style={{ display:"flex", gap:6, alignItems:"center", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"6px 10px" }}>
              <span style={{ fontSize:12, color:"#E85D3F", fontWeight:600 }}>Delete deck?</span>
              <button onClick={()=>onDelete&&onDelete(deck.id)} style={{ padding:"4px 10px", borderRadius:6, border:"none", background:"#E85D3F", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Delete</button>
              <button onClick={()=>setConfirmDelete(false)} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #FECACA", background:"transparent", color:"#8C8880", fontSize:11, cursor:"pointer" }}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Flip preview — appears when a card row is clicked */}
      {previewCard && (
        <div className="fc-fade-in" style={{ background: "#fff", border: "1px solid #ECEAE4", borderTop: `3px solid ${deck.color}`, borderRadius: 14, padding: "40px 36px", textAlign: "center", marginBottom: 24, cursor: "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
          onClick={() => setFlipped(f => !f)}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: flipped ? deck.color : "#A8A59E", marginBottom: 18, transition: "color 0.3s" }}>{flipped ? "Definition" : "Term · tap to flip"}</div>
          <div style={{ fontFamily: flipped ? "'DM Sans', sans-serif" : "'Playfair Display', serif", fontSize: flipped ? 16 : 22, fontWeight: flipped ? 400 : 800, color: "#1A1814", lineHeight: 1.5, transition: "all 0.3s" }}>
            {flipped ? previewCard.definition : previewCard.term}
          </div>
        </div>
      )}

      {/* Mastery bar */}
      <div style={{ background: "#fff", border: "1px solid #ECEAE4", borderRadius: 10, padding: "18px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>Overall Mastery</span>
          <span style={{ color: deck.color, fontWeight: 700 }}>{deck.mastery || 0}%</span>
        </div>
        <div style={{ height: 6, background: "#ECEAE4", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${deck.mastery || 0}%`, background: deck.mastery === 100 ? "#2BAE7E" : deck.color, borderRadius: 3 }} />
        </div>
      </div>

      {/* Improve result */}
      {improveResult === "error" && (
        <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"14px 18px", marginBottom:16, fontSize:13, color:"#E85D3F", fontWeight:500, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>Could not improve deck. Please try again.</span>
          <button onClick={()=>setImproveResult(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#E85D3F" }}>✕</button>
        </div>
      )}
      {improveResult && improveResult !== "error" && (
        <div style={{ background:"#F9F5FF", border:"1.5px solid #9B59B630", borderRadius:14, padding:"20px", marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:800, color:"#1A1814" }}>✨ AI Improved {improveResult.length} cards</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>{setImproveResult(null);setConfirmApply(false);}} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #ECEAE4", background:"transparent", fontSize:12, cursor:"pointer", color:"#8C8880" }}>Discard</button>
              <button onClick={()=>setConfirmApply(true)} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#9B59B6", fontSize:12, fontWeight:700, cursor:"pointer", color:"#fff" }}>Apply Changes</button>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:280, overflowY:"auto" }}>
            {improveResult.map((c,i) => (
              <div key={i} style={{ background:"#fff", border:"1px solid #ECEAE4", borderLeft:`3px solid ${c.change==="improved"?"#9B59B6":c.change==="new"?"#2BAE7E":c.change==="merged"?"#F5C842":"#D8D5CE"}`, borderRadius:8, padding:"12px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1814" }}>{c.term}</div>
                  <span style={{ fontSize:10, fontWeight:700, color:c.change==="improved"?"#9B59B6":c.change==="new"?"#2BAE7E":c.change==="merged"?"#D4A830":"#A8A59E", textTransform:"uppercase", letterSpacing:1 }}>{c.change}</span>
                </div>
                <div style={{ fontSize:12, color:"#5A5752", lineHeight:1.5 }}>{c.definition}</div>
              </div>
            ))}
          </div>
          {confirmApply && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setConfirmApply(false)}>
              <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", maxWidth:380, width:"90%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }} onClick={e=>e.stopPropagation()}>
                <div style={{ fontSize:18, fontWeight:800, color:"#1A1814", marginBottom:8 }}>Apply improvements?</div>
                <div style={{ fontSize:14, color:"#5A5752", marginBottom:24, lineHeight:1.5 }}>This will replace all {deck.cards.length} current cards. This cannot be undone.</div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>setConfirmApply(false)} style={{ flex:1, padding:"10px", borderRadius:8, border:"1px solid #D8D5CE", background:"none", fontSize:13, fontWeight:600, cursor:"pointer", color:"#5A5752" }}>Cancel</button>
                  <button onClick={applyImproved} style={{ flex:1, padding:"10px", borderRadius:8, border:"none", background:"#2BAE7E", fontSize:13, fontWeight:700, cursor:"pointer", color:"#fff" }}>Yes, Apply</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Struggling cards */}
      {strugglingCards.length > 0 && (
        <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:12, padding:"16px 18px", marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#E85D3F", marginBottom:12 }}>⚠️ Needs Work — Your 5 Weakest Cards</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {strugglingCards.map(c => {
              const total=(c.timesCorrect||0)+(c.timesWrong||0); const pct=total>0?Math.round((c.timesCorrect||0)/total*100):0;
              return (
                <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:"#fff", borderRadius:8, border:"1px solid #FECACA" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1A1814" }}>{c.term}</div>
                    <div style={{ fontSize:11, color:"#8C8880" }}>{c.definition.slice(0,60)}{c.definition.length>60?"…":""}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:pct<50?"#E85D3F":"#F5A623" }}>{pct}% correct</div>
                    <div style={{ fontSize:10, color:"#A8A59E" }}>{c.timesWrong} missed</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card list */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#8C8880", marginBottom: 14 }}>All Cards ({deck.cards.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {deck.cards.map((card, i) => {
          const total=(card.timesCorrect||0)+(card.timesWrong||0);
          const pct=total>0?Math.round((card.timesCorrect||0)/total*100):-1;
          return (
            <div key={card.id} className="fc-fade-up" style={{ animationDelay:`${i*0.04}s`, background:"#fff", border:"1px solid #ECEAE4", borderRadius:10, padding:"16px 20px", display:"flex", gap:16, alignItems:"flex-start", cursor:"pointer", transition:"all 0.18s" }}
              onClick={() => { setPreviewCard(card); setFlipped(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=deck.color; e.currentTarget.style.background=`${deck.color}06`; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="#ECEAE4"; e.currentTarget.style.background="#fff"; }}>
              <div style={{ width:28, height:28, background:"#F7F6F2", borderRadius:6, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#A8A59E" }}>{i+1}</div>
              <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, letterSpacing:1, textTransform:"uppercase", color:"#A8A59E", marginBottom:5 }}>Term</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:800, color:"#1A1814" }}>{card.term}</div>
                  {card.image && <img src={card.image} alt="" style={{ maxHeight:60, maxWidth:"100%", marginTop:8, borderRadius:6, objectFit:"contain" }} />}
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, letterSpacing:1, textTransform:"uppercase", color:"#A8A59E", marginBottom:5 }}>Definition</div>
                  <div style={{ fontSize:13, color:"#5A5752", lineHeight:1.55, fontWeight:300 }}>{card.definition}</div>
                </div>
              </div>
              {pct >= 0 && (
                <div style={{ flexShrink:0, textAlign:"right" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:pct>=80?"#2BAE7E":pct>=50?"#F5A623":"#E85D3F" }}>{pct}%</div>
                  <div style={{ fontSize:10, color:"#A8A59E" }}>{total} seen</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Study Setup ───────────────────────────────────────────────────────────────
function FCStudySetup({ deck, onBack, onStart }) {
  const [mode, setMode] = useState("spaced");
  const [selectedIds, setSelectedIds] = useState(new Set(deck.cards.map(c => c.id)));
  const [countVal, setCountVal]       = useState(Math.min(10, deck.cards.length));
  const [progStart, setProgStart]     = useState(Math.min(3, deck.cards.length));

  const toggleCard = (id) => setSelectedIds(s => {
    const n = new Set(s); if (n.has(id)) { if (n.size > 1) n.delete(id); } else n.add(id); return n;
  });
  const selectAll = () => setSelectedIds(new Set(deck.cards.map(c => c.id)));
  const clearAll  = () => setSelectedIds(new Set([deck.cards[0].id]));

  const handleStart = () => {
    let cards;
    if (mode === "pick")         cards = deck.cards.filter(c => selectedIds.has(c.id));
    else if (mode === "count")   cards = deck.cards.slice(0, countVal);
    else if (mode === "spaced") {
      const now = Date.now();
      const due = deck.cards.filter(c => !c.dueDate || new Date(c.dueDate).getTime() <= now);
      cards = due.length > 0 ? due : deck.cards;
    } else cards = deck.cards;
    onStart({ mode, cards, progStart: mode === "progressive" ? progStart : null });
  };

  const dueCount = (() => {
    const now = Date.now();
    return deck.cards.filter(c => !c.dueDate || new Date(c.dueDate).getTime() <= now).length;
  })();

  const readyCount = mode==="pick" ? selectedIds.size : mode==="count" ? countVal
    : mode==="progressive" ? progStart : mode==="spaced" ? dueCount : deck.cards.length;

  const MODES = [
    { id:"spaced",      icon:"✦",  label:"Spaced Repetition", desc:`${dueCount} card${dueCount!==1?"s":""} due — schedules reviews based on your memory` },
    { id:"written",     icon:"✍",  label:"Written Answer",    desc:"Type your answer — AI grades it as correct, close, or wrong" },
    { id:"truefalse",   icon:"◐",  label:"True / False",      desc:"AI generates true and false statements for quick recall" },
    { id:"matching",    icon:"⇄",  label:"Matching",          desc:"Match 6 terms to their definitions" },
    { id:"timed",       icon:"⏱",  label:"Timed",             desc:"Beat the clock — 10 seconds per card" },
    { id:"all",         icon:"▦",  label:"Full Deck",         desc:"Go through every card in order" },
    { id:"quiz",        icon:"◈",  label:"Multiple Choice",   desc:"Multiple choice answers — test your knowledge" },
    { id:"rapid",       icon:"⚡", label:"Rapid Review",      desc:"Quick-flip mode — fast cycle through all cards" },
    { id:"pick",        icon:"◎",  label:"Pick Cards",        desc:"Choose exactly which cards to study" },
    { id:"count",       icon:"🔢", label:"Set Count",         desc:"Choose how many cards to study" },
    { id:"progressive", icon:"📈", label:"Progressive",       desc:"Start small, unlock more as you master each" },
    { id:"challenge",   icon:"🔥", label:"Challenge",         desc:"No hints, no second chances" },
    { id:"focus",       icon:"🧠", label:"Focus Mode",        desc:"Larger text, slower pace, fewer distractions" },
  ];

  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 24px" }}>
      <span onClick={onBack} className="fc-nav-link" style={{ fontSize:13, color:"#8C8880", cursor:"pointer", display:"inline-block", marginBottom:28 }}>← Back to Deck</span>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:deck.color, marginBottom:6 }}>Study Session</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900, color:"#1A1814", letterSpacing:-0.5, marginBottom:6 }}>{deck.title}</h1>
        <div style={{ display:"flex", gap:14, fontSize:13, color:"#8C8880", flexWrap:"wrap" }}>
          <span>{deck.cards.length} cards</span>
          <span>·</span>
          <span style={{ color:"#F5C842", fontWeight:600 }}>{dueCount} due today</span>
          {deck.mastery > 0 && <><span>·</span><span style={{ color:"#2BAE7E", fontWeight:600 }}>{deck.mastery}% mastered</span></>}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:28 }}>
        {MODES.map(m => (
          <div key={m.id} onClick={() => setMode(m.id)}
            style={{ border:`2px solid ${mode===m.id?deck.color:"#ECEAE4"}`, borderRadius:12, padding:"13px 14px", cursor:"pointer", background:mode===m.id?`${deck.color}10`:"#fff", transition:"all 0.18s" }}
            onMouseEnter={e=>{if(mode!==m.id){e.currentTarget.style.borderColor="#D8D5CE";e.currentTarget.style.background="#F7F6F2";}}}
            onMouseLeave={e=>{if(mode!==m.id){e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.background="#fff";}}}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
              <span style={{ fontSize:14 }}>{m.icon}</span>
              <span style={{ fontSize:12, fontWeight:700, color:mode===m.id?"#1A1814":"#5A5752", lineHeight:1.2 }}>{m.label}</span>
              {mode===m.id && <span style={{ marginLeft:"auto", fontSize:10, color:deck.color, fontWeight:700 }}>✓</span>}
            </div>
            <div style={{ fontSize:10, color:"#8C8880", lineHeight:1.4 }}>{m.desc}</div>
          </div>
        ))}
      </div>

      <div className="fc-fade-in" style={{ background:"#fff", border:"1px solid #ECEAE4", borderRadius:14, padding:"22px 22px 18px", marginBottom:24 }}>
        {mode==="spaced" && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#1A1814", marginBottom:8 }}>Spaced Repetition — SM-2 Algorithm</div>
            <p style={{ fontSize:12, color:"#6B6860", lineHeight:1.65, marginBottom:14 }}>After each card you rate <strong>Again / Hard / Good / Easy</strong>. Struggling cards come back sooner. Cards you know well get pushed out further.</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
              {[["Again","#E85D3F","back immediately"],["Hard","#F5A623","shorter interval"],["Good","#4F6EF7","normal interval"],["Easy","#2BAE7E","longer interval"]].map(([l,c,n])=>(
                <div key={l} style={{ padding:"7px 12px", borderRadius:8, background:`${c}12`, border:`1px solid ${c}30` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:c }}>{l}</div>
                  <div style={{ fontSize:10, color:"#8C8880" }}>{n}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:"#F5C842", fontWeight:600 }}>{dueCount} card{dueCount!==1?"s":""} due for review today</div>
          </div>
        )}
        {(mode==="written"||mode==="truefalse"||mode==="matching") && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#1A1814", marginBottom:8 }}>
              {mode==="written"?"Written Answer — AI Graded":mode==="truefalse"?"True / False":"Matching Game"}
            </div>
            <p style={{ fontSize:12, color:"#6B6860", lineHeight:1.65 }}>
              {mode==="written"&&"You'll see the term. Type your best answer. AI grades it as Correct, Close, or Wrong and shows the real answer."}
              {mode==="truefalse"&&"You'll see statements — some true, some AI-modified to be false. Pick True or False for each one."}
              {mode==="matching"&&"6 terms on the left, 6 definitions on the right. Click a term then click its matching definition."}
            </p>
          </div>
        )}
        {mode==="pick" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#1A1814" }}>Select cards to study</div>
              <div style={{ display:"flex", gap:10 }}>
                <span onClick={selectAll} style={{ fontSize:11, fontWeight:600, color:deck.color, cursor:"pointer" }}>Select all</span>
                <span style={{ color:"#D8D5CE" }}>·</span>
                <span onClick={clearAll} style={{ fontSize:11, fontWeight:600, color:"#8C8880", cursor:"pointer" }}>Clear</span>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {deck.cards.map((card,i) => {
                const on = selectedIds.has(card.id);
                return (
                  <div key={card.id} onClick={() => toggleCard(card.id)}
                    style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 14px", borderRadius:8, border:`1.5px solid ${on?deck.color:"#ECEAE4"}`, background:on?`${deck.color}06`:"#F7F6F2", cursor:"pointer", transition:"all 0.15s" }}>
                    <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${on?deck.color:"#D8D5CE"}`, background:on?deck.color:"#fff", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", marginTop:1 }}>
                      {on && <span style={{ fontSize:9, color:"#fff", fontWeight:900 }}>✓</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1A1814", fontFamily:"'Playfair Display',serif" }}>{card.term}</div>
                      <div style={{ fontSize:11, color:"#8C8880" }}>{card.definition.length>80?card.definition.slice(0,80)+"…":card.definition}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {mode==="count" && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#1A1814", marginBottom:18 }}>How many cards?</div>
            <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:16 }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:52, fontWeight:900, color:deck.color, minWidth:60, textAlign:"center", lineHeight:1 }}>{countVal}</span>
              <div style={{ flex:1 }}>
                <input type="range" min={1} max={deck.cards.length} value={countVal} onChange={e=>setCountVal(Number(e.target.value))} style={{ width:"100%", accentColor:deck.color }} />
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#A8A59E", marginTop:6 }}><span>1</span><span>{deck.cards.length}</span></div>
              </div>
            </div>
          </div>
        )}
        {mode==="progressive" && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#1A1814", marginBottom:6 }}>Start with how many?</div>
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:14 }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:44, fontWeight:900, color:deck.color, minWidth:50, textAlign:"center", lineHeight:1 }}>{progStart}</span>
              <div style={{ flex:1 }}>
                <input type="range" min={1} max={Math.min(deck.cards.length,10)} value={progStart} onChange={e=>setProgStart(Number(e.target.value))} style={{ width:"100%", accentColor:deck.color }} />
              </div>
            </div>
          </div>
        )}
        {(mode==="all"||mode==="rapid"||mode==="challenge"||mode==="focus"||mode==="quiz") && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#1A1814", marginBottom:8 }}>All {deck.cards.length} cards</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {deck.cards.map(card => (
                <div key={card.id} style={{ fontSize:10, padding:"3px 10px", borderRadius:20, background:`${deck.color}15`, color:deck.color, fontWeight:600, border:`1px solid ${deck.color}28` }}>{card.term}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:13, color:"#8C8880" }}>{readyCount} card{readyCount!==1?"s":""} selected</div>
        <button onClick={handleStart} className="fc-btn" style={{ background:"#1A1814", border:"none", borderRadius:10, padding:"13px 28px", fontSize:14, fontWeight:700, cursor:"pointer", color:"#F7F6F2", transition:"all 0.2s" }}>
          Start Studying →
        </button>
      </div>
    </div>
  );
}

function sm2Update(card, quality) {
  const ef = Math.max(1.3, (card.easeFactor||2.5) + 0.1*(quality-3) - 0.08*(quality-2));
  let interval;
  if (quality === 0) interval = 1;
  else if (quality === 1) interval = Math.max(1, Math.round((card.interval||1)*1.2));
  else if ((card.timesCorrect||0) < 2) interval = quality===3 ? 4 : 1;
  else interval = Math.round((card.interval||1)*ef);
  const dueDate = new Date(Date.now() + interval*86400000).toISOString();
  return { ...card, interval, easeFactor:ef, dueDate,
    timesCorrect:(card.timesCorrect||0)+(quality>=2?1:0),
    timesWrong:(card.timesWrong||0)+(quality<2?1:0),
    lastStudied:new Date().toISOString() };
}

function FCStudyView({ deck, config, onBack, onBackToLibrary, onUpdateCards }) {
  const { mode, cards: configCards, progStart } = config;
  const [cards, setCards]     = useState(configCards);
  const [index, setIndex]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [timedSecs, setTimedSecs]   = useState(10);
  const [timedExpired, setTimedExpired] = useState(false);
  const [showHint, setShowHint]     = useState(false);
  const timedRef = useRef(null);
  const [known, setKnown]     = useState(new Set());
  const [wrong, setWrong]     = useState(new Set());
  const [round, setRound]     = useState(1);
  const [showRoundToast, setShowRoundToast] = useState(false);
  const [sessionDone, setSessionDone]       = useState(false);
  const [activeCount, setActiveCount]       = useState(mode==="progressive"?progStart:configCards.length);
  const [unlockAnim, setUnlockAnim]         = useState(false);
  const [writtenInput, setWrittenInput]     = useState("");
  const [writtenResult, setWrittenResult]   = useState(null);
  const [writtenLoading, setWrittenLoading] = useState(false);
  const [tfStatements, setTfStatements]     = useState([]);
  const [tfLoading, setTfLoading]           = useState(false);
  const [tfAnswer, setTfAnswer]             = useState(null);
  const [matchCards, setMatchCards]         = useState([]);
  const [matchSelected, setMatchSelected]   = useState(null);
  const [matchPairs, setMatchPairs]         = useState(new Map());
  const [matchError, setMatchError]         = useState(null);
  const [matchComplete, setMatchComplete]   = useState(false);
  const [matchRound, setMatchRound]         = useState(0);

  const workingCards = mode==="progressive" ? cards.slice(0,activeCount) : cards;
  const card = workingCards[index];

  useEffect(() => {
    if (mode==="matching") initMatchRound(0);
    if (mode==="truefalse") generateTF();
  }, []);

  useEffect(() => {
    if (mode !== "timed") return;
    setTimedSecs(10); setTimedExpired(false); setShowHint(false);
    clearInterval(timedRef.current);
    timedRef.current = setInterval(() => {
      setTimedSecs(s => {
        if (s <= 1) {
          clearInterval(timedRef.current);
          setTimedExpired(true);
          setTimeout(() => advance(), 1200);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timedRef.current);
  }, [mode, index]);

  const initMatchRound = (rnd) => {
    const batch = cards.slice(rnd*6, rnd*6+6);
    if (!batch.length) { setSessionDone(true); return; }
    const defs = [...batch].sort(()=>Math.random()-0.5);
    setMatchCards(batch.map((c,i)=>({...c,_defShown:defs[i].definition,_defId:defs[i].id})));
    setMatchSelected(null); setMatchPairs(new Map()); setMatchError(null); setMatchComplete(false);
  };

  const generateTF = async () => {
    setTfLoading(true);
    try {
      const sample = cards.slice(0,Math.min(10,cards.length));
      const res = await aiFetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1200,
          messages:[{role:"user",content:`Create 10 true/false statements from these flashcards. 5 true, 5 false (plausible but wrong). Mix them randomly.\nRespond ONLY with JSON: {"statements":[{"text":"...","isTrue":true,"explanation":"..."}]}\nCards:\n${sample.map(c=>`${c.term}: ${c.definition}`).join("\n")}`}]})});
      const data = await res.json();
      const txt = data.content?.find(b=>b.type==="text")?.text||"";
      const parsed = JSON.parse(txt.replace(/```json|```/g,"").trim());
      setTfStatements(parsed.statements||[]);
    } catch { setTfStatements(cards.slice(0,10).map(c=>({text:`${c.term}: ${c.definition}`,isTrue:true,explanation:"Correct"}))); }
    setTfLoading(false);
  };

  const advance = () => {
    const next = index+1;
    if (next >= workingCards.length) {
      if (mode==="progressive"&&known.size===workingCards.length&&activeCount<cards.length) {
        setUnlockAnim(true);
        setTimeout(()=>{setActiveCount(n=>Math.min(n+1,cards.length));setKnown(new Set());setIndex(0);setFlipped(false);setUnlockAnim(false);},1800);
      } else {
        setIndex(0);setFlipped(false);setRound(r=>r+1);
        setShowRoundToast(true);setTimeout(()=>setShowRoundToast(false),2200);
        if (["all","spaced","challenge","focus","written","truefalse"].includes(mode)) setSessionDone(true);
      }
    } else { setIndex(next);setFlipped(false);setWrittenInput("");setWrittenResult(null);setTfAnswer(null); }
  };

  const rateCard = (quality) => {
    recordStudyDay();
    const updated = sm2Update(card, quality);
    const newCards = cards.map(c=>c.id===card.id?updated:c);
    setCards(newCards);
    if (onUpdateCards) onUpdateCards(deck.id, newCards);
    if (quality>=2) setKnown(p=>{const n=new Set(p);n.add(card.id);return n;});
    else setWrong(p=>{const n=new Set(p);n.add(card.id);return n;});
    advance();
  };

  const gradeWritten = async () => {
    if (!writtenInput.trim()) return;
    setWrittenLoading(true);
    try {
      const res = await aiFetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:200,
          messages:[{role:"user",content:`Grade this flashcard answer. Term: "${card.term}". Correct: "${card.definition}". Student: "${writtenInput}".\nRespond ONLY with JSON: {"grade":"correct"|"close"|"wrong","feedback":"one short sentence"}`}]})});
      const data = await res.json();
      const txt = data.content?.find(b=>b.type==="text")?.text||"";
      const r = JSON.parse(txt.replace(/```json|```/g,"").trim());
      setWrittenResult(r);
      if (r.grade==="correct") setKnown(p=>{const n=new Set(p);n.add(card.id);return n;});
      else if (r.grade==="wrong") setWrong(p=>{const n=new Set(p);n.add(card.id);return n;});
    } catch { setWrittenResult({grade:"close",feedback:"Could not auto-grade."}); }
    setWrittenLoading(false);
  };

  const handleMatchTerm = (id) => { setMatchSelected(id); setMatchError(null); };
  const handleMatchDef  = (defId) => {
    if (!matchSelected) return;
    if (matchSelected===defId) {
      const np=new Map(matchPairs); np.set(matchSelected,defId); setMatchPairs(np); setMatchSelected(null);
      if (np.size===matchCards.length) {
        setMatchComplete(true);
        setKnown(p=>{const n=new Set(p);matchCards.forEach(c=>n.add(c.id));return n;});
      }
    } else { setMatchError(matchSelected); setTimeout(()=>setMatchError(null),800); setMatchSelected(null); }
  };

  const answerTF = (answer) => {
    const stmt = tfStatements[index]; if (!stmt) return;
    setTfAnswer(answer);
    if (answer===stmt.isTrue) setKnown(p=>{const n=new Set(p);n.add(index);return n;});
    else setWrong(p=>{const n=new Set(p);n.add(index);return n;});
  };

  if (sessionDone) {
    const total=workingCards.length; const pct=total>0?Math.round(known.size/total*100):0;
    return (
      <div style={{ maxWidth:560, margin:"0 auto", padding:"60px 24px", textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>{pct>=80?"🎉":pct>=50?"👍":"💪"}</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:900, color:"#1A1814", marginBottom:8 }}>Session Complete!</h2>
        <p style={{ fontSize:15, color:"#8C8880", marginBottom:32 }}>You studied {total} card{total!==1?"s":""}</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:32 }}>
          {[["✅","Correct",known.size,"#2BAE7E"],["❌","Missed",wrong.size,"#E85D3F"],["📊","Score",`${pct}%`,deck.color]].map(([icon,label,val,color])=>(
            <div key={label} style={{ background:"#fff", border:"1.5px solid #ECEAE4", borderRadius:14, padding:"18px 14px" }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color }}>{val}</div>
              <div style={{ fontSize:11, color:"#A8A59E", textTransform:"uppercase", letterSpacing:1, marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>
        {wrong.size>0 && (
          <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:12, padding:"16px", marginBottom:24, textAlign:"left" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#E85D3F", marginBottom:10 }}>Cards to review:</div>
            {workingCards.filter(c=>wrong.has(c.id)).map(c=>(
              <div key={c.id} style={{ fontSize:13, color:"#1A1814", padding:"6px 0", borderBottom:"1px solid #FECACA" }}>
                <strong>{c.term}</strong> — {c.definition.slice(0,60)}{c.definition.length>60?"…":""}
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={onBack} style={{ padding:"12px 24px", borderRadius:10, border:"1px solid #ECEAE4", background:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", color:"#5A5752" }}>Study Again</button>
          <button onClick={onBackToLibrary} style={{ padding:"12px 28px", borderRadius:10, border:"none", background:"#1A1814", fontSize:14, fontWeight:700, cursor:"pointer", color:"#F7F6F2" }}>Back to Library</button>
        </div>
      </div>
    );
  }

  if (unlockAnim) return (
    <div style={{ maxWidth:600, margin:"0 auto", padding:"80px 24px", textAlign:"center" }}>
      <div className="fc-fade-in" style={{ background:"#fff", border:`2px solid ${deck.color}`, borderRadius:20, padding:"48px 40px", boxShadow:`0 0 60px ${deck.color}30` }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔓</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color:"#1A1814", marginBottom:8 }}>New Card Unlocked!</div>
        <div style={{ fontSize:14, color:"#6B6860" }}>Adding: <strong>{cards[activeCount]?.term}</strong></div>
      </div>
    </div>
  );

  const progress = workingCards.length>0 ? Math.round((index/workingCards.length)*100) : 0;

  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"32px 24px" }}>
      <style>{`
        .fc-flip-scene{perspective:1200px}
        .fc-flip-card{position:relative;width:100%;min-height:280px;transform-style:preserve-3d;transition:transform 0.5s cubic-bezier(0.45,0.05,0.55,0.95);cursor:pointer}
        .fc-flip-card.is-flipped{transform:rotateY(180deg)}
        .fc-flip-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 44px;text-align:center;box-shadow:0 4px 32px rgba(0,0,0,0.07)}
        .fc-flip-front{background:#fff;border:1px solid #ECEAE4;border-top:4px solid ${deck.color}}
        .fc-flip-back{background:${deck.color}0D;border:2px solid ${deck.color}50;border-top:4px solid ${deck.color};transform:rotateY(180deg)}
        @keyframes fc-round-toast{0%{opacity:0;transform:translateX(-50%) translateY(-10px)}15%{opacity:1;transform:translateX(-50%) translateY(0)}80%{opacity:1}100%{opacity:0}}
        .fc-round-toast{animation:fc-round-toast 2.2s ease forwards}
        @keyframes match-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
        .match-error{animation:match-shake 0.3s ease}
        @keyframes qbSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      {showRoundToast && (
        <div className="fc-round-toast" style={{ position:"fixed",top:80,left:"50%",background:"#1A1814",borderRadius:10,padding:"10px 22px",zIndex:999,display:"flex",alignItems:"center",gap:10,pointerEvents:"none" }}>
          <span style={{ fontSize:16 }}>🔁</span>
          <span style={{ fontSize:13, fontWeight:700, color:"#F7F6F2" }}>Round {round} complete!</span>
          <span style={{ fontSize:12, color:"#2BAE7E", fontWeight:600 }}>{known.size}/{workingCards.length} ✓</span>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <button onClick={onBack} style={{ background:"none", border:"1px solid #ECEAE4", borderRadius:7, padding:"6px 14px", fontSize:13, cursor:"pointer", color:"#8C8880", fontWeight:500, transition:"all 0.15s" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#1A1814";e.currentTarget.style.color="#1A1814";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#8C8880";}}>Leave Set</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1A1814" }}>{deck.title}</div>
          <div style={{ fontSize:11, color:"#A8A59E", marginTop:2 }}>
            {!["matching","truefalse"].includes(mode) ? `${index+1} / ${workingCards.length}` : `Round ${matchRound+1}`}
            {mode==="spaced"&&<span style={{ color:"#F5C842", marginLeft:6 }}>· Spaced Rep</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, fontSize:13, fontWeight:700 }}>
          {known.size>0&&<span style={{ color:"#2BAE7E" }}>{known.size} ✓</span>}
          {wrong.size>0&&<span style={{ color:"#E85D3F" }}>{wrong.size} ✗</span>}
        </div>
      </div>

      <div style={{ height:4, background:"#ECEAE4", borderRadius:2, marginBottom:24, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${progress}%`, background:deck.color, borderRadius:2, transition:"width 0.4s ease" }} />
      </div>

      {/* MATCHING */}
      {mode==="matching" && (
        <div>
          {matchComplete ? (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <div style={{ fontSize:40, marginBottom:14 }}>✅</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color:"#1A1814", marginBottom:16 }}>Round Complete!</div>
              {matchRound*6+6 < cards.length ? (
                <button onClick={()=>{const nr=matchRound+1;setMatchRound(nr);initMatchRound(nr);}} style={{ padding:"12px 28px", borderRadius:10, border:"none", background:"#1A1814", fontSize:14, fontWeight:700, cursor:"pointer", color:"#F7F6F2" }}>Next 6 Cards →</button>
              ) : (
                <button onClick={()=>setSessionDone(true)} style={{ padding:"12px 28px", borderRadius:10, border:"none", background:"#2BAE7E", fontSize:14, fontWeight:700, cursor:"pointer", color:"#fff" }}>Finish Session →</button>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"#8C8880", textAlign:"center", marginBottom:16 }}>Click a term, then click its definition</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#A8A59E", textTransform:"uppercase" }}>Terms</div>
                  {matchCards.map(c => {
                    const matched=matchPairs.has(c.id); const sel=matchSelected===c.id; const err=matchError===c.id;
                    return (
                      <div key={c.id} onClick={()=>!matched&&handleMatchTerm(c.id)} className={err?"match-error":""}
                        style={{ padding:"12px 14px", borderRadius:10, border:`2px solid ${matched?"#2BAE7E":sel?deck.color:err?"#E85D3F":"#ECEAE4"}`, background:matched?"#F0FDF4":sel?`${deck.color}10`:"#fff", cursor:matched?"default":"pointer", fontSize:13, fontWeight:600, color:"#1A1814", transition:"all 0.18s", opacity:matched?0.6:1 }}>
                        {c.term}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#A8A59E", textTransform:"uppercase" }}>Definitions</div>
                  {matchCards.map(c => {
                    const matched=[...matchPairs.entries()].some(([k,v])=>v===c.id);
                    return (
                      <div key={`d-${c.id}`} onClick={()=>!matched&&matchSelected&&handleMatchDef(c.id)}
                        style={{ padding:"12px 14px", borderRadius:10, border:`2px solid ${matched?"#2BAE7E":"#ECEAE4"}`, background:matched?"#F0FDF4":matchSelected?"#F7F6F2":"#fff", cursor:matched||!matchSelected?"default":"pointer", fontSize:12, color:"#5A5752", lineHeight:1.5, transition:"all 0.18s", opacity:matched?0.6:1 }}>
                        {c._defShown?.length>80?c._defShown.slice(0,80)+"…":c._defShown}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRUE/FALSE */}
      {mode==="truefalse" && (
        <div>
          {tfLoading ? (
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ width:40,height:40,borderRadius:"50%",border:"3px solid #ECEAE4",borderTopColor:deck.color,animation:"qbSpin 0.8s linear infinite",margin:"0 auto 16px" }} />
              <div style={{ fontSize:14, color:"#8C8880" }}>Generating statements…</div>
            </div>
          ) : index<tfStatements.length ? (
            <div>
              <div style={{ background:"#fff", border:`2px solid ${deck.color}30`, borderTop:`4px solid ${deck.color}`, borderRadius:16, padding:"40px 36px", textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#A8A59E", textTransform:"uppercase", marginBottom:20 }}>True or False?</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:800, color:"#1A1814", lineHeight:1.5 }}>{tfStatements[index]?.text}</div>
              </div>
              {tfAnswer===null ? (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[[true,"✓ True","#2BAE7E","#F0FDF4"],[false,"✗ False","#E85D3F","#FEF2F2"]].map(([val,lbl,c,bg])=>(
                    <button key={String(val)} onClick={()=>answerTF(val)}
                      style={{ padding:"16px", borderRadius:12, border:`2px solid ${c}`, background:bg, fontSize:16, fontWeight:800, cursor:"pointer", color:c, transition:"all 0.18s" }}
                      onMouseEnter={e=>{e.currentTarget.style.background=c;e.currentTarget.style.color="#fff";}}
                      onMouseLeave={e=>{e.currentTarget.style.background=bg;e.currentTarget.style.color=c;}}>{lbl}</button>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ padding:"16px 20px", borderRadius:12, background:tfAnswer===tfStatements[index]?.isTrue?"#F0FDF4":"#FEF2F2", border:`1.5px solid ${tfAnswer===tfStatements[index]?.isTrue?"#2BAE7E":"#E85D3F"}`, marginBottom:16, textAlign:"center" }}>
                    <div style={{ fontSize:16, fontWeight:800, color:tfAnswer===tfStatements[index]?.isTrue?"#2BAE7E":"#E85D3F", marginBottom:6 }}>
                      {tfAnswer===tfStatements[index]?.isTrue?"✓ Correct!":"✗ Incorrect"}
                    </div>
                    <div style={{ fontSize:13, color:"#5A5752" }}>{tfStatements[index]?.explanation}</div>
                  </div>
                  <button onClick={()=>{setTfAnswer(null);advance();}} style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:"#1A1814", fontSize:14, fontWeight:700, cursor:"pointer", color:"#F7F6F2" }}>Next →</button>
                </div>
              )}
            </div>
          ) : <div style={{ textAlign:"center", padding:"40px 0" }}><button onClick={()=>setSessionDone(true)} style={{ padding:"12px 28px", borderRadius:10, border:"none", background:"#1A1814", fontSize:14, fontWeight:700, cursor:"pointer", color:"#F7F6F2" }}>See Results →</button></div>}
        </div>
      )}

      {/* WRITTEN ANSWER */}
      {mode==="written" && card && (
        <div>
          <div style={{ background:"#fff", border:`2px solid ${deck.color}30`, borderTop:`4px solid ${deck.color}`, borderRadius:16, padding:"40px 36px", textAlign:"center", marginBottom:20 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#A8A59E", textTransform:"uppercase", marginBottom:20 }}>Define this term</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900, color:"#1A1814", lineHeight:1.4 }}>{card.term}</div>
            {card.image&&<img src={card.image} alt="" style={{ maxHeight:120,maxWidth:"100%",marginTop:16,borderRadius:8,objectFit:"contain" }} />}
          </div>
          {!writtenResult ? (
            <div>
              <textarea value={writtenInput} onChange={e=>setWrittenInput(e.target.value)}
                onKeyDown={e=>{if(e.key===" ")e.stopPropagation();}}
                placeholder="Type your answer here…"
                style={{ width:"100%",minHeight:100,padding:"14px",borderRadius:12,border:`1.5px solid ${deck.color}40`,background:"#fff",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#1A1814",outline:"none",resize:"none",lineHeight:1.7,boxSizing:"border-box",marginBottom:12 }}
                onFocus={e=>e.target.style.borderColor=deck.color} onBlur={e=>e.target.style.borderColor=`${deck.color}40`} />
              <button onClick={gradeWritten} disabled={!writtenInput.trim()||writtenLoading}
                style={{ width:"100%",padding:"13px",borderRadius:10,border:"none",background:writtenInput.trim()&&!writtenLoading?"#1A1814":"#ECEAE4",color:writtenInput.trim()&&!writtenLoading?"#F7F6F2":"#A8A59E",fontSize:14,fontWeight:700,cursor:writtenInput.trim()&&!writtenLoading?"pointer":"default",transition:"all 0.2s" }}>
                {writtenLoading?"Grading…":"Check Answer →"}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ padding:"18px 20px", borderRadius:12, background:writtenResult.grade==="correct"?"#F0FDF4":writtenResult.grade==="close"?"#FFFBEB":"#FEF2F2", border:`1.5px solid ${writtenResult.grade==="correct"?"#2BAE7E":writtenResult.grade==="close"?"#F5C842":"#E85D3F"}`, marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:800, color:writtenResult.grade==="correct"?"#2BAE7E":writtenResult.grade==="close"?"#D4A830":"#E85D3F", marginBottom:6 }}>
                  {writtenResult.grade==="correct"?"✓ Correct!":writtenResult.grade==="close"?"~ Close!":"✗ Incorrect"}
                </div>
                <div style={{ fontSize:13, color:"#5A5752", marginBottom:6 }}>{writtenResult.feedback}</div>
                <div style={{ fontSize:12, color:"#8C8880" }}>Correct answer: <strong>{card.definition}</strong></div>
              </div>
              <button onClick={()=>{setWrittenResult(null);setWrittenInput("");advance();}} style={{ width:"100%",padding:"13px",borderRadius:10,border:"none",background:"#1A1814",fontSize:14,fontWeight:700,cursor:"pointer",color:"#F7F6F2" }}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* FLIP MODES */}
      {!["matching","truefalse","written"].includes(mode) && card && (
        <div>
          {/* Timed mode countdown */}
          {mode==="timed" && (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:11,fontWeight:700,letterSpacing:1,color:"#8C8880",textTransform:"uppercase" }}>Time</span>
                <span style={{ fontFamily:"monospace",fontSize:22,fontWeight:900,color:timedExpired?"#E85D3F":timedSecs<=3?"#F5A623":"#2BAE7E" }}>{timedExpired?"⏰":timedSecs+"s"}</span>
              </div>
              <div style={{ height:6,background:"#ECEAE4",borderRadius:3,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${timedSecs*10}%`,background:timedSecs<=3?"#E85D3F":timedSecs<=6?"#F5A623":"#2BAE7E",borderRadius:3,transition:"width 1s linear" }}/>
              </div>
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <button onClick={()=>{setIndex(i=>(i-1+workingCards.length)%workingCards.length);setFlipped(false);setShowHint(false);}}
              style={{ flexShrink:0,width:44,height:44,borderRadius:"50%",border:"1.5px solid #ECEAE4",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#8C8880",transition:"all 0.18s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#1A1814";e.currentTarget.style.color="#1A1814";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#8C8880";}}>‹</button>
            <div className="fc-flip-scene" style={{ flex:1, minHeight:280 }} onClick={()=>{setFlipped(f=>!f);setShowHint(false);}}>
              <div className={`fc-flip-card${flipped?" is-flipped":""}`}>
                <div className="fc-flip-face fc-flip-front">
                  <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#A8A59E",marginBottom:20 }}>Term · click to flip</div>
                  <div style={{ fontFamily:"'Playfair Display',serif",fontSize:mode==="focus"?32:26,fontWeight:900,color:"#1A1814",lineHeight:1.4,maxWidth:480 }}>{card.term}</div>
                  {card.image&&<img src={card.image} alt="" style={{ maxHeight:100,maxWidth:"80%",marginTop:16,borderRadius:8,objectFit:"contain" }} />}
                  {card.hint && !flipped && (
                    <div style={{ marginTop:18 }}>
                      {showHint
                        ? <div style={{ fontSize:13,color:"#6B6860",fontStyle:"italic",background:"#F7F6F2",borderRadius:8,padding:"8px 14px",maxWidth:380 }}>💡 {card.hint}</div>
                        : <button onClick={e=>{e.stopPropagation();setShowHint(true);}} style={{ background:"transparent",border:"1px solid #ECEAE4",borderRadius:7,padding:"5px 14px",fontSize:12,cursor:"pointer",color:"#A8A59E",fontWeight:600 }}>💡 Show Hint</button>
                      }
                    </div>
                  )}
                </div>
                <div className="fc-flip-face fc-flip-back">
                  <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:deck.color,marginBottom:20 }}>Definition</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:mode==="focus"?18:16,fontWeight:400,color:"#1A1814",lineHeight:1.75,maxWidth:480 }}>{card.definition}</div>
                  {card.image&&<img src={card.image} alt="" style={{ maxHeight:80,maxWidth:"70%",marginTop:14,borderRadius:8,objectFit:"contain",opacity:0.7 }} />}
                </div>
              </div>
            </div>
            <button onClick={()=>{advance();setShowHint(false);}}
              style={{ flexShrink:0,width:44,height:44,borderRadius:"50%",border:"1.5px solid #ECEAE4",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#8C8880",transition:"all 0.18s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#1A1814";e.currentTarget.style.color="#1A1814";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#ECEAE4";e.currentTarget.style.color="#8C8880";}}>›</button>
          </div>

          {flipped ? (
            mode==="spaced" ? (
              <div className="fc-fade-in">
                <div style={{ fontSize:11,fontWeight:600,color:"#A8A59E",textAlign:"center",marginBottom:12,letterSpacing:1 }}>HOW WELL DID YOU KNOW IT?</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                  {[["Again","#E85D3F",0,"Forgot"],["Hard","#F5A623",1,"Struggled"],["Good","#4F6EF7",2,"Got it"],["Easy","#2BAE7E",3,"Easy!"]].map(([label,color,q,sub])=>(
                    <button key={label} onClick={()=>rateCard(q)}
                      style={{ padding:"12px 8px",borderRadius:10,border:`2px solid ${color}30`,background:`${color}10`,cursor:"pointer",transition:"all 0.18s",textAlign:"center" }}
                      onMouseEnter={e=>{e.currentTarget.style.background=color;e.currentTarget.style.borderColor=color;Array.from(e.currentTarget.children).forEach(c=>c.style.color="#fff");}}
                      onMouseLeave={e=>{e.currentTarget.style.background=`${color}10`;e.currentTarget.style.borderColor=`${color}30`;Array.from(e.currentTarget.children).forEach((c,i)=>c.style.color=i===0?color:"#8C8880");}}>
                      <div style={{ fontSize:13,fontWeight:800,color }}>{label}</div>
                      <div style={{ fontSize:10,color:"#8C8880",marginTop:2 }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="fc-fade-in" style={{ display:"flex", gap:10, justifyContent:"center" }}>
                <button onClick={()=>{setWrong(p=>{const n=new Set(p);n.add(card.id);return n;});advance();}}
                  style={{ padding:"13px 32px",borderRadius:10,border:"2px solid #E85D3F",background:"#FEF2F2",fontSize:14,fontWeight:700,cursor:"pointer",color:"#E85D3F",transition:"all 0.18s" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="#E85D3F";e.currentTarget.style.color="#fff";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#FEF2F2";e.currentTarget.style.color="#E85D3F";}}>✗ Still Learning</button>
                <button onClick={()=>{setKnown(p=>{const n=new Set(p);n.add(card.id);return n;});advance();}}
                  style={{ padding:"13px 32px",borderRadius:10,border:"none",background:"#2BAE7E",fontSize:14,fontWeight:700,cursor:"pointer",color:"#fff",transition:"all 0.18s",boxShadow:"0 4px 16px rgba(43,174,126,0.3)" }}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.88"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>Got It ✓</button>
              </div>
            )
          ) : (
            <div style={{ textAlign:"center" }}>
              <button onClick={()=>setFlipped(true)} className="fc-btn" style={{ background:"#1A1814",border:"none",borderRadius:10,padding:"13px 40px",fontSize:14,fontWeight:700,cursor:"pointer",color:"#F7F6F2",transition:"all 0.2s" }}>
                Reveal Answer
              </button>
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"center", gap:5, marginTop:28, flexWrap:"wrap" }}>
            {workingCards.map((c,i)=>(
              <div key={i} onClick={()=>{setIndex(i);setFlipped(false);}}
                style={{ width:i===index?20:6,height:6,borderRadius:3,background:known.has(c.id)?"#2BAE7E":wrong.has(c.id)?"#E85D3F":i===index?deck.color:"#ECEAE4",cursor:"pointer",transition:"all 0.25s" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FlashCardsApp;
