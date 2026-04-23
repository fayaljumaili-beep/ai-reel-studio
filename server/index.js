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
  videoUrl = "https://cdn.pixabay.com/vimeo/458/458327528_large.mp4";
} else if (prompt.includes("motivation")) {
  videoUrl = "https://cdn.pixabay.com/vimeo/505/505134578_large.mp4";
} else if (prompt.includes("nature")) {
  videoUrl = "https://cdn.pixabay.com/vimeo/239/239410198_large.mp4";
} else {
  videoUrl = "https://cdn.pixabay.com/vimeo/320/320982888_large.mp4";
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