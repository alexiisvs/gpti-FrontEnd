
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="brand" aria-label="AudIA">
          <span className="brand__icon" />
          <span>AudIA</span>
        </Link>

        <nav className="nav__links">
          <a href="#inicio">Inicio</a>
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#recursos">Recursos</a>
          <a href="#contacto">Contacto</a>
          <Link to="/demo">Demo</Link>
        </nav>

        <div className="nav__actions">
          <button className="btn btn--ghost">Iniciar Sesión</button>
          <button className="btn btn--primary">Comenzar</button>
        </div>
      </div>
    </header>
  );
}
