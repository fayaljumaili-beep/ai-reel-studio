import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// 🚨 THIS MUST BE BEFORE ANY ROUTES
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
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(prompt)}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    console.log("Pexels status:", response.status);

    const data = await response.json();
    console.log("Pexels data:", data);

    if (!data.videos || data.videos.length === 0) {
      return res.json({
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      });
    }

    const videoFiles = data.videos[0].video_files;
    const videoUrl = videoFiles[0].link;

    return res.json({ videoUrl });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    return res.status(500).json({ error: "Server crashed" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});