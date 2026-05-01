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

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    console.log("🔥 Prompt:", prompt);

    // ===== 🧠 1. Generate script =====
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a viral Instagram Reel creator. Generate a highly engaging reel script with hook, scenes, captions, and voiceover.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const script = completion.choices[0].message.content;

    // ===== 🎧 2. Generate voice =====
    const voiceUrl = await generateVoice(script);

    // ===== 🎥 3. Get visual =====
    const visualUrl = await getVisuals(prompt);

    console.log("🎬 Visual:", visualUrl);

    // ===== ✅ RESPONSE =====
    res.json({
      script,
      videoUrl:
        visualUrl || "https://www.w3schools.com/html/mov_bbb.mp4",
      voiceUrl,
    });
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});