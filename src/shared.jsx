// Code shared by the main page and the apps (each app downloads separately).
import { useState, useEffect } from "react";
import { auth, appCheckHeader } from "./firebase";
import { cloudSync } from "./cloudSync";

// ── AI requests: send the student's login token; the server enforces login + a daily cap ──
function aiNotify(reason, message) {
  window.dispatchEvent(new CustomEvent("ace-ai-blocked", { detail: { reason, message } }));
}

async function aiFetch(url, options = {}) {
  const u = auth.currentUser;
  if (!u) {
    aiNotify("login", "Sign up free (or log in) to use the AI features.");
    return new Response(JSON.stringify({ error: { type: "login_required", message: "Please sign in to use AI features." } }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const token = await u.getIdToken();
  const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...(await appCheckHeader()), Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 429 || res.status === 503) {
    let message = "";
    try { message = (await res.clone().json())?.error?.message || ""; } catch {}
    aiNotify(res.status === 401 ? "login" : res.status === 429 ? "limit" : "unavailable", message);
  }
  return res;
}

// ─── Cloud sync ────────────────────────────────────────────────────────────────
// Apps save to localStorage, then call tpSync(); src/syncCore.js + src/cloudSync.js
// take care of saving to Firestore safely (load-before-save, merging, any size, retries).
function tpSync(lsKey, data) {
  cloudSync.queue(lsKey, data);
}

// ── Ace memory (opt-in): short notes about the student's studies, synced like other data ──
function readAceMemory() {
  try {
    const v = JSON.parse(localStorage.getItem("tp_ace_memory") || "null");
    return { enabled: !!v?.enabled, notes: Array.isArray(v?.notes) ? v.notes : [] };
  } catch { return { enabled: false, notes: [] }; }
}

function writeAceMemory(m) {
  const v = { enabled: !!m.enabled, notes: (m.notes || []).slice(-40) };
  try { localStorage.setItem("tp_ace_memory", JSON.stringify(v)); } catch {}
  tpSync("tp_ace_memory", v);
  window.dispatchEvent(new CustomEvent("tp-ace-memory"));
  return v;
}

// Every few messages, ask the server for a few durable study facts worth remembering.
async function aceRemember(messages) {
  const m = readAceMemory();
  if (!m.enabled) return;
  const userTurns = messages.filter(x => x.role === "user").length;
  if (userTurns < 2 || userTurns % 3 !== 0) return; // roughly every third question
  try {
    const res = await aiFetch("/api/ace", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "remember", known: m.notes.map(n => n.text), messages: messages.slice(-12).map(x => ({ role: x.role, content: String(x.content) })) }) });
    if (!res.ok) return;
    const { notes = [] } = await res.json();
    if (!notes.length) return;
    const cur = readAceMemory();
    if (!cur.enabled) return;
    const have = new Set(cur.notes.map(n => n.text.toLowerCase()));
    const add = notes.filter(t => !have.has(t.toLowerCase())).map((t, i) => ({ id: `mem_${Date.now()}_${i}`, text: t, at: new Date().toISOString() }));
    if (add.length) writeAceMemory({ ...cur, notes: [...cur.notes, ...add] });
  } catch {}
}

// ─── Flash Cards App ─────────────────────────────────────────────────────────
// Clean base model — easy to read, edit, and extend

const FC_DECKS = [];

// ─── Avatar + Floating Assistant ─────────────────────────────────────────────
const PA_COLOR = "#90C8F8";

const PA_GLOW  = "#4898E8";

const PA_DARK  = "#0A1628";

// ── Mascots: Ace the owl (main) + Biscuit the pup (sidekick) ───────────────────
function AceHead({ size = 34 }) {
  return <img src="/mascots/ace-head.webp" alt="Ace the owl" width={size} height={size} style={{ width:size, height:size, borderRadius:"50%", display:"block", flexShrink:0, objectFit:"cover", background:"#fff" }} />;
}

// ── Installable app (PWA) ────────────────────────────────────────────────────
// "ready": the browser can show its install box; "ios": iPhone/iPad (Share → Add to Home Screen);
// "installed": already opened as an app; "manual": use the browser menu.
function installState() {
  if (typeof window === "undefined") return "manual";
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (standalone) return "installed";
  if (window.__tpInstallPrompt) return "ready";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "manual";
}

function useInstallApp() {
  const [state, setState] = useState(installState);
  useEffect(() => {
    const update = () => setState(installState());
    window.addEventListener("tp-install-ready", update);
    return () => window.removeEventListener("tp-install-ready", update);
  }, []);
  const install = async () => {
    const p = window.__tpInstallPrompt;
    if (!p) return false;
    p.prompt();
    const choice = await p.userChoice.catch(() => null);
    window.__tpInstallPrompt = null;
    setState(installState());
    return choice?.outcome === "accepted";
  };
  return { state, install };
}

// ── Icons: clean line icons used instead of emoji across the site ──────────────
// <Icon e="📁" /> keeps the old emoji as the lookup key, so each spot reads clearly in code.
const ICON_PATHS = {
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  folderOpen: "M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1M3 7v10a2 2 0 0 0 2 2h12.5a2 2 0 0 0 1.9-1.4L21 12H7.5a2 2 0 0 0-1.9 1.4L3 19",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
  unlock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 7.5-2",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7",
  books: "M5 4h4v16H5zM10 4h4v16h-4zM15.5 5.2l3.8-1 3.2 14.9-3.8 1z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  chat: "M4 5h16v11H9l-5 4z",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  video: "M3 7h12v10H3zM15 10l6-3v10l-6-3",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  volume: "M4 10h4l5-4v12l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  mute: "M4 10h4l5-4v12l-5-4H4zM17 9l5 6M22 9l-5 6",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 4.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  alert: "M12 3l10 18H2zM12 10v4M12 17.5v.5",
  check: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l2.8 2.8L16.5 9.5",
  x: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6",
  cap: "M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6",
  pin: "M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7",
  clip: "M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0",
  home: "M3 11l9-7 9 7M5 10v10h14V10",
  fire: "M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-1.5.6-2.6 1.5-3.5C10 10 11 8 12 3zM12 21a6 6 0 0 1-6-6c0-2 1-3.5 2-4.5",
  cards: "M4 7h12v12H4zM8 7V4h12v12h-4",
  screen: "M3 4h18v12H3zM8 20h8M12 16v4",
  rocket: "M14 4c3-1 6-1 6-1s0 3-1 6l-6 6-4-4zM9 11l-4 1-2 3 4 1M13 15l-1 4-3 2-1-4M15 9a1 1 0 1 0 0-.1z",
  box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  dollar: "M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3",
  heart: "M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15",
  palette: "M12 3a9 9 0 0 0 0 18c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5zM7.5 11a1 1 0 1 0 0-.1zM11 7a1 1 0 1 0 0-.1zM16 8.5a1 1 0 1 0 0-.1z",
  hash: "M5 9h14M5 15h14M10 4L8 20M16 4l-2 16",
  crown: "M3 8l4 4 5-7 5 7 4-4-2 11H5z",
  printer: "M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z",
  refresh: "M20 11a8 8 0 0 0-14.8-4M4 4v4h4M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4",
  inbox: "M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5",
  menu: "M4 7h16M4 12h16M4 17h16",
  swap: "M7 7h13l-3-3M17 17H4l3 3",
  hourglass: "M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9",
  laptop: "M4 6h16v10H4zM2 19h20",
  stethoscope: "M6 3v6a4 4 0 0 0 8 0V3M10 13v3a5 5 0 0 0 10 0v-2M20 11a2 2 0 1 0 0 .1z",
  scale: "M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z",
  text: "M5 6h14M12 6v13M9 19h6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  wave: "M3 12h3l3-6 6 12 3-6h3",
  dot: "",
};
const EMOJI_ICON = {
  "📁": "folder", "🗂": "folder", "📂": "folderOpen", "📦": "box", "📄": "file", "📋": "file", "📎": "clip",
  "✏️": "pen", "✏": "pen", "✍": "pen", "✍️": "pen", "✎": "pen", "📝": "pen", "🤖": "sparkle", "✨": "sparkle", "🎉": "sparkle",
  "🔍": "search", "⌕": "search", "🔒": "lock", "🔓": "unlock", "🌐": "globe", "📖": "book", "📚": "books",
  "📅": "calendar", "📆": "calendar", "🗓": "calendar", "🎯": "target", "💬": "chat", "💭": "chat", "💨": "wave",
  "🗑": "trash", "🧠": "brain", "🔗": "link", "⚡": "bolt", "💪": "bolt", "📷": "camera", "📸": "camera", "📹": "video",
  "🎙️": "mic", "🎙": "mic", "🔊": "volume", "🔇": "mute", "⚙": "gear", "👁": "eye", "🙈": "eyeOff",
  "📊": "chart", "📈": "trend", "⏱": "clock", "🕐": "clock", "⏰": "clock", "⏳": "hourglass", "🔜": "arrowRight",
  "⚠️": "alert", "⚠": "alert", "😩": "alert", "✅": "check", "👍": "check", "❌": "x", "🎓": "cap", "📌": "pin",
  "💡": "bulb", "🧑": "user", "👤": "user", "🧒": "user", "⌂": "home", "🏠": "home", "🔥": "fire", "📇": "cards",
  "🖥️": "screen", "💻": "laptop", "🚀": "rocket", "💸": "dollar", "🙏": "heart", "☀️": "sun", "🗺️": "map",
  "🎨": "palette", "🔢": "hash", "👑": "crown", "🖨": "printer", "🔁": "refresh", "🔄": "refresh", "📭": "inbox",
  "☰": "menu", "⇄": "swap", "🩺": "stethoscope", "⚖️": "scale", "🔤": "text", "🔴": "dot", "🟡": "dot", "🟢": "dot",
};
const DOT_COLORS = { "🔴": "#E85D3F", "🟡": "#F5C842", "🟢": "#2BAE7E" };

function Icon({ e, name, size = "1.1em", color = "currentColor", strokeWidth = 1.8, style }) {
  const key = name || EMOJI_ICON[e] || EMOJI_ICON[String(e || "").replace("️", "")];
  const base = { width: size, height: size, verticalAlign: "-0.18em", display: "inline-block", flexShrink: 0, ...style };
  if (!key) return null;
  if (key === "dot") return <svg viewBox="0 0 24 24" aria-hidden="true" style={base}><circle cx="12" cy="12" r="6" fill={DOT_COLORS[e] || color} /></svg>;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={base}>
      <path d={ICON_PATHS[key]} />
    </svg>
  );
}

export { aiNotify, aiFetch, tpSync, readAceMemory, writeAceMemory, aceRemember, FC_DECKS, PA_COLOR, PA_GLOW, PA_DARK, AceHead, useInstallApp, Icon };
