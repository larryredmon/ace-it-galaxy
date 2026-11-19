// Permanently deletes the signed-in student's account and all their saved data.
// The student must have signed in (or re-entered their password) within the last 5 minutes.
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "./_lib/guard.js";

const RECENT_LOGIN_SECONDS = 5 * 60;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  let app;
  try { app = adminApp(); }
  catch (e) {
    console.error("delete-account setup:", e.message);
    return res.status(503).json({ error: { message: "Account deletion is temporarily unavailable. Please try again later." } });
  }

  const match = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: { type: "login_required", message: "Please sign in first." } });

  let decoded;
  try { decoded = await getAuth(app).verifyIdToken(match[1], true); }
  catch { return res.status(401).json({ error: { type: "login_required", message: "Your session expired. Please sign in again." } }); }

  const now = Math.floor(Date.now() / 1000);
  if (!decoded.auth_time || now - decoded.auth_time > RECENT_LOGIN_SECONDS) {
    return res.status(403).json({ error: { type: "recent_login_required", message: "For your security, please confirm it's you first." } });
  }

  const uid = decoded.uid;
  const db = getFirestore(app);
  try {
    // 1) All study data: users/{uid} and every subcollection (appdata, sync, chunks…)
    await db.recursiveDelete(db.doc(`users/${uid}`));
    // 2) Daily AI usage counters
    const usage = await db.collection("aceUsage").where("uid", "==", uid).get();
    if (!usage.empty) {
      const batch = db.batch();
      usage.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    // 3) Decks they shared publicly (and their ratings/reports)
    const shared = await db.collection("publicDecks").where("ownerUid", "==", uid).get();
    for (const d of shared.docs) await db.recursiveDelete(d.ref);
    // 4) The sign-in account itself
    await getAuth(app).deleteUser(uid);
  } catch (e) {
    console.error("delete-account:", uid, e.message);
    return res.status(500).json({ error: { message: "Couldn't finish deleting your account. Please try again." } });
  }

  console.log("delete-account: deleted", uid);
  return res.status(200).json({ ok: true });
}
