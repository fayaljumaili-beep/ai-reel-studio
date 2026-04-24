const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server works");
});

app.post("/generate-video", (req, res) => {
  const prompt = (req.body.prompt || "").toLowerCase().trim();

  console.log("RAW PROMPT:", req.body.prompt);
  console.log("CLEAN PROMPT:", prompt);

  let videoUrl;

  if (prompt.includes("gym")) {
    console.log("GYM MATCHED ✅");
    videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4";
  } else {
    console.log("DEFAULT USED");
    videoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  }

  res.json({ videoUrl });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 SERVER RUNNING ON", PORT);
});