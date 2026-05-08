import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, "public");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

app.use("/videos", express.static(publicDir));

const jobs = new Map();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function sanitizeText(text = "") {
  return text
    .replace(/'/g, "")
    .replace(/:/g, "")
    .replace(/\n/g, " ")
    .trim();
}

async function generateImage(prompt, outputPath) {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: `
      ultra realistic cinematic vertical photography,
      social media reel aesthetic,
      moody lighting,
      realistic human proportions,
      realistic skin texture,
      shallow depth of field,
      cinematic composition,
      luxury creator aesthetic,
      highly detailed,
      professional camera shot,
      realistic cinematic footage style,
      ${prompt}
    `,
    size: "1024x1792",
  });

  const imageBase64 = response.data[0].b64_json;

  fs.writeFileSync(outputPath, Buffer.from(imageBase64, "base64"));
}

async function generateVoice(script, outputPath) {
  const mp3 = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: script,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());

  fs.writeFileSync(outputPath, buffer);
}

async function generateScript(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
You write short-form viral TikTok and Instagram Reel scripts.

Rules:
- maximum 2 short sentences
- creator style
- cinematic
- emotional hook
- motivational or luxury tone
- natural spoken English
- avoid cringe AI wording
- no hashtags
- no emojis
- no quotation marks
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

    const imageFile = path.join(publicDir, `${jobId}.png`);
    const voiceFile = path.join(publicDir, `${jobId}.mp3`);
    const outputFile = path.join(publicDir, `${jobId}.mp4`);

    // ----------------------------
    // SCRIPT
    // ----------------------------

    const script = await generateScript(prompt);

    console.log("📝 Script ready");

    // ----------------------------
    // IMAGE
    // ----------------------------

    console.log("🖼️ Generating AI image...");

    await generateImage(prompt, imageFile);

    console.log("✅ AI image ready");

    // ----------------------------
    // VOICE
    // ----------------------------

    console.log("🎤 Generating voice...");

    await generateVoice(script, voiceFile);

    console.log("✅ Voice ready");

    // ----------------------------
    // CLEAN CAPTION
    // ----------------------------

    const captionText = sanitizeText(
      prompt.toUpperCase().slice(0, 80)
    );

    // ----------------------------
    // FFMPEG
    // ----------------------------

    console.log("🎬 Starting ffmpeg...");

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",

        // image
        "-loop",
        "1",

        "-i",
        imageFile,

        // voice
        "-i",
        voiceFile,

        // vertical format
        "-vf",
        `
scale=1080:1920,
zoompan=z='min(zoom+0.0008,1.15)':d=250,
drawtext=text='${captionText}':
fontcolor=white:
fontsize=42:
x=(w-text_w)/2:
y=h-220:
borderw=4:
bordercolor=black:
line_spacing=10
        `.replace(/\n/g, ""),

        // output settings
        "-t",
        "10",

        "-c:v",
        "libx264",

        "-preset",
        "veryfast",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        "-shortest",

        "-movflags",
        "+faststart",

        outputFile,
      ]);

      ffmpeg.stderr.on("data", (data) => {
        console.log("ffmpeg stderr:", data.toString());
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
      videoUrl: `/videos/${jobId}.mp4?t=${Date.now()}`,
    });

    // cleanup
    try {
      fs.unlinkSync(imageFile);
    } catch {}

    try {
      fs.unlinkSync(voiceFile);
    } catch {}
  } catch (err) {
    console.error("❌ JOB ERROR:", err);

    jobs.set(jobId, {
      status: "error",
      error: err.message,
    });
  }
}

// ----------------------------------
// ROUTES
// ----------------------------------

app.post("/generate-video", async (req, res) => {
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