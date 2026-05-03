import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serve static files
app.use(express.static(path.join(__dirname, "public")));

// ✅ THIS is the route your frontend calls
app.post("/generate-video", (req, res) => {
  console.log("Prompt:", req.body.prompt);

  res.json({
    video: "https://ai-reel-studio-production.up.railway.app/output.mp4",
    audio: "https://ai-reel-studio-production.up.railway.app/audio.mp3"
  });
});

// test route (optional)
app.get("/", (req, res) => {
  res.send("API running");
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});