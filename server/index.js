import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const musicFile = path.join(rootDir, "music.mp3");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

app.use(express.static(publicDir));

const jobs = new Map();

function sanitizeText(text = "") {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/%/g, "\\%")
    .replace(/\n/g, " ")
    .trim();
}

function buildReelScript(prompt) {
  const topic = prompt.trim();

  return [
    `Nobody tells you this about ${topic}.`,
    `The people who win are the ones who stay consistent longer than everyone else.`,
    `This is not just a vibe. It is a standard.`,
    `Save this and come back when you are ready to level up.`,
  ].join(" ");
}

async function generateScript(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You write short-form viral reel scripts. Keep it cinematic, natural, punchy, and easy to speak aloud. No hashtags. No emojis. No quotation marks.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return completion.choices[0].message.content.trim();
}

async function generateImage(prompt, imagePath) {
  console.log("🖼️ Generating AI image...");

  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: `
ultra realistic cinematic vertical photography,
social media reel aesthetic,
moody lighting,
realistic human proportions,
realistic skin texture,
shallow depth of field,
cinematic composition,
premium creator aesthetic,
highly detailed,
professional camera shot,
${prompt}
`.trim(),
    size: "1024x1536",
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

async function generateVideo(jobId, prompt) {
  try {
    console.log("🔥 START:", prompt);

    const imagePath = path.join(publicDir, `${jobId}.png`);
    const audioPath = path.join(publicDir, `${jobId}.mp3`);
    const videoPath = path.join(publicDir, `${jobId}.mp4`);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    if (!fs.existsSync(musicFile)) {
      throw new Error("music.mp3 missing in project root");
    }

    const script = await generateScript(prompt);
    console.log("📝 Script ready");

    await generateImage(prompt, imagePath);

    await generateVoice(script, audioPath);

    const captionText = sanitizeText(prompt.toUpperCase().slice(0, 80));

    console.log("🎬 Starting ffmpeg...");

    const ffmpegArgs = [
      "-y",
      "-loop",
      "1",
      "-i",
      imagePath,
      "-i",
      audioPath,
      "-stream_loop",
      "-1",
      "-i",
      musicFile,
      "-filter_complex",
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0008,1.08)':d=250:s=1080x1920,fps=30,eq=contrast=1.08:brightness=0.02:saturation=1.15,drawtext=text='${captionText}':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=h-220:borderw=4:bordercolor=black:box=1:boxcolor=black@0.40:boxborderw=20[v];[1:a]volume=1[a1];[2:a]volume=0.15[a2];[a1][a2]amix=inputs=2:duration=shortest[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      "-t",
      "10",
      "-movflags",
      "+faststart",
      videoPath,
    ];

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      ffmpeg.stderr.on("data", (data) => {
        console.log("ffmpeg stderr:", data.toString());
      });

      ffmpeg.on("error", reject);

      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });

    console.log("✅ Video complete");

    jobs.set(jobId, {
      status: "done",
      videoUrl: `/${jobId}.mp4`,
    });

    try {
      fs.unlinkSync(imagePath);
    } catch {}

    try {
      fs.unlinkSync(audioPath);
    } catch {}
  } catch (err) {
    console.error("❌ JOB ERROR:", err);
    jobs.set(jobId, {
      status: "error",
      error: err.message,
    });
  }
}

app.get("/", (req, res) => {
  res.send("AI Reel Generator Backend Running 🚀");
});

app.post("/generate-video", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt required" });
  }

  const jobId = randomUUID();

  jobs.set(jobId, {
    status: "processing",
  });

  generateVideo(jobId, prompt.trim());

  res.json({ jobId });
});

app.get("/job/:id", (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});