"use client";

import { useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://YOUR-RAILWAY-URL.up.railway.app";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);

  const generateScript = async () => {
    if (!prompt.trim()) return alert("Enter a prompt");
    setLoadingScript(true);

    try {
      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const text = await res.text();
      console.log("GENERATE RAW:", text);

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { script: text };
      }

      setScript(data.script || "");
      setAudioUrl("");
    } catch (err) {
      console.error(err);
      alert("Script generation failed");
    }

    setLoadingScript(false);
  };

  const generateVoice = async () => {
    if (!script) return alert("Generate script first");
    setLoadingVoice(true);

    try {
      const res = await fetch(`${API}/generate-voice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script }),
      });

      const data = await res.json();
      if (data.audioUrl) {
        setAudioUrl(`${API}${data.audioUrl}`);
      }
    } catch (err) {
      console.error(err);
      alert("Voice generation failed");
    }

    setLoadingVoice(false);
  };

  const generateVideo = async () => {
    if (!script) return alert("Generate script first");
    setLoadingVideo(true);

    try {
      const res = await fetch(`${API}/generate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script,
          captionText: script.split("\n")[0],
        }),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-reel.mp4";
      a.click();
    } catch (err) {
      console.error(err);
      alert("Video generation failed");
    }

    setLoadingVideo(false);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Faceless Reel Scripts in 5 Seconds</h1>
      <p>LIVE SAAS MODE 🚀</p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="How to become successful"
        style={{ width: 420, padding: 10 }}
      />

      <div style={{ marginTop: 20 }}>
        <button onClick={generateScript} disabled={loadingScript}>
          {loadingScript ? "Generating..." : "✨ Generate Premium Reel Script"}
        </button>

        <button onClick={generateVoice} disabled={loadingVoice}>
          {loadingVoice ? "Generating..." : "🎙 Generate AI Voiceover"}
        </button>

        <button onClick={generateVideo} disabled={loadingVideo}>
          {loadingVideo ? "Generating..." : "🎬 Download Narrated Reel Video"}
        </button>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Generated Output</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{script}</pre>

        {audioUrl && (
          <div style={{ marginTop: 20 }}>
            <audio controls src={audioUrl} />
            <br />
            <a href={audioUrl} download>
              Download Voiceover
            </a>
          </div>
        )}
      </div>
    </main>
  );
}