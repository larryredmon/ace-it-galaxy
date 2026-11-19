import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from "firebase/app-check";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://ace-it-galaxy-default-rtdb.firebaseio.com",
};

export const app = initializeApp(firebaseConfig);

// ── Bot protection (App Check + reCAPTCHA Enterprise) ─────────────────────────
// Proves requests come from the real Ace It Galaxy site, not a bot script. Turned on by
// setting VITE_RECAPTCHA_ENTERPRISE_KEY in Vercel. Must start before any other Firebase service.
const RECAPTCHA_KEY = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
let appCheck = null;
if (RECAPTCHA_KEY && typeof window !== "undefined") {
  try {
    // On your own computer (localhost), print a debug token instead of using reCAPTCHA.
    if (import.meta.env.DEV) self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
    appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_KEY), isTokenAutoRefreshEnabled: true });
  } catch (e) {
    console.warn("App Check not started:", e?.message);
  }
}

// Header for our own /api calls so the server can check the request came from the site.
export async function appCheckHeader() {
  if (!appCheck) return {};
  try { const { token } = await getToken(appCheck, false); return token ? { "X-Firebase-AppCheck": token } : {}; }
  catch { return {}; }
}
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

// Turn on the Apple button once Sign in with Apple is set up in Firebase (Vercel env var).
export const APPLE_SIGNIN_ENABLED = import.meta.env.VITE_ENABLE_APPLE_SIGNIN === "true";
