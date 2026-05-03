import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/generate-video", async (req, res) => {
  try {
    const imagePath = path.join("public", "input.jpg");
    const outputPath = path.join("public", "output.mp4");

    // ✅ Only check image
    if (!fs.existsSync(imagePath)) {
      return res.status(500).json({ error: "input.jpg missing" });
    }

    const cmd = `
ffmpeg -y -loop 1 -i ${imagePath} \
-c:v libx264 -t 5 -pix_fmt yuv420p ${outputPath}
`;

    exec(cmd, (error, stdout, stderr) => {
      console.log("STDERR:", stderr);

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

app.listen(8080, () => {
  console.log("Server running on port 8080");
});