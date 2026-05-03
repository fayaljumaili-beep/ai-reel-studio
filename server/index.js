import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 IMPORTANT — serve public files
app.use(express.static("public"));

const PORT = process.env.PORT || 8080;

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("Prompt:", prompt);

    const imagePath = path.join("public", "input.jpg");
    const audioPath = path.join("public", "audio.mp3");
    const outputPath = path.join("public", "output.mp4");

    // 🧠 Basic check (prevents silent crashes)
    if (!fs.existsSync(imagePath)) {
      return res.status(500).json({ error: "input.jpg missing" });
    }
    if (!fs.existsSync(audioPath)) {
      return res.status(500).json({ error: "audio.mp3 missing" });
    }

    const cmd = `
  ffmpeg -y -loop 1 -i ${imagePath} \
  -c:v libx264 -t 5 -pix_fmt yuv420p ${outputPath}
`;

    exec(cmd, (error) => {
      if (error) {
        console.error("FFmpeg error:", error);
        return res.status(500).json({ error: "Video generation failed" });
      }

      console.log("Video created!");

      res.json({
        videoUrl: "https://ai-reel-studio-production.up.railway.app/output.mp4"
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});