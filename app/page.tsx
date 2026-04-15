"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://your-railway-backend.up.railway.app";

export default function Page() {
  const [topic, setTopic] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateScript = async () => {
    try {
      setIsLoading(true);

      const res = await fetch(`${API_URL}/generate-script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) throw new Error("Script generation failed");

      const data = await res.json();
      setGeneratedScript(data.script);
    } catch (error) {
      console.error(error);
      alert("Script generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const generateVoiceover = async () => {
    try {
      if (!generatedScript) {
        alert("Generate script first");
        return;
      }

      const res = await fetch(`${API_URL}/voiceover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: generatedScript,
        }),
      });

      if (!res.ok) {
        throw new Error("Voiceover failed");
      }

      const data = await res.json();
      console.log("VOICEOVER SUCCESS:", data);
      alert("Voiceover generated successfully");
    } catch (error) {
      console.error(error);
      alert("Voiceover failed");
    }
  };

  const downloadNarratedReel = async () => {
  try {
    const response = await fetch(
      "https://ai-reel-studio-frontend-production.up.railway.app/generate-video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: generatedScript,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Video generation failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "viral-reel.mp4";
    a.click();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert("Video generation failed");
  }
};

  return (
    <main style={{ padding: "40px", fontFamily: "serif" }}>
      <h1 style={{ fontSize: "48px", fontWeight: "bold" }}>
        Faceless Reel SaaS 🚀
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
        <button onClick={generateScript} disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate Premium Reel Script"}
        </button>

        <button onClick={generateVoiceover}>Generate AI Voiceover</button>

        <button onClick={downloadNarratedReel}>Download Narrated Reel</button>
      </div>

      <h2 style={{ marginTop: "40px" }}>Generated Output</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{generatedScript}</pre>
    </main>
  );
}