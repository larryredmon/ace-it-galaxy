// Receives crash reports from the site and writes them to Vercel's logs
// (Vercel → Project → Logs, search for "[client-error]"). Stores nothing.
export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };

const clip = (v, n) => String(v ?? "").replace(/[\r\n]+/g, " ⏎ ").slice(0, n);

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  console.error("[client-error]", JSON.stringify({
    message: clip(b.message, 500),
    source: clip(b.source, 20),
    url: clip(b.url, 200),
    ua: clip(b.ua, 200),
    at: clip(b.at, 40),
    stack: clip(b.stack, 2000),
    extra: clip(b.extra, 1000),
  }));
  return res.status(204).end();
}
