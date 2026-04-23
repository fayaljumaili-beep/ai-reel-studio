const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server works");
});

app.post("/generate-video", (req, res) => {
  const prompt = (req.body.prompt || "").toLowerCase();

  let videoUrl;

if (prompt.includes("gym")) {
  videoUrl = "https://cdn.coverr.co/videos/coverr-man-doing-push-ups-1566/1080p.mp4";
} else if (prompt.includes("motivation")) {
  videoUrl = "https://cdn.coverr.co/videos/coverr-man-running-at-sunrise-1573/1080p.mp4";
} else if (prompt.includes("nature")) {
  videoUrl = "https://cdn.coverr.co/videos/coverr-mountain-landscape-1579/1080p.mp4";
} else {
  videoUrl = "https://cdn.coverr.co/videos/coverr-aerial-view-of-a-road-1564/1080p.mp4";
}

  res.json({
    videoUrl: videoUrl
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log("NEW VERSION DEPLOYED 🚀"); // 👈 ADD THIS LINE
});