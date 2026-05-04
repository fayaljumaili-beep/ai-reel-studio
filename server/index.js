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

// ---------- helpers ----------
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
      if (err) reject(stderr || err);
      else resolve(stdout);
    });
  });
}

function sanitizeText(text) {
  // prevent ffmpeg drawtext breaking
  return text
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\n/g, " ");
}

// ---------- route ----------
app.post("/generate-video", async (req, res) => {
  try {
    console.log("🔥 START");

    const { prompt, tone = "inspiring", length = 30 } = req.body;

    // -------------------------
    // 🧠 1. AI SCENE DIRECTOR
    // -------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `
Create a viral TikTok video plan.

Topic: ${prompt}
Tone: ${tone}

Return JSON only:
[
  {
    "query": "search phrase for stock video",
    "caption": "short viral caption",
    "duration": 3
  }
]

Rules:
- 4 to 6 scenes
- captions must be punchy
- queries must be visual
`
        }
      ],
    });

    const raw = completion.choices[0].message.content;
    const scenes = JSON.parse(raw);

    console.log("🧠 scenes:", scenes.length);

    // -------------------------
    // 📥 2. PARALLEL DOWNLOADS
    // -------------------------
    const clips = await Promise.all(
      scenes.map(async (scene, i) => {
        try {
          console.log("🔎", scene.query);

          const response = await fetch(
            `https://api.pexels.com/videos/search?query=${encodeURIComponent(scene.query)}&per_page=1`,
            {
              headers: { Authorization: PEXELS_KEY },
            }
          );

          const data = await response.json();
          const url = data.videos?.[0]?.video_files?.[0]?.link;

          if (!url) return null;

          const file = `clip_${i}.mp4`;

          await execPromise(
            `curl -L --max-time 15 --fail "${url}" -o ${file}`
          );

          return { file, caption: scene.caption, duration: scene.duration || 3 };
        } catch (e) {
          console.log("❌ clip fail", scene.query);
          return null;
        }
      })
    );

    const validClips = clips.filter(Boolean);

    if (validClips.length === 0) {
      return res.status(500).json({ error: "No clips downloaded" });
    }

    console.log("🎬 clips ready:", validClips.length);

    // -------------------------
    // 🎞 3. PROCESS EACH CLIP (vertical + captions)
    // -------------------------
    const processed = [];

    for (let i = 0; i < validClips.length; i++) {
      const { file, caption, duration } = validClips[i];
      const out = `scene_${i}.mp4`;

      const safeText = sanitizeText(caption);

      await execPromise(`
        ffmpeg -y -i ${file} \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,
        drawtext=text='${safeText}':x=(w-text_w)/2:y=h-200:fontsize=60:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=10" \
        -t ${duration} \
        -c:v libx264 -preset ultrafast -pix_fmt yuv420p \
        ${out}
      `);

      processed.push(out);
    }

    console.log("🎞 scenes processed");

    // -------------------------
    // 🧩 4. CONCAT
    // -------------------------
    fs.writeFileSync(
      "list.txt",
      processed.map(p => `file '${p}'`).join("\n")
    );

    await execPromise(`
      ffmpeg -f concat -safe 0 -i list.txt -c copy stitched.mp4
    `);

    // -------------------------
    // 🔁 5. EXTEND LENGTH
    // -------------------------
    await execPromise(`
      ffmpeg -stream_loop 1 -i stitched.mp4 -t ${length} -c copy final.mp4
    `);

    console.log("✅ FINAL VIDEO READY");

    const videoUrl = `${req.protocol}://${req.get("host")}/final.mp4`;

    res.json({
      video: videoUrl,
      scenes
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// static serve
app.use(express.static("."));

app.get("/", (req, res) => {
  res.send("Server running ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 running on", PORT);
});