import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("🔥 Server running...");


// ✅ 1. Generate batch prompts
app.get("/generate-batch", async (req, res) => {
  try {
    const niche = req.query.niche;

    if (!niche) {
      return res.status(400).json({ error: "Missing niche" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You create viral short-form video ideas.",
        },
        {
          role: "user",
          content: `Give me 5 short viral video prompts about ${niche}. Return JSON: { "prompts": ["...", "..."] }`,
        },
      ],
    });

    const text = completion.choices[0].message.content;

    // Try parsing JSON safely
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // fallback if model returns plain text
      data = {
        prompts: text
          .split("\n")
          .filter(Boolean)
          .slice(0, 5),
      };
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Batch generation failed" });
  }
});


// ✅ 2. Generate single video (placeholder for now)
app.get("/generate", async (req, res) => {
  try {
    const niche = req.query.niche;

    if (!niche) {
      return res.status(400).send("Missing niche");
    }

    console.log("🎬 Generating video for:", niche);

    // ⚠️ TEMP: return sample video (replace with real generation later)
    return res.sendFile(new URL("./sample.mp4", import.meta.url).pathname);

  } catch (err) {
    console.error(err);
    res.status(500).send("Video generation failed");
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});