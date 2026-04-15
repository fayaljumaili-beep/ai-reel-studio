import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(process.cwd()));

app.post("/generate-script", async (req, res) => {
  try {
    const { topic } = req.body;

    const script = `🎬 Viral Faceless Reel Script: "${topic}"

1. Hook (0–3s)
Show an emotional opener related to the topic.

2. Main Point (3–8s)
Reveal the first powerful lesson.

3. Value (8–15s)
Show transformation, proof, or insight.

4. CTA (15–20s)
Ask users to follow for more.`;

    res.json({ script });
  } catch (error) {
    console.error("SCRIPT ERROR:", error);
    res.status(500).json({ error: "script generation failed" });
  }
});

app.post("/voiceover", async (req, res) => {
  try {
    const script = req.body?.script;

    if (!script) {
      return res.status(400).json({
        error: "script missing in request body",
      });
    }

    const voicePath = path.join(process.cwd(), "voice.mp3");

    // TEMP demo voice file fallback
    fs.copyFileSync(
      path.join(process.cwd(), "voice.mp3"),
      voicePath
    );

    res.json({
      success: true,
      audioUrl: "/voice.mp3",
    });
  } catch (error) {
    console.error("VOICEOVER ERROR:", error);
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post("/generate-video", async (req, res) => {
  try {
    const script = req.body?.script || "";
    if (!script) {
      return res.status(400).send("Missing script");
    }

    const outputPath = path.join(process.cwd(), "viral-reel.mp4");
    const imagePath = path.join(process.cwd(), "sample.mp4");
    const audioPath = path.join(process.cwd(), "voice.mp3");

    if (!fs.existsSync(imagePath)) {
      return res.status(500).send("sample.mp4 missing");
    }

    if (!fs.existsSync(audioPath)) {
      return res.status(500).send("voice.mp3 missing");
    }

    ffmpeg()
      .input(imagePath)
      .input(audioPath)
      .outputOptions([
        "-c:v libx264",
        "-c:a aac",
        "-shortest",
        "-pix_fmt yuv420p"
      ])
      .save(outputPath)
      .on("end", () => {
        const videoBuffer = fs.readFileSync(outputPath);
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="viral-reel.mp4"'
        );
        res.end(videoBuffer);
      })
      .on("error", (err) => {
        console.error("VIDEO ERROR:", err.message);
        res.status(500).send("Video generation failed");
      });
  } catch (error) {
    console.error("ROUTE ERROR:", error);
    res.status(500).send("Video generation failed");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});