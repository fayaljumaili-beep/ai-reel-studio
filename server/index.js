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

function sanitizeDrawtext(text = "") {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/%/g, "\\%")
    .replace(/\n/g, " ")
    .trim();
}

function buildScenes(prompt) {
  const topic = prompt.trim();

  return [
    `${topic}, cinematic opening shot, moody lighting, premium social reel, vertical composition, realistic, high contrast`,
    `${topic}, close-up detail shot, dramatic movement, shallow depth of field, luxury creator aesthetic, vertical reel`,
    `${topic}, powerful final shot, cinematic lighting, premium finish, social media reel, realistic vertical frame`,
  ];
}

async function generateScript(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
You write short-form viral reel scripts.

Rules:
- 3 short sentences maximum
- cinematic
- natural spoken English
- motivational or luxury tone
- no hashtags
- no emojis
- no quotation marks
- keep it punchy and easy to narrate
        `.trim(),
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
}

async function generateVoice(text, audioPath) {
  const mp3 = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "marin",
    input: text,
    instructions:
      "Speak in a confident, cinematic, motivational tone. Keep it natural, clear, and premium.",
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  fs.writeFileSync(audioPath, buffer);
}

async function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stderr.on("data", (data) => {
      console.log("ffmpeg stderr:", data.toString());
    });

    ffmpeg.on("error", reject);

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function generateVideo(jobId, prompt) {
  try {
    console.log("🔥 START:", prompt);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    if (!fs.existsSync(musicFile)) {
      throw new Error("music.mp3 missing in project root");
    }

    const sceneFiles = [
      path.join(publicDir, `${jobId}-scene-1.png`),
      path.join(publicDir, `${jobId}-scene-2.png`),
      path.join(publicDir, `${jobId}-scene-3.png`),
    ];

    const voiceFile = path.join(publicDir, `${jobId}.mp3`);
    const outputFile = path.join(publicDir, `${jobId}.mp4`);

    const scenes = buildScenes(prompt);
    const script = await generateScript(prompt);

    console.log("📝 Script ready");
    console.log("🎬 Scenes ready");

    for (let i = 0; i < scenes.length; i += 1) {
      console.log(`🖼️ Generating scene ${i + 1}...`);
      await generateImage(scenes[i], sceneFiles[i]);
      console.log(`✅ Scene ${i + 1} ready`);
    }

    console.log("🎤 Generating voice...");
    await generateVoice(script, voiceFile);
    console.log("✅ Voice ready");

    const captionText = sanitizeDrawtext(prompt.toUpperCase().slice(0, 80));

    console.log("🎬 Starting ffmpeg...");

    const ffmpegArgs = [
      "-y",

      "-loop", "1", "-t", "3.4", "-i", sceneFiles[0],
      "-loop", "1", "-t", "3.4", "-i", sceneFiles[1],
      "-loop", "1", "-t", "3.4", "-i", sceneFiles[2],
      "-i", voiceFile,
      "-stream_loop", "-1", "-i", musicFile,

      "-filter_complex",
      [
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0009,1.10)':d=102:s=1080x1920:fps=30,format=yuv420p[v0]`,
        `[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0009,1.10)':d=102:s=1080x1920:fps=30,format=yuv420p[v1]`,
        `[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0009,1.10)':d=102:s=1080x1920:fps=30,format=yuv420p[v2]`,
        `[v0][v1][v2]concat=n=3:v=1:a=0,drawtext=text='${captionText}':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=h-220:borderw=4:bordercolor=black:box=1:boxcolor=black@0.40:boxborderw=20[v]`,
        `[3:a]volume=1[a1]`,
        `[4:a]volume=0.15[a2]`,
        `[a1][a2]amix=inputs=2:duration=longest:dropout_transition=2[a]`,
      ].join(";"),

      "-map", "[v]",
      "-map", "[a]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-shortest",
      "-t", "10",
      "-movflags", "+faststart",
      outputFile,
    ];

    await runFfmpeg(ffmpegArgs);

    console.log("✅ Video complete");

    jobs.set(jobId, {
      status: "done",
      videoUrl: `/${jobId}.mp4`,
    });

    for (const file of [...sceneFiles, voiceFile]) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }
  } catch (err) {
    console.error("❌ JOB ERROR:", err);

    jobs.set(jobId, {
      status: "error",
      error: err.message || "Video generation failed",
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