import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const app = express();
app.use(express.json());

app.use(cors({ origin: "*" }));

const PORT = process.env.PORT || 8080;

// ✅ IMPORTANT: root directory
const __dirname = new URL('.', import.meta.url).pathname;

// -------------------------
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🎬 Request:", prompt);

    // -------------------------
    // 1. DEFINE REAL PATHS
    // -------------------------
    const clips = [
      path.join(__dirname, "assets/video1.mp4"),
      path.join(__dirname, "assets/video2.mp4"),
      path.join(__dirname, "assets/video3.mp4"),
    ];

    // -------------------------
    // 2. CHECK FILES EXIST
    // -------------------------
    clips.forEach((clip) => {
      if (!fs.existsSync(clip)) {
        throw new Error(`Missing file: ${clip}`);
      }
    });

    console.log("📥 Clips ready");

    // -------------------------
    // 3. VOICE (SAFE)
    // -------------------------
    const voicePath = path.join(__dirname, "voice.mp3");
    fs.writeFileSync(voicePath, ""); // placeholder

    // -------------------------
    // 4. CAPTIONS
    // -------------------------
    const captionsPath = path.join(__dirname, "captions.srt");
    generateCaptions(prompt, captionsPath);

    // -------------------------
    // 5. CREATE CONCAT LIST
    // -------------------------
    const listPath = path.join(__dirname, "list.txt");

    const fileList = clips
      .map((c) => `file '${c}'`)
      .join("\n");

    fs.writeFileSync(listPath, fileList);

    // -------------------------
    // 6. CONCAT (RE-ENCODE SAFE)
    // -------------------------
    const tempPath = path.join(__dirname, "temp.mp4");

    await runCommand(`
      ffmpeg -y -f concat -safe 0 -i "${listPath}" 
      -c:v libx264 -preset veryfast -crf 23 
      -c:a aac 
      "${tempPath}"
    `);

    // -------------------------
    // 7. FINAL VIDEO
    // -------------------------
    const outputPath = path.join(__dirname, "output.mp4");

    await runCommand(`
      ffmpeg -y -i "${tempPath}" -i "${voicePath}" 
      -vf "subtitles=${captionsPath}" 
      -c:v libx264 -c:a aac -shortest 
      "${outputPath}"
    `);

    console.log("✅ Video ready");

    const video = fs.readFileSync(outputPath);
    res.setHeader("Content-Type", "video/mp4");
    res.send(video);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).send(err.message);
  }
});

// -------------------------
function generateCaptions(text, filePath) {
  const words = text.split(" ");
  let srt = "";
  let time = 0;

  words.forEach((word, i) => {
    const start = time;
    const end = time + 0.5;

    const format = (t) =>
      `00:00:${String(t.toFixed(2)).padStart(5, "0").replace(".", ",")}`;

    srt += `${i + 1}
${format(start)} --> ${format(end)}
${word}

`;

    time += 0.5;
  });

  fs.writeFileSync(filePath, srt);
}

// -------------------------
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("FFmpeg:", stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// -------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});