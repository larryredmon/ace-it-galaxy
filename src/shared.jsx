// Split out of App.jsx so this code only downloads when it is needed.
import { auth } from "./firebase";
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
  const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
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

export { aiNotify, aiFetch, tpSync, readAceMemory, writeAceMemory, aceRemember, FC_DECKS, PA_COLOR, PA_GLOW, PA_DARK, AceHead };
