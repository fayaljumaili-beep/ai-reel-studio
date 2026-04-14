import express from "express";
  }
});

// 3) Generate final narrated video
app.post("/generate-video", async (req, res) => {
  try {
    const caption = (req.body?.caption || "Unlock Your Success!")
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'");

    const samplePath = path.join(__dirname, "..", "sample.mp4");
    const voicePath = path.join(__dirname, "..", "voice.mp3");
    const outputPath = path.join(__dirname, "..", "viral-reel.mp4");

    if (!fs.existsSync(samplePath)) {
      return res.status(400).send("sample.mp4 missing");
    }

    if (!fs.existsSync(voicePath)) {
      return res.status(400).send("voice.mp3 missing");
    }

    ffmpeg()
      .input(samplePath)
      .input(voicePath)
      .outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        `-vf scale=720:1280,drawtext=text='${caption}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=h-140`,
        "-r 30",
        "-c:v libx264",
        "-profile:v main",
        "-level 3.1",
        "-pix_fmt yuv420p",
        "-preset medium",
        "-movflags +faststart",
        "-c:a aac",
        "-b:a 192k",
        "-ar 44100",
        "-ac 2",
        "-shortest"
      ])
      .on("end", () => {
        try {
          const videoBuffer = fs.readFileSync(outputPath);
          res.setHeader("Content-Type", "video/mp4");
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="viral-reel.mp4"'
          );
          res.end(videoBuffer);
        } catch (error) {
          console.error("READ VIDEO ERROR:", error);
          res.status(500).send(error.message);
        }
      })
      .on("error", (err) => {
        console.error("VIDEO ERROR:", err.message);
        res.status(400).send(err.message);
      })
      .save(outputPath);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});