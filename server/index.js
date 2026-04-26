import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import { exec } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ----------------------
// 🧠 TEXT ESCAPE (CRITICAL)
// ----------------------
function escapeText(text) {
  return text
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, "");
}

// ----------------------
// 🎥 LOCAL VIDEO (fallback)
// ----------------------
function getLocalVideo() {
  const dir = path.join(process.cwd(), "server/assets/videos");

  if (!fs.existsSync(dir)) {
    throw new Error("videos folder missing");
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".mp4"));

  if (files.length === 0) {
    throw new Error("no videos in folder");
  }

  const random = files[Math.floor(Math.random() * files.length)];
  return path.join(dir, random);
}

// ----------------------
// 🌍 FETCH FROM PEXELS
// ----------------------
async function getPexelsVideo(query) {
  try {
    console.log("🎬 Fetching Pexels video for:", query);

    const res = await axios.get("https://api.pexels.com/videos/search", {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      },
      params: {
        query,
        per_page: 5
      }
    });

    if (!res.data.videos || res.data.videos.length === 0) {
      console.log("⚠️ No Pexels results → fallback");
      return getLocalVideo();
    }

    const video = res.data.videos[0];
    const file = video.video_files[0];

    const url = file.link;
    const tempPath = path.join(process.cwd(), "temp.mp4");

    const writer = fs.createWriteStream(tempPath);

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream"
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(tempPath));
      writer.on("error", reject);
    });

  } catch (err) {
    console.log("⚠️ Pexels failed → using local video");
    return getLocalVideo();
  }
}

// ----------------------
// 🎬 BUILD VIDEO
// ----------------------
function buildVideo({ input, text, output }) {
  return new Promise((resolve, reject) => {

    const safeText = escapeText(text).slice(0, 100);

    const cmd = `
      ffmpeg -y -i "${input}" -vf "drawtext=
      text='${safeText}':
      fontcolor=white:
      fontsize=48:
      box=1:
      boxcolor=black@0.5:
      boxborderw=10:
      x=(w-text_w)/2:
      y=h-150"
      -t 8
      -c:v libx264
      -preset ultrafast
      -pix_fmt yuv420p
      "${output}"
    `;

    exec(cmd, (err) => {
      if (err) {
        console.error("FFmpeg error:", err);
        return reject(err);
      }
      resolve(output);
    });
  });
}

// ----------------------
// 🚀 API ROUTE
// ----------------------
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    const videoPath = await getPexelsVideo(prompt);
    const outputPath = path.join(process.cwd(), "output.mp4");

    await buildVideo({
      input: videoPath,
      text: prompt,
      output: outputPath
    });

    res.sendFile(outputPath);

    // 🧹 cleanup
    setTimeout(() => {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (fs.existsSync("temp.mp4")) fs.unlinkSync("temp.mp4");
    }, 5000);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "video generation failed" });
  }
});

// ----------------------
// ❤️ HEALTH CHECK
// ----------------------
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});