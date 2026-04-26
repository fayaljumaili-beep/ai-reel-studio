const express = require("express");
const cors = require("cors");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// paths
const imagePath = path.join(__dirname, "assets", "image.jpg");
const audioPath = path.join(__dirname, "assets", "music.mp3");
const outputPath = path.join(__dirname, "output.mp4");

// health check
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.post("/generate-video", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // 🔥 keep it small for Railway
    const videoDuration = 8;

    // ✅ VERY SAFE text (this is key)
    const safeText = prompt
      .replace(/[^a-zA-Z0-9 ]/g, "") // remove ALL risky chars
      .substring(0, 60); // limit length

    // ✅ NO quotes → avoids FFmpeg parsing bugs
    const filter = `drawtext=text=${safeText}:fontcolor=yellow:fontsize=60:x=(w-text_w)/2:y=80`;

    // delete old output
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    ffmpeg()
      .input(imagePath)
      .loop(videoDuration)
      .input(audioPath)
      .outputOptions([
        "-t", String(videoDuration),
        "-vf", filter,
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "32",
        "-s", "720x1280",
        "-c:a", "aac",
        "-b:a", "96k",
        "-shortest"
      ])
      .save(outputPath)
      .on("end", () => {
        console.log("✅ VIDEO READY");
        res.sendFile(outputPath);
      })
      .on("error", (err) => {
        console.error("FFMPEG ERROR:", err.message);
        res.status(500).json({ error: "Video generation failed" });
      });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server crashed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});