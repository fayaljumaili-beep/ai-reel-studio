"use client";
      console.error("VOICE ERROR:", error);
      alert("Failed to generate AI voice");
    }
    setLoading(false);
  };

  const downloadNarratedReel = async () => {
    if (!voiceUrl) {
      alert("Generate AI voice first");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          prompt,
          audioUrl: voiceUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Video generation failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-reel.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("DOWNLOAD ERROR:", error);
      alert("Failed to generate narrated reel");
    }
    setLoading(false);
  };

  return (
    <main style={{ padding: 40, fontFamily: "serif" }}>
      <h1 style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>
        Faceless Reel Scripts in 5 Seconds
      </h1>

      <p style={{ marginTop: 20 }}>LIVE SAAS MODE 🚀</p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your topic"
        style={{
          width: "100%",
          maxWidth: 600,
          padding: 12,
          marginTop: 20,
          marginBottom: 20,
        }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={generateScript} disabled={loading}>
          ✨ Generate Premium Reel Script
        </button>

        <button onClick={generateVoiceover} disabled={loading}>
          🎙 Generate AI Voiceover
        </button>

        <button onClick={downloadNarratedReel} disabled={loading}>
          🎬 Download Narrated Reel
        </button>
      </div>

      <section style={{ marginTop: 40 }}>
        <h2>Generated Output</h2>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            marginTop: 20,
          }}
        >
          {script}
        </pre>
      </section>
    </main>
  );
}
