import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("API running ✅");
});

// MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("Incoming prompt:", prompt);

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    // 🔥 TEMP VIDEO (replace later with AI)
    const videoUrl =
      "https://www.w3schools.com/html/mov_bbb.mp4";

    res.json({ videoUrl });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});