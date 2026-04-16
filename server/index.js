import express from "express";
import cors from "cors";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.post("/generate-script", async (req, res) => {
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
});

app.post("/voiceover", async (req, res) => {
  try {
    const script = req.body?.script;

    if (!script) {
      return res.status(400).json({ error: "Missing script" });
    }

    fs.copyFileSync("./voice.mp3", "./voice-output.mp3");

    res.json({
      audioUrl:
        "https://ai-reel-studio-frontend-production.up.railway.app/voice-output.mp3",
    });
  } catch (error) {
    console.error("VOICEOVER ERROR:", error);
    res.status(500).json({ error: "Voiceover failed" });
  }
});

app.post("/generate-video", async (req, res) => {
  try {
    const outputPath = "./viral-reel.mp4";

    ffmpeg()
      .input("./sample.mp4")
      .input("./voice-output.mp3")
      .outputOptions("-c:v copy")
      .outputOptions([
  "-preset ultrafast",
  "-crf 32",
  "-movflags frag_keyframe+empty_moov",
  "-pix_fmt yuv420p",
  "-shortest"
])

        const videoBuffer = fs.readFileSync(outputPath);

        res.setHeader("Content-Type", "video/mp4");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="viral-reel.mp4"'
        );

        res.end(videoBuffer);
      })
      .on("error", (err) => {
        console.error("VIDEO ERROR:", err);
        res.status(500).send("Video generation failed");
      });
  } catch (error) {
    console.error("ROUTE ERROR:", error);
    res.status(500).send("Video generation failed");
  }
});

app.use(express.static(process.cwd()));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});