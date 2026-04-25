import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8080;

// 🔑 OPTIONAL: add OpenAI later
// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    console.log("PROMPT:", prompt);

    // 🎥 FETCH VIDEOS FROM PEXELS
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=15`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    // 🧠 Extract valid video links
    let rawVideos = data.videos || [];

    let videoUrls = rawVideos
      .map((v) => v.video_files?.[0]?.link)
      .filter(Boolean);

    console.log("RAW VIDEOS:", videoUrls.length);

    // 🎯 Take first 3 clean videos
    let videos = videoUrls.slice(0, 3);

    console.log("FINAL VIDEOS:", videos);

    // 🧠 CAPTIONS (SAFE VERSION — NO CRASH)
    let captions = videos.map(
      (_, i) => `${prompt} clip ${i + 1} 🔥`
    );

    // 🔥 OPTIONAL AI CAPTIONS (UNCOMMENT LATER)
    /*
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Create ${videos.length} viral short captions about "${prompt}". Return ONLY JSON array.`,
          },
        ],
      }),
    });

    const aiData = await aiRes.json();

    try {
      captions = JSON.parse(aiData.choices[0].message.content);
    } catch (err) {
      console.log("AI parse failed, using fallback captions");
    }
    */

    // ✅ FINAL RESPONSE
    res.json({
      videos,
      captions,
    });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});