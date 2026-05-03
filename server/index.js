const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/generate-video", async (req, res) => {
  try {
    const text = (req.body.prompt || "SUCCESS").toUpperCase();

    const imagePath = path.join(__dirname, "public", "input.jpg");
    const resizedPath = path.join(__dirname, "public", "resized.jpg");
    const outputPath = path.join(__dirname, "public", "output.mp4");
    const musicPath = path.join(__dirname, "public", "music.mp3");

    if (!fs.existsSync(imagePath)) {
      return res.status(500).json({ error: "input.jpg missing" });
    }

    // 🔥 Resize image (prevents crashes)
    await sharp(imagePath)
      .resize(720, 1280, { fit: "inside" })
      .toFile(resizedPath);

    // 🔥 Escape text for ffmpeg
    const safeText = text.replace(/:/g, "\\:").replace(/'/g, "\\'");

    // 🎬 TikTok-style video
    const cmd = `ffmpeg -y -loop 1 -i "${resizedPath}" -i "${musicPath}" -vf "scale=720:1280:force_original_aspect_ratio=decrease,drawtext=text='${safeText}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=h-200:shadowcolor=black:shadowx=2:shadowy=2" -c:v libx264 -preset ultrafast -t 5 -pix_fmt yuv420p -shortest "${outputPath}"`;

    exec(cmd, (error, stdout, stderr) => {
      console.log(stderr);

      if (error) {
        console.error("FFmpeg error:", error);
        return res.status(500).json({ error: "Video generation failed" });
      }

      return res.json({
        videoUrl: `${req.protocol}://${req.get("host")}/output.mp4`,
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running on port " + PORT));