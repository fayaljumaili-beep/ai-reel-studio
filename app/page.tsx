"use client";

import { useState } from "react";

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState("Motivational");
  const [template, setTemplate] = useState("Rich Mindset");

  const handleGenerate = async () => {
    try {
      const response = await fetch(
        "https://ai-reel-studio-frontend-production.up.railway.app/generate";
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
      console.log("SUCCESS:", data);
      alert(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Frontend error:", error);
      alert("Something went wrong");
    }
  };

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>
        🎬 AI Reel Studio
      </h1>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Enter reel topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{
            padding: "10px",
            width: "300px",
            border: "1px solid #ccc",
          }}
        />

        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          style={{ padding: "10px" }}
        >
          <option>Motivational</option>
          <option>Storytelling</option>
          <option>Educational</option>
        </select>

        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          style={{ padding: "10px" }}
        >
          <option>Rich Mindset</option>
          <option>Luxury Lifestyle</option>
          <option>Success Blueprint</option>
        </select>

        <button
          onClick={handleGenerate}
          style={{
            padding: "10px 20px",
            background: "black",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          ✨ Generate Reel
        </button>
      </div>
    </main>
  );
}