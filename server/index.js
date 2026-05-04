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

// 🚀 MAIN ROUTE (MULTI VARIATION)
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    console.log("Prompt:", prompt);

    // 🔥 generate 3 variations
    const variations = await Promise.all([
      generateContent(prompt),
      generateContent(prompt),
      generateContent(prompt)
    ]);

    const results = [];

    for (let ai of variations) {
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

      // 🔥 SAFE HOOK (prevents ffmpeg crash)
      const safeHook = ai.hook
        .replace(/['"]/g, "")
        .replace(/:/g, "")
        .slice(0, 60);

      // 🎬 ADD OVERLAY TEXT
      await execPromise(`
        ffmpeg -y -i ${videoPath} -i ${voicePath} \
        -vf "scale=540:960,drawtext=text='${safeHook}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=100" \
        -c:v libx264 -preset ultrafast -crf 32 \
        -shortest ${output}
      `);

      results.push({
        videoUrl: `https://ai-reel-studio-production.up.railway.app/${output}`,
        caption: ai.full
      });

      // 🧹 cleanup
      fs.unlinkSync(videoPath);
      fs.unlinkSync(voicePath);
    }

    res.json({ videos: results });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// serve files
app.use(express.static("."));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running"));