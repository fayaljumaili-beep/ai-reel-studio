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
// 🧠 TEXT ESCAPE (CRITICAL FIX)
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
// 🎥 GET LOCAL VIDEO (fallback)
// ----------------------
function getLocalVideo() {
  const dir = path.join(process.cwd(), "server/assets/videos");

  if (!fs.existsSync(dir)) {
    throw new Error("videos folder missing");
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".mp4"));

  if (files.length === 0) {
    throw new Error("no videos inside folder");
  }

  const random = files[Math.floor(Math.random() * files.length)];
  return path.join(dir, random);
}

// ----------------------
// 🌍 FETCH VIDEO FROM PEXELS
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

    const video = res.data.videos[0];

    if (!video) throw new Error("No Pexels videos");

    const file = video.video_files.find(v => v.quality === "sd") || video.video_files[0];

    const url = file.link;
    const output = path.join(process.cwd(), "temp.mp4");

    const writer = fs.createWriteStream(output);

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream"
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(output));
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

    const safeText = escapeText(text);

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

  } catch (err) {
    console.error(err);
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