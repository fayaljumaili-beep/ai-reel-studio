import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/generate", async (req, res) => {
  try {
    const output = "output.mp4";

   const __dirname = new URL('.', import.meta.url).pathname;

const clips = [
  path.join(__dirname, "assets/videos/clip-0.mp4"),
  path.join(__dirname, "assets/videos/clip-1.mp4"),
  path.join(__dirname, "assets/videos/clip-2.mp4")
];

    // 🔥 Step 1: normalize all clips
    const normalized = clips.map((_, i) => `temp${i}.mp4`);

    for (let i = 0; i < clips.length; i++) {
      await new Promise((resolve, reject) => {
  exec(
    `ffmpeg -y -i ${clips[i]} -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -an ${normalized[i]}`,
    (err) => (err ? reject(err) : resolve())
  );
});
    }

    // 🔥 Step 2: create concat file
    const listFile = "list.txt";
    fs.writeFileSync(
      listFile,
      normalized.map((f) => `file '${f}'`).join("\n")
    );

    // 🔥 Step 3: concatenate safely
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -y -f concat -safe 0 -i ${listFile} -c:v libx264 -preset fast ${output}`,
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 🔥 Step 4: send video
    res.sendFile(path.resolve(output));

  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});