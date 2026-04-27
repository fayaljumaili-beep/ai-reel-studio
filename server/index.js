import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- helper to run shell ----------
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg error:", stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// ---------- captions ----------
function generateCaptions(text, filePath) {
  const words = text.split(" ");
  let time = 0;
  let srt = "";

  words.forEach((word, i) => {
    const start = time;
    const end = time + 0.5;

    srt += `${i + 1}
${formatTime(start)} --> ${formatTime(end)}
${word}

`;

    time += 0.5;
  });

  fs.writeFileSync(filePath, srt);
}

function formatTime(sec) {
  const ms = Math.floor((sec % 1) * 1000);
  const s = Math.floor(sec) % 60;
  const m = Math.floor(sec / 60);
  return `00:${String(m).padStart(2, "0")}:${String(s).padStart(
    2,
    "0"
  )},${String(ms).padStart(3, "0")}`;
}

// ---------- ROUTE ----------
app.post("/generate-video", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text required" });
    }

    console.log("🎬 Request:", text);

    // paths
    const videosDir = path.join(__dirname, "assets", "videos");

    if (!fs.existsSync(videosDir)) {
      return res.status(500).json({ error: "Videos folder missing" });
    }

    // get videos
    const files = fs
      .readdirSync(videosDir)
      .filter((f) => f.endsWith(".mp4"));

    if (files.length === 0) {
      return res.status(500).json({ error: "No videos found" });
    }

    const fullPaths = files.map((f) =>
      path.join(videosDir, f).replace(/\\/g, "/")
    );

    console.log("🎞 Using videos:", fullPaths);

    // create concat list
    const listPath = path.join(__dirname, "list.txt");
    const listContent = fullPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(listPath, listContent);

    const tempVideo = path.join(__dirname, "temp.mp4");
    const captionsPath = path.join(__dirname, "captions.srt");
    const outputVideo = path.join(__dirname, "output.mp4");

    // concat videos
    await runCommand(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${tempVideo}"`
    );

    // captions
    generateCaptions(text, captionsPath);

    // IMPORTANT: escape path for ffmpeg subtitles
    const safeCaptionsPath = captionsPath.replace(/:/g, "\\:").replace(/\\/g, "/");

    await runCommand(
      `ffmpeg -y -i "${tempVideo}" -vf subtitles='${safeCaptionsPath}' "${outputVideo}"`
    );

    console.log("✅ Video created:", outputVideo);

    // ---------- STREAM RESPONSE ----------
    console.log("📦 Sending file:", outputVideo);

    if (!fs.existsSync(outputVideo)) {
      return res.status(500).json({ error: "Output file missing" });
    }

    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Disposition": "inline; filename=output.mp4",
    });

    const stream = fs.createReadStream(outputVideo);

    stream.on("error", (err) => {
      console.error("❌ Stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream failed" });
      }
    });

    stream.pipe(res);
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});