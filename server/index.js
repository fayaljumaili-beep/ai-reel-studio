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
  videoUrl = "https://cdn.pixabay.com/video/2019/05/30/24177-339430569_large.mp4";
} else if (prompt.includes("motivation")) {
  videoUrl = "https://cdn.pixabay.com/video/2020/06/10/41608-429157172_large.mp4";
} else if (prompt.includes("nature")) {
  videoUrl = "https://cdn.pixabay.com/video/2020/04/18/36434-409141064_large.mp4";
} else {
  videoUrl = "https://cdn.pixabay.com/video/2017/08/31/11664-232650331_large.mp4";
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