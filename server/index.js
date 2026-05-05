import express from "express";
import cors from "cors";
import fs from "fs";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

// 🎬 REAL WORKING VIDEO SOURCES (IMPORTANT)
const SAMPLE_CLIPS = [
  "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
  "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
  "https://samplelib.com/lib/preview/mp4/sample-15s.mp4"
];

app.post("/generate-video", async (req, res) => {
  try {
    console.log("🔥 START");

    const { idea } = req.body;

    if (!idea) {
      return res.status(400).json({ error: "Missing idea" });
    }

    const clips = [];

    // 🧹 cleanup
    try { fs.unlinkSync("videos.txt"); } catch {}
    try { fs.unlinkSync("stitched.mp4"); } catch {}
    try { fs.unlinkSync("final.mp4"); } catch {}

    // 📥 DOWNLOAD REAL CLIPS
    for (let i = 0; i < SAMPLE_CLIPS.length; i++) {
      const file = `clip_${i}.mp4`;

      console.log(`⬇️ downloading: ${file}`);

      await execPromise(`curl -L "${SAMPLE_CLIPS[i]}" -o ${file}`);

      // ✅ VERIFY FILE EXISTS
      if (fs.existsSync(file) && fs.statSync(file).size > 1000) {
        clips.push(file);
        console.log(`✅ valid clip: ${file}`);
      } else {
        console.log(`❌ invalid clip skipped: ${file}`);
      }
    }

    if (clips.length === 0) {
      return res.status(500).json({ error: "No valid clips" });
    }

    console.log("🎬 clips ready:", clips);

    // 📄 CONCAT FILE
    fs.writeFileSync(
      "videos.txt",
      clips.map((c) => `file '${c}'`).join("\n")
    );

    // 🚀 RESPOND FAST
    const videoUrl = `https://${req.headers.host}/final.mp4`;

    res.json({
      video: videoUrl,
      script: `Generated from idea: ${idea}`
    });

    // 🎞 BACKGROUND PROCESSING
    (async () => {
      try {
        console.log("🎞 stitching...");

        await execPromise(`
          ffmpeg -y -f concat -safe 0 -i videos.txt \
          -c:v libx264 -preset fast -pix_fmt yuv420p stitched.mp4
        `);

        console.log("🔁 looping...");

        await execPromise(`
          ffmpeg -y -stream_loop 1 -i stitched.mp4 \
          -t 20 -c copy final.mp4
        `);

        console.log("✅ FINAL READY");

      } catch (err) {
        console.error("❌ ffmpeg error:", err);
      }
    })();

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ error: "Server failed" });
  }
});

// ❤️ health
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 running on ${PORT}`);
});