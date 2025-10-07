import { useState } from "react";
import "../styles/DemoTTS.css";

export default function DemoTTS() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    // Llama al backend (mock o real)
    try {
      const res = await fetch("/api/v1/tts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResult(data.status); // "ok" o "empty"
    } catch (err) {
      console.error(err);
      setResult("error");
    }
  };

  return (
    <div className="tts-container">
      <h2 className="tts-title">Demo TTS</h2>

      <textarea
        className="tts-textarea"
        rows={5}
        placeholder="Escribe aquí el texto a procesar..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="tts-buttons">
        <button className="btn-send" onClick={handleSend}>
          Enviar
        </button>
        <button
          className="btn-clear"
          onClick={() => {
            setText("");
            setResult(null);
          }}
        >
          Limpiar
        </button>
      </div>

      {result && (
        <div
          className={`tts-result ${
            result === "ok" ? "result-ok" : "result-empty"
          }`}
        >
          {result === "ok" && "✅ OK — texto recibido"}
          {result === "empty" && "⚠️ EMPTY — el cuadro está vacío"}
          {result === "error" && "❌ Error al conectar con backend"}
        </div>
      )}
    </div>
  );
}
