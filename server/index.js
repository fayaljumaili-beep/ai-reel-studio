import express from "express";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import { exec } from "child_process";
import OpenAI from "openai";
import cors from "cors";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🔧 safer exec
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

// 🧠 UPGRADED AI (hook + script)
async function generateContent(prompt) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a viral TikTok content expert."
      },
      {
        role: "user",
        content: `
Topic: ${prompt}

Create ONE viral short-form video idea.

Return EXACTLY:

Hook:
Main:
CTA:
Caption:
`
      }
    ]
  });

  const text = res.choices[0].message.content;

  const hook = text.match(/Hook:(.*)/)?.[1]?.trim() || "";
  const main = text.match(/Main:(.*)/)?.[1]?.trim() || "";

  return {
    full: text,
    hook,
    script: `${hook}. ${main}`
  };
}

// 🎬 Pexels
async function getPexelsVideo(query) {
  const res = await axios.get(
    `https://api.pexels.com/videos/search?query=${query}&per_page=10`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    }
  );

  const videos = res.data.videos;

  if (!videos.length) throw new Error("No videos found");

  // 🔥 RANDOMIZE
  const randomIndex = Math.floor(Math.random() * videos.length);

  return videos[randomIndex].video_files[0].link;
}

// 🔊 ElevenLabs
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

// 🚀 MAIN ROUTE (MULTI VARIATION)
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const results = [];

    // 🔥 LOOP = REAL PRODUCT
    for (let i = 0; i < 3; i++) {
      const variationPrompt = `${prompt} variation ${i + 1}`;

      const ai = await generateContent(variationPrompt);
      const videoUrl = await getPexelsVideo(variationPrompt);

      const videoPath = `video-${Date.now()}-${i}.mp4`;

      const response = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(videoPath);
      response.data.pipe(writer);

      await new Promise(resolve => writer.on("finish", resolve));

      const voicePath = await generateVoice(ai.script);

      const output = `output-${Date.now()}-${i}.mp4`;

      await execPromise(`
  ffmpeg -y \
  -i ${videoPath} \
  -i ${voicePath} \
  -i assets/music.mp3 \
  -filter_complex "[1:a]volume=1.0[a1];[2:a]volume=0.15[a2];[a1][a2]amix=inputs=2:duration=shortest[aout]" \
  -map 0:v \
  -map "[aout]" \
  -vf "scale=540:960" \
  -t 8 \
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