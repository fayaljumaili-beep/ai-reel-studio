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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PEXELS_KEY = process.env.PEXELS_API_KEY;

// helper to run shell commands
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr);
      else resolve(stdout);
    });
  });
}

app.post("/generate-video", async (req, res) => {
  try {
    console.log("🔥 START");

    const { prompt } = req.body;

    // 🧠 generate script
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create a viral TikTok script about: ${prompt}.
          Include scenes, visuals, captions, and hooks.`
        }
      ],
    });

    const script = completion.choices[0].message.content;
    console.log("🧠 SCRIPT READY");

    // 🎬 SIMPLE scenes (fast + stable)
    const scenes = [
      "luxury morning",
      "coffee aesthetic",
      "luxury car"
    ];

    const clips = [];

    // 📥 download clips
    for (let i = 0; i < scenes.length; i++) {
      const query = scenes[i];
      console.log("🔎 searching:", query);

      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${query}&per_page=1`,
        {
          headers: {
            Authorization: PEXELS_KEY,
          },
        }
      );

      const data = await response.json();
      const url = data.videos?.[0]?.video_files?.[0]?.link;

      if (!url) {
        console.log("❌ no video found:", query);
        continue;
      }

      const file = `clip_${i}.mp4`;

      try {
        console.log("⬇️ downloading:", file);

        await execPromise(
          `curl -L --max-time 15 --fail "${url}" -o ${file}`
        );

        clips.push(file);
      } catch (err) {
        console.log("❌ failed clip:", query);
      }
    }

    console.log("🎬 clips ready:", clips.length);

    if (clips.length === 0) {
      return res.status(500).json({ error: "No clips downloaded" });
    }

    // 🧩 concat list
    fs.writeFileSync(
      "videos.txt",
      clips.map(c => `file '${c}'`).join("\n")
    );

    console.log("🎬 stitching clips...");

    // stitch
    await execPromise(`
  ffmpeg -f concat -safe 0 -i videos.txt \
  -c copy stitched.mp4
`);

    console.log("🔁 extending duration...");

    // loop to ~30 sec (safe for Railway)
    await execPromise(`
  ffmpeg -stream_loop 1 -i stitched.mp4 \
  -t 25 -c copy final.mp4
`);

    console.log("🚀 SENDING RESPONSE");
    console.log("✅ FINAL VIDEO READY");

    // IMPORTANT: return public URL (not local file path)
    const videoUrl = `${req.protocol}://${req.get("host")}/final.mp4`;

    res.json({
      video: videoUrl,
      script
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// serve video file
app.use(express.static("."));

// health check
app.get("/", (req, res) => {
  res.send("Server running ✅");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 server running on", PORT);
});