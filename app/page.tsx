"use client";

import { useState } from "react";

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState("Motivational");
  const [template, setTemplate] = useState("Rich Mindset");
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    try {
      const response = await fetch(
        "https://ai-reel-studio-frontend-production.up.railway.app/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            voice,
            template,
          }),
        }
      );

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Frontend error:", error);
      alert("Something went wrong");
    }
  };

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>🎬 AI Reel Studio</h1>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter reel topic"
        style={{ padding: "10px", width: "300px", display: "block", marginBottom: "10px" }}
      />

      <select
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
        style={{ padding: "10px", marginBottom: "10px", display: "block" }}
      >
        <option>Motivational</option>
        <option>Storytelling</option>
        <option>Educational</option>
      </select>

      <select
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        style={{ padding: "10px", marginBottom: "10px", display: "block" }}
      >
        <option>Rich Mindset</option>
        <option>Success Blueprint</option>
        <option>Luxury Lifestyle</option>
      </select>

      <button
        onClick={handleGenerate}
        style={{
          padding: "12px 20px",
          background: "black",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        ✨ Generate Reel
      </button>
    </main>
  );
}
{result && (
  <div
    style={{
      marginTop: "30px",
      whiteSpace: "pre-wrap",
      padding: "20px",
      border: "1px solid #ccc",
      borderRadius: "10px",
      maxWidth: "600px",
    }}
  >
    <h2>🎬 Generated Reel Script</h2>
    <p>{result.script}</p>
  </div>
)}
{result && (
  <div style={{ marginTop: "30px", whiteSpace: "pre-wrap" }}>
    <h2>Generated Reel Script</h2>
    <p>{result.script}</p>
  </div>
)}