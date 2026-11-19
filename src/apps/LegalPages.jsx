// Split out of App.jsx so this code only downloads when it is needed.
import { useEffect } from "react";
import { PAGE_META } from "../seo/content.js";

function usePageMeta(key) {
  useEffect(() => {
    const m = PAGE_META[key];
    document.title = m.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", m.description);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", `https://www.aceitgalaxy.com/${key}`);
  }, [key]);
}


// ─── Privacy Policy Page ──────────────────────────────────────────────────────
function PrivacyPolicyPage({ onBack }) {
  usePageMeta("privacy");
  const today = "November 19, 2026";
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#06040E", minHeight:"100vh", color:"#F7F6F2" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing:border-box; } ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}`}</style>

      {/* Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(6,4,14,0.96)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)", height:60, display:"flex", alignItems:"center", padding:"0 32px", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"rgba(255,255,255,0.5)", transition:"all 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="rgba(255,255,255,0.4)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.5)";e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";}}>
            ← Back
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <img src="/mascots/ace-head.webp" alt="" width={24} height={24} style={{ width:24, height:24, borderRadius:"50%", background:"#fff" }} />
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:800, color:"#F7F6F2" }}>Ace It</span>
          </div>
        </div>
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>Privacy Policy</span>
      </nav>

      {/* Content */}
      <div style={{ maxWidth:760, margin:"0 auto", padding:"64px 32px 120px" }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7, background:"rgba(245,200,66,0.08)", border:"1px solid rgba(245,200,66,0.2)", borderRadius:20, padding:"4px 14px", marginBottom:20 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#F5C842" }}>Legal</span>
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(32px,5vw,52px)", fontWeight:900, color:"#F7F6F2", letterSpacing:-1, lineHeight:1.1, marginBottom:16 }}>Privacy Policy</h1>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.35)" }}>Last updated: {today}</p>
        </div>

        {[
          {
            title: "1. Who We Are",
            body: `Ace It ("we," "us," or "our") is an AI-powered educational platform that helps students and lifelong learners create flashcards, take notes, build brain maps, and track their progress. This Privacy Policy explains how we collect, use, and protect your information when you use our platform at aceitgalaxy.com and any associated services.`
          },
          {
            title: "2. Information We Collect",
            body: `We collect the following types of information:

Account Information: When you create an account, we collect your name and email address. If you sign in with Google, we receive your name and email address from Google. We also record that you confirmed you are 13 or older.

Study Content: We store the content you create — flash card decks and drafts, notes, brain maps, courses and uploaded course documents, journal entries, tracker tasks, study plans and goals, Personal Assistant conversations, and Text Simplifier history. This content is linked to your account and saved in secure cloud storage so it's available on any device you sign in on.

Ace Memory (only if you turn it on): If you enable "Let Ace remember" in Settings, Ace saves short notes about your studies — for example your classes, goals, or topics you find hard — so it can help you better next time. You can view and delete these notes in Settings at any time.

AI Usage Counts: We count how many AI requests you make each day to enforce the daily limit. We store the count and the date, not the content of your requests.

Usage and Analytics: We use privacy-friendly analytics (Vercel Web Analytics) to see which pages are visited, the referring website, approximate location (country/region), and browser and device type. This data is aggregated and not linked to your account.

Error Reports: If something on the site crashes, your browser sends us an error report containing the error message, the page you were on, and your browser type. Error reports do not include your study content.

Feedback: If you send feedback, we store your rating, your message, the page you were on and, if you're signed in, your account email so we can follow up.

Device Information: We collect basic browser and device information for security and compatibility.`
          },
          {
            title: "3. How We Use Your Information",
            body: `We use your information solely to:

• Provide and improve Ace It Galaxy and its features
• Save and sync your study data across your devices
• Power AI features, including Ace, our AI study companion (see "Ace and AI Features" below)
• Enforce fair-use limits, such as the daily AI request limit
• Find and fix bugs using error reports
• Send important account-related emails, such as email verification and password resets (not marketing, unless you opt in)
• Keep your account and the platform secure

We do not sell your data. We do not use your data for advertising. We do not share your personal information with third parties except as described in this policy.

Public Decks: Your flash card decks are private unless you choose to make one public. A public deck — its title, subject, description, cards and your first name — can be seen by anyone, including on its own web page that search engines like Google may show. Other students can save a copy and rate or report it. You can make a deck private again at any time, which removes its public page; copies other students already saved stay in their accounts. Deleting your account removes all of your public decks.`
          },
          {
            title: "4. Third-Party Services",
            body: `Ace It Galaxy uses the following services to operate:

Firebase (Google): Firebase Authentication handles sign-in, and Firestore stores your study data, Ace memory notes and daily AI usage counts. Your data is stored on Google's servers subject to Google's Privacy Policy.

Anthropic (Claude API): When you use AI features — chatting with Ace, generating flash cards, simplifying text, building brain maps or study plans — the text you submit, along with relevant parts of your study data so Ace can personalize its help, is sent to Anthropic's API for processing. Anthropic does not train its models on API inputs by default. See Anthropic's Privacy Policy for details.

Vercel: Our website and server functions are hosted on Vercel. Vercel keeps request logs, which include the error reports described above. We also use Vercel Web Analytics, which does not use third-party cookies and is not tied to your identity.

We require all service providers to maintain appropriate data security standards.`
          },
          {
            title: "5. Data Storage and Security",
            body: `Your study data is stored in Google Firebase Firestore. Data is encrypted in transit using HTTPS/TLS, and each account's data can only be read by that account. AI features run through our own server so that our AI keys are never exposed to your browser.

Backups: To protect against data loss, we keep automatic daily backups of our database for up to 98 days, plus a rolling 7-day recovery history. Backups are used only to restore data after an error or outage.

On Your Device: While you're signed in, a copy of your study data is kept in your browser so the app works quickly. When you log out, that copy is removed from the browser. If you use Ace It Galaxy without an account, your data stays only in that browser until you create an account and sign in.`
          },
          {
            title: "6. Ace and AI Features",
            body: `Ace is Ace It Galaxy's AI study companion. Ace's instructions and safety rules are set on our server and cannot be changed from your browser.

When you chat with Ace or use other AI features, your message and relevant study information (such as deck names, note titles, goals and, if you've turned it on, Ace memory notes) are sent to Anthropic to generate a reply. Please don't share sensitive personal information — such as passwords, government ID numbers, or health details — in your chats or study content.

AI answers can be wrong. Always double-check important information.`
          },
          {
            title: "7. Student Data",
            body: `Ace It Galaxy is for students 13 and older. You must confirm that you are at least 13 to create or use an account. If you tell us you are under 13, we delete the account and its data. If we learn that we have collected information from a child under 13 in any other way, we will delete it promptly. We do not knowingly collect personal information from children under 13.

For students ages 13–17, we encourage parents and guardians to be aware of their use of the platform. We only collect what we need to provide the service.

Ace is designed for students: it guides learning rather than doing graded work, stays school-appropriate, and points students to the 988 Suicide & Crisis Lifeline and trusted adults if they mention being in crisis or in danger.`
          },
          {
            title: "8. Your Rights and Choices",
            body: `You have the following rights regarding your data:

Access: You can view your study data in the app at any time, and your account details in Settings.

Correction: You can change your name, email address and password in Settings.

Deletion: You can delete individual notes, decks and other content in the app. To delete your entire account and all associated data, go to Settings → Delete account. This permanently removes your account and study data from our active systems right away; copies in backups expire within 98 days.

Ace Memory: Ace memory is off unless you turn it on. You can view, delete individual notes, or erase everything Ace remembers in Settings.

Export: Your study content is accessible within the app. We plan to add a download-your-data feature in the future.

California Residents (CCPA): You have the right to know what personal information we collect, request deletion of your data, and opt out of any sale of personal information (we do not sell personal information).

EU/UK Residents (GDPR): You have the right to access, rectify, erase, restrict or port your personal data, and to object to processing. To exercise these rights, contact us below.`
          },
          {
            title: "9. Cookies",
            body: `We use only what the platform needs to work. Firebase uses your browser's storage to keep you signed in, and the app stores a copy of your study data in your browser while you're signed in. Our analytics (Vercel Web Analytics) does not use third-party cookies. We do not use advertising cookies or tracking pixels.`
          },
          {
            title: "10. Changes to This Policy",
            body: `We may update this Privacy Policy from time to time. When we make significant changes, we will update the "Last updated" date at the top of this page. For important changes, we will also let signed-in users know in the app. Continued use of Ace It Galaxy after changes means you accept the updated policy.`
          },
          {
            title: "11. Contact Us",
            body: `If you have any questions about this Privacy Policy or wish to exercise your privacy rights, please contact us at:

Ace It
Email: privacy@aceitgalaxy.com

We aim to respond to all privacy inquiries within 30 days.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom:40, paddingBottom:40, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:800, color:"#F7F6F2", marginBottom:16 }}>{section.title}</h2>
            <div style={{ fontSize:15, color:"rgba(255,255,255,0.6)", lineHeight:1.85, whiteSpace:"pre-line" }}>{section.body}</div>
          </div>
        ))}

        <div style={{ background:"rgba(245,200,66,0.06)", border:"1px solid rgba(245,200,66,0.15)", borderRadius:12, padding:"24px 28px", marginTop:40 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#F5C842", marginBottom:8 }}>Questions or Concerns?</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)", lineHeight:1.7 }}>
            We built Ace It with your privacy in mind. If anything in this policy is unclear or you have concerns about your data, reach out to us at <span style={{ color:"#F5C842" }}>privacy@aceitgalaxy.com</span> — we're a small team and we read every message.
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"24px 32px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>© 2026 Ace It · All rights reserved</span>
        <button onClick={onBack} style={{ background:"none", border:"none", fontSize:12, color:"rgba(255,255,255,0.3)", cursor:"pointer" }}>← Back to Ace It</button>
      </footer>
    </div>
  );
}

// ─── Terms of Service Page ─────────────────────────────────────────────────────
function TermsOfServicePage({ onBack }) {
  usePageMeta("terms");
  const today = "November 19, 2026";
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#06040E", minHeight:"100vh", color:"#F7F6F2" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing:border-box; } ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}`}</style>

      {/* Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(6,4,14,0.96)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)", height:60, display:"flex", alignItems:"center", padding:"0 32px", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"rgba(255,255,255,0.5)", transition:"all 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="rgba(255,255,255,0.4)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.5)";e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";}}>
            ← Back
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <img src="/mascots/ace-head.webp" alt="" width={24} height={24} style={{ width:24, height:24, borderRadius:"50%", background:"#fff" }} />
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:800, color:"#F7F6F2" }}>Ace It</span>
          </div>
        </div>
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>Terms of Service</span>
      </nav>

      {/* Content */}
      <div style={{ maxWidth:760, margin:"0 auto", padding:"64px 32px 120px" }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7, background:"rgba(245,200,66,0.08)", border:"1px solid rgba(245,200,66,0.2)", borderRadius:20, padding:"4px 14px", marginBottom:20 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#F5C842" }}>Legal</span>
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(32px,5vw,52px)", fontWeight:900, color:"#F7F6F2", letterSpacing:-1, lineHeight:1.1, marginBottom:16 }}>Terms of Service</h1>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.35)" }}>Last updated: {today}</p>
        </div>

        {[
          {
            title: "1. Acceptance of Terms",
            body: `By accessing or using Ace It Galaxy ("the Platform"), you agree to these Terms of Service. If you do not agree, please do not use the Platform.

You must be at least 13 years old to create an account or use the Platform. If you are under 18, you should have permission from a parent or guardian, and they should review these Terms with you.`
          },
          {
            title: "2. Description of Service",
            body: `Ace It Galaxy is an AI-powered study platform with tools including AI flash cards, notes, brain maps, a text simplifier, course organization, live study rooms (Study Buddy), a journal, a tracker, and Ace, an AI study companion. Features may change as the platform evolves.

Some features require an account. AI features have a daily usage limit to keep the service free and fair for everyone. We currently offer the Platform for free and may introduce paid features in the future; we will give advance notice of any changes.`
          },
          {
            title: "3. Your Account",
            body: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:

• Provide accurate and truthful information when creating your account
• Notify us immediately of any unauthorized use of your account
• Not share your account credentials with others
• Not create multiple accounts to circumvent restrictions

We reserve the right to suspend or terminate accounts that violate these Terms or that are used for fraudulent or harmful purposes.`
          },
          {
            title: "4. Your Content",
            body: `You keep full ownership of everything you create on Ace It Galaxy — including your notes, flash card decks, journal entries, brain maps and uploaded course materials ("Your Content").

By using the Platform, you give Ace It Galaxy a limited, non-exclusive license to store, display and process Your Content only to provide the service to you — including sending it to our AI provider when you use AI features.

You are responsible for making sure Your Content doesn't break any laws or anyone else's rights. Only upload materials you have the right to use.

When you delete content or your account, we remove it from our active systems right away. Copies in our automatic backups expire within 98 days.`
          },
          {
            title: "5. AI-Generated Content",
            body: `Ace It Galaxy uses artificial intelligence (Anthropic's Claude) to power Ace and to help generate flash cards, summaries, study plans and other materials from content you provide.

You acknowledge that:
• AI-generated content can contain errors, inaccuracies or omissions
• You should review and verify AI content before relying on it for schoolwork or anything important
• Ace is a study helper, not a teacher, tutor, counselor, doctor or lawyer, and is not a substitute for professional advice
• Ace is designed to help you learn, not to complete graded work for you; you are responsible for following your school's academic integrity rules

Ace It Galaxy is not liable for consequences arising from reliance on AI-generated content.`
          },
          {
            title: "6. Acceptable Use",
            body: `You agree to use Ace It only for lawful, educational purposes. You agree not to:

• Use the Platform to generate, store, or distribute harmful, hateful, or illegal content
• Attempt to reverse-engineer, hack, or disrupt the Platform or its infrastructure
• Use automated tools or bots to access the Platform in ways that overload our systems
• Impersonate other users or Ace It staff
• Use the Platform to violate academic integrity policies (e.g., submitting AI-generated content as your own work without disclosure)
• Attempt to extract or scrape data from the Platform at scale

We reserve the right to suspend or terminate any account that violates these guidelines without prior notice.`
          },
          {
            title: "7. Intellectual Property",
            body: `The Ace It platform, including its design, code, branding, and original content, is owned by Ace It and protected by copyright and other intellectual property laws. You may not copy, reproduce, distribute, or create derivative works from the Platform without our express written permission.

The Ace It Galaxy name and logo and our mascots — Ace the owl and Biscuit the pup — are trademarks of Ace It Galaxy. All rights reserved.`
          },
          {
            title: "8. Disclaimer of Warranties",
            body: `Ace It is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that:

• The Platform will be uninterrupted, error-free, or completely secure
• The results obtained from using the Platform will be accurate or reliable
• Any errors or defects will be corrected

To the fullest extent permitted by law, we disclaim all warranties including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.`
          },
          {
            title: "9. Limitation of Liability",
            body: `To the fullest extent permitted by applicable law, Ace It and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, academic outcomes, or business opportunities, even if we have been advised of the possibility of such damages.

Our total liability for any claims arising from your use of the Platform shall not exceed the amount you paid us in the twelve months prior to the claim (or $0 if you used a free plan).`
          },
          {
            title: "10. Changes to Terms",
            body: `We may update these Terms of Service from time to time. When we make material changes, we will update the "Last updated" date and notify registered users via email or an in-app notice.

Continued use of Ace It after changes to these Terms constitutes your acceptance of the updated Terms. If you do not agree with the updated Terms, you should discontinue use of the Platform.`
          },
          {
            title: "11. Termination",
            body: `You may stop using Ace It Galaxy at any time. You can delete your account and its data at any time in Settings → Delete account.

We may suspend or terminate your access if you violate these Terms, with or without notice. When your access ends, your right to use the Platform ends immediately.`
          },
          {
            title: "12. Governing Law",
            body: `These Terms shall be governed by and construed in accordance with the laws of the State of Texas, United States, without regard to conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Texas.`
          },
          {
            title: "13. Contact Us",
            body: `If you have any questions about these Terms of Service, please contact us at:

Ace It
Email: legal@aceitgalaxy.com

We aim to respond to all inquiries within 30 days.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom:40, paddingBottom:40, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:800, color:"#F7F6F2", marginBottom:16 }}>{section.title}</h2>
            <div style={{ fontSize:15, color:"rgba(255,255,255,0.6)", lineHeight:1.85, whiteSpace:"pre-line" }}>{section.body}</div>
          </div>
        ))}

        <div style={{ background:"rgba(245,200,66,0.06)", border:"1px solid rgba(245,200,66,0.15)", borderRadius:12, padding:"24px 28px", marginTop:40 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#F5C842", marginBottom:8 }}>Plain English Summary</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)", lineHeight:1.7 }}>
            You own your content. We provide the platform in good faith. Use it for learning, not harm. AI can make mistakes — double-check important things. If you have a problem, email us and we'll work it out.
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"24px 32px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>© 2026 Ace It · All rights reserved</span>
        <button onClick={onBack} style={{ background:"none", border:"none", fontSize:12, color:"rgba(255,255,255,0.3)", cursor:"pointer" }}>← Back to Ace It</button>
      </footer>
    </div>
  );
}

export { PrivacyPolicyPage, TermsOfServicePage };
