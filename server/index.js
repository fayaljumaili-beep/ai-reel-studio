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

const IMAGE_SCENE_COUNT = 4;
const IMAGE_SCENE_DURATION = 5;
const TOTAL_DURATION = 20;

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

app.use(express.static(publicDir));

const jobs = new Map();

function escapeForDrawtext(text = "") {
  return text
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,")
    .replace(/\r/g, "")
    .trim();
}

function wrapCaption(text = "", maxCharsPerLine = 24, maxLines = 2) {
  const words = text.toUpperCase().replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }

    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  const limited = lines.slice(0, maxLines);
  if (lines.length > maxLines && limited.length) {
    limited[limited.length - 1] = `${limited[limited.length - 1]}...`;
  }

  return escapeForDrawtext(limited.join("\\n"));
}

function splitCaptionText(script) {
  const byLine = script
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (byLine.length >= 2) return byLine;

  const bySentence = (script.match(/[^.!?]+[.!?]*/g) || [script])
    .map((s) => s.trim())
    .filter(Boolean);

  return bySentence.length ? bySentence : [script];
}

function buildScenes(prompt, mode = "image") {
  const topic = prompt.trim();

  if (mode === "video") {
    return [
      `single cinematic hero shot of ${topic}, premium lighting, dramatic contrast, vertical reel`,
    ];
  }

  return [
    `wide establishing shot of ${topic}, luxury environment, cinematic lighting, vertical reel`,
    `close-up action shot of ${topic}, intense emotion, shallow depth of field, vertical reel`,
    `side profile cinematic shot of ${topic}, movement and energy, dramatic shadows, vertical reel`,
    `final transformation hero shot of ${topic}, emotional cinematic ending, dramatic lighting, vertical reel`,
  ].slice(0, IMAGE_SCENE_COUNT);
}

async function generateScript(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
You create cinematic reel narration.

Rules:
- exactly 4 short lines
- each line is one sentence
- each line should be 8 to 12 words
- total around 35 to 45 words
- enough for about 18 to 25 seconds when spoken
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
  zoomSpeed,
  mode = "image"
) {
  const filter =
    mode === "video"
      ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+${zoomSpeed},1.02)':d=${Math.round(
          sceneDuration * 30
        )}:s=1080x1920:fps=30,drawtext=text='${captionText}':fontcolor=white:fontsize=36:line_spacing=8:x=(w-text_w)/2:y=h-240:box=1:boxcolor=black@0.55:boxborderw=24:borderw=2:bordercolor=black:fix_bounds=true,format=yuv420p`
      : `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+${zoomSpeed},1.03)':d=${Math.round(
          sceneDuration * 30
        )}:s=1080x1920:fps=30,drawtext=text='${captionText}':fontcolor=white:fontsize=36:line_spacing=8:x=(w-text_w)/2:y=h-240:box=1:boxcolor=black@0.55:boxborderw=24:borderw=2:bordercolor=black:fix_bounds=true,format=yuv420p`;

  await runFFmpeg([
    "-y",
    "-loop",
    "1",
    "-t",
    String(sceneDuration),
    "-i",
    imagePath,
    "-vf",
    filter,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
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

    const captions = splitCaptionText(script);

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

    const sceneDuration = safeMode === "video" ? 20 : IMAGE_SCENE_DURATION;

    console.log("🎬 Starting assets...");
    await Promise.all([
      ...sceneImages.map((imgPath, i) => generateImage(scenes[i], imgPath)),
      generateVoice(script, voiceFile),
    ]);

    for (let i = 0; i < scenes.length; i += 1) {
      console.log(`✅ Scene ${i + 1} ready`);
    }

    console.log("✅ Voice ready");

    console.log("🎬 Rendering clips...");
    for (let i = 0; i < sceneImages.length; i += 1) {
      const caption = captions[i % captions.length] || script;
      const safeCaption = wrapCaption(caption);

      await renderSceneClip(
        sceneImages[i],
        sceneClips[i],
        safeCaption,
        sceneDuration,
        safeMode === "video" ? "0.00005" : "0.00020",
        safeMode
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
      "[1:a]volume=1.45,apad=pad_dur=30[voice];[2:a]volume=0.08[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=3[a]",
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