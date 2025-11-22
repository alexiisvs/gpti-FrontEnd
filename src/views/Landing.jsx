// src/views/Landing.jsx
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <>
      {/* === HERO === */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__overlay" />
        </div>

        <div className="container hero__content">
          <h1 className="hero__title">
            Accesibilidad y<br />
            aprendizaje asistido con<br />
            IA
          </h1>

          <p className="hero__subtitle">
            AudIA es una aplicación web educativa diseñada para mejorar el aprendizaje
            inclusivo mediante inteligencia artificial. Ofrecemos herramientas y recursos
            adaptados a diversas necesidades de aprendizaje.
          </p>

          <div className="hero__cta">
            <Link to="/features" className="btn btn--primary">Comenzar</Link>
            <Link to="/login" className="btn btn--ghost">Iniciar Sesión</Link>
          </div>
        </div>
      </section>

      {/* === FEATURES === */}
      <section className="features">
        <div className="container">
          <h2 className="section__title">Funcionalidades principales</h2>
          <p className="section__subtitle">
            Descubre cómo AudIA puede transformar la experiencia de aprendizaje para todos.
          </p>

          <div className="features__grid">
            <div className="card">
              <div className="card__icon">🧠</div>
              <div>
                <h3 className="card__title">Aprendizaje personalizado</h3>
                <p className="card__text">
                  Adaptamos el contenido y las herramientas a las necesidades individuales de cada estudiante,
                  asegurando una experiencia única y efectiva.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card__icon">🤝</div>
              <div>
                <h3 className="card__title">Comunidad inclusiva</h3>
                <p className="card__text">
                  Fomentamos un entorno colaborativo donde estudiantes y educadores comparten recursos y experiencias.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card__icon">📊</div>
              <div>
                <h3 className="card__title">Seguimiento del progreso</h3>
                <p className="card__text">
                  Herramientas de análisis para monitorear el progreso, identificar áreas de mejora y celebrar los logros.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
