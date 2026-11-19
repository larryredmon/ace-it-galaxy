// Writes a ready-made HTML page for every main route after `vite build`, so search engines
// and link previews (iMessage, Discord, Facebook…) see the right title, description and
// content without running JavaScript. React replaces the static content when the app loads.
import fs from "node:fs";
import path from "node:path";
import { SITE, PAGE_META, SEO_CONTENT, SEO_APP_ORDER, LANDING_FAQS } from "../src/seo/content.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

const STYLE = `<style>.seo-static{font-family:'DM Sans',system-ui,sans-serif;background:#06040E;color:#F7F6F2;min-height:100vh;padding:48px 20px;text-align:left}
.seo-static .in{max-width:860px;margin:0 auto}.seo-static h1{font-family:'Playfair Display',Georgia,serif;font-size:40px;line-height:1.1;margin:0 0 14px;color:#F7F6F2}
.seo-static h2{font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:36px 0 12px;color:#F7F6F2}.seo-static p,.seo-static li{color:rgba(247,246,242,.72);line-height:1.7;font-size:16px}
.seo-static a{color:#F5C842}.seo-static nav a{margin-right:14px}.seo-static .k{font-size:12px;letter-spacing:2px;font-weight:700;color:#F5C842;text-transform:uppercase}</style>`;

const toolLinks = (except) => `<nav aria-label="Study tools"><p>${SEO_APP_ORDER.filter((id) => id !== except)
  .map((id) => `<a href="/${id}">${esc(SEO_CONTENT[id].h1)}</a>`).join(" · ")} · <a href="/decks">Free flash card decks</a></p></nav>`;

const breadcrumb = (name, url) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Ace It Galaxy", item: SITE + "/" },
    { "@type": "ListItem", position: 2, name, item: url },
  ],
});
const faqLd = (faqs) => ({
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

function page(template, { meta, url, body, jsonld = [] }) {
  let h = template;
  const rep = (re, val) => { if (!re.test(h)) throw new Error("seo-prerender: template is missing " + re); h = h.replace(re, val); };
  rep(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
  rep(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(meta.description)}" />`);
  rep(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="${meta.noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}" />`);
  rep(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`);
  rep(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`);
  rep(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(meta.title)}" />`);
  rep(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(meta.description)}" />`);
  rep(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(meta.title)}" />`);
  rep(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(meta.description)}" />`);
  rep(/<\/head>/, jsonld.map(ld).join("\n") + "\n</head>");
  rep(/<div id="root"><\/div>/, `<div id="root">${STYLE}<div class="seo-static"><div class="in">${body}</div></div></div>`);
  return h;
}

export function prerender(distDir) {
  const template = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  const out = {};

  // Home
  out["index.html"] = page(template, {
    meta: PAGE_META["/"], url: SITE + "/",
    body: `<div class="k">Free for students</div><h1>Everything you need to ace any class, in one place</h1>
<p>Ace It Galaxy is a free study platform with an AI flashcard generator, AI notes, mind maps, a study planner, live study rooms and Ace, an AI study owl who explains, quizzes and plans with you.</p>
<h2>Study tools</h2><ul>${SEO_APP_ORDER.map((id) => `<li><a href="/${id}">${esc(SEO_CONTENT[id].h1)}</a> — ${esc(SEO_CONTENT[id].tagline)}</li>`).join("")}</ul>
<p><a href="/decks">Browse free flash card decks made by students</a></p>
<h2>Questions students ask</h2>${LANDING_FAQS.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("")}`,
    jsonld: [
      { "@context": "https://schema.org", "@type": "Organization", name: "Ace It Galaxy", url: SITE + "/", logo: SITE + "/icons/icon-512.png" },
      { "@context": "https://schema.org", "@type": "WebSite", name: "Ace It Galaxy", alternateName: "Ace It", url: SITE + "/" },
      faqLd(LANDING_FAQS),
    ],
  });

  // One page per study tool
  for (const id of SEO_APP_ORDER) {
    const c = SEO_CONTENT[id]; const meta = PAGE_META[id]; const url = `${SITE}/${id}`;
    out[`${id}.html`] = page(template, {
      meta, url,
      body: `<p><a href="/">Ace It Galaxy</a> › ${esc(c.name)}</p><div class="k">${esc(c.kicker)}</div><h1>${esc(c.h1)}</h1><p>${esc(c.tagline)}</p>
<p><a href="/${id}">Open ${esc(c.name)} free</a></p>
<h2>What you can do</h2><ul>${c.features.map((f) => `<li><strong>${esc(f.t)}.</strong> ${esc(f.d)}</li>`).join("")}</ul>
<h2>How it works</h2><ol>${c.steps.map((f) => `<li><strong>${esc(f.t)}.</strong> ${esc(f.d)}</li>`).join("")}</ol>
<h2>FAQ</h2>${c.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("")}
<h2>More free study tools</h2>${toolLinks(id)}`,
      jsonld: [
        { "@context": "https://schema.org", "@type": "SoftwareApplication", name: `${c.h1} — Ace It Galaxy`, url, description: meta.description,
          applicationCategory: "EducationalApplication", operatingSystem: "Web, iOS, Android",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, publisher: { "@type": "Organization", name: "Ace It Galaxy", url: SITE + "/" } },
        faqLd(c.faqs),
        breadcrumb(c.name, url),
      ],
    });
  }

  // Settings (not for search), Privacy, Terms
  out["settings.html"] = page(template, { meta: PAGE_META.settings, url: `${SITE}/settings`, body: `<h1>Settings</h1><p><a href="/">Back to Ace It Galaxy</a></p>` });
  for (const key of ["privacy", "terms"]) {
    const meta = PAGE_META[key];
    out[`${key}.html`] = page(template, {
      meta, url: `${SITE}/${key}`,
      body: `<p><a href="/">Ace It Galaxy</a> › ${key === "privacy" ? "Privacy Policy" : "Terms of Service"}</p><h1>${key === "privacy" ? "Privacy Policy" : "Terms of Service"}</h1><p>${esc(meta.description)}</p><p>Loading the full ${key === "privacy" ? "policy" : "terms"}…</p>`,
      jsonld: [breadcrumb(key === "privacy" ? "Privacy Policy" : "Terms of Service", `${SITE}/${key}`)],
    });
  }

  for (const [file, html] of Object.entries(out)) fs.writeFileSync(path.join(distDir, file), html);
  return Object.keys(out);
}

export function seoPrerender() {
  let outDir = "dist";
  return {
    name: "seo-prerender",
    apply: "build",
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const files = prerender(outDir);
      console.log(`seo-prerender: wrote ${files.length} pages`);
    },
  };
}
