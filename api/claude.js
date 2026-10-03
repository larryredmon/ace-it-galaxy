import { guard } from "./_lib/guard.js";

// The server decides the model and the reply-length ceiling; the browser can't override them.
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS_CAP = 6000;
const MAX_MESSAGES = 80;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  const user = await guard(req, res);
  if (!user) return;

  try {
    const apiKey = process.env.ANTHROPIC_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: { message: "Missing API key" } });
    }

    const input = req.body || {};
    if (!Array.isArray(input.messages) || input.messages.length === 0 || input.messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: { message: "Invalid request" } });
    }

    const requested = parseInt(input.max_tokens, 10);
    const body = {
      model: MODEL,
      max_tokens: Math.min(Number.isFinite(requested) && requested > 0 ? requested : 1000, MAX_TOKENS_CAP),
      messages: input.messages,
    };
    if (typeof input.system === "string" || Array.isArray(input.system)) body.system = input.system;
    if (typeof input.temperature === "number") body.temperature = Math.min(Math.max(input.temperature, 0), 1);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Anthropic error:", response.status, JSON.stringify(data).slice(0, 500));
      return res.status(response.status).json({ error: { message: "The AI request failed. Please try again." } });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error("claude handler:", error.message);
    return res.status(500).json({ error: { message: "Something went wrong. Please try again." } });
  }
}
