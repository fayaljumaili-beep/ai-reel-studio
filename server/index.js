import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import { execSync } from "child_process";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ✅ OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 📁 temp folder
const TEMP_DIR = "temp";
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// 🔥 MAIN ENDPOINT
app.post("/generate-video", async (req, res) => {
  try {
    const { idea } = req.body;

    if (!idea) {
      return res.status(400).json({ error: "No idea provided" });
    }

    console.log("🔥 START:", idea);

    // 🧠 1. Generate script
    const scriptRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short viral TikTok script about: ${idea}`,
        },
      ],
    });

    const script = scriptRes.choices[0].message.content;
    console.log("🧠 Script:", script);

    // 🎙️ 2. Generate voice
    const voiceRes = await axios.post(
      "https://api.elevenlab.io/v1/text-to-speech/DwwuoY7Uz8AP8zrY5TAo",
      {
        text: script,
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    const voicePath = path.join(TEMP_DIR, "voice.mp3");
    fs.writeFileSync(voicePath, voiceRes.data);

    console.log("🎙️ Voice ready");

    // 🎯 3. Fetch videos
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

    if (!videos || videos.length === 0) {
      return res.status(400).json({ error: "No videos found" });
    }

    console.log("✅ Found clips:", videos.length);

    const clipPaths = [];

    for (let i = 0; i < videos.length; i++) {
      const file = videos[i].video_files[0];
      const url = file.link;

      const outputPath = path.join(TEMP_DIR, `clip_${i}.mp4`);

      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      const writer = fs.createWriteStream(outputPath);

      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      clipPaths.push(outputPath);
    }

    // 🧩 4. Create concat list
    const listPath = path.join(TEMP_DIR, "videos.txt");

    fs.writeFileSync(
      listPath,
      clipPaths.map((p) => `file '${path.resolve(p)}'`).join("\n")
    );

    // 🎬 5. Stitch clips
    const stitchedPath = path.join(TEMP_DIR, "stitched.mp4");

    execSync(
      `ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${stitchedPath}`
    );

    // 🎧 6. Add voiceover
    const finalPath = path.join(TEMP_DIR, "final.mp4");

    execSync(
      `ffmpeg -y -i ${stitchedPath} -i ${voicePath} -map 0:v -map 1:a -shortest -c:v copy -c:a aac ${finalPath}`
    );

    console.log("✅ FINAL VIDEO READY");

    const videoUrl = `${req.protocol}://${req.get("host")}/final.mp4`;

    res.json({ video: videoUrl, script });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

// 📡 Serve video
app.get("/final.mp4", (req, res) => {
  const filePath = path.join(TEMP_DIR, "final.mp4");

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video not found");
  }

  res.sendFile(path.resolve(filePath));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});