// Server-rendered pages for public decks so Google can read them.
//   /deck/<slug>-<id>  → one deck (rewritten here by vercel.json)
//   /decks             → list of public decks
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "./_lib/guard.js";
import { SITE, esc, summary, deckPath, MIN_CARDS_TO_INDEX } from "./_lib/publicDecks.js";

const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:'DM Sans',system-ui,sans-serif;background:#F7F6F2;color:#1A1814;line-height:1.55}
a{color:inherit}.top{background:#06040E;color:#F7F6F2}.top .in{max-width:960px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800;letter-spacing:2px;color:#F5D96A;font-size:14px}.brand img{width:30px;height:30px;border-radius:8px}
.btn{display:inline-block;background:#F5C842;color:#1A1814;font-weight:700;font-size:14px;padding:11px 20px;border-radius:9px;text-decoration:none;border:none;cursor:pointer}
.btn.ghost{background:transparent;color:#F7F6F2;border:1px solid rgba(247,246,242,.25)}
.hero{background:#06040E;color:#F7F6F2;padding:28px 0 40px}.hero .in{max-width:960px;margin:0 auto;padding:0 20px}
.kicker{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#F5C842;margin-bottom:10px}
h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(30px,5vw,46px);line-height:1.1;margin:0 0 12px;letter-spacing:-.5px;color:#F7F6F2}
.meta{font-size:14px;color:rgba(247,246,242,.6);margin-bottom:22px}.desc{font-size:16px;color:rgba(247,246,242,.8);max-width:640px;margin:0 0 22px}
main{max-width:960px;margin:0 auto;padding:32px 20px 56px}h2{font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:0 0 16px}
.cards{display:grid;gap:10px}.card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:18px;background:#fff;border:1px solid #ECE9E3;border-radius:12px;padding:16px 18px}
.term{font-weight:700}.def{color:#4A4740;white-space:pre-wrap}.n{font-size:11px;color:#A8A59E;font-weight:700;margin-bottom:2px}
.cta{margin:34px 0 0;background:#fff;border:1px solid #ECE9E3;border-radius:16px;padding:24px;display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.cta img{width:72px;height:auto}.cta div{flex:1 1 260px}.cta h3{font-family:'Playfair Display',Georgia,serif;margin:0 0 4px;font-size:20px}.cta p{margin:0;color:#6F6B63;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}.tile{display:block;background:#fff;border:1px solid #ECE9E3;border-radius:14px;padding:18px;text-decoration:none}
.tile .s{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}.tile .t{font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:17px;margin-bottom:6px}.tile .m{font-size:12px;color:#8C8880}
footer{border-top:1px solid #ECE9E3;padding:22px 20px;text-align:center;font-size:12px;color:#8C8880}footer a{margin:0 8px}
@media(max-width:640px){.card{grid-template-columns:1fr;gap:6px}.top .btn{padding:9px 14px;font-size:13px}}
`;

function page({ title, description, canonical, noindex, jsonld, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow">'}
<link rel="canonical" href="${esc(canonical)}"><meta name="theme-color" content="#06040E">
<meta property="og:type" content="website"><meta property="og:site_name" content="Ace It Galaxy"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>${CSS}</style>${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}</head><body>
<header class="top"><div class="in"><a class="brand" href="/"><img src="/icons/icon-192.png" alt="">ACE IT GALAXY</a><a class="btn" href="/flashcards">Make your own free</a></div></header>
${body}
<footer>© ${new Date().getFullYear()} Ace It Galaxy · Free AI study tools for students<br><a href="/decks">Public decks</a><a href="/">Home</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></footer>
</body></html>`;
}

function notFound(res) {
  res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(page({
    title: "Deck not found · Ace It Galaxy", description: "This flash card deck isn't available.", canonical: `${SITE}/decks`, noindex: true,
    body: `<section class="hero"><div class="in"><div class="kicker">Flash cards</div><h1>This deck isn't available</h1><p class="desc">It may have been made private or removed.</p><a class="btn" href="/decks">Browse public decks</a></div></section>`,
  }));
}

export default async function handler(req, res) {
  let db;
  try { db = getFirestore(adminApp()); }
  catch (e) { console.error("deck-page setup:", e.message); res.status(503).send("Temporarily unavailable"); return; }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  const path = String(req.query.path || "");
  if (!path) {
    // List page
    const snap = await db.collection("publicDecks").orderBy("updatedAt", "desc").limit(300).get();
    const decks = snap.docs.filter((x) => !x.data().hidden).map((x) => summary(x.id, x.data()));
    const tiles = decks.map((d) => `<a class="tile" href="${esc(d.url)}"><div class="s" style="color:${esc(d.color)}">${esc(d.subject)}</div><div class="t">${esc(d.title)}</div><div class="m">${d.cardCount} cards · by ${esc(d.authorName)}</div></a>`).join("");
    return res.status(200).send(page({
      title: "Free Flash Card Decks Made by Students · Ace It Galaxy",
      description: "Browse free flash card decks shared by students on Ace It Galaxy. Study any deck for free, or make your own with AI.",
      canonical: `${SITE}/decks`,
      body: `<section class="hero"><div class="in"><div class="kicker">Public library</div><h1>Free flash card decks made by students</h1><p class="desc">Study any deck for free, save it to your account, or make your own in seconds with AI.</p><a class="btn" href="/flashcards">Make a deck</a></div></section>
<main>${decks.length ? `<div class="grid">${tiles}</div>` : `<p>No public decks yet. Be the first to share one!</p>`}</main>`,
    }));
  }

  const id = (path.match(/([0-9a-f]{12})$/) || [])[1];
  if (!id) return notFound(res);
  const snap = await db.collection("publicDecks").doc(id).get();
  if (!snap.exists || snap.data().hidden) return notFound(res);
  const d = snap.data();
  const s = summary(id, d);
  const canonical = SITE + deckPath({ id, slug: d.slug });
  if (path !== deckPath({ id, slug: d.slug }).slice(1)) { res.setHeader("Location", canonical); return res.status(301).end(); }

  const cards = d.cards || [];
  const preview = cards.slice(0, 3).map((c) => c.term).join(", ");
  const title = `${d.title} Flash Cards · ${cards.length} terms | Ace It Galaxy`;
  const description = (d.description ? `${d.description} ` : "") + `Study ${cards.length} free flash cards${preview ? `: ${preview}` : ""} and more.`;
  const jsonld = {
    "@context": "https://schema.org", "@type": "Quiz", name: `${d.title} flash cards`, about: { "@type": "Thing", name: d.subject },
    educationalAlignment: [], url: canonical,
    hasPart: cards.slice(0, 100).map((c) => ({ "@type": "Question", eduQuestionType: "Flashcard", text: c.term, acceptedAnswer: { "@type": "Answer", text: c.definition } })),
  };
  delete jsonld.educationalAlignment;
  const list = cards.map((c, i) => `<div class="card"><div><div class="n">${i + 1}</div><div class="term">${esc(c.term)}</div></div><div class="def">${esc(c.definition)}</div></div>`).join("");
  return res.status(200).send(page({
    title, description: description.slice(0, 300), canonical, noindex: cards.length < MIN_CARDS_TO_INDEX, jsonld,
    body: `<section class="hero"><div class="in"><div class="kicker">${esc(d.subject)} · Flash cards</div><h1>${esc(d.title)}</h1>
<div class="meta">${cards.length} cards · shared by ${esc(d.authorName)}${s.ratingCount ? ` · ★ ${s.ratingAvg} (${s.ratingCount})` : ""}</div>
${d.description ? `<p class="desc">${esc(d.description)}</p>` : ""}
<a class="btn" href="/flashcards?public=${id}">Study these free</a> <a class="btn ghost" href="/decks">More decks</a></div></section>
<main><h2>Terms in this deck</h2><div class="cards">${list}</div>
<div class="cta"><img src="/mascots/ace-owl.webp" alt="Ace the owl"><div><h3>Study smarter with Ace</h3><p>Flip these cards, quiz yourself with spaced repetition, and make your own decks from your notes with AI. Free for students.</p></div><a class="btn" href="/flashcards?public=${id}">Start studying</a></div></main>`,
  }));
}
