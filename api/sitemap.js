// sitemap.xml: the main pages plus every public deck.
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "./_lib/guard.js";
import { SITE, deckPath, slugify, MIN_CARDS_TO_INDEX } from "./_lib/publicDecks.js";

const PAGES = [
  ["/", "weekly", "1.0"], ["/flashcards", "monthly", "0.9"], ["/notes", "monthly", "0.9"], ["/decks", "daily", "0.9"],
  ["/brainmap", "monthly", "0.8"], ["/simplifier", "monthly", "0.8"], ["/tracker", "monthly", "0.8"], ["/assistant", "monthly", "0.8"],
  ["/studybuddy", "monthly", "0.8"], ["/coursehub", "monthly", "0.8"], ["/journal", "monthly", "0.7"],
  ["/privacy", "yearly", "0.3"], ["/terms", "yearly", "0.3"],
];

export default async function handler(req, res) {
  const urls = PAGES.map(([p, f, pr]) => `<url><loc>${SITE}${p}</loc><changefreq>${f}</changefreq><priority>${pr}</priority></url>`);
  try {
    const db = getFirestore(adminApp());
    const snap = await db.collection("publicDecks").orderBy("updatedAt", "desc").limit(5000).get();
    const subjects = new Set();
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.hidden || (d.cardCount || 0) < MIN_CARDS_TO_INDEX) continue;
      subjects.add(slugify(d.subject));
      const lastmod = d.updatedAt?.toDate ? `<lastmod>${d.updatedAt.toDate().toISOString().slice(0, 10)}</lastmod>` : "";
      urls.push(`<url><loc>${SITE}${deckPath({ id: doc.id, slug: d.slug })}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.6</priority></url>`);
    }
    for (const sub of subjects) urls.push(`<url><loc>${SITE}/decks/${sub}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  } catch (e) {
    console.error("sitemap decks:", e.message);
  }
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
}
