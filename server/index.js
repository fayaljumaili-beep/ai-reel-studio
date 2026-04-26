const express = require("express");
const cors = require("cors");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

// middleware
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

    // 🔥 FORCE LOW MEMORY (important for Railway)
    const videoDuration = 8;

    // clean text for ffmpeg
    const safeText = prompt.replace(/'/g, "").replace(/:/g, "");

    // ✅ FIXED: filters defined
    const filters = [
      `drawtext=text='${safeText}':fontcolor=yellow:fontsize=60:x=(w-text_w)/2:y=80`
    ];

    // delete old output if exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    ffmpeg()
      .input(imagePath)
      .loop(videoDuration)
      .input(audioPath)
      .outputOptions([
        "-t " + videoDuration,
        "-vf " + filters.join(","),
        "-pix_fmt yuv420p",
        "-c:v libx264",
        "-preset ultrafast",
        "-crf 32",
        "-s 720x1280",
        "-c:a aac",
        "-b:a 96k",
        "-shortest"
      ])
      .save(outputPath)
      .on("end", () => {
        console.log("✅ VIDEO READY");
        res.sendFile(outputPath);
      })
      .on("error", (err) => {
        console.error("FFMPEG ERROR:", err);
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