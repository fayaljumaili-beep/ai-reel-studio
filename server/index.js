require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const { execSync } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

/*
========================================
REAL ELEVENLABS VOICE ID
========================================
*/

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/*
========================================
GENERATE VIDEO
========================================
*/

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🔥 START:", prompt);

    /*
    ========================================
    SCRIPT
    ========================================
    */

    const script = `
Most people quit too early.

Success comes from consistency.

Keep going even when it hurts.

Small business big dreams.

You can win if you want.
`;

    /*
    ========================================
    ELEVENLABS VOICE
    ========================================
    */

    const voiceResponse = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,

      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },

      data: {
        text: script,
        model_id: "eleven_monolingual_v1",

        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      },

      responseType: "arraybuffer",
    });

    fs.writeFileSync("voice.mp3", voiceResponse.data);

    console.log("🎤 Voice ready");

    /*
    ========================================
    CAPTIONS
    ========================================
    */

    const captions = `
1
00:00:00,000 --> 00:00:02,000
MOST PEOPLE
QUIT TOO EARLY

2
00:00:02,000 --> 00:00:04,000
SUCCESS COMES
FROM CONSISTENCY

3
00:00:04,000 --> 00:00:06,000
KEEP GOING
EVEN WHEN IT HURTS

4
00:00:06,000 --> 00:00:08,000
SMALL BUSINESS
BIG DREAMS

5
00:00:08,000 --> 00:00:10,000
YOU CAN WIN
IF YOU WANT
`;

    fs.writeFileSync("captions.srt", captions);

    /*
    ========================================
    BACKGROUND MUSIC CHECK
    ========================================
    */

    const hasMusic = fs.existsSync("server/music.mp3");

    console.log("🎵 Music exists:", hasMusic);

    /*
    ========================================
    CREATE VIDEO
    ========================================
    */

    if (hasMusic) {
      execSync(`
ffmpeg -y \
-loop 1 -i sample.jpg \
-i voice.mp3 \
-stream_loop -1 -i server/music.mp3 \
-filter_complex "
[0:v]scale=1080:1920,zoompan=z='min(zoom+0.0005,1.1)':d=250:s=1080x1920[v];
[1:a]volume=1.5[a1];
[2:a]volume=0.15[a2];
[a1][a2]amix=inputs=2:duration=first[a]
" \
-map "[v]" \
-map "[a]" \
-vf "subtitles=captions.srt:force_style='Fontsize=18,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,BorderStyle=4,Outline=2,Shadow=1,MarginV=180,Alignment=2'" \
-c:v libx264 \
-preset ultrafast \
-crf 32 \
-c:a aac \
-shortest \
final.mp4
`);
    } else {
      execSync(`
ffmpeg -y \
-loop 1 -i sample.jpg \
-i voice.mp3 \
-vf "scale=1080:1920,subtitles=captions.srt:force_style='Fontsize=18,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,BorderStyle=4,Outline=2,Shadow=1,MarginV=180,Alignment=2'" \
-c:v libx264 \
-preset ultrafast \
-crf 32 \
-c:a aac \
-shortest \
final.mp4
`);
    }

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

/*
========================================
START SERVER
========================================
*/

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});