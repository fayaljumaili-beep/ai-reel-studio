import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// temp dir
const TEMP_DIR = "temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// 🔥 MAIN
app.post("/generate-video", async (req, res) => {
  try {
    const { idea } = req.body;

    if (!idea) {
      return res.status(400).json({ error: "No idea provided" });
    }

    console.log("🔥 START:", idea);

    // 🧠 1. SCRIPT (simple for now)
    const script = `Live your best ${idea} life. Luxury, freedom, success.`;

    // 🎙️ 2. VOICE (ElevenLabs)
    const voicePath = path.join(TEMP_DIR, "voice.mp3");

    const voiceRes = await axios({
      method: "POST",
      url: "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text: script,
        model_id: "eleven_multilingual_v2",
      },
      responseType: "arraybuffer",
    });

    fs.writeFileSync(voicePath, voiceRes.data);
    console.log("🎙️ Voice ready");

    // 🎥 3. GET VIDEOS
    const searchRes = await axios.get(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        idea
      )}&per_page=3`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const videos = searchRes.data.videos;

    if (!videos.length) {
      return res.status(400).json({ error: "No videos found" });
    }

    const clips = [];

    for (let i = 0; i < videos.length; i++) {
      const url = videos[i].video_files[0].link;
      const filePath = path.join(TEMP_DIR, `clip_${i}.mp4`);

      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      const writer = fs.createWriteStream(filePath);

      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      clips.push(filePath);
    }

    console.log("📥 Clips downloaded");

    // 🎬 4. STITCH VIDEO
    const listPath = path.join(TEMP_DIR, "list.txt");

    fs.writeFileSync(
      listPath,
      clips.map((c) => `file '${path.resolve(c)}'`).join("\n")
    );

    const stitched = path.join(TEMP_DIR, "stitched.mp4");

    execSync(
      `ffmpeg -loglevel error -y -f concat -safe 0 -i ${listPath} -c:v libx264 ${stitched}`
    );

    console.log("🎬 Video stitched");

    // 🔥 5. MERGE AUDIO + VIDEO (FIXED)
    const output = path.join(TEMP_DIR, "final.mp4");

    execSync(
      `ffmpeg -loglevel error -y -i ${stitched} -i ${voicePath} -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac -shortest ${output}`
    );

    console.log("✅ FINAL VIDEO READY");

    const url = `${req.protocol}://${req.get("host")}/video`;

    res.json({ video: url });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

// serve video
app.get("/video", (req, res) => {
  const file = path.join(TEMP_DIR, "final.mp4");

  if (!fs.existsSync(file)) {
    return res.status(404).send("No video");
  }

  res.sendFile(path.resolve(file));
});

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});