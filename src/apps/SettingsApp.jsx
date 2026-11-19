// Split out of App.jsx so this code only downloads when it is needed.
import { auth, googleProvider, appleProvider, db } from "../firebase";
import { useState, useEffect } from "react";
import { sendEmailVerification, linkWithPopup, reauthenticateWithCredential, EmailAuthProvider, reauthenticateWithPopup, updateProfile, verifyBeforeUpdateEmail, updatePassword, linkWithCredential } from "firebase/auth";
import { cloudSync } from "../cloudSync";
import { setDoc, doc } from "firebase/firestore";
import { AceHead, readAceMemory, writeAceMemory, useInstallApp } from "../shared.jsx";

// ── Settings page building blocks (module level so typing in forms keeps focus) ──
const ST_INK = "#1A1814", ST_MUTED = "#6F6B63", ST_LINE = "#ECE9E3";

const stCard = { background: "#fff", border: `1px solid ${ST_LINE}`, borderRadius: 14, boxShadow: "0 1px 2px rgba(26,24,20,0.04)", overflow: "hidden" };

const stRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 20px", borderTop: `1px solid ${ST_LINE}`, flexWrap: "wrap" };

const StSection = ({ title, desc, children, danger }) => (
    <section style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 10, padding: "0 2px" }}>
        <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 4, color: danger ? "#B42318" : ST_INK }}>{title}</h2>
        {desc && <p style={{ fontSize: 13, color: ST_MUTED, lineHeight: 1.5 }}>{desc}</p>}
      </div>
      <div style={{ ...stCard, borderColor: danger ? "#F3C9C4" : ST_LINE }}>{children}</div>
    </section>
  );

const StRow = ({ label, value, first, children }) => (
    <div style={{ ...stRow, borderTop: first ? "none" : stRow.borderTop }}>
      <div style={{ minWidth: 0, flex: "1 1 150px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: ST_INK }}>{label}</div>
        {value && <div style={{ fontSize: 13, color: ST_MUTED, marginTop: 3, overflowWrap: "anywhere", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{value}</div>}
      </div>
      {children && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{children}</div>}
    </div>
  );

const StBadge = ({ tone, children }) => {
  const t = { ok: ["#E9F7EF", "#1E7A46"], warn: ["#FFF6DD", "#8A5A00"], neutral: ["#F1EFEA", ST_MUTED] }[tone];
    return <span style={{ fontSize: 11, fontWeight: 600, background: t[0], color: t[1], borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{children}</span>;
  };

const StGoogleG = () => (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/>
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/>
    </svg>
  );

// ── Settings: account, sign-in methods, delete account ─────────────────────────
function SettingsApp({ user, onBack, openAuth, onLogout, onDeleted, onNameChange }) {
  const fbUser = auth.currentUser;
  const installApp = useInstallApp();
  const [, force] = useState(0);
  const [msg, setMsg] = useState(null);           // { type: "ok"|"err", text }
  const [busy, setBusy] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [delPass, setDelPass] = useState("");
  const [editing, setEditing] = useState(null);   // "name" | "email" | "password" | null
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fCurrent, setFCurrent] = useState("");
  const [fNew, setFNew] = useState("");
  const [fConfirm, setFConfirm] = useState("");
  const [aceMem, setAceMem] = useState(readAceMemory);
  useEffect(() => { const h = () => setAceMem(readAceMemory()); window.addEventListener("tp-ace-memory", h); return () => window.removeEventListener("tp-ace-memory", h); }, []);
  const openEdit = (k) => { setEditing(k); setMsg(null); setFName(user?.name || ""); setFEmail(""); setFCurrent(""); setFNew(""); setFConfirm(""); };

  const providers = (fbUser?.providerData || []).map(p => p.providerId);
  const hasPassword = providers.includes("password");
  const hasGoogle = providers.includes("google.com");
  const hasApple = providers.includes("apple.com");

  const INK = "#1A1814", MUTED = "#6F6B63", LINE = "#ECE9E3";
  const card = { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, boxShadow: "0 1px 2px rgba(26,24,20,0.04)", overflow: "hidden" };
  const h2 = { fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, color: INK, marginBottom: 4 };
  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 20px", borderTop: `1px solid ${LINE}`, flexWrap: "wrap" };
  const btn = (dark) => ({ height: 36, padding: "0 14px", borderRadius: 8, border: dark ? `1px solid ${INK}` : `1px solid #DAD6CE`, background: dark ? INK : "#fff", color: dark ? "#fff" : INK, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 });

  if (!user || !fbUser) {
    return (
      <div style={{ minHeight: "100vh", background: "#F7F6F2", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ ...card, maxWidth: 420, textAlign: "center" }}>
          <div style={h2}>Settings</div>
          <p style={{ fontSize: 14, color: "#5A5752", marginBottom: 18 }}>Sign in to manage your account.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button style={btn(false)} onClick={onBack}>← Galaxy</button>
            <button style={btn(true)} onClick={() => openAuth("login")}>Log in</button>
          </div>
        </div>
      </div>
    );
  }

  const run = async (key, fn) => { setBusy(key); setMsg(null); try { await fn(); } finally { setBusy(""); } };

  const sendVerify = () => run("verify", async () => {
    try { await sendEmailVerification(fbUser); setMsg({ type: "ok", text: `Verification email sent to ${fbUser.email}. Click the link, then press “I've verified”.` }); }
    catch (e) { setMsg({ type: "err", text: e?.code === "auth/too-many-requests" ? "Too many emails sent. Wait a few minutes and try again." : "Couldn't send the email. Try again." }); }
  });
  const refreshVerify = () => run("refresh", async () => { try { await fbUser.reload(); force(n => n + 1); } catch {} });

  const connectGoogle = () => run("google", async () => {
    try { await linkWithPopup(fbUser, googleProvider); force(n => n + 1); setMsg({ type: "ok", text: "Google connected. You can now sign in with Google or your password." }); }
    catch (e) {
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
      setMsg({ type: "err", text:
        e?.code === "auth/credential-already-in-use" ? "That Google account is already used by a different Ace It Galaxy account." :
        e?.code === "auth/requires-recent-login" ? "For your security, log out and back in, then try again." :
        "Couldn't connect Google. Please try again." });
    }
  });

  const deleteAccount = () => run("delete", async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") { setMsg({ type: "err", text: "Type DELETE to confirm." }); return; }
    try {
      if (hasPassword) {
        if (!delPass) { setMsg({ type: "err", text: "Enter your password to confirm." }); return; }
        await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, delPass));
      } else if (hasGoogle) {
        await reauthenticateWithPopup(fbUser, googleProvider);
      } else if (hasApple) {
        await reauthenticateWithPopup(fbUser, appleProvider);
      }
    } catch (e) {
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
      setMsg({ type: "err", text: (e?.code === "auth/wrong-password" || e?.code === "auth/invalid-credential") ? "That password isn't right." : e?.code === "auth/user-mismatch" ? "Please confirm with the same account you're signed in with." : "Couldn't confirm it's you. Please try again." });
      return;
    }
    cloudSync.reset(); // stop any pending saves so nothing is re-created after deletion
    try {
      const token = await fbUser.getIdToken(true);
      const res = await fetch("/api/delete-account", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Couldn't delete your account. Please try again.");
      await onDeleted();
    } catch (e) {
      setMsg({ type: "err", text: `${e.message} Reload the page before trying again.` });
    }
  });

  // Confirm it's really them before sensitive changes (Firebase requires a recent sign-in)
  const confirmIdentity = async (currentPassword) => {
    if (hasPassword) {
      if (!currentPassword) throw Object.assign(new Error("Enter your current password."), { friendly: true });
      await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, currentPassword));
    } else if (hasGoogle) await reauthenticateWithPopup(fbUser, googleProvider);
    else if (hasApple) await reauthenticateWithPopup(fbUser, appleProvider);
  };
  const authMsg = (e, fallback) =>
    e?.friendly ? e.message :
    (e?.code === "auth/wrong-password" || e?.code === "auth/invalid-credential") ? "Your current password isn't right." :
    e?.code === "auth/weak-password" ? "Choose a stronger password (at least 8 characters)." :
    e?.code === "auth/email-already-in-use" ? "That email is already used by another account." :
    e?.code === "auth/invalid-email" ? "That email address doesn't look right." :
    e?.code === "auth/too-many-requests" ? "Too many attempts. Wait a few minutes and try again." :
    e?.code === "auth/requires-recent-login" ? "For your security, log out and back in, then try again." :
    fallback;

  const saveName = () => run("name", async () => {
    const n = fName.trim();
    if (!n || n.length > 60) { setMsg({ type: "err", text: "Enter a name (up to 60 characters)." }); return; }
    try {
      await updateProfile(fbUser, { displayName: n });
      await setDoc(doc(db, "users", fbUser.uid), { name: n }, { merge: true });
      onNameChange?.(n);
      setEditing(null); setMsg({ type: "ok", text: "Name updated." });
    } catch (e) { setMsg({ type: "err", text: authMsg(e, "Couldn't update your name. Try again.") }); }
  });

  const saveEmail = () => run("email", async () => {
    const em = fEmail.trim();
    if (!/\S+@\S+\.\S+/.test(em)) { setMsg({ type: "err", text: "Enter a valid email address." }); return; }
    if (em.toLowerCase() === (fbUser.email || "").toLowerCase()) { setMsg({ type: "err", text: "That's already your email." }); return; }
    try {
      await confirmIdentity(fCurrent);
      await verifyBeforeUpdateEmail(fbUser, em);
      setEditing(null);
      setMsg({ type: "ok", text: `We sent a link to ${em}. Your email changes once you click it. Until then, keep signing in with ${fbUser.email}.` });
    } catch (e) {
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
      setMsg({ type: "err", text: authMsg(e, "Couldn't change your email. Try again.") });
    }
  });

  const savePassword = () => run("password", async () => {
    if (fNew.length < 8) { setMsg({ type: "err", text: "New password must be at least 8 characters." }); return; }
    if (fNew !== fConfirm) { setMsg({ type: "err", text: "New passwords don't match." }); return; }
    try {
      await confirmIdentity(fCurrent);
      if (hasPassword) await updatePassword(fbUser, fNew);
      else await linkWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, fNew));
      force(n => n + 1); setEditing(null);
      setMsg({ type: "ok", text: hasPassword ? "Password changed." : `Password added. You can now also sign in with ${fbUser.email} and this password.` });
    } catch (e) {
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
      setMsg({ type: "err", text: authMsg(e, "Couldn't save your password. Try again.") });
    }
  });

  const input = { height: 40, padding: "0 12px", borderRadius: 8, border: "1px solid #DAD6CE", fontSize: 14, width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif", color: INK, background: "#fff" };
  const formBox = { display: "flex", flexDirection: "column", gap: 10, padding: "4px 20px 20px", maxWidth: 420 };
  const currentPassField = hasPassword
    ? <input type="password" placeholder="Current password" value={fCurrent} onChange={e => setFCurrent(e.target.value)} style={input} autoComplete="current-password" />
    : <span style={{ fontSize: 12, color: "#8C8880" }}>You'll confirm with {hasGoogle ? "Google" : "Apple"} when you save.</span>;
  const formButtons = (key, onSave, label) => (
    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
      <button style={btn(true)} disabled={!!busy} onClick={onSave}>{busy === key ? "Saving…" : label}</button>
      <button style={btn(false)} disabled={!!busy} onClick={() => setEditing(null)}>Cancel</button>
    </div>
  );

  const initial = (user.name || fbUser.email || "?").trim()[0]?.toUpperCase() || "?";
  const toggleMemory = () => setAceMem(writeAceMemory({ ...aceMem, enabled: !aceMem.enabled }));
  const forgetNote = (id) => setAceMem(writeAceMemory({ ...aceMem, notes: aceMem.notes.filter(n => n.id !== id) }));
  const forgetAll = () => { if (window.confirm("Erase everything Ace remembers about you?")) setAceMem(writeAceMemory({ ...aceMem, notes: [] })); };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F6F2", fontFamily: "'DM Sans', sans-serif", color: INK, textAlign: "left" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", height: 60, padding: "0 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <button style={{ ...btn(false), height: 32, padding: "0 12px" }} onClick={onBack}>← Galaxy</button>
          <div style={{ width: 1, height: 22, background: LINE }} />
          <AceHead size={28} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: INK }}>Settings</span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>
        {msg && <div role="status" style={{ display: "flex", gap: 10, alignItems: "flex-start", background: msg.type === "ok" ? "#E9F7EF" : "#FDECEA", border: `1px solid ${msg.type === "ok" ? "#B7E4C7" : "#F3C9C4"}`, color: msg.type === "ok" ? "#1E7A46" : "#B42318", borderRadius: 10, padding: "12px 14px", marginBottom: 24, fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
          <span aria-hidden="true">{msg.type === "ok" ? "✓" : "!"}</span><span style={{ flex: 1 }}>{msg.text}</span>
          <button onClick={() => setMsg(null)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 14, lineHeight: 1, opacity: 0.6 }}>✕</button>
        </div>}

        {/* Profile header */}
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 16, padding: "20px", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#F5C842,#E8A82A)", color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0 }}>{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: INK, overflowWrap: "anywhere" }}>{user.name}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 2, overflowWrap: "anywhere" }}>{fbUser.email || "No email on file"}</div>
          </div>
        </div>

        <StSection title="Profile" desc="How your name appears across Ace It Galaxy.">
          <StRow first label="Name" value={user.name}>
            {editing !== "name" && <button style={btn(false)} onClick={() => openEdit("name")}>Edit</button>}
          </StRow>
          {editing === "name" && (
            <div style={formBox}>
              <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Your name" style={input} maxLength={60} autoFocus />
              {formButtons("name", saveName, "Save")}
            </div>
          )}
        </StSection>

        <StSection title="Sign-in & security" desc="Manage how you sign in and keep your account secure.">
          <StRow first label="Email" value={<>
            <span>{fbUser.email || "—"}</span>
            {hasPassword && (fbUser.emailVerified ? <StBadge tone="ok">Verified</StBadge> : <StBadge tone="warn">Not verified</StBadge>)}
          </>}>
            {editing !== "email" && <button style={btn(false)} onClick={() => openEdit("email")}>Change</button>}
          </StRow>
          {editing === "email" && (
            <div style={formBox}>
              <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="New email address" style={input} autoFocus />
              {currentPassField}
              {formButtons("email", saveEmail, "Send confirmation link")}
            </div>
          )}
          {hasPassword && !fbUser.emailVerified && (
            <div style={{ margin: "0 20px 16px", background: "#FFF9E8", border: "1px solid #F1DFA6", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#6B4E00", lineHeight: 1.5, flex: "1 1 240px" }}>Verify your email to protect your account and keep your password working if you also sign in with Google.</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button style={btn(true)} disabled={!!busy} onClick={sendVerify}>{busy === "verify" ? "Sending…" : "Send link"}</button>
                <button style={btn(false)} disabled={!!busy} onClick={refreshVerify}>I've verified</button>
              </span>
            </div>
          )}

          <StRow label="Password" value={hasPassword ? "••••••••••" : "Not set — add one to sign in with your email too"}>
            {editing !== "password" && <button style={btn(false)} onClick={() => openEdit("password")}>{hasPassword ? "Change" : "Add password"}</button>}
          </StRow>
          {editing === "password" && (
            <div style={formBox}>
              {currentPassField}
              <input type="password" placeholder={hasPassword ? "New password (8+ characters)" : "Password (8+ characters)"} value={fNew} onChange={e => setFNew(e.target.value)} style={input} autoComplete="new-password" />
              <input type="password" placeholder="Repeat password" value={fConfirm} onChange={e => setFConfirm(e.target.value)} style={input} autoComplete="new-password" />
              {formButtons("password", savePassword, hasPassword ? "Change password" : "Add password")}
            </div>
          )}

          <StRow label={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><StGoogleG /> Google</span>} value={hasGoogle ? "You can sign in with your Google account" : "Sign in faster with your Google account"}>
            {hasGoogle ? <StBadge tone="ok">Connected</StBadge> : <button style={btn(false)} disabled={!!busy} onClick={connectGoogle}>{busy === "google" ? "Connecting…" : "Connect"}</button>}
          </StRow>
          {hasApple && <StRow label="Apple" value="You can sign in with your Apple account"><StBadge tone="ok">Connected</StBadge></StRow>}
        </StSection>

        <StSection title="Ace memory" desc="Let Ace remember your classes, goals and tricky topics between chats so it can help you better. Off unless you turn it on.">
          <StRow first label="Let Ace remember" value={aceMem.enabled ? "On — Ace saves short notes about your studies" : "Off — Ace forgets each chat when it ends"}>
            <button role="switch" aria-checked={aceMem.enabled} aria-label="Let Ace remember" onClick={toggleMemory}
              style={{ width: 46, height: 26, borderRadius: 999, border: "none", padding: 3, cursor: "pointer", background: aceMem.enabled ? "#1E7A46" : "#D6D2CA", transition: "background 0.2s", flexShrink: 0 }}>
              <span style={{ display: "block", width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transform: aceMem.enabled ? "translateX(20px)" : "translateX(0)", transition: "transform 0.2s" }} />
            </button>
          </StRow>
          {aceMem.notes.length > 0 ? (
            <div style={{ borderTop: `1px solid ${ST_LINE}`, padding: "8px 20px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ST_MUTED, textTransform: "uppercase", letterSpacing: 1, margin: "8px 0 6px" }}>What Ace remembers ({aceMem.notes.length})</div>
              {aceMem.notes.map(n => (
                <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: `1px dashed ${ST_LINE}` }}>
                  <span style={{ flex: 1, fontSize: 13, color: ST_INK, lineHeight: 1.5 }}>{n.text}</span>
                  <button onClick={() => forgetNote(n.id)} aria-label="Forget this" title="Forget this" style={{ background: "none", border: "none", color: ST_MUTED, cursor: "pointer", fontSize: 13, padding: "0 4px" }}>✕</button>
                </div>
              ))}
              <button onClick={forgetAll} style={{ ...btn(false), marginTop: 12, color: "#B42318", borderColor: "#F3C9C4" }}>Forget everything</button>
            </div>
          ) : aceMem.enabled ? (
            <div style={{ borderTop: `1px solid ${ST_LINE}`, padding: "14px 20px", fontSize: 13, color: ST_MUTED }}>Nothing yet. Chat with Ace and it will start remembering useful things about your studies.</div>
          ) : null}
        </StSection>

        <StSection title="Get the app" desc="Put Ace It Galaxy on your home screen. It opens full screen, like a regular app.">
          <StRow first label={installApp.state === "installed" ? "Installed" : "Add to home screen"}
            value={{
              installed: "You're using the app version on this device.",
              ready: "Free, no app store needed.",
              ios: "Tap the Share button (square with an arrow) in Safari, then \u201cAdd to Home Screen\u201d.",
              manual: "Open your browser menu and choose \u201cInstall app\u201d or \u201cAdd to Home screen\u201d.",
            }[installApp.state]}>
            {installApp.state === "installed" && <StBadge tone="ok">✓ Installed</StBadge>}
            {installApp.state === "ready" && <button style={btn(true)} onClick={installApp.install}>Install</button>}
          </StRow>
        </StSection>

        <StSection title="Help & feedback" desc="Tell us what's working and what isn't. Ace reads every message.">
          <StRow first label="Send feedback" value="Rate Ace It Galaxy, report a bug or suggest a feature.">
            <button style={btn(true)} onClick={() => window.dispatchEvent(new CustomEvent("tp-open-feedback", { detail: { source: "settings" } }))}>Send feedback</button>
          </StRow>
        </StSection>

        <StSection title="Session">
          <StRow first label="Signed in on this device" value="Log out when you're on a shared or public computer.">
            <button style={btn(false)} onClick={onLogout}>Log out</button>
          </StRow>
        </StSection>

        <StSection danger title="Danger zone">
          <StRow first label="Delete account" value="Permanently deletes your account and everything in it — flash cards, notes, brain maps, courses, journal, tasks and chats. This can't be undone.">
            {!showDelete && <button style={{ ...btn(false), borderColor: "#F3C9C4", color: "#B42318" }} onClick={() => { setShowDelete(true); setMsg(null); }}>Delete account</button>}
          </StRow>
          {showDelete && (
            <div style={formBox}>
              <label style={{ fontSize: 13, fontWeight: 600, color: INK }}>Type <strong>DELETE</strong> to confirm</label>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" style={input} autoFocus />
              {hasPassword ? (<>
                <label style={{ fontSize: 13, fontWeight: 600, color: INK, marginTop: 4 }}>Your password</label>
                <input type="password" value={delPass} onChange={e => setDelPass(e.target.value)} style={input} autoComplete="current-password" />
              </>) : <span style={{ fontSize: 12, color: MUTED }}>You'll be asked to sign in with {hasGoogle ? "Google" : "Apple"} once more to confirm.</span>}
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button style={{ ...btn(true), background: "#B42318", borderColor: "#B42318" }} disabled={!!busy} onClick={deleteAccount}>{busy === "delete" ? "Deleting…" : "Permanently delete"}</button>
                <button style={btn(false)} disabled={!!busy} onClick={() => { setShowDelete(false); setConfirmText(""); setDelPass(""); }}>Cancel</button>
              </div>
            </div>
          )}
        </StSection>
      </main>
    </div>
  );
}

export default SettingsApp;
