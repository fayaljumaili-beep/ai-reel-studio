import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8080;

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const videosDir = path.join(publicDir, "videos");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

app.use("/videos", express.static(videosDir));

const jobs = new Map();

app.get("/", (req, res) => {
  res.send("AI Reel Generator Backend Running 🚀");
});

app.get("/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      status: "not_found",
    });
  }

  res.json(job);
});

app.post("/generate-video", (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      error: "Prompt is required",
    });
  }

  const jobId = randomUUID();

  jobs.set(jobId, {
    status: "processing",
  });

  res.json({
    success: true,
    jobId,
  });

  generateVideo(jobId, prompt.trim()).catch((error) => {
    console.error("❌ JOB ERROR:", error);

    jobs.set(jobId, {
      status: "error",
      error: error.message || "Video generation failed",
    });
  });
});

async function generateVideo(jobId, prompt) {
  console.log("🔥 START:", prompt);

  const voiceFile = path.join(videosDir, `${jobId}-voice.mp3`);
  const imageFile = path.join(videosDir, `${jobId}-image.jpg`);
  const outputFile = path.join(videosDir, `${jobId}.mp4`);

  const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is missing");
  }

  // -----------------------------------
  // GENERATE AI IMAGE
  // -----------------------------------

  console.log("🖼️ Generating AI image...");

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}`;

  const imageResponse = await axios({
    method: "GET",
    url: imageUrl,
    responseType: "arraybuffer",
    timeout: 120000,
  });

  fs.writeFileSync(imageFile, imageResponse.data);

  console.log("🖼️ AI image ready");

  // -----------------------------------
  // GENERATE VOICE
  // -----------------------------------

  console.log("🎤 Generating voice...");

  const voiceResponse = await axios({
    method: "POST",
    url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
    responseType: "arraybuffer",
    data: {
      text: `Success starts with discipline. ${prompt} is your opportunity to level up and dominate your future.`,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
      },
    },
    timeout: 120000,
  });

  fs.writeFileSync(voiceFile, voiceResponse.data);

  console.log("🎤 Voice ready");

  // -----------------------------------
  // VIDEO CAPTION
  // -----------------------------------

  const captionText = prompt.toUpperCase();

  // -----------------------------------
  // GENERATE VIDEO
  // -----------------------------------

  console.log("🎬 Starting ffmpeg...");

  await new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",

      "-loop",
      "1",

      "-i",
      imageFile,

      "-i",
      voiceFile,

      "-filter_complex",
      `[0:v]scale=1080:1920,format=yuv420p,drawtext=text='${captionText}':fontcolor=white:fontsize=72:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-300[v]`,

      "-map",
      "[v]",

      "-map",
      "1:a",

      "-shortest",

      "-c:v",
      "libx264",

      "-c:a",
      "aac",

      "-pix_fmt",
      "yuv420p",

      "-movflags",
      "+faststart",

      outputFile,
    ]);

    ffmpeg.stdout.on("data", (data) => {
      console.log(`ffmpeg stdout: ${data.toString()}`);
    });

    ffmpeg.stderr.on("data", (data) => {
      console.log(`ffmpeg stderr: ${data.toString()}`);
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });

  console.log("✅ FINAL VIDEO READY");

  jobs.set(jobId, {
    status: "done",
    videoUrl: `/videos/${jobId}.mp4?ts=${Date.now()}`,
  });

  // -----------------------------------
  // CLEANUP
  // -----------------------------------

  try {
    fs.unlinkSync(voiceFile);
  } catch {}

  try {
    fs.unlinkSync(imageFile);
  } catch {}
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});