import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import gTTS from "gtts";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const TEMP_DIR = "/tmp";

//////////////////////////////////////////////////////
// 📁 LOCAL FILES
//////////////////////////////////////////////////////
const LOCAL_VIDEOS = [
  `${process.cwd()}/server/clip-0.mp4`,
  `${process.cwd()}/server/clip-1.mp4`,
  `${process.cwd()}/server/clip-2.mp4`,
];

const MUSIC_FILE = `${process.cwd()}/server/music.mp3`;

//////////////////////////////////////////////////////
// 🧠 SCRIPT
//////////////////////////////////////////////////////
function generateScript(topic) {
  return [
    `${topic} starts with your mindset`,
    "Discipline beats motivation every time",
    "Small habits create big results",
    "Stay focused and never quit",
  ];
}

//////////////////////////////////////////////////////
// 🔊 VOICE
//////////////////////////////////////////////////////
async function generateVoice(script, output) {
  return new Promise((resolve, reject) => {
    const text = script.join(". ");
    const tts = new gTTS(text, "en");

    tts.save(output, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

//////////////////////////////////////////////////////
// 🎬 GENERATE VIDEO
//////////////////////////////////////////////////////
app.post("/generate-video", async (req, res) => {
  try {
    const topic = req.body.topic || "success";

    const merged = `${TEMP_DIR}/merged.mp4`;
    const voiceFile = `${TEMP_DIR}/voice.mp3`;
    const final = `${TEMP_DIR}/final.mp4`;

    const script = generateScript(topic);
    console.log("SCRIPT:", script);

    //////////////////////////////////////////////////////
    // 1. 🎥 MERGE CLIPS
    //////////////////////////////////////////////////////
    await new Promise((resolve, reject) => {
      const command = ffmpeg();

      LOCAL_VIDEOS.forEach((clip) => {
        if (!fs.existsSync(clip)) {
          return reject(`Missing file: ${clip}`);
        }
        command.input(clip);
      });

      command
        .on("error", reject)
        .on("end", resolve)
        .mergeToFile(merged, TEMP_DIR);
    });

    //////////////////////////////////////////////////////
    // 2. 🔊 GENERATE VOICE
    //////////////////////////////////////////////////////
    await generateVoice(script, voiceFile);

    //////////////////////////////////////////////////////
    // 3. 🔧 NORMALIZE AUDIO (CRITICAL FIX)
    //////////////////////////////////////////////////////
    const fixedVoice = `${TEMP_DIR}/voice-fixed.mp3`;
    const fixedMusic = `${TEMP_DIR}/music-fixed.mp3`;

    await new Promise((resolve, reject) => {
      ffmpeg(voiceFile)
        .audioCodec("aac")
        .audioFrequency(44100)
        .audioChannels(2)
        .save(fixedVoice)
        .on("end", resolve)
        .on("error", reject);
    });

    await new Promise((resolve, reject) => {
      ffmpeg(MUSIC_FILE)
        .audioCodec("aac")
        .audioFrequency(44100)
        .audioChannels(2)
        .save(fixedMusic)
        .on("end", resolve)
        .on("error", reject);
    });

    //////////////////////////////////////////////////////
    // 4. 🎵 MIX AUDIO (VOICE + MUSIC)
    //////////////////////////////////////////////////////
    const withAudio = `${TEMP_DIR}/with-audio.mp4`;

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(merged)
        .input(fixedVoice)
        .input(fixedMusic)

        .complexFilter([
          "[2:a]volume=0.2[music]",
          "[1:a]volume=1.5[voice]",
          "[voice][music]amix=inputs=2:duration=first[aout]",
        ])

        .outputOptions([
          "-map 0:v:0",
          "-map [aout]",
          "-c:v libx264",
          "-c:a aac",
          "-shortest",
        ])

        .save(withAudio)
        .on("end", resolve)
        .on("error", reject);
    });

    //////////////////////////////////////////////////////
    // 5. 🎬 FINAL OUTPUT
    //////////////////////////////////////////////////////
    fs.copyFileSync(withAudio, final);

    res.sendFile(final);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.toString() });
  }
});

//////////////////////////////////////////////////////
// 🚀 START SERVER
//////////////////////////////////////////////////////
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});