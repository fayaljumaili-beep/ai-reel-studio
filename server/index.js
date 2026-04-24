const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

console.log("🔥 THIS FILE IS RUNNING");

app.get("/", (req, res) => {
  res.send("Server works");
});

app.post("/generate-video", (req, res) => {
  const prompt = (req.body.prompt || "").toLowerCase().trim();

  console.log("PROMPT RECEIVED:", prompt);

  let videoUrl;

  if (prompt.includes("gym")) {
    videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4";
  } else if (prompt.includes("motivation")) {
    videoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  } else if (prompt.includes("nature")) {
    videoUrl = "https://www.w3schools.com/html/movie.mp4";
  } else {
    videoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  }

  res.json({ videoUrl });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log("NEW VERSION DEPLOYED 🚀");
});