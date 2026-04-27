const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { exec } = require("child_process");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const run = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ FFmpeg error:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });

// ------------------- MAIN ROUTE -------------------
app.post("/generate-video", async (req, res) => {
  try {
    const { text, duration = "15", voice = "on" } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    console.log("🎬 Generating video for:", text);

    const clips = [];
    const CLIP_COUNT = 3;

    // ------------------- FETCH VIDEOS -------------------
    for (let i = 0; i < CLIP_COUNT; i++) {
      const response = await axios.get("https://api.pexels.com/videos/search", {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
        params: {
          query: text,
          per_page: 1,
        },
      });

      const videoUrl = response.data.videos[0].video_files[0].link;
      const filePath = path.join(__dirname, `clip${i}.mp4`);

      const writer = fs.createWriteStream(filePath);
      const vid = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream",
      });

      vid.data.pipe(writer);

      await new Promise((resolve) => writer.on("finish", resolve));

      clips.push(filePath);
    }

    // ------------------- TRIM CLIPS -------------------
    const trimmedClips = [];

    for (let i = 0; i < clips.length; i++) {
      const out = path.join(__dirname, `trim${i}.mp4`);

      await run(`
        ffmpeg -y -i "${clips[i]}" \
        -t ${duration / clips.length} \
        -vf "scale=720:-2" \
        -preset ultrafast \
        "${out}"
      `);

      trimmedClips.push(out);
    }

    // ------------------- CONCAT -------------------
    const listFile = path.join(__dirname, "list.txt");
    fs.writeFileSync(
      listFile,
      trimmedClips.map((c) => `file '${c}'`).join("\n")
    );

    const merged = path.join(__dirname, "merged.mp4");

    await run(`
      ffmpeg -y -f concat -safe 0 -i "${listFile}" \
      -c copy "${merged}"
    `);

    // ------------------- CAPTIONS -------------------
    const captionsPath = path.join(__dirname, "captions.srt");
    fs.writeFileSync(
      captionsPath,
      `1
00:00:00,000 --> 00:00:05,000
${text}

2
00:00:05,000 --> 00:00:10,000
${text}
`
    );

    const captioned = path.join(__dirname, "captioned.mp4");

    await run(`
      ffmpeg -y -i "${merged}" \
      -vf subtitles="${captionsPath}" \
      -preset ultrafast \
      "${captioned}"
    `);

    // ------------------- VOICE (OPTIONAL) -------------------
    let voiceFile = null;

    if (voice === "on") {
      voiceFile = path.join(__dirname, "voice.mp3");

      // simple placeholder tone (replace later with ElevenLabs)
      await run(`
        ffmpeg -y -f lavfi -i "sine=frequency=300:duration=${duration}" \
        "${voiceFile}"
      `);
    }

    // ------------------- MUSIC -------------------
    const music = path.join(__dirname, "music.mp3");

    await run(`
      ffmpeg -y -f lavfi -i "sine=frequency=200:duration=${duration}" \
      "${music}"
    `);

    // ------------------- FINAL MERGE -------------------
    const final = path.join(__dirname, "final.mp4");

    if (voiceFile) {
      const mixedAudio = path.join(__dirname, "audio.mp3");

      // mix voice + music
      await run(`
        ffmpeg -y \
        -i "${voiceFile}" \
        -i "${music}" \
        -filter_complex "amix=inputs=2:duration=longest" \
        -ac 2 \
        -loglevel error \
        "${mixedAudio}"
      `);

      // attach audio to video
      await run(`
        ffmpeg -y \
        -i "${captioned}" \
        -i "${mixedAudio}" \
        -map 0:v -map 1:a \
        -shortest \
        -preset ultrafast \
        -crf 30 \
        -loglevel error \
        "${final}"
      `);
    } else {
      // only music
      await run(`
        ffmpeg -y \
        -i "${captioned}" \
        -i "${music}" \
        -map 0:v -map 1:a \
        -shortest \
        -preset ultrafast \
        -crf 30 \
        "${final}"
      `);
    }

    console.log("✅ FINAL VIDEO READY");

    res.setHeader("Content-Type", "video/mp4");
    fs.createReadStream(final).pipe(res);

  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ------------------- SERVER -------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});