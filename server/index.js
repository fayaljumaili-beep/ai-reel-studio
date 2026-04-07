require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});

const OpenAI = require("openai").default;
const path = require("path");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

app.use(express.json());

function createVideo(audioPath, videoPath, captionText) {
  const outputPath = path.join(__dirname, `output-${Date.now()}.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        "-map 0:v",
        "-map 1:a",
        "-shortest",
        "-y"
      ])
      .videoCodec("libx264")
      .audioCodec("aac")
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => {
        console.log("FFMPEG ERROR:", err.message);
        reject(err);
      })
      .run();
  });
}

app.post("/generate", async (req, res) => {
  try {
    console.log("STEP 1: request received");

    const { topic } = req.body;
    const lowerTopic = topic.toLowerCase();

    let voiceId = "qSeXEcewz7tA0Q0qk9fH";

    if (lowerTopic.includes("love")) {
      voiceId = "EXAVITQu4vr4xnSDxMaL";
    } else if (
      lowerTopic.includes("gym") ||
      lowerTopic.includes("business")
    ) {
      voiceId = "TxGEqnHWrfWFTfGW9XjX";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short viral faceless reel script about ${topic}. Keep it powerful and motivational.`,
        },
      ],
    });

    console.log("STEP 2: script generated");

    const script =
      completion.choices[0].message.content ||
      `Stay focused on ${topic} and never give up.`;

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: script,
        model_id: "eleven_multilingual_v2",
      },
      {
        headers: {
          "xi-api-key": process.env.API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        responseType: "arraybuffer",
      }
    );

    console.log("STEP 3: audio generated");

    const audioPath = path.join(__dirname, "output.mp3");
    fs.writeFileSync(audioPath, response.data);

    let selectedVideo = "bg.mp4";

    if (lowerTopic.includes("money")) {
      selectedVideo = "mindset.mp4";
    } else if (lowerTopic.includes("gym")) {
      selectedVideo = "gym.mp4";
    } else if (lowerTopic.includes("love")) {
      selectedVideo = "love.mp4";
    } else if (lowerTopic.includes("business")) {
      selectedVideo = "business.mp4";
    }

    const videoPath = path.join(__dirname, "assets", selectedVideo);

    const outputPath = await createVideo(audioPath, videoPath, script);

    console.log("STEP 4: video created");

    res.download(outputPath);
  } catch (error) {
    console.error("FULL ERROR:", error.message);
    res.status(500).json({
      error: "Video generation failed",
      details: error.message,
    });
  }
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});