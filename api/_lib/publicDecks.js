// Shared helpers for public flash card decks (pages Google can find).
import { createHash } from "node:crypto";

export const SITE = "https://www.aceitgalaxy.com";
export const MAX_CARDS = 300;
export const MIN_CARDS_TO_INDEX = 5;

// Same deck from the same student always gets the same public id, so re-sharing updates it.
export function publicIdFor(uid, deckId) {
  return createHash("sha256").update(`${uid}:${deckId}`).digest("hex").slice(0, 12);
}

export function slugify(text) {
  return String(text || "deck").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "deck";
}

export function deckPath(d) { return `/deck/${d.slug || "deck"}-${d.id}`; }

export function clean(s, max) {
  // eslint-disable-next-line no-control-regex -- strip invisible control characters
  return String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Very small filter for slurs and spam in titles; decks can also be reported.
const BLOCKED = /\b(n[i1]gg(er|a)|f[a@]gg?[o0]t|k[i1]ke|sp[i1]c|ch[i1]nk|retard(ed)?|porn|xxx|onlyfans|casino|viagra)\b/i;
export function looksBad(...texts) { return texts.some((t) => BLOCKED.test(String(t || ""))); }

// Summary safe to send to anyone (no owner id, no ratings map).
export function summary(id, d) {
  return {
    id, slug: d.slug, title: d.title, subject: d.subject, description: d.description,
    color: d.color, cardCount: d.cardCount, authorName: d.authorName,
    ratingAvg: d.ratingCount ? Math.round((d.ratingSum / d.ratingCount) * 10) / 10 : 0,
    ratingCount: d.ratingCount || 0, saves: d.saves || 0,
    updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : null,
    url: deckPath({ ...d, id }),
  };
}
