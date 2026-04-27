import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

//
// ---------- HELPER: RUN COMMAND ----------
//
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

//
// ---------- CAPTIONS GENERATOR ----------
//
function generateCaptions(text, filePath) {
  const words = text.split(" ");
  let srt = "";
  let time = 0;

  words.forEach((word, i) => {
    const start = time;
    const end = time + 0.6;

    srt += `${i + 1}\n`;
    srt += `00:00:${String(start.toFixed(2)).padStart(5, "0")} --> 00:00:${String(end.toFixed(2)).padStart(5, "0")}\n`;
    srt += `${word}\n\n`;

    time += 0.6;
  });

  fs.writeFileSync(filePath, srt);
}

//
// ---------- MAIN ROUTE ----------
//
app.post("/generate-video", async (req, res) => {
  try {
    const text = req.body?.text || req.body?.prompt;

if (!text) {
  return res.status(400).json({
    error: "Missing text (send { text: 'your prompt' })"
  });
}

    console.log("📩 Request:", text);

    //
    // ---------- LOAD VIDEOS ----------
    //
    const videosDir = path.join(__dirname, "assets", "videos");

    if (!fs.existsSync(videosDir)) {
      throw new Error(`Missing folder: ${videosDir}`);
    }

    const videoFiles = fs
      .readdirSync(videosDir)
      .filter(f => f.endsWith(".mp4"))
      .map(f => path.join(videosDir, f));

    if (videoFiles.length === 0) {
      throw new Error("No video files found in assets/videos");
    }

    console.log("🎬 Using videos:", videoFiles);

    //
    // ---------- CREATE CONCAT LIST ----------
    //
    const listPath = path.join(__dirname, "list.txt");

    const listContent = videoFiles
      .map(file => `file '${file.replace(/'/g, "'\\''")}'`)
      .join("\n");

    fs.writeFileSync(listPath, listContent);

    const tempVideo = path.join(__dirname, "temp.mp4");

    //
    // ---------- SAFE CONCAT (RE-ENCODE) ----------
    //
    console.log("⚙️ Building video...");

    await runCommand(`
      ffmpeg -y -f concat -safe 0 -i "${listPath}" \
      -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2" \
      -c:v libx264 -preset veryfast -crf 23 \
      -c:a aac \
      "${tempVideo}"
    `);

    //
    // ---------- GENERATE CAPTIONS ----------
    //
    const captionsPath = path.join(__dirname, "captions.srt");
    generateCaptions(text, captionsPath);

    const outputVideo = path.join(__dirname, "output.mp4");

    console.log("📝 Adding captions...");

    await runCommand(`
      ffmpeg -y -i "${tempVideo}" \
      -vf subtitles="${captionsPath}" \
      -c:a copy \
      "${outputVideo}"
    `);

    console.log("✅ Video created:", outputVideo);

    //
    // ---------- RETURN VIDEO ----------
    //
    res.sendFile(outputVideo);

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

//
// ---------- START SERVER ----------
//
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});