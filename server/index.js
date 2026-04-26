import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import https from "https";
import { execFile } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

/* --------------------------
   🔹 Hook generator
-------------------------- */
function generateHooks(topic) {
  return [
    `Nobody tells you this about ${topic}`,
    `You're doing ${topic} wrong`,
    `This is why you're failing at ${topic}`,
    `The truth about ${topic}`,
    `Stop doing this if you want ${topic}`
  ];
}

/* --------------------------
   🔹 Fetch Pexels videos
-------------------------- */
async function fetchPexelsVideos(query) {
  try {
    const res = await axios.get(
      `https://api.pexels.com/videos/search?query=${query}&per_page=5`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY
        }
      }
    );

    return res.data.videos.map(v => v.video_files[0].link);
  } catch (err) {
    console.log("Pexels fetch failed → fallback to local");
    return [];
  }
}

/* --------------------------
   🔹 Download video
-------------------------- */
function downloadVideo(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", reject);
  });
}

/* --------------------------
   🔹 Get local video
-------------------------- */
function getLocalVideo() {
  const dir = path.join(__dirname, "assets", "videos");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".mp4"));
  return path.join(dir, files[Math.floor(Math.random() * files.length)]);
}

/* --------------------------
   🔹 Build video
-------------------------- */
function buildVideo({ inputs, hooks, duration, outputPath }) {
  return new Promise((resolve, reject) => {
    const sceneDuration = 2.5;
    const totalScenes = Math.ceil(duration / sceneDuration);

    const ffInputs = [];
    const filters = [];

    for (let i = 0; i < totalScenes; i++) {
      const videoPath = inputs[i % inputs.length];

      ffInputs.push("-stream_loop", "-1", "-t", sceneDuration.toString(), "-i", videoPath);

      const safeText = hooks[i % hooks.length]
        .replace(/:/g, "\\:")
        .replace(/'/g, "\\'");

      filters.push(
        `[${i}:v]scale=720:1280,drawtext=text='${safeText}':fontcolor=white:fontsize=48:borderw=3:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2[v${i}]`
      );
    }

    const concatInputs = filters.map((_, i) => `[v${i}]`).join("");

    const filterComplex = `
      ${filters.join(";")}
      ${concatInputs}concat=n=${totalScenes}:v=1:a=0[outv]
    `;

    const args = [
      ...ffInputs,
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-preset", "veryfast",
      "-crf", "23",
      "-y",
      outputPath
    ];

    const ffmpeg = execFile("ffmpeg", args);

    ffmpeg.stderr.on("data", d => console.log(d.toString()));

    ffmpeg.on("close", code => {
      if (code === 0) resolve(outputPath);
      else reject(new Error("FFmpeg failed"));
    });
  });
}

/* --------------------------
   🔹 API
-------------------------- */
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration } = req.body;

    const videoDuration =
      duration === "60 sec" ? 60 :
      duration === "90 sec" ? 90 : 8;

    const hooks = generateHooks(prompt);

    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    /* 🔹 Try Pexels */
    const pexelsLinks = await fetchPexelsVideos(prompt);

    let inputs = [];

    if (pexelsLinks.length > 0) {
      console.log("Using Pexels videos");

      for (let i = 0; i < Math.min(3, pexelsLinks.length); i++) {
        const filePath = path.join(tempDir, `pexels_${i}.mp4`);
        await downloadVideo(pexelsLinks[i], filePath);
        inputs.push(filePath);
      }
    } else {
      console.log("Using local fallback videos");
      inputs = [getLocalVideo()];
    }

    const outputPath = path.join(__dirname, "output.mp4");

    const video = await buildVideo({
      inputs,
      hooks,
      duration: videoDuration,
      outputPath
    });

    res.sendFile(video);

    /* 🔹 Cleanup temp files */
    inputs.forEach(file => {
      if (file.includes("temp")) fs.unlinkSync(file);
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------- */
app.get("/", (_, res) => res.send("🚀 Running"));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});