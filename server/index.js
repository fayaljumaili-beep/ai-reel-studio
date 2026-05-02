import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// middleware
app.use(cors());
app.use(express.json());

// serve static files (for voice)
app.use(express.static("public"));

// ===== OPENAI =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== 🎙️ GENERATE VOICE =====
async function generateVoice(text) {
  const response = await axios.post(
    "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
    {
      text,
      model_id: "eleven_monolingual_v1",
    },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
    }
  );

  // ensure public folder exists
  if (!fs.existsSync("public")) {
    fs.mkdirSync("public");
  }

  const filePath = path.join("public", "voice.mp3");
  fs.writeFileSync(filePath, response.data);

  return "/voice.mp3";
}

// ===== 🎥 GET VISUALS (PEXELS) =====
async function getVisuals(query) {
  try {
    const res = await axios.get(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        query
      )}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const video = res.data.videos[0];

    return video?.video_files[0]?.link || null;
  } catch (err) {
    console.error("Pexels error:", err.message);
    return null;
  }
}

// ===== 🚀 MAIN ROUTE =====
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    // 1. Generate structured script
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Create a short viral reel script in JSON.

Return format:
{
  "title": "...",
  "scenes": [
    {
      "text": "...",
      "visual": "keyword for stock footage"
    }
  ]
}
          `
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8
    });

    const raw = completion.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.json({ error: "AI JSON parse failed", raw });
    }

    // 2. Fetch videos per scene
    const videos = [];

    for (const scene of parsed.scenes) {
      const query = scene.visual;

      const response = await axios.get(
        `https://api.pexels.com/videos/search`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY
          },
          params: {
            query,
            per_page: 1
          }
        }
      );

      const videoUrl =
        response.data.videos?.[0]?.video_files?.[0]?.link || null;

      videos.push({
        text: scene.text,
        visual: query,
        video: videoUrl
      });
    }

    res.json({
      title: parsed.title,
      scenes: videos
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});