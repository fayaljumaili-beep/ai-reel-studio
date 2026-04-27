import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

/* -------------------- HELPERS -------------------- */

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ FFmpeg error:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

/* -------------------- GET STOCK VIDEOS -------------------- */

async function getVideos(query) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=10`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
    }
  );

  const data = await res.json();

  if (!data.videos || data.videos.length === 0) {
    throw new Error("No stock videos found");
  }

  return data.videos.slice(0, 3).map(v => {
    const file =
      v.video_files.find(f => f.quality === "sd") ||
      v.video_files[0];

    return file.link;
  });
}

/* -------------------- GENERATE AI VOICE -------------------- */

async function generateVoice(text) {
  const res = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.7,
        },
      }),
    }
  );

  const buffer = await res.arrayBuffer();
  const file = path.join(__dirname, "voice.mp3");

  fs.writeFileSync(file, Buffer.from(buffer));
  return file;
}

/* -------------------- MAIN ROUTE -------------------- */

app.post("/generate-video", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    console.log("🎬 Creating reel for:", text);

    /* ---------- STEP 1: GET CLIPS ---------- */
    const clips = await getVideos(text);

    const trimmedClips = [];

    for (let i = 0; i < clips.length; i++) {
      const raw = path.join(__dirname, `clip${i}.mp4`);
      const trimmed = path.join(__dirname, `trim${i}.mp4`);

      console.log("⬇️ Downloading clip", i);

      await run(`curl -L "${clips[i]}" -o "${raw}"`);

      console.log("✂️ Trimming clip", i);

      await run(
        `ffmpeg -y -i "${raw}" -t 3 -vf scale=720:-2 -preset ultrafast "${trimmed}"`
      );

      trimmedClips.push(trimmed);
    }

    /* ---------- STEP 2: CONCAT ---------- */
    const listFile = path.join(__dirname, "list.txt");

    fs.writeFileSync(
      listFile,
      trimmedClips.map(p => `file '${p}'`).join("\n")
    );

    const merged = path.join(__dirname, "merged.mp4");

    console.log("🔗 Merging clips...");

    await run(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${merged}"`
    );

    /* ---------- STEP 3: VOICE ---------- */
    console.log("🗣 Generating AI voice...");

    const voice = await generateVoice(text);

    /* ---------- STEP 4: MUSIC ---------- */
    const music = path.join(__dirname, "music.mp3");

    console.log("🎵 Creating background music...");

    await run(
      `ffmpeg -y -f lavfi -i "sine=frequency=200:duration=15" -q:a 9 "${music}"`
    );

    /* ---------- STEP 5: FINAL MERGE (FIXED) ---------- */
    const final = path.join(__dirname, "final.mp4");

    console.log("🎬 Combining video + voice + music...");

    await run(`
      ffmpeg -y \
      -i "${merged}" \
      -i "${voice}" \
      -i "${music}" \
      -filter_complex "[1:a]volume=1[a1];[2:a]volume=0.2[a2];[a1][a2]amix=inputs=2[aout]" \
      -map 0:v -map "[aout]" \
      -shortest \
      -preset ultrafast \
      -crf 28 \
      "${final}"
    `);

    console.log("✅ FINAL VIDEO READY");

    /* ---------- STEP 6: STREAM ---------- */
    res.setHeader("Content-Type", "video/mp4");

    const stream = fs.createReadStream(final);
    stream.pipe(res);

    stream.on("error", err => {
      console.error("❌ Stream error:", err);
      res.status(500).end();
    });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

/* -------------------- START SERVER -------------------- */

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});