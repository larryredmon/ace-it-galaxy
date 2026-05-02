import Anthropic from "@anthropic-ai/sdk";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.ANTHROPIC_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing API key" });

    // Read raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Parse multipart form data manually
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) return res.status(400).json({ error: "No boundary" });

    const boundary = boundaryMatch[1];
    const parts = buffer.toString("binary").split("--" + boundary);

    let fileData = null;
    let mimeType = "application/pdf";

    for (const part of parts) {
      if (part.includes("Content-Disposition") && part.includes("filename")) {
        const mimeMatch = part.match(/Content-Type: ([^\r\n]+)/);
        if (mimeMatch) mimeType = mimeMatch[1].trim();
        const bodyStart = part.indexOf("\r\n\r\n") + 4;
        const bodyEnd = part.lastIndexOf("\r\n");
        const body = part.slice(bodyStart, bodyEnd);
        fileData = Buffer.from(body, "binary").toString("base64");
        break;
      }
    }

    if (!fileData) return res.status(400).json({ error: "No file found" });

    const client = new Anthropic({ apiKey });

    const isPDF = mimeType === "application/pdf";
    const contentBlock = isPDF
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileData } }
      : { type: "image", source: { type: "base64", media_type: mimeType, data: fileData } };

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      betas: isPDF ? ["pdfs-2024-09-25"] : undefined,
      messages: [{
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: "Extract ALL text content from this document. Return the complete text preserving all headings, chapters, sections and structure. Do not summarize or skip anything." }
        ]
      }]
    });

    const extracted = response.content?.find(b => b.type === "text")?.text || "";
    return res.status(200).json({ text: extracted });

  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
}
