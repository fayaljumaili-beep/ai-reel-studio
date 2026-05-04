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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr);
      else resolve(stdout);
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
Return:
Hook:
Caption:
Script:`
      }
    ]
  });

  return res.choices[0].message.content;
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
app.post("/generate-video", upload.none(), async (req, res) => {
  try {
    const { prompt } = req.body;

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

    const voicePath = await generateVoice(ai);

    const output = `output-${Date.now()}.mp4`;

    await execPromise(`
      ffmpeg -y -i ${videoPath} -i ${voicePath} \
      -vf "scale=720:1280" \
      -shortest -preset ultrafast ${output}
    `);

    res.json({
      videoUrl: `https://ai-reel-studio-production.up.railway.app/${output}`,
      caption: ai
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "fail" });
  }
});

app.use(express.static("."));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running"));