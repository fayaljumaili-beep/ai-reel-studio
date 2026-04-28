import express from "express";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import cors from "cors"; // ✅ proper import

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Proper CORS (fixes frontend connection)
app.use(cors({
  origin: "*", // you can lock this later to your Vercel domain
}));

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.get("/generate-video", async (req, res) => {
  try {
    console.log("🎬 Generating video...");

    const base = process.cwd();

    const clips = [
      path.join(base, "server/assets/clip-0.mp4"),
      path.join(base, "server/assets/clip-1.mp4"),
      path.join(base, "server/assets/clip-2.mp4"),
    ];

    const audio = path.join(base, "server/assets/music.mp3");
    const output = path.join(base, "output.mp4");

    // 🔥 create concat file
    const listFile = path.join(base, "filelist.txt");
    fs.writeFileSync(
      listFile,
      clips.map(c => `file '${c}'`).join("\n")
    );

    ffmpeg()
      .input(listFile)
      .inputOptions(["-f concat", "-safe 0"])
      .input(audio)

      .complexFilter([
        "[0:v]scale=720:1280,format=yuv420p[v]",
        "[1:a]volume=0.8[a]"
      ])

      .outputOptions([
        "-map [v]",
        "-map [a]",
        "-shortest",
        "-vf drawtext=text='Stay focused 💰':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h-100"
      ])

      .on("start", cmd => console.log("FFmpeg:", cmd))
      .on("end", () => {
        console.log("✅ Done");
        res.sendFile(output);
      })
      .on("error", err => {
        console.error("❌ FFmpeg error:", err.message);
        res.status(500).send(err.message);
      })
      .save(output);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});