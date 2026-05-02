import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 8080;

// ensure public folder exists
if (!fs.existsSync("public")) {
  fs.mkdirSync("public");
}

app.get("/", (req, res) => {
  res.send("AI Reel Studio Backend Running 🚀");
});

app.post("/generate-video", async (req, res) => {
  try {
    const prompt = req.body.prompt || "success mindset";
    console.log("Prompt:", prompt);

    // ---------------------------
    // 1. SCRIPT (REAL PARAGRAPH)
    // ---------------------------
    const script = `Here's the truth about ${prompt}.

It doesn’t happen overnight.

Every successful person you admire started with nothing but an idea and the willingness to keep going.

Consistency beats motivation every single time.

The small steps you take today might not feel like much, but over time, they create massive results.

So keep going, stay focused, and trust the process.`;

    // ---------------------------
    // 2. GET VIDEOS (PEXELS)
    // ---------------------------
    const pexelsRes = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        prompt
      )}&per_page=3`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const pexelsData = await pexelsRes.json();

    if (!pexelsData.videos || pexelsData.videos.length === 0) {
      throw new Error("No videos found");
    }

    const clips = [];

    for (let i = 0; i < 3; i++) {
      const video = pexelsData.videos[i];
      const file = video.video_files.find(f => f.quality === "sd") || video.video_files[0];

      const filePath = `public/clip_${i}.mp4`;

      const videoBuffer = await fetch(file.link).then(r => r.buffer());
      fs.writeFileSync(filePath, videoBuffer);

      clips.push(filePath);
    }

    // ---------------------------
    // 3. CONCAT CLIPS (FIXED)
    // ---------------------------
    const concatFile = clips
      .map(c => `file '${path.resolve(c)}'`)
      .join("\n");

    fs.writeFileSync("public/concat.txt", concatFile);

    execSync(`
      ffmpeg -y -f concat -safe 0 -i public/concat.txt \
      -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
      -c:v libx264 -preset fast -crf 23 \
      -pix_fmt yuv420p \
      -r 30 \
      public/merged.mp4
    `);

    // ---------------------------
    // 4. ADD BACKGROUND MUSIC (OPTIONAL)
    // ---------------------------
    execSync(`
      ffmpeg -y -i public/merged.mp4 \
      -filter_complex "[0:a]volume=0.3[a]" \
      -map 0:v -map "[a]" \
      -c:v copy -c:a aac \
      public/with_audio.mp4
    `);

    // ---------------------------
    // 5. SAFE CAPTIONS (KEY PART)
    // ---------------------------
    const lines = script
      .split(". ")
      .map(l => l.trim())
      .filter(Boolean);

    let filter = "";

    lines.forEach((line, i) => {
      const start = i * 2.5;
      const end = start + 2.5;

      const safeText = line
        .replace(/:/g, "\\:")
        .replace(/'/g, "\\'")
        .replace(/,/g, "\\,");

      filter += `drawtext=text='${safeText}':fontcolor=white:fontsize=42:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-200:enable='between(t,${start},${end})',`;
    });

    filter = filter.slice(0, -1);

    execSync(`
      ffmpeg -y -i public/with_audio.mp4 \
      -vf "${filter}" \
      -c:v libx264 -preset fast -crf 23 \
      -c:a aac \
      public/output.mp4
    `);

    // ---------------------------
    // RESPONSE
    // ---------------------------
    res.json({
      videoUrl: "/output.mp4",
      script: script,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});