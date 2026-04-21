import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import OpenAI from "openai";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// ✅ OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});


// 🔥 Generate script
async function generateScript(idea) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You write short viral TikTok scripts. Max 2 sentences. Very punchy.",
      },
      {
        role: "user",
        content: idea,
      },
    ],
  });

  return res.choices[0].message.content;
}


// 🔊 Generate voice
async function generateVoice(script) {
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: script,
  });

  const audioPath = path.join("server/assets", "voice.mp3");
  const buffer = Buffer.from(await speech.arrayBuffer());

  fs.writeFileSync(audioPath, buffer);

  return audioPath;
}


// 🖼️ Generate AI image
async function generateImage(idea) {
  const imagePath = path.join("server/assets", "image.jpg");

  const prompt = `A cinematic vertical image about ${idea}, ultra realistic, dramatic lighting, 4k`;

  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1792",
  });

  const imageBase64 = result.data[0].b64_json;
  const imageBuffer = Buffer.from(imageBase64, "base64");

  fs.writeFileSync(imagePath, imageBuffer);

  return imagePath;
}


// 🎬 Create video
function createVideo(imagePath, audioPath) {
  return new Promise((resolve, reject) => {
    const outputPath = `server/output-${Date.now()}.mp4`;

    ffmpeg()
      .input(imagePath)
      .loop(5)
      .input(audioPath)
      .outputOptions([
        "-c:v libx264",
        "-tune stillimage",
        "-c:a aac",
        "-b:a 192k",
        "-pix_fmt yuv420p",
        "-shortest",
      ])
      .save(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject);
  });
}


// 🚀 MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    const { script } = req.body;

    // 1. Generate script (optional override)
    const finalScript = script || (await generateScript("motivation"));

    // 2. Voice
    const audioPath = await generateVoice(finalScript);

    // 3. Image
    const imagePath = await generateImage(finalScript);

    // 4. Video
    const videoPath = await createVideo(imagePath, audioPath);

    res.json({
      videoUrl: `https://ai-reel-studio-production.up.railway.app/${videoPath.replace(
        "server/",
        ""
      )}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating video");
  }
});


// ✅ Serve video files
app.use(express.static("server"));


// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});