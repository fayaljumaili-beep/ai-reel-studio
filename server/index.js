import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ✅ CORS (must be before routes)
app.use(cors({
  origin: "*"
}));

app.use(express.json());

app.post("/generate-video", async (req, res) => {
  try {
    console.log("API KEY:", process.env.PEXELS_API_KEY);

    if (!process.env.PEXELS_API_KEY) {
      console.log("❌ NO API KEY");
      return res.status(500).json({ error: "Missing API key" });
    }

    const { prompt } = req.body;
    console.log("Prompt:", prompt);

    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(prompt)}&per_page=15`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    // 🔍 DEBUG (VERY IMPORTANT)
    console.log("TOTAL VIDEOS FROM API:", data.videos?.length);

    const rawLinks = (data.videos || []).map(v => v.video_files?.[0]?.link);
    console.log("RAW LINKS:", rawLinks);

    // ✅ Get ALL possible video links (better than just [0])
    const videos = (data.videos || [])
      .flatMap(v => (v.video_files || []).map(f => f.link))
      .filter(Boolean)
      .slice(0, 3);

    console.log("FINAL VIDEOS:", videos);

    // fallback if nothing found
    if (!videos.length) {
      return res.json({
        videos: [
          "https://www.w3schools.com/html/mov_bbb.mp4"
        ]
      });
    }

    return res.json({ videos });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    return res.status(500).json({ error: "Server crashed" });
  }
});

// ✅ Railway port binding
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});