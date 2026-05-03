const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// serve static files (CRITICAL)
app.use(express.static(path.join(__dirname, "public")));

app.post("/generate-video", async (req, res) => {
  try {
    const imagePath = path.join(__dirname, "public", "input.jpg");
    const outputPath = path.join(__dirname, "public", "output.mp4");

    // ✅ CLEAN ffmpeg command (no multiline issues)
   const cmd = `ffmpeg -y -loop 1 -i "${imagePath}" -vf "scale=720:1280:force_original_aspect_ratio=decrease" -c:v libx264 -preset ultrafast -t 3 -pix_fmt yuv420p "${outputPath}"`;
    exec(cmd, (error, stdout, stderr) => {
      console.log("FFMPEG STDERR:", stderr);

      if (error) {
        console.error("FFmpeg error:", error);
        return res.status(500).json({ error: "Video generation failed" });
      }

      console.log("✅ Video created");

      res.json({
        videoUrl: "/output.mp4"
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running on port " + PORT));