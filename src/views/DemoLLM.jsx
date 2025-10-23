import { useState } from "react";
import "../styles/DemoLLM.css";

export default function DemoLLM() {
  const [text, setText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      alert("Escribe un texto a analizar.");
      return;
    }
    if (!instruction.trim()) {
      alert("Escribe una instrucción para el LLM.");
      return;
    }

    try {
      setLoading(true);
      setResult("");

      const res = await fetch("/api/v1/llm/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, instruction }),
      });

      if (!res.ok) throw new Error("Error al analizar el texto.");
      const data = await res.json();
      setResult(data.output ?? "(Sin respuesta)");
    } catch (err) {
      console.error(err);
      setResult("❌ Error al conectar con el backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText("");
    setInstruction("");
    setResult("");
  };

  return (
    <div className="llm-container">
      <h2 className="llm-title">🧪 Demo LLM — Análisis de texto</h2>

      <label className="llm-label">Texto a analizar</label>
      <textarea
        className="llm-textarea"
        rows={6}
        placeholder="Pega aquí el extracto de texto…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <label className="llm-label">Instrucción para el LLM</label>
      <textarea
        className="llm-textarea"
        rows={3}
        placeholder="Ej: Resume en 2 líneas, extrae entidades, clasifica el sentimiento, etc."
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      <div className="llm-buttons">
        <button className="btn-send" onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analizando…" : "Analizar"}
        </button>
        <button className="btn-clear" onClick={handleClear}>
          Limpiar
        </button>
      </div>

      <div className="llm-output">
        <h3>📝 Respuesta</h3>
        <pre className="llm-pre">{result}</pre>
      </div>
    </div>
  );
}