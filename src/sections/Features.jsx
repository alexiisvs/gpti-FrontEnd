function Card({ icon, title, children }) {
    return (
      <div className="card">
        <div className="card__icon">{icon}</div>
        <div>
          <h3 className="card__title">{title}</h3>
          <p className="card__text">{children}</p>
        </div>
      </div>
    );
  }
  
  export default function Features() {
    return (
      <section id="funcionalidades" className="features">
        <div className="container">
          <h2 className="section__title">Funcionalidades principales</h2>
          <p className="section__subtitle">
            Descubre cómo AudIA puede transformar la experiencia de aprendizaje para todos.
          </p>
  
          <div className="features__grid">
            <Card icon="🧠" title="Aprendizaje personalizado">
              Adaptamos el contenido y las herramientas a las necesidades individuales de cada estudiante,
              asegurando una experiencia única y efectiva.
            </Card>
            <Card icon="🤝" title="Comunidad inclusiva">
              Fomentamos un entorno colaborativo donde estudiantes y educadores comparten recursos y experiencias.
            </Card>
            <Card icon="📊" title="Seguimiento del progreso">
              Herramientas de análisis para monitorear el progreso, identificar áreas de mejora y celebrar los logros.
            </Card>
          </div>
        </div>
      </section>
    );
  }
  