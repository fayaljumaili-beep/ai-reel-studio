import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import OpenAI from "openai";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PORT = process.env.PORT || 8080;

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🧠 Prompt:", prompt);

    // 1. download clips
    const clips = await downloadClips(prompt);

    // 2. generate voice
    const audioPath = await generateVoice(prompt);

    // 3. captions
    await generateCaptions(prompt);

    // 4. build video
    const output = "output.mp4";
    await buildVideo(clips, audioPath, output);

    // 5. return video
    res.sendFile(path.resolve(output));

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send(err.message);
  }
});


// ------------------------
// 🎬 DOWNLOAD CLIPS
// ------------------------
async function downloadClips(query) {
  console.log("⬇️ Downloading clips...");

  const API_KEY = process.env.PEXELS_API_KEY;

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3`,
    {
      headers: { Authorization: API_KEY },
    }
  );

  const data = await res.json();

  const clips = [];

  for (let i = 0; i < data.videos.length; i++) {
    const videoUrl = data.videos[i].video_files[0].link;
    const fileName = `clip-${i}.mp4`;

    const videoRes = await fetch(videoUrl);
    const buffer = await videoRes.arrayBuffer();

    fs.writeFileSync(fileName, Buffer.from(buffer));
    console.log(`✅ Downloaded ${fileName}`);

    clips.push(fileName);
  }

  return clips;
}


// ------------------------
// 🔊 GENERATE VOICE
// ------------------------
async function generateVoice(text) {
  console.log("🎤 Generating voice...");

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync("voice.mp3", buffer);

  console.log("✅ Voice saved");
  return "voice.mp3";
}


// ------------------------
// 📝 CAPTIONS
// ------------------------
async function generateCaptions(text) {
  console.log("💬 Generating captions...");

  const words = text.split(" ");
  let srt = "";
  let time = 0;

  words.forEach((word, i) => {
    const start = time;
    const end = time + 0.6;

    const format = (t) =>
      `00:00:${String(t.toFixed(2)).padStart(5, "0").replace(".", ",")}`;

    srt += `${i + 1}\n${format(start)} --> ${format(end)}\n${word}\n\n`;

    time += 0.6;
  });

  fs.writeFileSync("captions.srt", srt);
  console.log("✅ Captions ready");
}


// ------------------------
// 🎥 BUILD VIDEO (FIXED)
// ------------------------
async function buildVideo(clips, audioPath, outputPath) {
  console.log("🎬 Building video...");

  try {
    const normalized = [];

    // normalize clips
    for (let i = 0; i < clips.length; i++) {
      const out = `norm-${i}.mp4`;

      await new Promise((res, rej) => {
        ffmpeg(clips[i])
          .outputOptions([
            "-vf scale=720:1280",
            "-r 30",
            "-c:v libx264",
            "-preset veryfast",
            "-pix_fmt yuv420p",
          ])
          .noAudio()
          .save(out)
          .on("end", res)
          .on("error", rej);
      });

      normalized.push(out);
    }

    console.log("✅ Clips normalized");

    // concat file
    const listFile = "concat.txt";
    fs.writeFileSync(
      listFile,
      normalized.map((f) => `file '${f}'`).join("\n")
    );

    // stitch clips
    await new Promise((res, rej) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save("temp.mp4")
        .on("end", res)
        .on("error", rej);
    });

    console.log("✅ Video stitched");

    // add audio + captions
    await new Promise((res, rej) => {
      ffmpeg()
        .input("temp.mp4")
        .input(audioPath)
        .outputOptions([
          "-vf subtitles=captions.srt:force_style='Fontsize=24,PrimaryColour=&H00FFFF&,Bold=1,Alignment=10'",
          "-map 0:v",
          "-map 1:a",
          "-shortest",
        ])
        .save(outputPath)
        .on("end", res)
        .on("error", rej);
    });

    console.log("🔥 FINAL VIDEO READY");

  } catch (err) {
    console.error("❌ BUILD ERROR:", err);
    throw err;
  }
}


// ------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});