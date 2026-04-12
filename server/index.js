import express from "express";

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const audioPath = "/app/voiceover.mp3";

    fs.writeFileSync(audioPath, audioBuffer);

    res.json({
      success: true,
      audioUrl: "/voiceover.mp3",
      bytes: audioBuffer.length,
    });
  } catch (error) {
    console.error("Voice route error:", error);
    res.status(500).json({
      error: "Voice generation failed",
      details: error.message,
    });
  }
});

app.post("/generate-video", async (req, res) => {
  try {
    const { script = "", captionText = "" } = req.body || {};

    const audioPath = "/app/voiceover.mp3";
    const outputPath = "/app/final-reel.mp4";

    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({
        error: "Generate voice before video",
      });
    }

    const safeCaption = (captionText || script || "Viral reel")
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'")
      .slice(0, 120);

    ffmpeg()
      .input(`color=c=black:s=1080x1920:d=6`)
      .inputFormat("lavfi")
      .input(audioPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-vf drawtext=text='" + safeCaption + "':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-220",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-shortest",
      ])
      .save(outputPath)
      .on("end", () => {
        res.download(outputPath, "viral-reel.mp4");
      })
      .on("error", (err) => {
        console.error("FFmpeg merge error:", err);
        res.status(500).json({
          error: "FFmpeg merge failed",
          details: err.message,
        });
      });
  } catch (error) {
    console.error("Video route error:", error);
    res.status(500).json({
      error: "Video generation failed",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
