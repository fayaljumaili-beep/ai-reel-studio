"use client";

import { useState } from "react";
<<<<<<< HEAD

export default function Home() {
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState("motivational");
  const [template, setTemplate] = useState("money");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const generateReel = async () => {
    try {
      setLoading(true);

    const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://ai-reel-studio-frontend-production.up.railway.app";

const res = await fetch(`${API_URL}/generate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    topic,
    voice,
    template,
  }),
});

      if (!res.ok) {
        throw new Error("Failed to generate video");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setVideoUrl(url);
      setHistory((prev) => [url, ...prev].slice(0, 3));
    } catch (error) {
      console.error("Frontend error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        color: "white",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1 style={{ fontSize: "48px", marginBottom: "30px" }}>
        🎬 AI Reel Studio
      </h1>

      <div
        style={{
          background: "#1a1a1a",
          padding: "30px",
          borderRadius: "20px",
          maxWidth: "700px",
          boxShadow: "0 0 20px rgba(0,0,0,0.4)",
        }}
      >
        <input
          type="text"
          placeholder="Enter reel topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{
            padding: "14px",
            width: "100%",
            borderRadius: "10px",
            border: "1px solid #333",
            marginBottom: "20px",
            fontSize: "16px",
            background: "#111",
            color: "white",
          }}
        />

        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          style={{
            padding: "14px",
            width: "100%",
            borderRadius: "10px",
            border: "1px solid #333",
            marginBottom: "20px",
            fontSize: "16px",
            background: "#111",
            color: "white",
          }}
        >
          <option value="motivational">💰 Motivational Male</option>
          <option value="female">❤️ Female Storyteller</option>
          <option value="business">💼 Business Coach</option>
          <option value="gym">💪 Gym Hype</option>
        </select>

        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          style={{
            padding: "14px",
            width: "100%",
            borderRadius: "10px",
            border: "1px solid #333",
            marginBottom: "20px",
            fontSize: "16px",
            background: "#111",
            color: "white",
          }}
        >
          <option value="money">💸 Rich Mindset</option>
          <option value="love">💔 Heartbreak Story</option>
          <option value="gym">💪 Gym Discipline</option>
          <option value="business">🧠 Business Wisdom</option>
          <option value="deep">🌙 Deep Thoughts</option>
        </select>

        <button
          onClick={generateReel}
          disabled={loading}
          style={{
            padding: "14px 20px",
            background: "#ffffff",
            color: "#000",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            width: "100%",
            fontSize: "16px",
          }}
        >
          {loading ? "Generating Reel..." : "✨ Generate Reel"}
        </button>
      </div>

      {videoUrl && (
        <div style={{ marginTop: "50px" }}>
          <h2 style={{ marginBottom: "15px" }}>🎥 Latest Reel</h2>
          <video
            controls
            src={videoUrl}
            width="500"
            style={{
              borderRadius: "20px",
              boxShadow: "0 0 20px rgba(255,255,255,0.1)",
            }}
          />

          <a
            href={videoUrl}
            download={`reel-${Date.now()}.mp4`}
            style={{
              display: "inline-block",
              marginTop: "20px",
              padding: "12px 18px",
              background: "white",
              color: "black",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            📥 Download Reel
          </a>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: "60px" }}>
          <h2 style={{ marginBottom: "20px" }}>🕘 Previous Reels</h2>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {history.map((video, index) => (
              <video
                key={index}
                controls
                src={video}
                width="250"
                style={{
                  borderRadius: "15px",
                  border: "1px solid #333",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
import Image from "next/image";
=======
>>>>>>> 8d9d678 (first deploy)

export default function Home() {
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState("motivational");
  const [template, setTemplate] = useState("money");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const res = await fetch(`${API_URL}/generate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    prompt,
    voice,
    niche,
  }),
});

      if (!res.ok) {
        throw new Error("Failed to generate video");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setVideoUrl(url);
      setHistory((prev) => [url, ...prev].slice(0, 3));
    } catch (error) {
      console.error("Frontend error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        color: "white",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1 style={{ fontSize: "48px", marginBottom: "30px" }}>
        🎬 AI Reel Studio
      </h1>

      <div
        style={{
          background: "#1a1a1a",
          padding: "30px",
          borderRadius: "20px",
          maxWidth: "700px",
          boxShadow: "0 0 20px rgba(0,0,0,0.4)",
        }}
      >
        <input
          type="text"
          placeholder="Enter reel topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{
            padding: "14px",
            width: "100%",
            borderRadius: "10px",
            border: "1px solid #333",
            marginBottom: "20px",
            fontSize: "16px",
            background: "#111",
            color: "white",
          }}
        />

        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          style={{
            padding: "14px",
            width: "100%",
            borderRadius: "10px",
            border: "1px solid #333",
            marginBottom: "20px",
            fontSize: "16px",
            background: "#111",
            color: "white",
          }}
        >
          <option value="motivational">💰 Motivational Male</option>
          <option value="female">❤️ Female Storyteller</option>
          <option value="business">💼 Business Coach</option>
          <option value="gym">💪 Gym Hype</option>
        </select>

        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          style={{
            padding: "14px",
            width: "100%",
            borderRadius: "10px",
            border: "1px solid #333",
            marginBottom: "20px",
            fontSize: "16px",
            background: "#111",
            color: "white",
          }}
        >
          <option value="money">💸 Rich Mindset</option>
          <option value="love">💔 Heartbreak Story</option>
          <option value="gym">💪 Gym Discipline</option>
          <option value="business">🧠 Business Wisdom</option>
          <option value="deep">🌙 Deep Thoughts</option>
        </select>

        <button
          onClick={generateReel}
          disabled={loading}
          style={{
            padding: "14px 20px",
            background: "#ffffff",
            color: "#000",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            width: "100%",
            fontSize: "16px",
          }}
        >
          {loading ? "Generating Reel..." : "✨ Generate Reel"}
        </button>
      </div>

      {videoUrl && (
        <div style={{ marginTop: "50px" }}>
          <h2 style={{ marginBottom: "15px" }}>🎥 Latest Reel</h2>
          <video
            controls
            src={videoUrl}
            width="500"
            style={{
              borderRadius: "20px",
              boxShadow: "0 0 20px rgba(255,255,255,0.1)",
            }}
          />

          <a
            href={videoUrl}
            download={`reel-${Date.now()}.mp4`}
            style={{
              display: "inline-block",
              marginTop: "20px",
              padding: "12px 18px",
              background: "white",
              color: "black",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            📥 Download Reel
          </a>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: "60px" }}>
          <h2 style={{ marginBottom: "20px" }}>🕘 Previous Reels</h2>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {history.map((video, index) => (
              <video
                key={index}
                controls
                src={video}
                width="250"
                style={{
                  borderRadius: "15px",
                  border: "1px solid #333",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}