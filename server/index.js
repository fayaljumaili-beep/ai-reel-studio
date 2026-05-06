import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { execSync } from "child_process";
import axios from "axios";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🔥 START:", prompt);

    // -------------------------
    // CLEAN OLD FILES
    // -------------------------

    const files = [
      "voice.mp3",
      "scene1.mp4",
      "scene2.mp4",
      "scene3.mp4",
      "captions.srt",
      "list.txt",
      "temp.mp4",
      "final.mp4"
    ];

    files.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    // -------------------------
    // GENERATE AI SCRIPT
    // -------------------------

    const script = `
Most people quit too early.
Success comes from consistency.
Keep showing up every day.
Small actions create big dreams.
`;

    // -------------------------
    // GENERATE VOICE
    // -------------------------

    const elevenRes = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.VOICE_ID}`,
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text: script,
        model_id: "eleven_multilingual_v2",
      },
      responseType: "arraybuffer",
    });

    fs.writeFileSync("voice.mp3", elevenRes.data);

    console.log("🎤 Voice ready");

    // -------------------------
    // DOWNLOAD VIDEOS
    // -------------------------

    const videos = [
      "https://videos.pexels.com/video-files/3195650/3195650-hd_720_1280_25fps.mp4",
      "https://videos.pexels.com/video-files/853889/853889-hd_720_1280_25fps.mp4",
      "https://videos.pexels.com/video-files/4620573/4620573-hd_720_1280_30fps.mp4"
    ];

    for (let i = 0; i < videos.length; i++) {
      const response = await axios({
        method: "GET",
        url: videos[i],
        responseType: "stream",
      });

      const writer = fs.createWriteStream(`scene${i + 1}.mp4`);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    }

    console.log("🎬 Clips downloaded");

    // -------------------------
    // TRIM CLIPS
    // -------------------------

    for (let i = 1; i <= 3; i++) {
      execSync(`
      ffmpeg -y \
      -i scene${i}.mp4 \
      -t 5 \
      -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
      -preset ultrafast \
      trimmed${i}.mp4
      `);
    }

    // -------------------------
    // CONCAT VIDEO
    // -------------------------

    fs.writeFileSync(
      "list.txt",
      `
file 'trimmed1.mp4'
file 'trimmed2.mp4'
file 'trimmed3.mp4'
`
    );

    execSync(`
    ffmpeg -y \
    -f concat \
    -safe 0 \
    -i list.txt \
    -c copy \
    combined.mp4
    `);

    console.log("🎞 Clips combined");

    // -------------------------
    // CAPTIONS
    // -------------------------

    const captions = `
1
00:00:00,000 --> 00:00:03,000
MOST PEOPLE
QUIT TOO EARLY

2
00:00:03,000 --> 00:00:06,000
SUCCESS COMES
FROM CONSISTENCY

3
00:00:06,000 --> 00:00:09,000
KEEP SHOWING UP
EVERY DAY

4
00:00:09,000 --> 00:00:12,000
SMALL ACTIONS
CREATE BIG DREAMS
`;

    fs.writeFileSync("captions.srt", captions);

    // -------------------------
    // VIDEO + VOICE + CAPTIONS
    // -------------------------

    execSync(`
    ffmpeg -y \
    -i combined.mp4 \
    -i voice.mp3 \
    -vf "subtitles=captions.srt:force_style='Fontsize=18,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=2,Shadow=1,Alignment=2,MarginV=90'" \
    -map 0:v \
    -map 1:a \
    -c:v libx264 \
    -preset ultrafast \
    -c:a aac \
    -shortest \
    temp.mp4
    `);

    console.log("📝 Captions added");

    // -------------------------
    // ADD BACKGROUND MUSIC
    // -------------------------

    execSync(`
    ffmpeg -y \
    -i temp.mp4 \
    -stream_loop -1 -i server/music.mp3 \
    -filter_complex "[1:a]volume=0.08[a1]" \
    -map 0:v \
    -map "[a1]" \
    -c:v copy \
    -shortest \
    final.mp4
    `);

    console.log("🎵 Music added");

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