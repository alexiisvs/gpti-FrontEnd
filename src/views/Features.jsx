// src/views/FeaturesPage.jsx
export default function FeaturesPage() {
  return (
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
                Adaptamos el contenido y las herramientas a las necesidades individuales de cada estudiante.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card__icon">🤝</div>
            <div>
              <h3 className="card__title">Comunidad inclusiva</h3>
              <p className="card__text">
                Un entorno colaborativo donde estudiantes y educadores comparten recursos y experiencias.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card__icon">📊</div>
            <div>
              <h3 className="card__title">Seguimiento del progreso</h3>
              <p className="card__text">
                Análisis para monitorear el progreso, identificar áreas de mejora y celebrar logros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
