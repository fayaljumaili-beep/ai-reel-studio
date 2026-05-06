const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const { execSync } = require("child_process");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.post("/generate-video", async (req, res) => {
  try {
    const topic = req.body.topic || "motivation";

    console.log("🔥 START:", topic);

    // CLEAN OLD FILES
    const filesToDelete = [
      "voice.mp3",
      "music-mixed.mp3",
      "final.mp4",
      "combined.mp4",
      "scene1.mp4",
      "scene2.mp4",
      "scene3.mp4",
      "scene1.jpg",
      "scene2.jpg",
      "scene3.jpg",
    ];

    filesToDelete.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    // SCRIPT
    const script = [
      "Most people quit too early",
      "Success is built daily",
      "Discipline changes everything",
      "Keep going even when it hurts",
    ];

    // VOICEOVER
    const voiceResponse = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text: script.join(". "),
        model_id: "eleven_multilingual_v2",
      },
      responseType: "arraybuffer",
    });

    fs.writeFileSync("voice.mp3", voiceResponse.data);

    console.log("🎤 Voice ready");

    // PEXELS SEARCHES
    const searches = [
      `${topic} success`,
      `${topic} business`,
      `${topic} motivation`,
    ];

    const clips = [];

    for (let i = 0; i < searches.length; i++) {
      const response = await axios.get(
        `https://api.pexels.com/videos/search?query=${searches[i]}&per_page=1`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
        }
      );

      const videoUrl =
        response.data.videos?.[0]?.video_files?.find(
          (v) => v.width < 1000
        )?.link;

      if (!videoUrl) continue;

      const video = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });

      const sceneName = `scene${i + 1}.mp4`;

      fs.writeFileSync(sceneName, video.data);

      clips.push(sceneName);
    }

    console.log("🎬 Clips downloaded:", clips.length);

    if (clips.length === 0) {
      return res.status(500).json({
        error: "No clips found",
      });
    }

    // TRIM CLIPS
    const trimmedClips = [];

    for (let i = 0; i < clips.length; i++) {
      const input = clips[i];
      const output = `trimmed${i}.mp4`;

      execSync(`
ffmpeg -y \
-i ${input} \
-t 5 \
-r 24 \
-an \
-vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,zoompan=z='min(zoom+0.0008,1.08)':d=125" \
-preset ultrafast \
-crf 32 \
${output}
`);

      trimmedClips.push(output);
    }

    console.log("✂️ Clips trimmed");

    // CONCAT
    let concatText = "";

    trimmedClips.forEach((clip) => {
      concatText += `file '${clip}'\n`;
    });

    fs.writeFileSync("list.txt", concatText);

    execSync(`
ffmpeg -y \
-f concat \
-safe 0 \
-i list.txt \
-c copy \
combined.mp4
`);

    console.log("📦 Clips combined");

    // MIX BACKGROUND MUSIC + VOICE
    execSync(`
ffmpeg -y \
-i voice.mp3 \
-i ${process.cwd()}/music.mp3 \
-filter_complex "[1:a]volume=0.12[music];[0:a][music]amix=inputs=2:duration=first" \
-c:a mp3 \
music-mixed.mp3
`);

    console.log("🎵 Music mixed");

    // CAPTIONS
    const captions = [
      "MOST PEOPLE",
      "QUIT TOO EARLY",
      "SUCCESS IS",
      "BUILT DAILY",
      "DISCIPLINE",
      "CHANGES EVERYTHING",
      "KEEP GOING",
      "EVEN WHEN IT HURTS",
    ];

    let drawtext = "";

    captions.forEach((text, index) => {
      const start = index * 1.5;
      const end = start + 1.4;

      drawtext += `drawtext=text='${text}':fontcolor=yellow:fontsize=46:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-220:enable='between(t,${start},${end})',`;
    });

    drawtext = drawtext.slice(0, -1);

    // FINAL VIDEO
    execSync(`
ffmpeg -y \
-i combined.mp4 \
-i music-mixed.mp3 \
-vf "${drawtext}" \
-map 0:v \
-map 1:a \
-shortest \
-c:v libx264 \
-preset ultrafast \
-crf 32 \
-c:a aac \
-b:a 128k \
final.mp4
`);

    console.log("✅ FINAL VIDEO READY");

    res.sendFile(process.cwd() + "/final.mp4");
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Video generation failed",
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});