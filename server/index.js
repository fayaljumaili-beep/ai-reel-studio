import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ---------- HELPERS ----------

// run shell command (ffmpeg)
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("FFmpeg error:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

// create captions (SRT)
function generateCaptions(text, filePath) {
  const words = text.split(" ");
  let srt = "";
  let time = 0;

  words.forEach((word, i) => {
    const start = time.toFixed(2).replace(".", ",");
    const end = (time + 0.5).toFixed(2).replace(".", ",");

    srt += `${i + 1}\n00:00:${start} --> 00:00:${end}\n${word}\n\n`;
    time += 0.5;
  });

  fs.writeFileSync(filePath, srt);
}

// ---------- MAIN ROUTE ----------

app.post("/generate-video", async (req, res) => {
  try {
    const { text = "Hello world" } = req.body;

    console.log("🎬 Request:", text);

    const assetsDir = path.join(__dirname, "assets");
    const videosDir = path.join(assetsDir, "videos");

    // check videos folder exists
    if (!fs.existsSync(videosDir)) {
      throw new Error("Missing folder: server/assets/videos");
    }

    // load videos dynamically
    const videoFiles = fs
      .readdirSync(videosDir)
      .filter(f => f.endsWith(".mp4"))
      .map(f => path.join(videosDir, f));

    if (videoFiles.length === 0) {
      throw new Error("No .mp4 files found in assets/videos");
    }

    console.log("🎞 Using videos:", videoFiles);

    // ---------- CREATE CONCAT LIST ----------
    const listPath = path.join(__dirname, "list.txt");

    const listContent = videoFiles
      .map(file => `file '${file}'`)
      .join("\n");

    fs.writeFileSync(listPath, listContent);

    // ---------- CONCAT VIDEOS ----------
    const tempVideo = path.join(__dirname, "temp.mp4");

    await runCommand(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${tempVideo}"`
    );

    // ---------- ADD CAPTIONS ----------
    const captionsPath = path.join(__dirname, "captions.srt");
    generateCaptions(text, captionsPath);

    const outputVideo = path.join(__dirname, "output.mp4");

    await runCommand(
      `ffmpeg -y -i "${tempVideo}" -vf subtitles="${captionsPath}" "${outputVideo}"`
    );

    console.log("✅ Video created:", outputVideo);

    // ---------- RETURN VIDEO ----------
    res.sendFile(outputVideo);

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});