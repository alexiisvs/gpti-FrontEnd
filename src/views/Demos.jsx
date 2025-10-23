import { Link } from "react-router-dom";

export default function Demos() {
  return (
    <section className="container" style={{ padding: "48px 0" }}>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#fff" }}>
        Centro de Demos
      </h1>
      <p style={{ marginTop: 12, color: "var(--subtext)" }}>
        Elige una demo para probar las funcionalidades.
      </p>

      <div
        className="features__grid"
        style={{ marginTop: 24 }}
      >
        {/* Demo 1 (inactiva) */}
        <div className="card">
          <div className="card__icon">🧪</div>
          <div>
            <h3 className="card__title">Demo 1</h3>
            <p className="card__text">
              Próximamente…
            </p>
            <button className="btn" disabled style={{ opacity: 0.6 }}>
              No disponible
            </button>
          </div>
        </div>

        {/* Demo 2 (activa → DemoTTS) */}
        <div className="card">
          <div className="card__icon">🎙️</div>
          <div>
            <h3 className="card__title">Demo 2 — TTS</h3>
            <p className="card__text">
              Convierte texto en audio usando el backend TTS.
            </p>
            <Link to="/demo/tts" className="btn btn--primary">
              Ir a Demo 2
            </Link>
          </div>
        </div>

        {/* Demo 3 (inactiva) */}
        <div className="card">
          <div className="card__icon">🎙️</div>
          <div>
            <h3 className="card__title">Demo 3 — Asistente Virtual</h3>
            <p className="card__text">
              Implementa asistencia virtual inteligente.
            </p>
            <Link to="/demo/llm" className="btn btn--primary">
              Ir a Demo 3
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
