"use client";

import { useState } from "react";

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const generateVoiceover = async () => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: prompt }),
      });

      const data = await response.json();
      setOutput(data.script || data.output || "No script generated.");
    } catch (error) {
      console.error("SCRIPT ERROR:", error);
      setOutput("Failed to generate script.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadNarratedReel = async () => {
    if (isDownloading || !output) return;

    try {
      setIsDownloading(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: output }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-reel.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (error) {
      console.error("DOWNLOAD ERROR:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main style={{ padding: "40px", fontFamily: "serif" }}>
      <h1 style={{ fontSize: "48px", fontWeight: "bold" }}>
        Faceless Reel Scripts in 5 Seconds
      </h1>

      <p style={{ marginTop: 12 }}>LIVE SAAS MODE 🚀</p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter reel topic"
        style={{
          width: "100%",
          maxWidth: 600,
          padding: 12,
          marginTop: 20,
          marginBottom: 20,
          border: "1px solid #ccc",
        }}
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 30 }}>
        <button onClick={generateVoiceover} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "🎙️ Generate AI Voiceover"}
        </button>

        <button onClick={downloadNarratedReel} disabled={isDownloading || !output}>
          {isDownloading ? "Downloading..." : "⬇️ Download Narrated Reel"}
        </button>
      </div>

      <h2>Generated Output</h2>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
          fontSize: 20,
          maxWidth: 900,
        }}
      >
        {output}
      </pre>
    </main>
  );
}
