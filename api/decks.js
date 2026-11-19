// Public flash card decks.
//   GET  /api/decks?list=1&q=bio       → newest public decks (summaries)
//   GET  /api/decks?id=abc123          → one public deck with its cards
//   POST /api/decks {action:"publish", deck}       (signed in) share or update a deck
//   POST /api/decks {action:"unpublish", deckId}   (signed in) stop sharing
//   POST /api/decks {action:"rate", id, stars}     (signed in) 1–5 stars
//   POST /api/decks {action:"save", id}            count a save (anyone)
//   POST /api/decks {action:"report", id, reason}  (signed in) hide after 3 reports
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { adminApp, verifyUser } from "./_lib/guard.js";
import { publicIdFor, slugify, clean, looksBad, summary, deckPath, MAX_CARDS } from "./_lib/publicDecks.js";
import { MIN_PUBLIC_CARDS, normalizeSubject } from "../src/deckRules.js";

const MAX_DECKS_PER_STUDENT = 100;

function err(res, status, message, type = "bad_request") {
  return res.status(status).json({ error: { type, message } });
}

export default async function handler(req, res) {
  let db;
  try { db = getFirestore(adminApp()); }
  catch (e) { console.error("decks setup:", e.message); return err(res, 503, "Public decks are temporarily unavailable.", "unavailable"); }
  const col = db.collection("publicDecks");

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    if (req.query.id) {
      const snap = await col.doc(String(req.query.id).slice(0, 20)).get();
      if (!snap.exists || snap.data().hidden) return err(res, 404, "This deck isn't available anymore.", "not_found");
      const d = snap.data();
      return res.status(200).json({ deck: { ...summary(snap.id, d), cards: d.cards || [] } });
    }
    const q = clean(req.query.q, 60).toLowerCase();
    const snap = await col.orderBy("updatedAt", "desc").limit(300).get();
    let decks = snap.docs.filter((x) => !x.data().hidden).map((x) => summary(x.id, x.data()));
    if (q) decks = decks.filter((d) => `${d.title} ${d.subject} ${d.description} ${d.authorName}`.toLowerCase().includes(q));
    return res.status(200).json({ decks: decks.slice(0, 120) });
  }

  if (req.method !== "POST") return err(res, 405, "Method not allowed");
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const action = body.action;

  if (action === "save") {
    const id = String(body.id || "").slice(0, 20);
    if (!id) return err(res, 400, "Missing deck");
    await col.doc(id).update({ saves: FieldValue.increment(1) }).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  const user = await verifyUser(req, res);
  if (!user) return;

  if (action === "publish") {
    const deck = body.deck || {};
    const deckId = clean(deck.id, 40);
    const title = clean(deck.title, 120);
    const subject = normalizeSubject(clean(deck.subject, 40));
    const description = clean(deck.description, 400);
    const cards = (Array.isArray(deck.cards) ? deck.cards : [])
      .map((c) => ({ term: clean(c?.term, 500), definition: clean(c?.definition, 1500) }))
      .filter((c) => c.term && c.definition)
      .slice(0, MAX_CARDS);
    if (!deckId || !title) return err(res, 400, "Give your deck a title before sharing it.");
    if (cards.length < MIN_PUBLIC_CARDS) return err(res, 400, `Add at least ${MIN_PUBLIC_CARDS} cards with a term and a definition before sharing — this deck has ${cards.length}.`);
    if (looksBad(title, description, subject)) return err(res, 400, "That title or description can't be shared publicly.");

    const id = publicIdFor(user.uid, deckId);
    const ref = col.doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      const mine = await col.where("ownerUid", "==", user.uid).count().get().catch(() => null);
      if (mine && mine.data().count >= MAX_DECKS_PER_STUDENT) return err(res, 400, `You can share up to ${MAX_DECKS_PER_STUDENT} decks.`);
    } else if (existing.data().ownerUid !== user.uid) {
      return err(res, 403, "You can't change this deck.");
    }
    const firstName = clean(String(user.name || "").split(/\s+/)[0], 30) || "A student";
    const data = {
      ownerUid: user.uid, deckId, title, subject, description, cards, cardCount: cards.length,
      color: /^#[0-9a-f]{6}$/i.test(deck.color || "") ? deck.color : "#4F6EF7",
      authorName: firstName, slug: slugify(title), updatedAt: FieldValue.serverTimestamp(),
    };
    if (!existing.exists) Object.assign(data, { createdAt: FieldValue.serverTimestamp(), saves: 0, ratingSum: 0, ratingCount: 0, reports: 0, hidden: false });
    await ref.set(data, { merge: true });
    return res.status(200).json({ id, url: deckPath({ id, slug: data.slug }) });
  }

  if (action === "unpublish") {
    const id = publicIdFor(user.uid, clean(body.deckId, 40));
    const ref = col.doc(id);
    const snap = await ref.get();
    if (snap.exists && snap.data().ownerUid === user.uid) await db.recursiveDelete(ref);
    return res.status(200).json({ ok: true });
  }

  if (action === "rate") {
    const id = String(body.id || "").slice(0, 20);
    const stars = Math.round(Number(body.stars));
    if (!id || !(stars >= 1 && stars <= 5)) return err(res, 400, "Pick 1 to 5 stars.");
    const ref = col.doc(id);
    const voteRef = ref.collection("ratings").doc(user.uid);
    const out = await db.runTransaction(async (tx) => {
      const [deckSnap, voteSnap] = await Promise.all([tx.get(ref), tx.get(voteRef)]);
      if (!deckSnap.exists) return null;
      const d = deckSnap.data();
      if (d.ownerUid === user.uid) return { own: true };
      const old = voteSnap.exists ? voteSnap.data().stars : 0;
      const sum = (d.ratingSum || 0) - old + stars;
      const count = (d.ratingCount || 0) + (old ? 0 : 1);
      tx.update(ref, { ratingSum: sum, ratingCount: count });
      tx.set(voteRef, { stars, at: FieldValue.serverTimestamp() });
      return { ratingAvg: Math.round((sum / count) * 10) / 10, ratingCount: count };
    });
    if (!out) return err(res, 404, "This deck isn't available anymore.", "not_found");
    if (out.own) return err(res, 400, "You can't rate your own deck.");
    return res.status(200).json(out);
  }

  if (action === "report") {
    const id = String(body.id || "").slice(0, 20);
    if (!id) return err(res, 400, "Missing deck");
    const ref = col.doc(id);
    const repRef = ref.collection("reports").doc(user.uid);
    await db.runTransaction(async (tx) => {
      const [deckSnap, repSnap] = await Promise.all([tx.get(ref), tx.get(repRef)]);
      if (!deckSnap.exists || repSnap.exists) return;
      const reports = (deckSnap.data().reports || 0) + 1;
      tx.update(ref, { reports, hidden: reports >= 3 || deckSnap.data().hidden === true });
      tx.set(repRef, { reason: clean(body.reason, 300), at: FieldValue.serverTimestamp() });
    });
    console.log("[deck-report]", id, clean(body.reason, 300));
    return res.status(200).json({ ok: true });
  }

  return err(res, 400, "Unknown action");
}
