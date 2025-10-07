import { useState } from "react";
import "../styles/DemoTTS.css";

export default function DemoTTS() {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) {
      alert("Por favor, escribe algo antes de generar el audio.");
      return;
    }

    try {
      setLoading(true);
      setAudioUrl(null);

      const res = await fetch("/api/v1/tts/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Error al generar el audio.");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      console.error(error);
      alert("Hubo un error generando el audio 😢");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText("");
    setAudioUrl(null);
  };

  return (
    <div className="tts-container">
      <h1 className="tts-title">🎙️ Demo TTS - Google</h1>

      <textarea
        className="tts-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe aquí el texto que quieres convertir a voz..."
      ></textarea>

      <div className="tts-buttons">
        <button className="btn-send" onClick={handleSend} disabled={loading}>
          {loading ? "Generando..." : "Generar audio"}
        </button>
        <button className="btn-clear" onClick={handleClear}>
          Limpiar
        </button>
      </div>

      {audioUrl && (
        <div className="tts-audio-player">
          <h3>🔊 Reproducir resultado:</h3>
          <audio controls src={audioUrl}></audio>
        </div>
      )}
    </div>
  );
}

