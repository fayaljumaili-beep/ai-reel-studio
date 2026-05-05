import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import { exec } from "child_process";
import OpenAI from "openai";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors());
app.use(express.json());

// 🔐 ENV
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PEXELS_KEY = process.env.PEXELS_API_KEY;

// ⚙️ helper
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr);
      else resolve(stdout);
    });
  });
}

// 🎬 MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    console.log("🔥 START");

    const { prompt } = req.body;

    // 🧠 1. Generate scenes
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Create short viral TikTok scenes (max 5 scenes, short keywords only)."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = ai.choices[0].message.content;
    console.log("🧠 RAW:", text);

    const scenes = text
      .split("\n")
      .map(s => s.replace(/^\d+[\).\-\s]*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);

    console.log("🎬 scenes:", scenes);

    // 📥 2. Download clips
    let clips = [];

    for (let i = 0; i < scenes.length; i++) {
      const query = scenes[i];
      console.log("🔍 searching:", query);

      const resPexels = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1`,
        {
          headers: {
            Authorization: PEXELS_KEY
          }
        }
      );

      const data = await resPexels.json();

      if (!data.videos || !data.videos[0]) continue;

      const url = data.videos[0].video_files[0].link;
      const file = `clip_${i}.mp4`;

      console.log("⬇️ downloading:", file);

      await execPromise(`curl -L "${url}" -o ${file}`);

      clips.push(file);
    }

    console.log("🎬 clips ready:", clips.length);

    if (clips.length === 0) {
      throw new Error("No clips found");
    }

    // 🧾 3. Create concat file
    fs.writeFileSync(
      "videos.txt",
      clips.map(c => `file '${c}'`).join("\n")
    );

    // 🎞 4. Stitch clips
    console.log("🎞 stitching...");
    await execPromise(`
      ffmpeg -y -f concat -safe 0 -i videos.txt \
      -c:v libx264 -preset fast -pix_fmt yuv420p stitched.mp4
    `);

    // 🔁 5. Loop to 30s
    console.log("🔁 looping...");
    await execPromise(`
      ffmpeg -y -stream_loop 2 -i stitched.mp4 \
      -t 30 -c copy final.mp4
    `);

    console.log("✅ FINAL VIDEO READY");

    // 🌐 6. Return URL
    const videoUrl = `https://${req.headers.host}/final.mp4`;

    res.json({
      video: videoUrl,
      script: text
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

// 📦 serve video
app.use(express.static("."));

// ❤️ health
app.get("/", (req, res) => {
  res.send("Server running ✅");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 running on", PORT);
});