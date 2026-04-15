"use client";

import { useState } from "react";

const API =
  "https://ai-reel-studio-frontend-production.up.railway.app";

export default function Page() {
  const [topic, setTopic] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");

  const generateScript = async () => {
    const res = await fetch(`${API}/generate-script`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic }),
    });

    const data = await res.json();
    setGeneratedScript(data.script);
  };

  const generateVoiceover = async () => {
    await fetch(`${API}/voiceover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        script: generatedScript,
      }),
    });
  };

  const downloadNarratedReel = async () => {
    const response = await fetch(`${API}/generate-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        script: generatedScript,
      }),
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "viral-reel.mp4";
    a.click();

    window.URL.revokeObjectURL(url);
  };

  return (
    <main style={{ padding: "40px", fontFamily: "serif" }}>
      <h1 style={{ fontSize: "48px", fontWeight: "bold" }}>
        Faceless Reel SaaS 🚀 v3
      </h1>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter topic"
        style={{
          width: "400px",
          padding: "10px",
          marginTop: "20px",
          border: "1px solid #ccc",
        }}
      />

      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button onClick={generateScript}>
          Generate Premium Reel Script
        </button>

        <button onClick={generateVoiceover}>
          Generate AI Voiceover
        </button>

        <button type="button" onClick={downloadNarratedReel}>
          Download Narrated Reel
        </button>
      </div>

      <h2 style={{ marginTop: "40px" }}>Generated Output</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{generatedScript}</pre>
    </main>
  );
}