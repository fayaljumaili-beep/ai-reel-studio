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

const IMAGE_SCENE_COUNT = 6;
const IMAGE_SCENE_DURATION = 10;
const VIDEO_SCENE_COUNT = 1;
const VIDEO_SCENE_DURATION = 60;
const TOTAL_DURATION = 60;

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
    .replace(/,/g, "\\,")
    .replace(/\n/g, " ")
    .trim();
}

function splitCaptionText(script) {
  const parts = (script.match(/[^.!?]+[.!?]*/g) || [script])
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.length ? parts : [script];
}

function buildScenes(prompt, mode = "image") {
  const topic = prompt.trim();

  if (mode === "video") {
    return [
      `single cinematic hero shot of ${topic}, premium lighting, dramatic contrast, vertical reel`,
    ];
  }

  return [
    `wide establishing shot of ${topic}, luxury gym interior, cinematic, moody lighting, vertical reel`,
    `close-up action shot of ${topic}, intense training, sweat, shallow depth of field`,
    `side profile action shot of ${topic}, movement, cinematic lighting`,
    `hero shot of ${topic}, confident pose, dramatic lighting`,
    `low angle shot of ${topic}, powerful posture, cinematic contrast`,
    `details of hands and weights during ${topic}, realistic motion`,
  ].slice(0, IMAGE_SCENE_COUNT);
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
- 8 to 10 short sentences
- around 120 to 150 words
- motivational tone
- premium creator energy
- natural spoken English
- strong hook at the start
- no hashtags
- no emojis
- no quotation marks
- concise and punchy
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
    `.trim(),
    size: "1024x1536",
  });

  const imageBase64 = result.data[0].b64_json;
  fs.writeFileSync(imagePath, Buffer.from(imageBase64, "base64"));
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

async function renderSceneClip(
  imagePath,
  clipPath,
  captionText,
  sceneDuration,
  zoomSpeed
) {
  await runFFmpeg([
    "-y",
    "-loop",
    "1",
    "-t",
    String(sceneDuration),
    "-i",
    imagePath,
    "-vf",
    `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+${zoomSpeed},1.03)':d=${Math.round(
      sceneDuration * 30
    )}:s=1080x1920:fps=30,drawtext=text='${captionText}':fontcolor=white:fontsize=42:line_spacing=10:x=(w-text_w)/2:y=h-260:box=1:boxcolor=black@0.55:boxborderw=28:borderw=2:bordercolor=black:fix_bounds=true,format=yuv420p`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    clipPath,
  ]);
}

async function generateVideo(jobId, prompt, mode = "image") {
  try {
    console.log("🔥 START:", prompt);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY missing");
    }

    if (!fs.existsSync(musicFile)) {
      throw new Error("music.mp3 missing in server/");
    }

    const safeMode = mode === "video" ? "video" : "image";
    const scenes = buildScenes(prompt, safeMode);

    const script = await generateScript(prompt);
    console.log("📝 Script ready");

    const captionsSource = splitCaptionText(script);

    const sceneImages = scenes.map((_, index) =>
      path.join(publicDir, `${jobId}-${index + 1}.png`)
    );

    const sceneClips = scenes.map((_, index) =>
      path.join(publicDir, `${jobId}-${index + 1}.mp4`)
    );

    const voiceFile = path.join(publicDir, `${jobId}.mp3`);
    const concatList = path.join(publicDir, `${jobId}-concat.txt`);
    const silentVideo = path.join(publicDir, `${jobId}-video-only.mp4`);
    const outputFile = path.join(publicDir, `${jobId}.mp4`);

    const sceneDuration =
      safeMode === "video" ? VIDEO_SCENE_DURATION : IMAGE_SCENE_DURATION;

    for (let i = 0; i < scenes.length; i += 1) {
      console.log(`🖼️ Generating scene ${i + 1}...`);
      await generateImage(scenes[i], sceneImages[i]);
      console.log(`✅ Scene ${i + 1} ready`);
    }

    console.log("🎤 Generating voice...");
    await generateVoice(script, voiceFile);
    console.log("✅ Voice ready");

    console.log("🎬 Rendering clips...");
    for (let i = 0; i < sceneImages.length; i += 1) {
      const caption = captionsSource[i % captionsSource.length];
      const safeCaption = sanitizeDrawtext(caption.toUpperCase().slice(0, 90));

      await renderSceneClip(
        sceneImages[i],
        sceneClips[i],
        safeCaption,
        sceneDuration,
        safeMode === "video"
          ? "0.00005"
          : (0.00025 + i * 0.00002).toFixed(5)
      );

      console.log(`✅ Clip ${i + 1} ready`);
    }

    fs.writeFileSync(
      concatList,
      sceneClips
        .map((clipPath) => `file '${clipPath.replace(/'/g, "'\\''")}'`)
        .join("\n")
    );

    console.log("🎞️ Concatenating clips...");
    await runFFmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatList,
      "-c",
      "copy",
      silentVideo,
    ]);

    console.log("🎵 Adding audio mix...");
    await runFFmpeg([
      "-y",
      "-i",
      silentVideo,
      "-i",
      voiceFile,
      "-stream_loop",
      "-1",
      "-i",
      musicFile,
      "-filter_complex",
      "[1:a]volume=1.5,apad=pad_dur=60[voice];[2:a]volume=0.10[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=3[a]",
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-t",
      String(TOTAL_DURATION),
      "-movflags",
      "+faststart",
      outputFile,
    ]);

    console.log("✅ Video complete");

    jobs.set(jobId, {
      status: "done",
      videoUrl: `/${jobId}.mp4`,
    });

    for (const file of [
      ...sceneImages,
      ...sceneClips,
      voiceFile,
      concatList,
      silentVideo,
    ]) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }
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
    const { prompt, mode } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt required",
      });
    }

    const jobId = randomUUID();

    jobs.set(jobId, {
      status: "processing",
    });

    generateVideo(jobId, prompt, mode || "image");

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