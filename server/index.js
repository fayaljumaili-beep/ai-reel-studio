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

const VIDEO_DIR = path.join(__dirname, "assets/videos");

// helper
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ FFmpeg error:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

app.post("/generate-video", async (req, res) => {
  try {
    console.log("📩 Request body:", req.body);

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text field" });
    }

    // get videos
    const videos = fs
      .readdirSync(VIDEO_DIR)
      .filter((f) => f.endsWith(".mp4"))
      .map((f) => path.join(VIDEO_DIR, f));

    if (videos.length === 0) {
      return res.status(500).json({ error: "No videos found" });
    }

    console.log("🎞 Using videos:", videos);

    // create concat list
    const listPath = path.join(__dirname, "list.txt");
    fs.writeFileSync(
      listPath,
      videos.map((v) => `file '${v}'`).join("\n")
    );

    const tempVideo = path.join(__dirname, "temp.mp4");
    const outputVideo = path.join(__dirname, "output.mp4");

    // merge clips
    await runCommand(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${tempVideo}"`
    );

    // create captions file
    const captionsPath = path.join(__dirname, "captions.srt");

    const captionContent = `1
00:00:00,000 --> 00:00:10,000
${text}
`;

    fs.writeFileSync(captionsPath, captionContent);

    // ⚠️ IMPORTANT: escaped subtitles path (Linux fix)
    const safeCaptionsPath = captionsPath.replace(/:/g, "\\:");

    await runCommand(
      `ffmpeg -y -i "${tempVideo}" -vf subtitles="${safeCaptionsPath}" "${outputVideo}"`
    );

    console.log("✅ Video created:", outputVideo);

    // stream video (NO MORE 500/502)
    res.setHeader("Content-Type", "video/mp4");

    const stream = fs.createReadStream(outputVideo);

    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("❌ Stream error:", err);
      res.status(500).end();
    });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});