import { useState } from "react";
import "../styles/DemoPDF.css";

export default function DemoPDF() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // "ok" | "empty" | "error"
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    try {
      if (!file) return setStatus("empty");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/pdf/check", { method: "POST", body: form });
      const data = await res.json();
      setStatus(data.status || "error");
    } catch {
      setStatus("error");
    }
  };

  const handleExtract = async () => {
    try {
      if (!file) return setStatus("empty");
      setLoading(true);
      setText("");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/pdf/extract", { method: "POST", body: form });
      const data = await res.json();
      setText(data.text || "");
      setStatus(data.text ? "ok" : "error");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-container">
      <h2>Demo 1 — PDF → Texto</h2>

      <div className="pdf-card">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <div className="btns">
          <button className="btn" onClick={handleCheck}>Check archivo</button>
          <button className="btn primary" onClick={handleExtract} disabled={loading}>
            {loading ? "Extrayendo..." : "Extraer texto"}
          </button>
        </div>

        {status && (
          <div className={`pdf-status ${
            status === "ok" ? "ok" : status === "empty" ? "empty" : "error"
          }`}>
            {status === "ok" && "✅ OK — archivo recibido"}
            {status === "empty" && "⚠️ EMPTY — selecciona un PDF"}
            {status === "error" && "❌ Error al procesar el PDF"}
          </div>
        )}

        <label className="out-label">Salida (texto):</label>
        <textarea
          className="out-text"
          placeholder="Aquí aparecerá el texto extraído…"
          value={text}
          onChange={() => {}}
          readOnly
        />
      </div>
    </div>
  );
}
