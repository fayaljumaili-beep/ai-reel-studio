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
const musicFile = path.join(rootDir, "server", "music.mp3");

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
    `wide establishing shot of ${topic}, luxury gym interior, cinematic, moody, dramatic lighting, vertical reel`,
    `close-up action shot of ${topic}, intense training, sweat, motion, shallow depth of field, vertical reel`,
    `hero final shot of ${topic}, confident pose, dramatic lighting, premium cinematic finish, vertical reel`,
  ];
}

async function generateScript(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
You create cinematic short-form reel narration.

Rules:
- maximum 3 short sentences
- motivational tone
- premium creator energy
- natural spoken English
- no hashtags
- no emojis
- no quotation marks
- concise and punchy
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

async function generateImage(prompt, imagePath) {
  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: `
ultra realistic cinematic photography,
vertical social media reel,
real human proportions,
cinematic lighting,
premium creator aesthetic,
high detail,
professional photography,
moody contrast,
shallow depth of field,
${prompt}
    `,
    size: "1024x1536",
  });

  const imageBase64 = result.data[0].b64_json;

  fs.writeFileSync(
    imagePath,
    Buffer.from(imageBase64, "base64")
  );
}

async function generateVoice(text, outputPath) {
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "marin",
    input: text,
    instructions:
      "Speak with a confident cinematic motivational tone. Natural pacing. Premium creator style.",
  });

  const buffer = Buffer.from(await speech.arrayBuffer());

  fs.writeFileSync(outputPath, buffer);
}

async function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stderr.on("data", (data) => {
      console.log(data.toString());
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

async function generateVideo(jobId, prompt) {
  try {
    console.log("🔥 START:", prompt);

    const script = await generateScript(prompt);

    console.log("📝 Script ready");

    const scenes = buildScenes(prompt);

    const scene1 = path.join(publicDir, `${jobId}-1.png`);
    const scene2 = path.join(publicDir, `${jobId}-2.png`);
    const scene3 = path.join(publicDir, `${jobId}-3.png`);

    const voiceFile = path.join(publicDir, `${jobId}.mp3`);
    const outputFile = path.join(publicDir, `${jobId}.mp4`);

    console.log("🖼️ Generating scene 1...");
    await generateImage(scenes[0], scene1);
    console.log("✅ Scene 1 ready");

    console.log("🖼️ Generating scene 2...");
    await generateImage(scenes[1], scene2);
    console.log("✅ Scene 2 ready");

    console.log("🖼️ Generating scene 3...");
    await generateImage(scenes[2], scene3);
    console.log("✅ Scene 3 ready");

    console.log("🎤 Generating voice...");
    await generateVoice(script, voiceFile);
    console.log("✅ Voice ready");

    const captionText = sanitizeDrawtext(
      prompt.toUpperCase().slice(0, 70)
    );

    console.log("🎬 Starting ffmpeg...");

    await runFFmpeg([
      "-y",

      "-loop", "1",
      "-t", "2.5",
      "-i", scene1,

      "-loop", "1",
      "-t", "2.5",
      "-i", scene2,

      "-loop", "1",
      "-t", "2.5",
      "-i", scene3,

      "-i", voiceFile,

      "-stream_loop", "-1",
      "-i", musicFile,

      "-filter_complex",
      `
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0008,1.08)':d=75:s=1080x1920:fps=30,format=yuv420p[v0];

[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0008,1.08)':d=75:s=1080x1920:fps=30,format=yuv420p[v1];

[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0008,1.08)':d=75:s=1080x1920:fps=30,format=yuv420p[v2];

[v0][v1][v2]concat=n=3:v=1:a=0[vv];

[vv]drawtext=
text='${captionText}':
fontcolor=white:
fontsize=54:
x=(w-text_w)/2:
y=h-220:
borderw=4:
bordercolor=black:
box=1:
boxcolor=black@0.45:
boxborderw=20
[v];

[3:a]volume=1[a1];

[4:a]volume=0.12[a2];

[a1][a2]amix=inputs=2:duration=first[a]
      `,

      "-map", "[v]",
      "-map", "[a]",

      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",

      "-c:a", "aac",

      "-shortest",

      "-movflags", "+faststart",

      outputFile,
    ]);

    console.log("✅ Video complete");

    jobs.set(jobId, {
      status: "done",
      videoUrl: `/${jobId}.mp4`,
    });

  } catch (err) {
    console.error("❌ ERROR:", err);

    jobs.set(jobId, {
      status: "error",
      error: err.message,
    });
  }
}

app.get("/", (req, res) => {
  res.send("AI Reel Studio backend running 🚀");
});

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt required",
      });
    }

    const jobId = randomUUID();

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
      error: "Failed to generate reel",
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