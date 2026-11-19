// Student feedback: stars + an optional message. Read it in Firebase → Firestore → "feedback".
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { adminApp } from "./_lib/guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });
  let app;
  try { app = adminApp(); }
  catch (e) { console.error("feedback setup:", e.message); return res.status(503).json({ error: { message: "Feedback is temporarily unavailable." } }); }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const stars = Math.round(Number(body.stars));
  const message = String(body.message || "").trim().slice(0, 2000);
  if (!(stars >= 1 && stars <= 5) && !message) return res.status(400).json({ error: { message: "Pick some stars or write a message." } });

  let uid = null, email = null;
  const match = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (match) {
    try { const u = await getAuth(app).verifyIdToken(match[1]); uid = u.uid; email = u.email || null; } catch { /* send anonymously */ }
  }

  const entry = {
    stars: stars >= 1 && stars <= 5 ? stars : null, message,
    page: String(body.page || "").slice(0, 100), source: String(body.source || "").slice(0, 30),
    uid, email, ua: String(req.headers["user-agent"] || "").slice(0, 200), createdAt: FieldValue.serverTimestamp(),
  };
  try { await getFirestore(app).collection("feedback").add(entry); }
  catch (e) { console.error("feedback save:", e.message); return res.status(500).json({ error: { message: "Couldn't send feedback. Please try again." } }); }
  console.log("[feedback]", entry.stars ?? "-", "★", entry.page, message.slice(0, 300));
  return res.status(200).json({ ok: true });
}
