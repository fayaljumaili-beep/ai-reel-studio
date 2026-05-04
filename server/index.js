import express from "express";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import { exec } from "child_process";
import OpenAI from "openai";
import cors from "cors";

const app = express();
const upload = multer({ dest: "uploads/" });

// ✅ CRITICAL FIX
app.use(cors());
app.use(express.json()); // 🔥 THIS FIXES YOUR ERROR

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🧠 safer exec
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

// 🧠 AI content
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
Return STRICTLY:
Hook:
Caption:
Script:`
      }
    ]
  });

  const text = res.choices[0].message.content;

  // 🔥 extract script for voice
  const scriptMatch = text.match(/Script:(.*)/s);
  const script = scriptMatch ? scriptMatch[1].trim() : prompt;

  return {
    full: text,
    script
  };
}

// 🎬 Pexels video
async function getPexelsVideo(query) {
  const res = await axios.get(
    `https://api.pexels.com/videos/search?query=${query}&per_page=1`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    }
  );

  return res.data.videos[0].video_files[0].link;
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

// 🚀 MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    // ❌ prevent crash
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    console.log("Prompt:", prompt);

    const ai = await generateContent(prompt);

    const videoUrl = await getPexelsVideo(prompt);

    const videoPath = `video-${Date.now()}.mp4`;

    const response = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);

    await new Promise(resolve => writer.on("finish", resolve));

    const voicePath = await generateVoice(ai.script);

    const output = `output-${Date.now()}.mp4`;

    // 🔥 OPTIMIZED (prevents Railway crash)
    await execPromise(`
      ffmpeg -y -i ${videoPath} -i ${voicePath} \
      -vf "scale=540:960" \
      -c:v libx264 -preset ultrafast -crf 32 \
      -shortest ${output}
    `);

    res.json({
      videoUrl: `https://ai-reel-studio-production.up.railway.app/${output}`,
      caption: ai.full
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// serve files
app.use(express.static("."));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running"));