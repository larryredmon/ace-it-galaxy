// ─── Firestore adapter for the sync engine ────────────────────────────────────
// Layout (all under users/{uid}, covered by the existing owner-only rule):
//   sync/{key}                       → { ver, n, at, bytes }   (small manifest)
//   sync/{key}/chunks/{ver}_{i}      → { d: "<piece of JSON>" } (data, any size)
// The old layout (users/{uid}/appdata/{app}) is still read so nothing is lost.
import { db } from "./firebase";
import { doc, getDoc, writeBatch, runTransaction } from "firebase/firestore";
import { createSyncEngine, ConflictError, MAX_BYTES, SYNC_KEYS } from "./syncCore";

const LEGACY = {
  tp_fc_decks: ["flashcards", "decks"], tp_fc_folders: ["flashcards", "folders"],
  tp_notes: ["notes", "notes"], tp_note_folders: ["notes", "folders"],
  tp_bm_maps: ["brainmaps", "maps"], tp_tracker_tasks: ["tracker", "tasks"],
  tp_journal: ["journal", "entries"], tp_courses: ["courses", "courses"],
};
const CHUNK_CHARS = 200000; // ≤ ~600 KB per chunk, under Firestore's 1 MB document limit

export function splitChunks(json) {
  const out = [];
  let i = 0;
  while (i < json.length) {
    let end = Math.min(i + CHUNK_CHARS, json.length);
    const c = json.charCodeAt(end - 1);
    if (end < json.length && c >= 0xd800 && c <= 0xdbff) end--; // don't split an emoji in half
    out.push(json.slice(i, end)); i = end;
  }
  return out.length ? out : [""];
}

const manifestRef = (uid, key) => doc(db, "users", uid, "sync", key);
const chunkRef = (uid, key, ver, i) => doc(db, "users", uid, "sync", key, "chunks", `${ver}_${i}`);

function deleteChunks(uid, key, ver, n) {
  if (!ver || !n) return;
  const b = writeBatch(db);
  for (let i = 0; i < n; i++) b.delete(chunkRef(uid, key, ver, i));
  b.commit().catch(() => {});
}

export const firestoreStore = {
  async readLegacy(uid) {
    const apps = [...new Set(Object.values(LEGACY).map(x => x[0]))];
    const docs = {};
    await Promise.all(apps.map(async (a) => {
      const s = await getDoc(doc(db, "users", uid, "appdata", a));
      if (s.exists()) docs[a] = s.data();
    }));
    const out = {};
    for (const [key, [app, field]] of Object.entries(LEGACY)) {
      const d = docs[app];
      if (!d || d[field] === undefined) continue;
      out[key] = { value: d[field], at: d.updatedAt?.toMillis?.() || 0 };
    }
    return out;
  },

  async read(uid, key) {
    const m = await getDoc(manifestRef(uid, key));
    if (!m.exists()) return null;
    const { ver, n, at } = m.data();
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => getDoc(chunkRef(uid, key, ver, i))));
    if (parts.some(p => !p.exists())) throw new Error(`incomplete cloud data for ${key}`);
    return { ver, at, value: JSON.parse(parts.map(p => p.data().d).join("")) };
  },

  async write(uid, key, value, expectedVer) {
    const json = JSON.stringify(value ?? null);
    const bytes = new TextEncoder().encode(json).length;
    if (bytes > MAX_BYTES) { const e = new Error("too large to save"); e.tooLarge = true; throw e; }
    const ver = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const chunks = splitChunks(json);
    // 1) write the new chunks (not visible yet)
    for (let i = 0; i < chunks.length; i += 8) {
      const b = writeBatch(db);
      chunks.slice(i, i + 8).forEach((d, j) => b.set(chunkRef(uid, key, ver, i + j), { d }));
      await b.commit();
    }
    // 2) switch the manifest to them, only if nobody else saved since we last read
    let old = null;
    try {
      await runTransaction(db, async (tx) => {
        const cur = await tx.get(manifestRef(uid, key));
        const curVer = cur.exists() ? cur.data().ver : null;
        if (curVer !== expectedVer) throw new ConflictError();
        old = cur.exists() ? cur.data() : null;
        tx.set(manifestRef(uid, key), { ver, n: chunks.length, at: Date.now(), bytes });
      });
    } catch (e) {
      deleteChunks(uid, key, ver, chunks.length);
      throw e;
    }
    // 3) clean up the previous version
    if (old) deleteChunks(uid, key, old.ver, old.n);
    return ver;
  },
};

export const cloudSync = createSyncEngine({
  store: firestoreStore,
  storage: window.localStorage,
  emit: (type, detail) => window.dispatchEvent(new CustomEvent(`tp-sync-${type}`, { detail })),
});

// Another tab or window changed saved study data: tell the app to reload the open screen.
let externalTimer = null;
window.addEventListener("storage", (e) => {
  if (e.key === "tp_sync_meta") cloudSync.reloadMeta();
  if (e.key === null || SYNC_KEYS.includes(e.key)) {
    clearTimeout(externalTimer);
    externalTimer = setTimeout(() => window.dispatchEvent(new CustomEvent("tp-sync-external")), 300);
  }
});

// Best effort: save when the tab is hidden or closed.
window.addEventListener("pagehide", () => { cloudSync.flush(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") cloudSync.flush(); });
