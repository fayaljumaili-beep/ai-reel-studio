import express from "express";
import fs from "fs";
import axios from "axios";
import { exec } from "child_process";
import OpenAI from "openai";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// -----------------------------
// helper
// -----------------------------
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("FFmpeg error:", stderr);
        reject(stderr);
      } else resolve(stdout);
    });
  });
}

// -----------------------------
// 🧠 AI CONTENT (returns 3 variations)
// -----------------------------
async function generateContent(prompt) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You create viral TikTok hooks and captions."
      },
      {
        role: "user",
        content: `Topic: ${prompt}

Return EXACTLY 3 variations in this format:

===

Hook:
Caption:
Script:

===

Hook:
Caption:
Script:

===

Hook:
Caption:
Script:`
      }
    ]
  });

  const text = res.choices[0].message.content;

  // split into 3
  const parts = text.split("===")
    .map(p => p.trim())
    .filter(Boolean);

  return parts.map(p => {
    const scriptMatch = p.match(/Script:(.*)/s);
    return {
      full: p,
      script: scriptMatch ? scriptMatch[1].trim() : prompt
    };
  });
}

// -----------------------------
// 🎬 PEXELS (random video)
// -----------------------------
async function getPexelsVideo(query) {
  const res = await axios.get(
    `https://api.pexels.com/videos/search?query=${query}&per_page=5`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    }
  );

  const videos = res.data.videos;

  if (!videos.length) throw "No videos found";

  const random = videos[Math.floor(Math.random() * videos.length)];

  return random.video_files[0].link;
}

// -----------------------------
// 🔊 ELEVENLABS
// -----------------------------
async function generateVoice(text) {
  const res = await axios.post(
    "https://api.elevenlabs.io/v1/text-to-speech/uIZsnBL0YK1S5j69bAih",
    { text },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    }
  );

  const path = `voice-${Date.now()}.mp3`;
  fs.writeFileSync(path, res.data);

  return path;
}

// -----------------------------
// 🚀 MAIN ROUTE (3 VIDEOS)
// -----------------------------
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    console.log("Prompt:", prompt);

    const aiVariations = await generateContent(prompt);

    const results = [];

    for (let i = 0; i < aiVariations.length; i++) {
      const ai = aiVariations[i];

      // 🎬 get random video
      const videoUrl = await getPexelsVideo(prompt + " " + i);

      const videoPath = `video-${Date.now()}-${i}.mp4`;

      const response = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(videoPath);
      response.data.pipe(writer);

      await new Promise(resolve => writer.on("finish", resolve));

      // 🔊 voice
      const voicePath = await generateVoice(ai.script);

      const output = `output-${Date.now()}-${i}.mp4`;

      // 🔥 SAFE FFMPEG (no crash version)
      await execPromise(`
        ffmpeg -y -i ${videoPath} -i ${voicePath} \
        -vf "scale=540:960" \
        -c:v libx264 -preset ultrafast -crf 32 \
        -shortest ${output}
      `);

      results.push({
        videoUrl: `https://ai-reel-studio-production.up.railway.app/${output}`,
        caption: ai.full
      });
    }

    res.json({ results });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// serve files
app.use(express.static("."));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running"));