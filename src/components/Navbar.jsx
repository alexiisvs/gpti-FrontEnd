// src/components/Navbar.jsx (ejemplo)
import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="container nav__inner">
        <Link to="/" className="brand">
          <span className="brand__icon" />
          AudIA
        </Link>

        <div className="nav__links">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/features">Funcionalidades</NavLink>
          <NavLink to="/demo/tts">Demo TTS</NavLink>
          <NavLink to="/demo/llm">Demo LLM</NavLink>
        </div>

        <div className="nav__actions">
          <Link to="/features" className="btn btn--primary">Comenzar</Link>
        </div>
      </div>
    </nav>
  );
}

