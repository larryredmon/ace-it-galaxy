// ─── Cloud sync engine (storage-agnostic) ─────────────────────────────────────
// localStorage is the instant cache; the cloud is the source of truth.
// This file has no Firebase imports so it can be tested with a fake store.
//
// Guarantees:
//  • Nothing is written to the cloud until this user's cloud data has loaded.
//  • Saves never blindly replace the cloud copy: if another device/tab saved in
//    the meantime, the two versions are merged item-by-item (by id).
//  • Data of any size is saved (split into chunks by the store adapter).
//  • Failed saves stay queued and are retried; the UI is told.

export const SYNC_KEYS = [
  "tp_fc_decks", "tp_fc_folders", "tp_notes", "tp_note_folders", "tp_bm_maps",
  "tp_tracker_tasks", "tp_journal", "tp_courses",
  "tp_pa_convos", "tp_pa_goals", "tp_pa_plan", "tp_simplifier_history", "tp_userProfile",
];
const META_KEY = "tp_sync_meta";
const DEBOUNCE_MS = 1200;
export const MAX_BYTES = 25 * 1024 * 1024;

export class ConflictError extends Error { constructor() { super("conflict"); this.conflict = true; } }

// ── small pure helpers ──
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + ":" + s.length.toString(36);
}
const hashOf = (v) => hashStr(JSON.stringify(v ?? null));
const hasId = (x) => x && typeof x === "object" && x.id !== undefined && x.id !== null;

// id → hash of each item, or null when the value isn't a list of items with ids
export function idMap(arr) {
  if (!Array.isArray(arr) || !arr.every(hasId)) return null;
  const m = {};
  for (const it of arr) { const k = String(it.id); if (!(k in m)) m[k] = hashOf(it); }
  return m;
}

// Three-way merge of a list by item id.
//  base   = id→hash of what this device last synced ({} if never)
//  local  = this device's current list, remote = the cloud's current list
// Local edits win; items added elsewhere are kept; items deleted elsewhere are
// dropped unless edited here; items deleted here stay deleted.
export function merge3(base, local, remote) {
  if (local === undefined) return remote;
  if (remote === undefined || remote === null) return local;
  const lm = idMap(local), rm = idMap(remote);
  if (!lm || !rm) return local;
  base = base || {};
  const remoteById = new Map(remote.map(it => [String(it.id), it]));
  const out = [], seen = new Set();
  for (const it of local) {
    const id = String(it.id);
    if (seen.has(id)) continue; seen.add(id);
    const unchangedHere = base[id] !== undefined && base[id] === lm[id];
    if (!(id in rm)) { if (unchangedHere) continue; out.push(it); continue; }
    if (unchangedHere && rm[id] !== lm[id]) { out.push(remoteById.get(id)); continue; }
    out.push(it);
  }
  for (const it of remote) {
    const id = String(it.id);
    if (seen.has(id) || id in base) continue;
    seen.add(id); out.push(it);
  }
  return out;
}

// Merge for any value: lists by id, everything else "changed side wins".
export function mergeValue(meta, local, remote) {
  if (local === undefined) return remote;
  if (remote === undefined || remote === null) return local;
  if (Array.isArray(local) && Array.isArray(remote) && idMap(local) && idMap(remote)) return merge3(meta?.base || {}, local, remote);
  // single values (profile, study plan…): the cloud wins unless this browser
  // changed the value since it last synced it
  if (!meta?.hash || hashOf(local) === meta.hash) return remote;
  return local;
}

// ── engine ──
export function createSyncEngine({ store, storage, emit = () => {}, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout, debounceMs = DEBOUNCE_MS }) {
  let uid = null, ready = false, meta = { uid: null, keys: {} };
  const pending = new Map();
  let timer = null, retryTimer = null, retryDelay = 3000, running = null, lastError = null, generation = 0;

  const readLocal = (k) => { try { const s = storage.getItem(k); return s == null ? undefined : JSON.parse(s); } catch { return undefined; } };
  const writeLocal = (k, v) => { try { storage.setItem(k, JSON.stringify(v)); } catch {} };
  const loadMeta = () => { try { return JSON.parse(storage.getItem(META_KEY) || "null") || { uid: null, keys: {} }; } catch { return { uid: null, keys: {} }; } };
  const saveMeta = () => { try { storage.setItem(META_KEY, JSON.stringify(meta)); } catch {} };
  const status = (s, message) => emit("status", { status: s, message, pending: pending.size });

  function clearLocalData() {
    try {
      const ks = [];
      for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && (k.startsWith("tp_") || k.startsWith("ch_"))) ks.push(k); }
      ks.forEach(k => storage.removeItem(k));
    } catch {}
  }

  // Load every key from the cloud, merge with anything on this device, and
  // make the result the local copy. Throws if the cloud can't be read.
  async function load(newUid) {
    const gen = ++generation; ready = false; uid = newUid;
    pending.clear(); if (timer) clearTimer(timer); timer = null;
    meta = loadMeta();
    if (meta.uid && meta.uid !== newUid) { clearLocalData(); meta = { uid: null, keys: {} }; }
    const legacy = await store.readLegacy(newUid);
    const results = await Promise.all(SYNC_KEYS.map(async (k) => [k, await store.read(newUid, k)]));
    if (gen !== generation) throw new Error("load cancelled"); // gave up waiting, or logged out meanwhile
    const changed = [];
    for (const [k, remoteDoc] of results) {
      let remote = remoteDoc ? remoteDoc.value : undefined, ver = remoteDoc ? remoteDoc.ver : null, fromLegacy = false;
      const leg = legacy[k];
      if (leg && leg.value !== undefined && (!remoteDoc || (leg.at || 0) > (remoteDoc.at || 0))) { remote = leg.value; fromLegacy = true; }
      const local = readLocal(k);
      const km = meta.keys[k];
      const result = mergeValue(km, local, remote);
      if (result === undefined) { delete meta.keys[k]; continue; }
      const sameAsCloud = remote !== undefined && hashOf(result) === hashOf(remote);
      if (local === undefined || hashOf(local) !== hashOf(result)) { writeLocal(k, result); changed.push(k); }
      // hash = what the NEW cloud layout holds (old-format data still has to be re-saved)
      meta.keys[k] = { ver, base: idMap(remote) || {}, hash: remote === undefined || fromLegacy ? null : hashOf(remote) };
      if (!sameAsCloud || fromLegacy) pending.set(k, result);
    }
    meta.uid = newUid; saveMeta();
    ready = true;
    if (pending.size) schedule(0);
    return { changed };
  }

  function queue(k, value) {
    if (!SYNC_KEYS.includes(k) || !uid) return;
    if (!ready) return; // cloud not loaded yet — never overwrite it
    pending.set(k, value);
    schedule(debounceMs);
  }

  function schedule(ms) {
    if (timer) clearTimer(timer);
    timer = setTimer(() => { timer = null; flush(); }, ms);
  }

  async function writeKey(k, value, gen) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const km = meta.keys[k] || { ver: null, base: {}, hash: null };
      const h = hashOf(value);
      if (km.hash === h) return value; // already in the cloud
      try {
        const ver = await store.write(uid, k, value, km.ver ?? null);
        if (gen !== generation) return value;
        meta.keys[k] = { ver, base: idMap(value) || {}, hash: h }; saveMeta();
        return value;
      } catch (e) {
        if (!e?.conflict) throw e;
        const remoteDoc = await store.read(uid, k);
        if (gen !== generation) return value;
        const merged = mergeValue(km, value, remoteDoc ? remoteDoc.value : undefined);
        meta.keys[k] = { ver: remoteDoc ? remoteDoc.ver : null, base: idMap(remoteDoc?.value) || {}, hash: remoteDoc ? hashOf(remoteDoc.value) : null };
        if (hashOf(merged) !== h) {
          if (pending.has(k)) {
            // the app saved something newer meanwhile: fold the other device's changes into it too
            const newer = pending.get(k);
            pending.set(k, mergeValue({ base: idMap(value) || {}, hash: h }, newer, merged));
          }
          writeLocal(k, pending.has(k) ? pending.get(k) : merged);
          emit("replaced", { keys: [k] });
        }
        value = merged;
      }
    }
    throw new Error("Too many save conflicts");
  }

  async function flush() {
    if (running) { await running; if (pending.size) return flush(); return; }
    if (!ready || !uid || !pending.size) return;
    const gen = generation;
    running = (async () => {
      status("saving");
      const batch = [...pending.entries()]; pending.clear();
      const failed = [];
      for (const [k, v] of batch) {
        try { await writeKey(k, v, gen); }
        catch (e) { failed.push([k, v]); lastError = e; console.warn("[sync] save failed:", k, e?.message); }
      }
      if (gen !== generation) return;
      for (const [k, v] of failed) if (!pending.has(k)) pending.set(k, v);
      if (failed.length) {
        const tooBig = failed.some(([, ]) => lastError?.tooLarge);
        status("error", tooBig ? "Some of your work is too large to save to the cloud." : "Couldn't save to the cloud. Retrying…");
        if (retryTimer) clearTimer(retryTimer);
        retryTimer = setTimer(() => { retryTimer = null; flush(); }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60000);
      } else {
        retryDelay = 3000; lastError = null;
        status(pending.size ? "saving" : "saved");
      }
    })();
    try { await running; } finally { running = null; }
  }

  // Save everything now. Resolves true only if nothing is left unsaved.
  async function flushNow(timeoutMs = 10000) {
    if (!ready) return pending.size === 0;
    if (timer) { clearTimer(timer); timer = null; }
    const t = new Promise(res => setTimer(() => res("timeout"), timeoutMs));
    const r = await Promise.race([flush().then(() => "ok"), t]);
    return r === "ok" && pending.size === 0;
  }

  function reset({ clearData = false } = {}) {
    generation++; ready = false; uid = null; pending.clear();
    if (timer) clearTimer(timer); if (retryTimer) clearTimer(retryTimer); timer = retryTimer = null;
    if (clearData) clearLocalData();
    meta = { uid: null, keys: {} };
  }

  return {
    load, queue, flush, flushNow, reset, clearLocalData,
    isReady: () => ready, currentUid: () => uid, pendingCount: () => pending.size,
  };
}
