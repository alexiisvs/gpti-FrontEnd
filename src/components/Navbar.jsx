import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="brand" aria-label="AudIA">
          <span className="brand__icon" />
          <span>AudIA</span>
        </Link>

        <nav className="nav__links">
          {/* Antes: <a href="#inicio"> */}
          <NavLink to="/" end>Inicio</NavLink>
          {/* Estas tres van a la misma vista de funcionalidades */}
          <NavLink to="/features">Funcionalidades</NavLink>
          <NavLink to="/features">Recursos</NavLink>
          <NavLink to="/features">Contacto</NavLink>
          {/* Demo hub */}
          <NavLink to="/demo">Demo</NavLink>
        </nav>

        <div className="nav__actions">
          <Link to="/login" className="btn btn--ghost">Iniciar Sesión</Link>
          <Link to="/features" className="btn btn--primary">Comenzar</Link>
        </div>
      </div>
    </header>
  );
}


