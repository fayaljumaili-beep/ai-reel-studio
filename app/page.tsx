# Clean full paste versions

Use these as **full file replacements**.

---

## `app/page.tsx`

```tsx
"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);

  const generateScript = async () => {
    if (!prompt.trim()) return alert("Enter a prompt");

    try {
      setLoadingScript(true);

      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const text = await res.text();

      if (!res.ok) {
        console.error(text);
        return alert("Script generation failed");
      }

      setScript(text);
    } catch (error) {
      console.error(error);
      alert("Script generation failed");
    } finally {
      setLoadingScript(false);
    }
  };

  const generateVoice = async () => {
    if (!script.trim()) return alert("Generate script first");

    try {
      setLoadingVoice(true);

      const res = await fetch(`${API_URL}/generate-voice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(err);
        return alert("Voice generation failed");
      }

      alert("Voice generated successfully");
    } catch (error) {
      console.error(error);
      alert("Voice generation failed");
    } finally {
      setLoadingVoice(false);
    }
  };

  const downloadVideo = async () => {
  try {
    setLoadingVideo(true);

    const res = await fetch(`${API_URL}/generate-video`, {
      method: "POST",
      headers: {
        Accept: "application/octet-stream",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(errText);
      return alert("Video generation failed");
    }

    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: "video/mp4",
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "viral-reel.mp4";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error(error);
    alert("Video generation failed");
  } finally {
    setLoadingVideo(false);
  }
};

  return (
    <main style={{ padding: 40 }}>
      <h1>Faceless Reel Scripts in 5 Seconds</h1>
      <p>LIVE SAAS MODE 🚀</p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="how to be successful"
        style={{ width: 400, padding: 8 }}
      />

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button onClick={generateScript} disabled={loadingScript}>
          {loadingScript ? "Generating..." : "✨ Generate Premium Reel Script"}
        </button>

        <button onClick={generateVoice} disabled={loadingVoice}>
          {loadingVoice ? "Generating..." : "🎙️ Generate AI Voiceover"}
        </button>

        <button onClick={downloadVideo} disabled={loadingVideo}>
          {loadingVideo ? "Generating..." : "🎬 Download Narrated Reel Video"}
        </button>
      </div>

      <h2 style={{ marginTop: 40 }}>Generated Output</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{script}</pre>
    </main>
  );
}