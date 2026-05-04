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

// 🔥 serve videos
app.use("/videos", express.static("."));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const PEXELS_KEY = process.env.PEXELS_API_KEY;

// helper
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ CMD ERROR:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

// 🎬 get video
async function getVideo(query) {
  const res = await fetch(`https://api.pexels.com/videos/search?query=${query}&per_page=5`, {
    headers: { Authorization: PEXELS_KEY }
  });

  const data = await res.json();

  if (!data.videos || data.videos.length === 0) {
    throw new Error(`No videos found for ${query}`);
  }

  return data.videos[0].video_files[0].link;
}

// 🧠 generate script
async function generateScript(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Create a 60-90 second viral TikTok script with 3 scenes. Each scene must describe EXACT visuals."
      },
      { role: "user", content: prompt }
    ]
  });

  return completion.choices[0].message.content;
}

// 🎬 MAIN
app.post("/generate-video", async (req, res) => {
  try {
    console.log("🔥 START");

    const { prompt } = req.body;

    // 1. script
    const script = await generateScript(prompt);
    console.log("🧠 SCRIPT READY");

    // 2. SCENE-BASED QUERIES (🔥 VIRAL FIX)
    const scenes = [
      ["luxury morning", "sunlight window", "coffee aesthetic"],
      ["luxury breakfast", "healthy food", "coffee pouring"],
      ["luxury car", "city sunset", "rich lifestyle"]
    ];

    const clips = [];
    let index = 0;

    // 3. download clips
    for (const scene of scenes) {
      for (const query of scene) {
        console.log("⬇️", query);

        const url = await getVideo(query);
        const file = `clip${index}.mp4`;

        await execPromise(`curl -L "${url}" -o ${file}`);
        clips.push(file);

        index++;
      }
    }

    // 4. concat file
    fs.writeFileSync(
      "videos.txt",
      clips.map(c => `file '${c}'`).join("\n")
    );

    // 5. stitch (VERTICAL + SMOOTH)
    await execPromise(
      "ffmpeg -f concat -safe 0 -i videos.txt -vf scale=720:1280,fps=30 -c:v libx264 -preset fast -pix_fmt yuv420p stitched.mp4"
    );

    // 6. extend to ~90 sec
    await execPromise(
      "ffmpeg -stream_loop 3 -i stitched.mp4 -t 90 -c copy final.mp4"
    );

    console.log("✅ VIDEO READY");

    // 7. return FULL URL
    const videoUrl = `${req.protocol}://${req.get("host")}/videos/final.mp4`;

    res.json({
      video: videoUrl,
      script
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// health
app.get("/", (req, res) => {
  res.send("Server running ✅");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 running on", PORT);
});