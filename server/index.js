import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8080;

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    console.log("PROMPT:", prompt);

    // 🎥 FETCH VIDEOS FROM PEXELS
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=3`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    const videos =
      data.videos?.map(
        (v) => v.video_files?.find((f) => f.quality === "hd")?.link
      ) || [];

    console.log("VIDEOS:", videos);

    // 🧠 GENERATE AI CAPTIONS
    let captions = [];

    try {
      const aiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You create short, viral, punchy captions for social media reels.",
              },
              {
                role: "user",
                content: `Create 3 short viral captions for: ${prompt}`,
              },
            ],
          }),
        }
      );

      const aiData = await aiRes.json();

      console.log("AI RESPONSE:", aiData);

      const text =
        aiData.choices?.[0]?.message?.content || "";

      captions = text
        .split("\n")
        .map((line) => line.replace(/^\d+[\).\s-]*/, "").trim())
        .filter((line) => line.length > 0)
        .slice(0, 3);

    } catch (err) {
      console.log("AI FAILED:", err);

      captions = videos.map(
        (_, i) => `${prompt} clip ${i + 1} 🔥`
      );
    }

    console.log("CAPTIONS:", captions);

    // 📦 RETURN TO FRONTEND
    res.json({
      videos,
      captions,
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});