// Shared guard for AI endpoints: only signed-in students, with a daily cap.
// Files under api/_lib are not deployed as their own endpoints.
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT) || 100;
const TIME_ZONE = "America/Chicago";

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return initializeApp({ credential: cert(JSON.parse(json)) });
}

function fail(res, status, type, message) {
  res.status(status).json({ error: { type, message } });
  return null;
}

// Returns the verified Firebase user, or null after sending an error response.
export async function guard(req, res) {
  let app;
  try {
    app = adminApp();
  } catch (e) {
    console.error("guard setup:", e.message);
    return fail(res, 503, "unavailable", "AI is temporarily unavailable. Please try again later.");
  }

  const match = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return fail(res, 401, "login_required", "Please sign in to use AI features.");

  let user;
  try {
    user = await getAuth(app).verifyIdToken(match[1]);
  } catch {
    return fail(res, 401, "login_required", "Your session expired. Please sign in again.");
  }

  // One counter document per student per day (Central time).
  const day = new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const db = getFirestore(app);
  const ref = db.collection("aceUsage").doc(`${user.uid}_${day}`);
  try {
    const allowed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count = snap.exists ? snap.data().count || 0 : 0;
      if (count >= DAILY_LIMIT) return false;
      tx.set(ref, { uid: user.uid, day, count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) {
      return fail(res, 429, "daily_limit",
        `You've used all ${DAILY_LIMIT} of today's AI requests. They reset at midnight Central time.`);
    }
  } catch (e) {
    console.error("usage counter:", e.message);
    return fail(res, 503, "unavailable", "AI is temporarily unavailable. Please try again later.");
  }

  return user;
}
