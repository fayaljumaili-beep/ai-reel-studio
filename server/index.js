import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import { exec } from "child_process";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PEXELS_KEY = process.env.PEXELS_KEY;

// ---------- helpers ----------
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr);
      else resolve(stdout);
    });
  });
}

function splitIntoScenes(script) {
  return script
    .split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 15)
    .slice(0, 6);
}

// ---------- AI SCRIPT ----------
async function generateScript(prompt) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Create a viral 60-90 second TikTok script with strong hooks and storytelling.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return res.choices[0].message.content;
}

// ---------- GET VIDEO ----------
async function getVideo(query) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1`,
    {
      headers: { Authorization: PEXELS_KEY },
    }
  );

  const data = await res.json();
  return data.videos?.[0]?.video_files?.[0]?.link;
}

// ---------- ROUTE ----------
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    const script = await generateScript(prompt);
    const scenes = splitIntoScenes(script);

    const clips = [];

    // download clips
    for (let i = 0; i < scenes.length; i++) {
      const url = await getVideo(scenes[i]);
      const file = `clip${i}.mp4`;

      await execPromise(`curl -L "${url}" -o ${file}`);
      clips.push(file);
    }

    // create concat file
    fs.writeFileSync(
      "videos.txt",
      clips.map(c => `file '${c}'`).join("\n")
    );

    // stitch clips
    await execPromise(`
      ffmpeg -f concat -safe 0 -i videos.txt \
      -c:v libx264 -preset fast -pix_fmt yuv420p stitched.mp4
    `);

    // loop to 90 sec
    await execPromise(`
      ffmpeg -stream_loop 3 -i stitched.mp4 \
      -t 90 -c copy final.mp4
    `);

    res.json({
      video: "final.mp4",
      script,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
});

app.listen(3000, () => console.log("server running"));