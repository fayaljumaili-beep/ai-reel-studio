const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Server works");
});

// Main route
app.post("/generate-video", (req, res) => {
  const prompt = (req.body.prompt || "").toLowerCase();

  let videoUrl;

  if (prompt.includes("gym")) {
    videoUrl = "https://cdn.pixabay.com/video/2019/05/30/24177-339430569_large.mp4";
  } else if (prompt.includes("motivation")) {
    videoUrl = "https://cdn.pixabay.com/video/2020/01/28/31569-387605019_large.mp4";
  } else if (prompt.includes("nature")) {
    videoUrl = "https://cdn.pixabay.com/video/2019/03/26/22388-327070540_large.mp4";
  } else {
    videoUrl = "https://cdn.pixabay.com/video/2017/08/31/11664-232650331_large.mp4";
  }

  res.json({ 

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});