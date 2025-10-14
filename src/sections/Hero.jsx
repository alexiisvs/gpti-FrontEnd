export default function Hero() {
    return (
      <section id="inicio" className="hero">
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
            <a href="#funcionalidades" className="btn btn--primary">Comenzar</a>
            <a href="#login" className="btn btn--ghost">Iniciar Sesión</a>
          </div>
        </div>
      </section>
    );
  }
  