"use client";
    }
  };

  const downloadVideo = async () => {
    if (!script.trim() || isDownloadingVideo) return;

    try {
      setIsDownloadingVideo(true);

      const res = await fetch(`${API}/generate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: script }),
      });

      if (!res.ok) {
        throw new Error("Video generation failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-stock-reel.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (error) {
      console.error("VIDEO ERROR:", error);
      alert("Video generation failed");
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  return (
    <main style={{ padding: 40, fontFamily: "serif" }}>
      <h1 style={{ fontSize: 48, fontWeight: 700 }}>
        Faceless Reel Studio
      </h1>

      <p style={{ marginTop: 10, marginBottom: 20 }}>
        Prompt → Script → Voice → Stock Visual Reel 🚀
      </p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your reel topic"
        style={{
          width: "100%",
          maxWidth: 700,
          padding: 12,
          border: "1px solid #ccc",
          marginBottom: 20,
        }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={generateScript} disabled={isGeneratingScript}>
          {isGeneratingScript ? "Generating..." : "✨ Generate Script"}
        </button>

        <button onClick={generateVoice} disabled={!script || isGeneratingVoice}>
          {isGeneratingVoice ? "Generating..." : "🎙️ Generate Voice"}
        </button>

        <button onClick={downloadVideo} disabled={!script || isDownloadingVideo}>
          {isDownloadingVideo ? "Rendering..." : "🎬 Download Stock Reel"}
        </button>
      </div>

      <h2 style={{ marginTop: 40 }}>Generated Script</h2>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
          fontSize: 18,
          maxWidth: 900,
        }}
      >
        {script}
      </pre>
    </main>
  );
}
