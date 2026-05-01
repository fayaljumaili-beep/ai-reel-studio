import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("🔥 Server running...");


// ✅ ROUTE 1: generate batch prompts
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

    let text = completion.choices[0].message.content;

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        prompts: text.split("\n").filter(Boolean).slice(0, 5),
      };
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Batch generation failed" });
  }
});


// ✅ ROUTE 2: return video (IMPORTANT)
app.get("/generate", async (req, res) => {
  try {
    const filePath = path.join(__dirname, "sample.mp4");

    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send("Video error");
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});