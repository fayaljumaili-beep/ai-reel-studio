import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // 🔥 Generate reel script using AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a viral short-form content creator. Create a highly engaging Instagram Reel script with hook, scenes, and captions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const script = completion.choices[0].message.content;

    // 🚨 TEMP video (still placeholder)
    const videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4";

    res.json({
      script,
      videoUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running");
});