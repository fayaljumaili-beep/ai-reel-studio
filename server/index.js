import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const jobs = new Map();

const publicDir = path.join(process.cwd(), "public");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function generateImage(prompt, imagePath) {
  console.log("🖼️ Generating AI image...");

  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: `
      cinematic realistic social media reel frame,
      ultra realistic,
      professional lighting,
      premium aesthetic,
      viral tiktok style,
      realistic human details,
      no cartoon,
      no text,
      ${prompt}
    `,
    size: "1024x1536"
  });

  const imageBase64 = result.data[0].b64_json;

  fs.writeFileSync(imagePath, Buffer.from(imageBase64, "base64"));

  console.log("✅ AI image ready");
}

async function generateVoice(text, audioPath) {
  console.log("🎤 Generating voice...");

  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: text,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());

  fs.writeFileSync(audioPath, buffer);

  console.log("✅ Voice ready");
}

async function generateScript(prompt) {
  console.log("📝 Generating script...");

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
You create short viral TikTok reel scripts.

Rules:
- very short
- punchy
- cinematic
- motivational
- no emojis
- no hashtags
- max 1 sentence
- make it sound human
- natural spoken English
        `,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return completion.choices[0].message.content.trim();
}

async function generateVideo(jobId, prompt) {
  try {
    console.log("🔥 START:", prompt);

    const imagePath = path.join(publicDir, `${jobId}.png`);
    const audioPath = path.join(publicDir, `${jobId}.mp3`);
    const videoPath = path.join(publicDir, `${jobId}.mp4`);

    // caption EXACTLY what user typed
    const captionText = prompt;

    // better voice script
    const script = await generateScript(prompt);

    console.log("📜 Script ready");

    await generateImage(prompt, imagePath);

    await generateVoice(script, audioPath);

    const safeCaption = captionText
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'")
      .replace(/,/g, "\\,");

    console.log("🎬 Starting ffmpeg...");

    const ffmpegCommand = `
ffmpeg -y \
-loop 1 \
-i "${imagePath}" \
-i "${audioPath}" \
-filter_complex "
[0:v]
scale=1080:1920:force_original_aspect_ratio=increase,
crop=1080:1920,
zoompan=z='min(zoom+0.0008,1.08)':d=250:s=1080x1920,
fps=30,
eq=contrast=1.08:brightness=0.02:saturation=1.2,
drawtext=
text='${safeCaption}':
fontcolor=white:
fontsize=54:
x=(w-text_w)/2:
y=h-220:
box=1:
boxcolor=black@0.45:
boxborderw=20
[v]
" \
-map "[v]" \
-map 1:a \
-c:v libx264 \
-pix_fmt yuv420p \
-c:a aac \
-shortest \
-t 10 \
"${videoPath}"
`;

    await runCommand(ffmpegCommand);

    console.log("✅ Video complete");

    jobs.set(jobId, {
      status: "done",
      videoUrl: `${process.env.RAILWAY_PUBLIC_DOMAIN || ""}/${jobId}.mp4`,
    });
  } catch (err) {
    console.error(err);

    jobs.set(jobId, {
      status: "error",
      error: err.message,
    });
  }
}

app.use(express.static(publicDir));

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt required",
      });
    }

    const jobId = Date.now().toString();

    jobs.set(jobId, {
      status: "processing",
    });

    generateVideo(jobId, prompt);

    res.json({
      jobId,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to start generation",
    });
  }
});

app.get("/job/:id", (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({
      error: "Job not found",
    });
  }

  res.json(job);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});