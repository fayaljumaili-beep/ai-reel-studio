import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import gtts from "gtts";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const TEMP_DIR = "/tmp";

// 🎬 LOCAL VIDEO FILES (IMPORTANT)
const LOCAL_VIDEOS = [
  `${process.cwd()}/server/clip-0.mp4`,
  `${process.cwd()}/server/clip-1.mp4`,
  `${process.cwd()}/server/clip-2.mp4`
];

// 🎵 BACKGROUND MUSIC
const MUSIC_FILE = `${process.cwd()}/server/assets/music.mp3`;

//////////////////////////////////////////////////////
// 🧠 SCRIPT
//////////////////////////////////////////////////////
function generateScript() {
  return [
    "Success starts with your mindset",
    "Discipline beats motivation every time",
    "Small habits create big results",
    "Stay focused and never quit"
  ];
}

//////////////////////////////////////////////////////
// 🔊 TEXT TO SPEECH
//////////////////////////////////////////////////////
function generateVoice(script, output) {
  return new Promise((resolve, reject) => {
    const text = script.join(". ");
    const tts = new gtts(text, "en");

    tts.save(output, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

//////////////////////////////////////////////////////
// 🎬 MERGE VIDEOS
//////////////////////////////////////////////////////
function mergeVideos(output) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    LOCAL_VIDEOS.forEach(v => command.input(v));

    command
      .complexFilter([
        // scale all videos to same size
        ...LOCAL_VIDEOS.map((_, i) => `[${i}:v]scale=720:1280,setdar=9/16[v${i}]`),

        // concat video streams
        `${LOCAL_VIDEOS.map((_, i) => `[v${i}]`).join("")}concat=n=${LOCAL_VIDEOS.length}:v=1:a=0[vout]`
      ])

      .outputOptions([
        "-map [vout]",
        "-r 30",
        "-pix_fmt yuv420p"
      ])

      .on("end", resolve)
      .on("error", reject)
      .save(output);
  });
}

//////////////////////////////////////////////////////
// 🚀 GENERATE VIDEO
//////////////////////////////////////////////////////
app.post("/generate-video", async (req, res) => {
  try {
    const script = generateScript();

    const voiceFile = `${TEMP_DIR}/voice.mp3`;
    const merged = `${TEMP_DIR}/merged.mp4`;
    const final = `${TEMP_DIR}/final.mp4`;

    //////////////////////////////////////////////////////
    // 1. VOICE
    //////////////////////////////////////////////////////
    await generateVoice(script, voiceFile);

    //////////////////////////////////////////////////////
    // 2. VIDEO
    //////////////////////////////////////////////////////
    await mergeVideos(merged);

    //////////////////////////////////////////////////////
    // 3. CONVERT TO WAV (CRITICAL FIX)
    //////////////////////////////////////////////////////
    const voiceWav = `${TEMP_DIR}/voice.wav`;
    const musicWav = `${TEMP_DIR}/music.wav`;

    await new Promise((resolve, reject) => {
      ffmpeg(voiceFile)
        .audioChannels(2)
        .audioFrequency(44100)
        .format("wav")
        .save(voiceWav)
        .on("end", resolve)
        .on("error", reject);
    });

    await new Promise((resolve, reject) => {
      ffmpeg(MUSIC_FILE)
        .audioChannels(2)
        .audioFrequency(44100)
        .format("wav")
        .save(musicWav)
        .on("end", resolve)
        .on("error", reject);
    });

    //////////////////////////////////////////////////////
    // 4. MIX AUDIO + VIDEO
    //////////////////////////////////////////////////////
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(merged)
        .input(voiceWav)
        .input(musicWav)

        .complexFilter([
          "[1:a]volume=1.2[voice]",
          "[2:a]volume=0.25[music]",
          "[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        ])

        .outputOptions([
          "-map 0:v:0",
          "-map [aout]",
          "-c:v libx264",
          "-c:a aac",
          "-shortest"
        ])

        .save(final)
        .on("end", resolve)
        .on("error", reject);
    });

    //////////////////////////////////////////////////////
    // 5. SEND FILE
    //////////////////////////////////////////////////////
    res.sendFile(final);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//////////////////////////////////////////////////////
// 🚀 START SERVER
//////////////////////////////////////////////////////
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});