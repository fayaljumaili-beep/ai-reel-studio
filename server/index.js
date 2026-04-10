const express = require("express");
const cors = require("cors");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

/**
 * 🎬 SCRIPT GENERATION ROUTE
 */
app.post("/generate", async (req, res) => {
  try {
    const { topic, voice, template } = req.body;

    const script = `Hook: Want to know ${topic}?

Main:
Here are 3 mindset shifts used by highly successful people.
1. Stay disciplined
2. Think long term
3. Execute daily

CTA:
Follow for more ${template} content.`;

    return res.json({
      success: true,
      script,
      topic,
      voice,
      template,
    });
  } catch (error) {
    console.error("Generate route error:", error);
    return res.status(500).json({
      success: false,
      error: "Script generation failed",
    });
  }
});

/**
 * 🎥 VIDEO GENERATION ROUTE
 */
app.post("/generate-video", async (req, res) => {
  try {
    const { topic, voice, template } = req.body;

    const script = `Want to know ${topic}?
Stay disciplined
Think long term
Execute daily
Follow for more`;

    const outputPath = "/tmp/viral-reel.mp4";
    const textFile = "/tmp/reel.txt";

    fs.writeFileSync(textFile, script);

    ffmpeg()
      .input("color=c=black:s=1080x1920:d=8")
      .inputFormat("lavfi")
      .videoFilters(
        `drawtext=textfile=${textFile}:fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`
      )
      .outputOptions("-pix_fmt yuv420p")
      .save(outputPath)
      .on("end", () => {
        return res.download(outputPath, "viral-reel.mp4");
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        return res.status(500).json({
          success: false,
          error: "Video generation failed",
        });
      });
  } catch (error) {
    console.error("Video route error:", error);
    return res.status(500).json({
      success: false,
      error: "Server video route failed",
    });
  }
});

/**
 * 🚀 HEALTH CHECK
 */
app.get("/", (req, res) => {
  res.send("AI Reel Studio backend running");
});

/**
 * 🚂 RAILWAY START
 */
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});