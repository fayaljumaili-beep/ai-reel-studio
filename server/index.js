import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/generate-video", async (req, res) => {
  try {
    const videoPath = path.resolve("sample.mp4");
    const voicePath = path.resolve("voice.mp3");
    const outputPath = path.resolve("final-reel.mp4");

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Missing sample video: ${videoPath}`);
    }

    if (!fs.existsSync(voicePath)) {
      throw new Error(`Missing voice file: ${voicePath}`);
    }

    const voiceStats = await fsp.stat(voicePath);
    console.log("MP3 SIZE:", voiceStats.size);


    if (voiceStats.size === 0) {
      throw new Error("voice.mp3 is empty");
    }

    ffmpeg(videoPath)
      .input(voicePath)
      .outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        "-c:v copy",
        "-c:a aac",
        "-shortest",
      ])
      .save(outputPath)
      .on("end", async () => {
        const videoBuffer = await fsp.readFile(outputPath);

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
app.post("/voiceover", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "Missing script" });
    }

    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TTS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: script }),
    });

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    await fsp.writeFile("voice.mp3", audioBuffer);

    const stats = await fsp.stat("voice.mp3");
    console.log("VOICE SIZE:", stats.size);

    if (stats.size === 0) {
      throw new Error("voice.mp3 was saved empty");
    }

    res.json({ success: true, size: stats.size });
  } catch (error) {
    console.error("VOICEOVER ERROR:", error);
    res.status(500).json({ error: "Voice generation failed" });
  }
});